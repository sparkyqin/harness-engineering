#!/usr/bin/env bash
# check-build.sh — build-test Skill 的脚本：调用 build-stamp.sh 做前端构建戳记
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$ROOT"

if bash ".harness/scripts/build-stamp.sh"; then
  echo "RESULT: PASS"
  exit 0
else
  echo "RESULT: FAIL"
  exit 1
fi
