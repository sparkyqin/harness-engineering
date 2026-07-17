#!/usr/bin/env bash
# init-task.sh — 新任务脚手架(第4层硬门禁)
#
# 用途:/harness-propose 第0步一键初始化:
#   1. 创建 deliverables/<任务名>/ 目录
#   2. 从 _template/ 复制文档模板
#   3. 登记到 board.md(追加一行,状态 PENDING)
#   4. refactor 档提示跑 baseline.sh snapshot
#
# 用法: bash .harness/scripts/init-task.sh <任务名> [profile]
#   profile: quick | standard | refactor(默认 standard)
# 退出码:0 = 成功;1 = 任务已存在或参数缺失。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

TASK="${1:-}"
PROFILE="${2:-standard}"

if [ -z "$TASK" ]; then
  echo "用法: init-task.sh <任务名> [quick|standard|refactor]"
  echo "  创建 deliverables/<任务名>/ + 复制模板 + 登记 board.md"
  exit 1
fi

# 校验任务名(kebab-case)
case "$TASK" in
  *[^a-z0-9-]*|[A-Z]*) echo "[init-task] 错误:任务名须为 kebab-case(小写字母/数字/连字符): $TASK"; exit 1;;
esac

DELIV="$HARNESS_DIR/deliverables/$TASK"
if [ -d "$DELIV" ]; then
  echo "[init-task] 错误:任务已存在: $DELIV"
  echo "  若要继续,直接 /harness-propose $TASK;若要重建,先 mv 到 _archive。"
  exit 1
fi

TEMPLATE="$HARNESS_DIR/deliverables/_template"
if [ ! -d "$TEMPLATE" ]; then
  echo "[init-task] 错误:模板目录缺失: $TEMPLATE"
  exit 1
fi

# 1+2. 创建目录 + 复制模板
mkdir -p "$DELIV"
cp -r "$TEMPLATE/." "$DELIV/"
echo "[init-task] 已创建: $DELIV"
echo "[init-task] 已复制模板文档(proposal/requirements/design/.../tasks.md)"

# 3. 登记到 board.md
BOARD="$HARNESS_DIR/board.md"
if [ ! -f "$BOARD" ]; then
  cat > "$BOARD" <<'EOF'
# board.md — Harness 任务看板(状态机真实来源)

> 列:ID | 任务名 | 阶段 | 状态码 | profile | 结论/备注
> 状态码:PENDING / IN_PROGRESS / AWAITING_ARCHIVE / DONE

| ID | 任务名 | 阶段 | 状态码 | profile | 结论/备注 |
|---|---|---|---|---|---|
EOF
  NEXT_ID=1
else
  LAST_ID=$(grep -oE '^\| [0-9]+' "$BOARD" | grep -oE '[0-9]+' | sort -n | tail -1)
  NEXT_ID=$(( ${LAST_ID:-0} + 1 ))
fi
ID_FMT=$(printf "%03d" "$NEXT_ID")
printf '| %s | %s | 提案 | PENDING | %s | 初始化 |\n' "$ID_FMT" "$TASK" "$PROFILE" >> "$BOARD"
echo "[init-task] 已登记 board.md: ID=$ID_FMT, profile=$PROFILE, 状态=PENDING"

# 4. refactor 档提示建基线
if [ "$PROFILE" = "refactor" ]; then
  echo "[init-task] profile=refactor → 建议立即跑: bash .harness/scripts/baseline.sh snapshot $TASK"
fi

echo "[init-task] 完成。下一步:人 + AI 反复打磨 proposal.md,确认定稿后进入 propose 链路。"
exit 0
