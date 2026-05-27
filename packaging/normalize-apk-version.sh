#!/bin/bash
set -euo pipefail

INPUT_VERSION="${1:-$(jq -r .version package.json)}"
MAJOR="${INPUT_VERSION%%.*}"
REST="${INPUT_VERSION#*.}"
MINOR="${REST%%.*}"
PATCH="${REST#*.}"
echo "${MAJOR}.${MINOR}.${PATCH}"
