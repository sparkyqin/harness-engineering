#!/usr/bin/env bash
# stage-doc.sh — 文档暂存与就位校验
#
# 用途:在每棒产出文档后,校验文档是否"就位"(写入 deliverables/<task>/ 对应路径),
#   并校验:① 含 `## 结论 PASS`(或 BLOCK/FAIL/REJECT);② 非模板残留(不含未替换占位符)。
#   PM 抛"文档就位"心跳前调用。
#   例外:proposal / tasks / dev-log 不强制结论段(dev-log 的结论由 developer hook verdict 体现),
#         但三者仍须过模板残留检查(不能是空模板)。
#
# 用法: bash .harness/scripts/stage-doc.sh <task> <artifact>
#   artifact: proposal | requirements | impact-analysis | design | readiness-review | dev-log | code-review | test-report | tasks
# 退出码:0 = 文档就位(且结论段存在或属无需结论段的例外)且无模板残留;1 = 缺失/无结论段/模板残留。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TASK="${1:-}"; ART="${2:-}"
if [ -z "$TASK" ] || [ -z "$ART" ]; then
  echo "用法: stage-doc.sh <task> <artifact>"
  exit 1
fi

case "$ART" in
  proposal|requirements|design|readiness-review|dev-log|code-review|test-report|tasks) FILE="$ART.md";;
  impact-analysis) FILE="impact-analysis.md";;
  *) echo "[stage-doc] 未知 artifact: $ART"; exit 1;;
esac

DOC="$HARNESS_DIR/deliverables/$TASK/$FILE"
if [ ! -f "$DOC" ]; then
  echo "[stage-doc] FAIL:文档未就位: $DOC"
  exit 1
fi

# ---- 模板残留检查(所有 artifact 都查;防止 Worker 声称完成但留空模板)----
# 占位符模式:模板里 <!-- ... --> 指引后的尖括号占位 / {{...}} / 典型未填标记
RESIDUE=$(grep -nE '<(做法|文件级改动|可检查的成果|标题|task|一句|...|待填)>|\{\{[A-Z_]+\}\}|<!-- (由|填充|本段)' "$DOC" 2>/dev/null | head -3)
if [ -n "$RESIDUE" ]; then
  echo "[stage-doc] FAIL:文档含未替换的模板占位符(Worker 未真正填写): $DOC"
  echo "$RESIDUE" | sed 's/^/    /'
  exit 1
fi

# 校验结论段(proposal/tasks/dev-log 不强制——dev-log 结论由 hook verdict 体现)
case "$ART" in
  proposal|tasks|dev-log)
    echo "[stage-doc] PASS(就位 + 无模板残留,无需结论段): $DOC"
    exit 0
    ;;
esac

if grep -qE '^## 结论 (PASS|BLOCK|FAIL|REJECT)' "$DOC"; then
  echo "[stage-doc] PASS(就位 + 无模板残留 + 结论段存在): $DOC"
  exit 0
else
  echo "[stage-doc] FAIL:文档就位但缺 \`## 结论 PASS|BLOCK|FAIL|REJECT\` 段: $DOC"
  exit 1
fi
