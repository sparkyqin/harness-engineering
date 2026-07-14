#!/usr/bin/env bash
# verify.sh — 交付前总验证（第4层硬门禁）
#
# 用途：交付前总验证。区分 FAIL（阻塞交付）与 WARN（记录不阻塞）。
# 退出码：0 = 全过（可有 WARN）；1 = 有 FAIL。
#
# 检查类别：
#   A 静态规范   A1-A3,A6,A8 FAIL | A4,A5,A7 WARN
#   B 交付门槛   B1-B2            FAIL
#   C 工程一致性 C1-C5 FAIL | C6 WARN
#
# 调用：bash .harness/scripts/verify.sh
# 依赖：node / npm / rg(可选，缺失则降级 grep)
set -uo pipefail

# 解析仓库根（脚本位于 .harness/scripts/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

PASS=0; WARN=0; FAIL=0
declare -a FAIL_ITEMS=()

# ---- helpers ----
has_rg() { command -v rg >/dev/null 2>&1; }
# 在 src 范围搜文件名/内容（排除 node_modules/dist/build）
src_files() {
  if has_rg; then rg --files -g '!node_modules' -g '!dist' -g '!build' "$@"; \
  else find . -type f -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' "${@}"; fi
}
grep_src() {  # $1=pattern
  if has_rg; then rg -l "$1" -g '!node_modules' -g '!dist' -g '!build' 2>/dev/null; \
  else grep -rl "$1" --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v node_modules; fi
}
record() { # $1=PASS|WARN|FAIL  $2=id  $3=msg
  case "$1" in
    PASS) PASS=$((PASS+1)); printf '  [%s] %s %s\n' PASS "$2" "$3";;
    WARN) WARN=$((WARN+1)); printf '  [%s] %s %s\n' WARN "$2" "$3";;
    FAIL) FAIL=$((FAIL+1)); FAIL_ITEMS+=("$2: $3"); printf '  [%s] %s %s\n' FAIL "$2" "$3";;
  esac
}

echo "=== verify.sh 交付前总验证 ==="

# ============ A 静态规范 ============
echo "[A] 静态规范"
# A1 使用 ES Module（package.json type=module 或 .mjs）
if node -e "require('./package.json').type==='module'" 2>/dev/null; then
  record PASS A1 "package.json type=module (ES Module)"
else
  record FAIL A1 "未声明 ES Module（package.json 缺 type:module）"
fi

# A2 后端路由使用 asyncHandler（存在则检查）
if grep_src 'Router\|router\.' | head -1 | grep -q .; then
  if grep_src 'asyncHandler' | grep -q .; then
    record PASS A2 "路由使用 asyncHandler"
  else
    record WARN A2 "未检测到 asyncHandler（异步错误可能未捕获）"
  fi
else
  record PASS A2 "无后端路由（跳过）"
fi

# A3 Model 包含 timestamps（Mongoose）
if grep_src 'mongoose\.Schema\|new Schema' | grep -q .; then
  if grep_src 'timestamps' | grep -q .; then
    record PASS A3 "Model 包含 timestamps"
  else
    record FAIL A3 "存在 Schema 但未配置 timestamps"
  fi
else
  record PASS A3 "无 Mongoose Schema（跳过）"
fi

# A4 无残留 console.log（WARN）
if grep_src 'console\.log' | grep -v 'node_modules' | grep -q .; then
  record WARN A4 "检测到残留 console.log"
else
  record PASS A4 "无残留 console.log"
fi

# A5 单文件不超过 300 行（WARN，仅 src/）
BIG=$(find src -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' 2>/dev/null | while read -r f; do
  lines=$(wc -l < "$f" 2>/dev/null || echo 0); [ "$lines" -gt 300 ] && echo "$f($lines)";
done)
if [ -n "$BIG" ]; then record WARN A5 "单文件 >300 行: $BIG"; else record PASS A5 "单文件均 ≤300 行"; fi

# A6 路由有对应 Controller
ROUTES=$(grep_src 'router\.\(get\|post\|put\|delete\|patch\)' 2>/dev/null | head -1)
if [ -n "$ROUTES" ]; then
  if grep_src 'controllers/' | grep -q . || grep_src 'Controller' | grep -q .; then
    record PASS A6 "路由有对应 Controller"
  else
    record FAIL A6 "存在路由但未检测到 Controller 层"
  fi
else
  record PASS A6 "无路由（跳过）"
fi

# A7 认证路由引入 protect 中间件（WARN）
if grep_src 'auth\|login\|protect' | grep -q .; then
  if grep_src 'protect' | grep -q .; then
    record PASS A7 "认证路由引入 protect"
  else
    record WARN A7 "存在认证相关代码但未引入 protect 中间件"
  fi
else
  record PASS A7 "无认证路由（跳过）"
fi

# A8 后端无硬编码端口（FAIL）
if grep_src 'app\.listen(3000\|listen(8080\|listen(5000' | grep -q .; then
  record FAIL A8 "后端硬编码端口（应使用 process.env.PORT）"
else
  record PASS A8 "后端无硬编码端口"
fi

# ============ B 交付门槛 ============
echo "[B] 交付门槛"
# B1 前端 build 成功
if [ -f package.json ] && node -e "require('./package.json').scripts.build" 2>/dev/null; then
  if npm run build >/dev/null 2>&1; then
    record PASS B1 "前端 build 成功"
  else
    record FAIL B1 "前端 build 失败"
  fi
else
  record PASS B1 "无 build 脚本（跳过）"
fi

# B2 seeder 语法正确（Schema 与种子数据一致）
if grep_src 'seeder\|seed\|data:import' | grep -q .; then
  if node -c "$(grep_src 'seeder\|seed' | head -1)" 2>/dev/null || npm run data:import >/dev/null 2>&1; then
    record PASS B2 "seeder 语法/导入正确"
  else
    record FAIL B2 "seeder 语法错误或种子与 Schema 不一致"
  fi
else
  record PASS B2 "无 seeder（跳过）"
fi

# ============ C 工程一致性 ============
echo "[C] 工程一致性"
# C1 路由进 app.js / server.js
if grep_src 'app\.use(' app.js server.js index.js 2>/dev/null | grep -q . || grep -l 'app.use(' app.js server.js index.js 2>/dev/null | grep -q .; then
  record PASS C1 "路由注册进 app/server 入口"
else
  record FAIL C1 "路由未注册进应用入口"
fi

# C2 Screen 进 index.js（前端入口）
if find src -name 'index.js' -o -name 'index.jsx' 2>/dev/null | head -1 | grep -q .; then
  if grep_src 'Screen\|createStackNavigator\|<Route' | grep -q .; then
    record PASS C2 "Screen/Route 注册进前端入口"
  else
    record FAIL C2 "存在 Screen 但未注册进前端入口"
  fi
else
  record PASS C2 "无前端入口（跳过）"
fi

# C3 Model 文件 export default
if grep_src 'mongoose\.Schema\|new Schema' | grep -q .; then
  if grep_src 'export default' | grep -q model; then
    record PASS C3 "Model 文件 export default"
  else
    record FAIL C3 "Model 文件未 export default"
  fi
else
  record PASS C3 "无 Model（跳过）"
fi

# C4 API Slice 使用 injectEndpoints
if grep_src 'createApi\|apiSlice' | grep -q .; then
  if grep_src 'injectEndpoints' | grep -q .; then
    record PASS C4 "API Slice 使用 injectEndpoints"
  else
    record FAIL C4 "存在 createApi 但未用 injectEndpoints"
  fi
else
  record PASS C4 "无 API Slice（跳过）"
fi

# C5 应用入口注册 errorMiddleware
if grep_src 'errorMiddleware\|errorHandler' | grep -q .; then
  if grep -l 'errorMiddleware\|errorHandler' app.js server.js index.js 2>/dev/null | grep -q .; then
    record PASS C5 "应用入口注册 errorMiddleware"
  else
    record FAIL C5 "errorMiddleware 未注册进入口"
  fi
else
  record WARN C5 "未检测到 errorMiddleware"
fi

# C6 前端无直接 fetch/axios 调用（应通过 RTK Query）（WARN）
if grep_src 'createApi\|apiSlice' | grep -q .; then
  if grep_src 'axios\.|fetch(' | grep -v node_modules | grep -q .; then
    record WARN C6 "前端存在直接 fetch/axios（应通过 RTK Query）"
  else
    record PASS C6 "前端无直接 fetch/axios"
  fi
else
  record PASS C6 "无 RTK Query（跳过）"
fi

# ============ 汇总 ============
echo ""
echo "=== 汇总 ==="
echo "通过 $PASS | 警告 $WARN | 失败 $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "FAIL 项（阻塞交付）："
  for i in "${FAIL_ITEMS[@]}"; do echo "  - $i"; done
  echo "结论: verify.sh FAIL（阻塞交付）"
  exit 1
fi
echo "结论: verify.sh PASS（通过 $PASS，警告 $WARN，失败 0）"
exit 0
