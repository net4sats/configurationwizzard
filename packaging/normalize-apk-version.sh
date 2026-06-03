#!/bin/sh
#
# Produce an apk-tools-compatible version string from our internal
# PACKAGE_VERSION. apk versions must match:
#   <digit>[.<digit>]*[_<suffix><digit>*]*[-r<digit>+]
# i.e. the version body is digit.digit.digit (or similar), with '_'
# used for pre-release tags, and '-r<N>' reserved for the package
# release revision.
#
# Inputs we see (set by .github/workflows/build-package.yml):
#   - Release tags:   v1.2.3, v1.2.3-alpha1, v1.2.3-beta2, v1.2.3-rc1
#   - Channel builds: <channel>.<base>.<run>.<shorthash>
#                     e.g. stable.1.0.0.42.abc1234 or dev.1.0.0.7.def5678
#
# Tag inputs pass through (with -alpha/-beta/-rc → _alpha/_beta/_rc so apk
# sees them as pre-release markers). Channel builds carry a CI run number and
# a short hash that apk's grammar can't represent, so we collapse them to
# 0.0.0_git<RUN>-r0 — a valid apk pre-release version. The full human-readable
# PACKAGE_VERSION is still embedded in the package filename and the NIP-94
# metadata; this script only produces the apk control-file value.
set -eu

version="${1#v}"

if [ -z "$version" ]; then
    printf '0.0.0-r0\n'
    exit 0
fi

# Release-tag format: N.N.N optionally followed by -alpha/beta/rc/preN.
if printf '%s' "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc|pre)[0-9]*)?$'; then
    normalized=$(printf '%s' "$version" \
        | sed -e 's/-alpha/_alpha/g' \
              -e 's/-beta/_beta/g'   \
              -e 's/-pre/_pre/g'     \
              -e 's/-rc/_rc/g')
    printf '%s-r0\n' "$normalized"
    exit 0
fi

# Channel build: <channel>.<x>.<y>.<z>.<run>.<sha> — pull out the CI run
# number (the second-to-last dot segment) for an apk-safe stub.
build_nr=$(printf '%s' "$version" | sed -n 's/.*\.\([0-9][0-9]*\)\.[^.]*$/\1/p')
if [ -n "$build_nr" ]; then
    printf '0.0.0_git%s-r0\n' "$build_nr"
else
    printf '0.0.0-r0\n'
fi
