#!/usr/bin/env bash
# verify.sh — 交付前总验证(第4层硬门禁)
#
# 用途:交付前总验证。区分 FAIL(阻塞交付)与 WARN(记录不阻塞)。
# 退出码:0 = 全过(可有 WARN);1 = 有 FAIL。
#
# 设计(平台核心):verify.sh 是【调度器】,不硬编码检查项。
#   检查项来自 checks 注册表:.harness/scripts/checks/*.sh(每文件一个检查,自注册 PASS/WARN/FAIL)。
#   - 通用最小检查(栈无关):始终加载 → checks/00-generic.sh
#   - 项目特异检查(A/C 类,如"路由进入口"/"injectEndpoints"):由 fill 阶段(AI 或人)写入 checks/
#   无 checks/ 目录时,只跑内联的通用最小检查(退化基线,Level 1 可用)。
#
# 调用:bash .harness/scripts/verify.sh
# 依赖:node / npm / rg(可选,缺失降级 grep)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"
CHECKS_DIR="$SCRIPT_DIR/checks"
cd "$ROOT_DIR"

PASS=0; WARN=0; FAIL=0
declare -a FAIL_ITEMS=()

# ---- helpers(与 kit 一致:rg 优先,降级 grep;只扫源码目录) ----
has_rg() { command -v rg >/dev/null 2>&1; }
# 探测源码目录(避免扫 node_modules/build,否则拖垮性能)
SRC_DIRS=""
for d in src backend frontend/src frontend server lib app; do [ -d "$d" ] && SRC_DIRS="$SRC_DIRS $d"; done
[ -z "$SRC_DIRS" ] && SRC_DIRS="."

src_files() {
  if has_rg; then rg --files $SRC_DIRS "$@"; \
  else find $SRC_DIRS -type f -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' "${@}"; fi
}
grep_src() {  # $1=pattern
  if has_rg; then rg -l "$1" $SRC_DIRS 2>/dev/null; \
  else grep -rl "$1" --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' --include='*.py' --include='*.go' $SRC_DIRS 2>/dev/null; fi
}

# record:供 checks/*.sh 调用。$1=PASS|WARN|FAIL  $2=id  $3=msg
record() {
  case "$1" in
    PASS) PASS=$((PASS+1)); printf '  [%s] %s %s\n' PASS "$2" "$3";;
    WARN) WARN=$((WARN+1)); printf '  [%s] %s %s\n' WARN "$2" "$3";;
    FAIL) FAIL=$((FAIL+1)); FAIL_ITEMS+=("$2: $3"); printf '  [%s] %s %s\n' FAIL "$2" "$3";;
  esac
}

# 导出给 checks 子脚本用(checks 用 grep_src/src_files 探测,echo 结论行,不调 record)
export -f grep_src src_files has_rg
export SRC_DIRS ROOT_DIR

echo "=== verify.sh 交付前总验证 ==="

# ============ 通用最小检查(栈无关,始终执行) ============
echo "[A] 通用静态规范(最小基线)"

# G1 无残留调试输出 console.log / print(只 WARN,不阻塞)
if grep_src 'console\.log\b' | grep -q . 2>/dev/null || grep_src 'print(' | grep -q . 2>/dev/null; then
  record WARN G1 "存在 console.log/print 调试输出残留(WARN,建议清理)"
else
  record PASS G1 "无 console.log/print 残留"
fi

# G2 单文件不超过阈值(默认 400 行;WARN)
MAX_LINES="${VERIFY_MAX_LINES:-400}"
oversized=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  lines=$(wc -l < "$f" 2>/dev/null || echo 0)
  if [ "$lines" -gt "$MAX_LINES" ]; then oversized=$((oversized+1)); fi
done < <(src_files 2>/dev/null | grep -E '\.(js|jsx|ts|tsx|py|go)$' || true)
if [ "$oversized" -gt 0 ]; then
  record WARN G2 "有 $oversized 个源文件超过 ${MAX_LINES} 行(WARN,建议拆分)"
else
  record PASS G2 "源文件行数均 ≤${MAX_LINES}"
fi

# ============ 项目特异检查(由 checks/*.sh 提供,可选) ============
# checks/*.sh 不调 record(避免跨 shell 变量共享问题),而是 echo 一行结论:
#   [PASS|WARN|FAIL] <id> <description>
# verify.sh 捕获后回显,并从输出行统计计数。
if [ -d "$CHECKS_DIR" ]; then
  echo "[B] 项目特异检查(来自 checks/ 注册表)"
  for chk in "$CHECKS_DIR"/*.sh; do
    [ -e "$chk" ] || continue
    # 跑 check,捕获其结论行(以 [PASS]/[WARN]/[FAIL] 开头)
    _out=$(bash "$chk" 2>/dev/null || true)
    # 回显所有输出(含诊断),并提取结论行计数
    if [ -n "$_out" ]; then printf '%s\n' "$_out"; fi
    _verdict=$(printf '%s\n' "$_out" | grep -oE '\[(PASS|WARN|FAIL)\] [^ ]+' | head -1 | grep -oE 'PASS|WARN|FAIL' || true)
    case "$_verdict" in
      PASS) PASS=$((PASS+1));;
      WARN) WARN=$((WARN+1));;
      FAIL) FAIL=$((FAIL+1)); _id=$(printf '%s\n' "$_out" | grep -oE '\[FAIL\] [^ ]+' | head -1 | awk '{print $2}'); FAIL_ITEMS+=("$_id");;
    esac
  done
else
  echo "[B] 项目特异检查: 无 checks/ 目录(仅通用基线;Level 2+ 由 fill 填充)"
fi

# ============ 交付门槛(通用) ============
echo "[C] 交付门槛"

# D1 package.json 存在且可解析(若有 node 项目)
if [ -f "$ROOT_DIR/package.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" 2>/dev/null; then
    record PASS D1 "package.json 可解析"
  else
    record FAIL D1 "package.json 解析失败(语法错)"
  fi
fi

echo ""
echo "=== 结论: verify.sh $([ $FAIL -eq 0 ] && echo PASS || echo FAIL) ==="
echo "  PASS=$PASS  WARN=$WARN  FAIL=$FAIL"
if [ ${#FAIL_ITEMS[@]} -gt 0 ]; then
  echo "  FAIL 项:"
  printf '    - %s\n' "${FAIL_ITEMS[@]}"
  echo "  (FAIL = 阻塞交付;PM 须打回 Dev)"
fi
[ $FAIL -eq 0 ] && exit 0 || exit 1
