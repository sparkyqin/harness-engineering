#!/usr/bin/env bash
# ensure-playwright.sh — 确认 Playwright 可用（TE B 类 E2E 前置）
#
# 用途：test-e2e Skill / TE 跑 B 类真实浏览器验收前调用。
#   检查 @playwright/test 是否安装、浏览器是否就位；缺失则尝试安装。
#
# 用法: bash .harness/scripts/ensure-playwright.sh
# 退出码：0 = 可用；1 = 安装失败。
set -uo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[ensure-playwright] 检查 Playwright..."

if ! node -e "require('@playwright/test')" 2>/dev/null; then
  echo "[ensure-playwright] @playwright/test 未安装，尝试安装..."
  if ! npm install -D @playwright/test >/dev/null 2>&1; then
    echo "[ensure-playwright] 安装 @playwright/test 失败"
    exit 1
  fi
fi

# 检查浏览器是否就位（chromium 足矣）
if ! npx playwright install --dry-run chromium >/dev/null 2>&1; then
  echo "[ensure-playwright] 安装 chromium 浏览器..."
  if ! npx playwright install chromium >/dev/null 2>&1; then
    echo "[ensure-playwright] chromium 安装失败"
    exit 1
  fi
fi

echo "[ensure-playwright] PASS：Playwright + chromium 就绪"
exit 0
