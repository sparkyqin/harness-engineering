#!/usr/bin/env bash
# build-stamp.sh — 前端构建戳记检查
#
# 用途：避免重复构建。检查 BUILD_STAMP 是否命中当前代码状态：
#   - 命中 → 跳过重建（输出"build-stamp 命中，跳过重建"）
#   - 未命中 → 跑 npm run build，成功后写入新 BUILD_STAMP
#
# 戳记基于关键源文件的 mtime/hash 摘要，存于 .harness/.build-stamp。
# verify.sh B1 与 build-test Skill 调用本脚本。
#
# 用法: bash .harness/scripts/build-stamp.sh
# 退出码：0 = 构建就绪（命中或重建成功）；1 = 构建失败。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
STAMP_FILE="$ROOT_DIR/.harness/.build-stamp"
cd "$ROOT_DIR"

compute_fingerprint() {  # 关键源文件指纹（src/ + 配置）
  find src package.json vite.config.* webpack.config.* 2>/dev/null -type f \
    -not -path '*/node_modules/*' \
    -exec shasum {} + 2>/dev/null | shasum | cut -d' ' -f1
}

if [ ! -f package.json ]; then
  echo "[build-stamp] 无 package.json，跳过"
  exit 0
fi

# 没有 build 脚本则跳过
if ! node -e "require('./package.json').scripts.build" 2>/dev/null; then
  echo "[build-stamp] 无 build 脚本，跳过"
  exit 0
fi

CURRENT=$(compute_fingerprint)
[ -z "$CURRENT" ] && { echo "[build-stamp] 无法计算指纹，强制构建"; CURRENT="none"; }

if [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$CURRENT" ]; then
  echo "[build-stamp] 命中，跳过重建"
  exit 0
fi

echo "[build-stamp] 未命中，执行 npm run build..."
if npm run build >/dev/null 2>&1; then
  echo "$CURRENT" > "$STAMP_FILE"
  echo "[build-stamp] 构建成功，戳记已更新"
  exit 0
else
  echo "[build-stamp] 构建失败"
  exit 1
fi
