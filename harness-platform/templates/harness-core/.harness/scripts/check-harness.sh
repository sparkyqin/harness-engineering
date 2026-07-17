#!/usr/bin/env bash
# check-harness.sh — Harness 系统完整性校验(第4层硬门禁)
#
# 用途:校验 .harness/ 目录结构与角色契约是否完整(不校验业务代码,只校验 harness 自身)。
#   按 Level 分级检查(向后兼容:Level 逐级累积,高 Level 含低 Level 全部检查):
#     L1  static-infra  : 顶层入口 + scripts + codebase-guide + templates + board + specs + memory
#     L2  +static-infra : (同 L1,不新增项;Skills/载体由 carriers 阶段生成,此处不强检)
#     L3  +orchestration: 七角色契约 + workflow 三件套 + 载体(.claude 或 .opencode)
#     L4  +hooks        : hooks 实现(Claude .cjs 或 OpenCode plugin)+ baseline
#
# Level 来源:.harness/level 文件(由 scaffold 写入)。无此文件默认 L1。
#
# 退出码:0 = 完整;1 = 缺失项。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

PASS=0; FAIL=0
declare -a MISSING=()

check() { # $1=path  $2=label
  if [ -e "$1" ]; then
    PASS=$((PASS+1)); printf '  [PASS] %s\n' "$2"
  else
    FAIL=$((FAIL+1)); MISSING+=("$2 ($1)"); printf '  [FAIL] %s\n' "$2"
  fi
}
check_content() { # $1=file  $2=pattern  $3=label
  if [ -f "$1" ] && grep -q "$2" "$1"; then
    PASS=$((PASS+1)); printf '  [PASS] %s\n' "$3"
  else
    FAIL=$((FAIL+1)); MISSING+=("$3"); printf '  [FAIL] %s\n' "$3"
  fi
}

# 读 Level
LEVEL="L1"
if [ -f "$HARNESS_DIR/level" ]; then LEVEL="$(cat "$HARNESS_DIR/level" | tr -d '[:space:]')"; fi
case "$LEVEL" in
  L1|L2|L3|L4) ;;
  *) LEVEL="L1";;
esac

echo "=== check-harness.sh 系统完整性校验 (Level=$LEVEL) ==="

echo "[1] 顶层入口(static-infra)"
check "$ROOT_DIR/AGENTS.md" "AGENTS.md 入口"
check "$ROOT_DIR/GUIDE.md" "GUIDE.md 工作流总览"

echo "[2] scripts 硬门禁(static-infra)"
check "$HARNESS_DIR/scripts/verify.sh" "verify.sh"
check "$HARNESS_DIR/scripts/check-harness.sh" "check-harness.sh"
check "$HARNESS_DIR/scripts/init-task.sh" "init-task.sh"
check "$HARNESS_DIR/scripts/stage-doc.sh" "stage-doc.sh"
if [ "$LEVEL" = "L4" ]; then
  check "$HARNESS_DIR/scripts/baseline.sh" "baseline.sh"
fi

echo "[3] codebase-guide 子文档(static-infra)"
for doc in index overview backend-arch frontend-arch deps dev-recipes harness-roles; do
  check "$HARNESS_DIR/codebase-guide/$doc.md" "codebase-guide/$doc.md"
done

echo "[4] deliverables 模板与归档(static-infra)"
check "$HARNESS_DIR/deliverables/_template" "deliverables/_template/"
check "$HARNESS_DIR/deliverables/_archive" "deliverables/_archive/"

echo "[5] 看板与 specs 索引(static-infra)"
check "$HARNESS_DIR/board.md" "board.md"
check "$HARNESS_DIR/specs/_index.md" "specs/_index.md"

echo "[6] memory 库(static-infra)"
check "$HARNESS_DIR/memory/index.md" "memory/index.md"
check "$HARNESS_DIR/memory/entries" "memory/entries/"

# ---- Level >= L3: orchestration + carriers ----
if [ "$LEVEL" = "L3" ] || [ "$LEVEL" = "L4" ]; then
  echo "[7] 七角色契约(orchestration)"
  for role in project-manager business-analyst solution-architect readiness-reviewer developer code-reviewer test-engineer; do
    check "$HARNESS_DIR/agents/$role.md" "agent: $role"
  done

  echo "[8] 角色五要素段落(每个 worker agent 必含)"
  for role in business-analyst solution-architect readiness-reviewer developer code-reviewer test-engineer; do
    f="$HARNESS_DIR/agents/$role.md"
    check_content "$f" "身份宣言" "$role: 身份宣言段"
    check_content "$f" "禁止事项" "$role: 禁止事项段"
    check_content "$f" "完成条件" "$role: 完成条件段"
  done

  echo "[9] workflow 三件套(orchestration)"
  check "$HARNESS_DIR/workflow/flow-definition.md" "flow-definition.md"
  check "$HARNESS_DIR/workflow/transitions.json" "transitions.json"
  check "$HARNESS_DIR/workflow/subagent-orchestration.md" "subagent-orchestration.md"

  echo "[10] 载体(orchestration)"
  # 至少有一套载体存在
  if [ -d "$ROOT_DIR/.claude" ] || [ -d "$ROOT_DIR/.opencode" ]; then
    PASS=$((PASS+1)); printf '  [PASS] 载体存在(.claude 或 .opencode)\n'
  else
    FAIL=$((FAIL+1)); MISSING+=("载体缺失(.claude 和 .opencode 都不存在)"); printf '  [FAIL] 载体缺失\n'
  fi
fi

# ---- Level = L4: hooks ----
if [ "$LEVEL" = "L4" ]; then
  echo "[11] hooks 实现(L4)"
  # Claude: .claude/settings.json 注册了 hooks + .harness/hooks/*.cjs 至少有 verify-after-developer
  if [ -f "$ROOT_DIR/.claude/settings.json" ]; then
    check_content "$ROOT_DIR/.claude/settings.json" "SubagentStop" "Claude settings.json: SubagentStop hook"
    check "$HARNESS_DIR/hooks/verify-after-developer.cjs" "hooks/verify-after-developer.cjs"
  fi
  # OpenCode: .opencode/plugins/harness-hooks.ts
  check "$ROOT_DIR/.opencode/plugins/harness-hooks.ts" "OpenCode plugin: harness-hooks.ts"
fi

echo ""
echo "=== 结论: check-harness $([ $FAIL -eq 0 ] && echo PASS || echo FAIL) (Level=$LEVEL) ==="
echo "  PASS=$PASS  FAIL=$FAIL"
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "  缺失项:"
  printf '    - %s\n' "${MISSING[@]}"
fi
[ $FAIL -eq 0 ] && exit 0 || exit 1
