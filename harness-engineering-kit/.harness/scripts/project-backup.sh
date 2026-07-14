#!/usr/bin/env bash
# project-backup.sh — 归档前项目备份
#
# 用途：/harness-archive 第3步"证据预检 + mv 归档"前，对 deliverables + specs + board
#   打一个时间戳备份，便于 check-harness 终检 FAIL 时回滚。
#
# 用法: bash .harness/scripts/project-backup.sh [task]
#   不传 task 则备份全量 deliverables；传 task 则仅备份该任务目录。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"
BACKUP_ROOT="$HARNESS_DIR/.backups"
mkdir -p "$BACKUP_ROOT"

# 时间戳（不用 Date.now，用文件序号兜底 + git 可用时用 git describe）
if command -v git >/dev/null 2>&1 && [ -d "$ROOT_DIR/.git" ]; then
  STAMP=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "nogit")
else
  STAMP="bak$(ls -1 "$BACKUP_ROOT" 2>/dev/null | wc -l)"
fi
STAMP="${STAMP}-$(date +%Y%m%d-%H%M%S 2>/dev/null || echo 'notime')"

DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"

TASK="${1:-}"
if [ -n "$TASK" ]; then
  SRC="$HARNESS_DIR/deliverables/$TASK"
  [ -d "$SRC" ] && cp -r "$SRC" "$DEST/deliverables-$TASK" 2>/dev/null
  echo "[backup] 已备份任务 '$TASK' → $DEST"
else
  cp -r "$HARNESS_DIR/deliverables" "$DEST/" 2>/dev/null
  cp -r "$HARNESS_DIR/specs" "$DEST/" 2>/dev/null
  cp "$HARNESS_DIR/board.md" "$DEST/" 2>/dev/null
  echo "[backup] 已备份 deliverables + specs + board → $DEST"
fi

echo "[backup] 完成。check-harness 终检 FAIL 时可从此处回滚。"
exit 0
