#!/bin/sh
#
# Build a net4sats configurationwizzard package (apk or ipk) using the
# OpenWrt SDK in Docker — the same approach the tollgate-module-basic-go
# reference uses for apk.
#
# Unlike that module there is nothing to cross-compile: the package ships a
# prebuilt Preact SPA plus an rpcd plugin, and is arch-independent
# (PKGARCH:=all), so a single SDK build produces one package installable on
# every architecture. We still go through the SDK because apk-tools' OpenWrt
# package format is produced by the SDK's apk binary; reimplementing it by
# hand (the way packaging/build-ipk.sh wraps an ipk) is out of scope.
#
# Usage:
#   SDK_TAG=mediatek-filogic-25.12.0 scripts/build-sdk-package.sh
#
# Env:
#   SDK_TAG          (required) openwrt/sdk image tag, e.g. mediatek-filogic-25.12.0
#   PACKAGE_FORMAT   apk | ipk           (default: apk)
#   PACKAGE_VERSION  human version string (default: package.json .version)
#   ARTIFACT_DIR     output dir          (default: ./dist-packages)
#   SKIP_BUILD       set to 1 to reuse an existing dist/ (skip npm build)
set -eu

PACKAGE_NAME=configurationwizzard
PACKAGE_FORMAT="${PACKAGE_FORMAT:-apk}"
ARTIFACT_DIR="${ARTIFACT_DIR:-$(pwd)/dist-packages}"

case "$PACKAGE_FORMAT" in
    apk|ipk) ;;
    *) printf 'ERROR: PACKAGE_FORMAT must be apk or ipk, got %s\n' "$PACKAGE_FORMAT" >&2; exit 1 ;;
esac

if [ -z "${SDK_TAG:-}" ]; then
    printf '%s\n' 'ERROR: SDK_TAG is required (no default — refusing to guess a target).' >&2
    printf '%s\n' 'Example: SDK_TAG=mediatek-filogic-25.12.0 scripts/build-sdk-package.sh' >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

PACKAGE_VERSION="${PACKAGE_VERSION:-$(jq -r .version package.json)}"

printf 'Package:        %s\n' "$PACKAGE_NAME"
printf 'Format:         %s\n' "$PACKAGE_FORMAT"
printf 'Version:        %s\n' "$PACKAGE_VERSION"
printf 'SDK image:      openwrt/sdk:%s\n' "$SDK_TAG"
printf 'Artifact dir:   %s\n' "$ARTIFACT_DIR"

# 1. Build the SPA (admin + captive portal) unless reusing an existing dist/.
if [ "${SKIP_BUILD:-0}" != "1" ]; then
    printf '\n=== Building SPA (npm run build) ===\n'
    npm run build
fi
[ -d dist/admin ] && [ -d dist/portal ] || {
    printf 'ERROR: dist/admin and dist/portal not found. Run npm run build first.\n' >&2
    exit 1
}

# 2. Stage the SDK package tree. The Makefile reads dist/, rpcd/ and files/
#    relative to its own directory ($(PKG_MAKEFILE_DIR)).
STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

cp -R packaging/. "$STAGE_DIR/"          # Makefile, normalize-apk-version.sh, files/, ...
mkdir -p "$STAGE_DIR/rpcd"
cp openwrt/rpcd/tollgate openwrt/rpcd/tollgate_acl.json "$STAGE_DIR/rpcd/"
cp -R dist "$STAGE_DIR/dist"

mkdir -p "$ARTIFACT_DIR"

# 3. Assemble and compile inside the SDK container.
docker run --rm -i -u root \
    -v "$STAGE_DIR":/builder/package/"$PACKAGE_NAME" \
    -v "$ARTIFACT_DIR":/artifacts \
    -e PACKAGE_NAME="$PACKAGE_NAME" \
    -e PACKAGE_FORMAT="$PACKAGE_FORMAT" \
    -e PACKAGE_VERSION="$PACKAGE_VERSION" \
    "openwrt/sdk:${SDK_TAG}" \
    /bin/bash -se <<'EOF'
set -euo pipefail
cd /builder

make defconfig
{
    echo "CONFIG_PACKAGE_${PACKAGE_NAME}=y"
    echo "CONFIG_PACKAGE_nodogsplash=y"
    echo "CONFIG_PACKAGE_luci=y"
    echo "CONFIG_PACKAGE_jq=y"
    [ "$PACKAGE_FORMAT" = "apk" ] && echo "CONFIG_USE_APK=y" || true
} >> .config
make defconfig

# Direct compile so the build doesn't depend on the custom tollgate-wrt
# runtime dependency being present in the SDK feeds.
env PACKAGE_VERSION="$PACKAGE_VERSION" make -j"$(nproc)" V=s "package/${PACKAGE_NAME}/compile"

PKG_PATH="$(find /builder/bin -type f -name "${PACKAGE_NAME}*.${PACKAGE_FORMAT}" | sort | head -n1)"
if [ -z "$PKG_PATH" ]; then
    echo "ERROR: no .${PACKAGE_FORMAT} produced for ${PACKAGE_NAME}" >&2
    find /builder/bin -maxdepth 6 -type f | head -50 >&2
    exit 1
fi
ls -lh "$PKG_PATH"
cp "$PKG_PATH" "/artifacts/${PACKAGE_NAME}_${PACKAGE_VERSION}_all.${PACKAGE_FORMAT}"
EOF

printf '\n=== Built: %s/%s_%s_all.%s ===\n' \
    "$ARTIFACT_DIR" "$PACKAGE_NAME" "$PACKAGE_VERSION" "$PACKAGE_FORMAT"
