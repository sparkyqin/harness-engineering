#!/usr/bin/env bash
# stage-doc.sh — 文档暂存与就位校验
#
# 用途：在每棒产出文档后，校验文档是否"就位"（写入 deliverables/<task>/ 对应路径），
#   并校验是否含 `## 结论 PASS`（或 BLOCK/FAIL/REJECT）。PM 抛"文档就位"心跳前调用。
#   例外：proposal / tasks / dev-log 不强制结论段（dev-log 的结论由 developer hook verdict 体现）。
#
# 用法: bash .harness/scripts/stage-doc.sh <task> <artifact>
#   artifact: proposal | requirements | impact-analysis | design | readiness-review | dev-log | code-review | test-report | tasks
# 退出码：0 = 文档就位（且结论段存在或属无需结论段的例外）；1 = 缺失或无结论段。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TASK="${1:-}"; ART="${2:-}"
if [ -z "$TASK" ] || [ -z "$ART" ]; then
  echo "用法: stage-doc.sh <task> <artifact>"
  exit 1
fi

# artifact → 文件名映射
case "$ART" in
  proposal|requirements|design|readiness-review|dev-log|code-review|test-report|tasks) FILE="$ART.md";;
  impact-analysis) FILE="impact-analysis.md";;
  *) echo "[stage-doc] 未知 artifact: $ART"; exit 1;;
esac

DOC="$HARNESS_DIR/deliverables/$TASK/$FILE"
if [ ! -f "$DOC" ]; then
  echo "[stage-doc] FAIL：文档未就位: $DOC"
  exit 1
fi

# 校验结论段（proposal/tasks/dev-log 不强制结论段）
# - proposal/tasks：本就是过程性文档，无 PASS/FAIL 结论。
# - dev-log：developer.md 契约规定其格式为「一句话总结 + 测试执行摘要 + 改动清单 + 遗留风险」，
#   不含 ## 结论 段——Dev 棒的"结论"由 developer hook 的 verdict（npm test + verify.sh 退出码）
#   体现，不由文档段体现。若强制结论段，会逼 Dev 伪造一个 hook 之外的结论，反而削弱硬门禁。
case "$ART" in
  proposal|tasks|dev-log)
    echo "[stage-doc] PASS：$FILE 已就位（无需结论段）"
    exit 0
    ;;
  *)
    if grep -qE '^## 结论 (PASS|BLOCK|FAIL|REJECT)' "$DOC"; then
      CONC=$(grep -oE '^## 结论 (PASS|BLOCK|FAIL|REJECT)' "$DOC")
      echo "[stage-doc] PASS：$FILE 已就位，$CONC"
      exit 0
    else
      echo "[stage-doc] FAIL：$FILE 已就位但缺少 '## 结论 PASS/BLOCK/FAIL/REJECT' 段"
      exit 1
    fi
    ;;
esac
