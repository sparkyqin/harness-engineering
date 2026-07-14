#!/usr/bin/env bash
# check-harness.sh — Harness 系统完整性校验（第4层硬门禁）
#
# 用途：校验 .harness/ 目录结构与角色契约是否完整。
#   - Agent 文件齐不齐（7 个角色）
#   - 契约段落全不全（每个 agent 内嵌五要素）
#   - workflow 三件套在不在
#   - scripts 硬门禁脚本在不在
#   - deliverables/_template + _archive 在不在
#   - codebase-guide 6 个子文档在不在
#   - board.md / specs/_index.md 在不在
#
# 退出码：0 = 完整；1 = 缺失项。
# archive 终检时也调用本脚本；FAIL → PM 修，3 轮修不动则回滚升级给人。
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

echo "=== check-harness.sh 系统完整性校验 ==="

echo "[1] 顶层入口"
check "$ROOT_DIR/AGENTS.md" "AGENTS.md 项目入口"
check "$ROOT_DIR/CLAUDE.md" "CLAUDE.md 起始上下文"
check "$ROOT_DIR/GUIDE.md" "GUIDE.md 工作流总览"

echo "[2] 7 个角色定义（含 PM）"
for role in project-manager business-analyst solution-architect readiness-reviewer developer code-reviewer test-engineer; do
  f="$HARNESS_DIR/agents/$role.md"
  check "$f" "agent: $role"
done

echo "[3] 角色契约五要素（每个 agent 内嵌）"
for role in project-manager business-analyst solution-architect readiness-reviewer developer code-reviewer test-engineer; do
  f="$HARNESS_DIR/agents/$role.md"
  check_content "$f" "身份宣言" "$role: 身份宣言"
  check_content "$f" "输入" "$role: 输入(读什么)"
  check_content "$f" "输出" "$role: 输出(写什么)"
  check_content "$f" "禁止事项" "$role: 禁止事项(NEVER)"
  check_content "$f" "完成条件" "$role: 完成条件"
done

echo "[4] workflow 三件套"
check "$HARNESS_DIR/workflow/transitions.json" "workflow/transitions.json 状态机"
check "$HARNESS_DIR/workflow/flow-definition.md" "workflow/flow-definition.md 接力赛规则"
check "$HARNESS_DIR/workflow/subagent-orchestration.md" "workflow/subagent-orchestration.md 调度手册"

echo "[5] scripts 硬门禁"
for s in verify.sh baseline.sh check-harness.sh init-task.sh build-stamp.sh stage-doc.sh codebase-guide-init.sh ensure-playwright.sh check-e2e-evidence.py project-backup.sh; do
  check "$HARNESS_DIR/scripts/$s" "script: $s"
done

echo "[6] deliverables 结构"
check "$HARNESS_DIR/deliverables/_template" "deliverables/_template 模板目录"
check "$HARNESS_DIR/deliverables/_archive" "deliverables/_archive 归档目录"

echo "[7] codebase-guide 知识地图（6 子文档）"
for g in index overview backend-arch frontend-arch deps dev-recipes harness-roles; do
  check "$HARNESS_DIR/codebase-guide/$g.md" "codebase-guide: $g.md"
done

echo "[8] specs / memory / board"
check "$HARNESS_DIR/specs/_index.md" "specs/_index.md 能力索引"
check "$HARNESS_DIR/memory/index.md" "memory/index.md 记忆索引"
check "$HARNESS_DIR/memory/entries" "memory/entries 记忆条目目录"
check "$HARNESS_DIR/memory/templates" "memory/templates 记忆模板目录"

echo ""
echo "=== 汇总 ==="
echo "通过 $PASS | 失败 $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "缺失项："
  for m in "${MISSING[@]}"; do echo "  - $m"; done
  echo "结论: check-harness.sh FAIL（Harness 不完整）"
  exit 1
fi
echo "结论: check-harness.sh PASS（Harness 完整）"
exit 0
