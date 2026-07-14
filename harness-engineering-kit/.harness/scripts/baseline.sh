#!/usr/bin/env bash
# baseline.sh — 开发前后基线对比（第4层硬门禁）
#
# 用途：堵住"不是我引入的"借口。
#   refactor 档 propose 前：baseline.sh snapshot   → 建立基线快照
#   apply 后 / TE 后：       baseline.sh compare   → 与基线对比，只关注"新增 FAIL"
#
# 子命令：
#   snapshot [task]  — 为任务建基线（跑一次 verify + npm test，结果存 .harness/baseline/<task>.json）
#   compare  [task]  — 与基线对比（跑 verify + npm test，列出新增 FAIL）
#   list             — 列出已有基线
#
# 退出码：0 = 未新增 FAIL；1 = 新增 FAIL 或基线缺失。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BL_DIR="$ROOT_DIR/.harness/baseline"
mkdir -p "$BL_DIR"
cd "$ROOT_DIR"

ACTION="${1:-}"; TASK="${2:-default}"

run_checks() {  # 输出 "verify=<pass|fail> tests=<n>" 到 stdout
  local v_pass=fail t_pass=0
  if bash "$SCRIPT_DIR/verify.sh" >/dev/null 2>&1; then v_pass=pass; fi
  t_pass=$(npm test 2>/dev/null | grep -oE '[0-9]+ passing' | grep -oE '[0-9]+' | tail -1)
  [ -z "$t_pass" ] && t_pass=0
  echo "{\"verify\":\"$v_pass\",\"tests\":$t_pass}"
}

case "$ACTION" in
  snapshot)
    echo "[baseline] 为任务 '$TASK' 建立基线快照..."
    RESULT=$(run_checks)
    echo "$RESULT" > "$BL_DIR/$TASK.json"
    echo "[baseline] 快照已存: .harness/baseline/$TASK.json"
    echo "[baseline] $RESULT"
    echo "[baseline] 注意：基线记录的是'开发前'状态。后续 compare 只关心新增 FAIL。"
    exit 0
    ;;
  compare)
    BASE="$BL_DIR/$TASK.json"
    if [ ! -f "$BASE" ]; then
      echo "[baseline] 错误：任务 '$TASK' 无基线快照。先跑 baseline.sh snapshot $TASK"
      exit 1
    fi
    echo "[baseline] 与基线 '$TASK' 对比..."
    NOW=$(run_checks)
    B_VERIFY=$(grep -oE '"verify":"[a-z]+"' "$BASE" | cut -d'"' -f4)
    B_TESTS=$(grep -oE '"tests":[0-9]+' "$BASE" | cut -d':' -f2)
    N_VERIFY=$(echo "$NOW" | grep -oE '"verify":"[a-z]+"' | cut -d'"' -f4)
    N_TESTS=$(echo "$NOW" | grep -oE '"tests":[0-9]+' | cut -d':' -f2)

    echo "[baseline] 基线: verify=$B_VERIFY tests=$B_TESTS"
    echo "[baseline] 当前: verify=$N_VERIFY tests=$N_TESTS"

    new_fail=0
    # verify 基线 pass → 当前 fail = 新增 FAIL
    if [ "$B_VERIFY" = "pass" ] && [ "$N_VERIFY" = "fail" ]; then
      echo "[baseline] 新增 FAIL: verify.sh 由 PASS 退化为 FAIL"
      new_fail=1
    fi
    # 测试数下降 = 新增 FAIL（测试不应减少）
    if [ "$N_TESTS" -lt "$B_TESTS" ]; then
      echo "[baseline] 新增 FAIL: 测试用例数 $B_TESTS → $N_TESTS（减少）"
      new_fail=1
    fi

    if [ "$new_fail" -gt 0 ]; then
      echo "[baseline] 结论: compare FAIL（存在新增 FAIL，不可甩锅给历史）"
      exit 1
    fi
    echo "[baseline] 结论: compare PASS（未新增 FAIL）"
    exit 0
    ;;
  list)
    echo "[baseline] 已有基线："
    ls -1 "$BL_DIR"/*.json 2>/dev/null | while read -r f; do
      echo "  - $(basename "$f" .json): $(cat "$f")"
    done || echo "  （无）"
    exit 0
    ;;
  *)
    echo "用法: baseline.sh <snapshot|compare|list> [task]"
    echo "  snapshot [task]  建立开发前基线（refactor 档 propose 前必跑）"
    echo "  compare  [task]  开发后与基线对比（只关心新增 FAIL）"
    echo "  list            列出已有基线"
    exit 1
    ;;
esac
