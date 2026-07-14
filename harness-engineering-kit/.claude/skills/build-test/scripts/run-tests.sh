#!/usr/bin/env bash
# run-tests.sh — build-test Skill 的脚本：跑 npm test 并解析通过数
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

OUT=$(npm test 2>&1)
RC=$?
PASSED=$(echo "$OUT" | grep -oE '[0-9]+ passing' | grep -oE '[0-9]+' | tail -1)
FAILED=$(echo "$OUT" | grep -oE '[0-9]+ failing' | grep -oE '[0-9]+' | tail -1)
[ -z "$PASSED" ] && PASSED=0
[ -z "$FAILED" ] && FAILED=0

echo "npm test exit=$RC | passed=$PASSED | failed=$FAILED"
if [ "$RC" -ne 0 ] || [ "$FAILED" -gt 0 ]; then
  echo "RESULT: FAIL"
  exit 1
fi
echo "RESULT: PASS"
exit 0
