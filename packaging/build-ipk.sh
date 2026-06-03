#!/bin/bash
set -euo pipefail

# The package is arch-independent (prebuilt SPA + shell rpcd + JSON), so it is
# built once as Architecture: all and installs on every target. (A leading
# arch argument is still accepted and ignored for backwards compatibility.)
case "${1:-}" in
    aarch64_*|arm_*|mips_*|mipsel_*|x86_64|all) shift ;;
esac
VERSION="${1:-$(jq -r .version package.json)}"
ARCH="all"
PACKAGE_NAME="configurationwizzard"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$REPO_ROOT/dist"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Building $PACKAGE_NAME ipk ==="
echo "  Architecture: $ARCH"
echo "  Version:      $VERSION"
echo "  Source:       $BUILD_DIR"

if [ ! -d "$BUILD_DIR/admin" ] || [ ! -d "$BUILD_DIR/portal" ]; then
    echo "ERROR: Build output not found. Run 'npm run build' first."
    exit 1
fi

CTRL_DIR="$WORK_DIR/control"
DATA_DIR="$WORK_DIR/data"

mkdir -p "$CTRL_DIR" "$DATA_DIR"

mkdir -p "$DATA_DIR/www/net4sats"
cp -r "$BUILD_DIR/admin/." "$DATA_DIR/www/net4sats/"

mkdir -p "$DATA_DIR/etc/nodogsplash/htdocs"
cp -r "$BUILD_DIR/portal/." "$DATA_DIR/etc/nodogsplash/htdocs/"

mkdir -p "$DATA_DIR/usr/libexec/rpcd"
cp "$REPO_ROOT/openwrt/rpcd/tollgate" "$DATA_DIR/usr/libexec/rpcd/tollgate"
chmod 755 "$DATA_DIR/usr/libexec/rpcd/tollgate"

mkdir -p "$DATA_DIR/usr/share/rpcd/acl.d"
cp "$REPO_ROOT/openwrt/rpcd/tollgate_acl.json" "$DATA_DIR/usr/share/rpcd/acl.d/tollgate.json"

mkdir -p "$DATA_DIR/etc/uci-defaults"
cp "$SCRIPT_DIR/files/etc/uci-defaults/91-configurationwizzard-setup" "$DATA_DIR/etc/uci-defaults/91-configurationwizzard-setup"
chmod 755 "$DATA_DIR/etc/uci-defaults/91-configurationwizzard-setup"

cat > "$CTRL_DIR/control" << EOF
Package: configurationwizzard
Version: ${VERSION}
Architecture: ${ARCH}
Maintainer: net4sats <dev@net4sats.com>
License: MIT
Depends: tollgate-wrt, nodogsplash, luci, jq
Provides: tollgate-captive-portal-site
Conflicts: tollgate-captive-portal
Replaces: nodogsplash
Description: net4sats Configuration Wizard admin SPA and captive portal theme
EOF

cp "$SCRIPT_DIR/postinst" "$CTRL_DIR/postinst"
cp "$SCRIPT_DIR/prerm" "$CTRL_DIR/prerm"
chmod 755 "$CTRL_DIR/postinst" "$CTRL_DIR/prerm"

cd "$WORK_DIR"
tar -czf control.tar.gz -C "$CTRL_DIR" .
tar -czf data.tar.gz -C "$DATA_DIR" .

echo "2.0" > debian-binary

OUTPUT="$REPO_ROOT/${PACKAGE_NAME}_${VERSION}_${ARCH}.ipk"
# OpenWrt opkg expects gzip-compressed tarball, not ar archive
tar -czf "$OUTPUT" ./debian-binary ./control.tar.gz ./data.tar.gz

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "=== Built: $OUTPUT ($SIZE) ==="
