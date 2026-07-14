#!/usr/bin/env bash
# codebase-guide-init.sh — 模块化知识地图初始化/刷新
#
# 用途：扫描代码库，生成/刷新 .harness/codebase-guide/ 的 6 个子文档骨架。
#   这是"渐进式披露"的入口：让 Agent 先读 index.md 获知"该去读哪几份子文件"，
#   避免一次性灌入全部上下文。
#
#   生成的是骨架 + 占位提示，仍需人/AI 补充实质内容（知识工程是底座，非一蹴而就）。
#
# 用法: bash .harness/scripts/codebase-guide-init.sh
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"
GUIDE_DIR="$HARNESS_DIR/codebase-guide"
mkdir -p "$GUIDE_DIR"
cd "$ROOT_DIR"

echo "[codebase-guide] 扫描代码库，生成知识地图骨架..."

detect() {  # $1=检测项 → 输出 yes/no + 证据
  case "$1" in
    backend)  [ -f package.json ] && node -e "require('./package.json').dependencies?.express" 2>/dev/null && echo "yes (Express)" || echo "no";;
    frontend) [ -f package.json ] && node -e "require('./package.json').dependencies?.react" 2>/dev/null && echo "yes (React)" || echo "no";;
    db)       [ -f package.json ] && node -e "require('./package.json').dependencies?.mongoose" 2>/dev/null && echo "yes (MongoDB/Mongoose)" || echo "no";;
    rtk)      [ -f package.json ] && node -e "require('./package.json').dependencies?.['@reduxjs/toolkit']" 2>/dev/null && echo "yes" || echo "no";;
  esac
}

# index.md
cat > "$GUIDE_DIR/index.md" <<EOF
# Codebase Guide — 知识地图入口

> 渐进式披露入口。先读本文件，按角色决定要读哪几份子文件，不要一次全读。
> RoleContract 控制：BA/SA 偏重 overview+arch；Dev 偏重 dev-recipes+arch；CR 偏重 arch+deps；TE 偏重 dev-recipes。

## 按角色必读
| 角色 | 必读子文档 |
|---|---|
| BA | overview.md, harness-roles.md |
| SA | overview.md, backend-arch.md, frontend-arch.md, deps.md |
| RR | overview.md, harness-roles.md |
| Dev | overview.md, dev-recipes.md, backend-arch.md, frontend-arch.md |
| CR | backend-arch.md, frontend-arch.md, deps.md |
| TE | dev-recipes.md, harness-roles.md |

## 子文档清单
- overview.md — 项目架构总览
- backend-arch.md — 后端架构
- frontend-arch.md — 前端架构
- deps.md — 依赖与版本
- dev-recipes.md — 开发场景配方
- harness-roles.md — 角色职责速查
EOF
echo "[codebase-guide] index.md 已生成"

# overview.md
cat > "$GUIDE_DIR/overview.md" <<EOF
# Overview — 项目架构总览

## 技术栈（自动探测）
- 后端: $(detect backend)
- 前端: $(detect frontend)
- 数据库: $(detect db)
- 状态管理: $(detect rtk)

## 目录结构
\`\`\`
$(find . -maxdepth 2 -type d -not -path '*/node_modules*' -not -path '*/.git*' -not -path '*/dist*' -not -path '*/build*' 2>/dev/null | sort | head -40)
\`\`\`

<!-- TODO: 人工补充 — 模块间依赖关系、核心业务域划分 -->
EOF
echo "[codebase-guide] overview.md 已生成"

# backend-arch.md / frontend-arch.md / deps.md / dev-recipes.md / harness-roles.md 骨架
for f in backend-arch frontend-arch deps dev-recipes harness-roles; do
  if [ ! -f "$GUIDE_DIR/$f.md" ]; then
    cat > "$GUIDE_DIR/$f.md" <<EOF
# $(echo $f | sed 's/-/ /g' | sed 's/\b./\U&/')

<!-- TODO: 人工/AI 补充。参考 harness-roles.md 的角色速查。 -->
EOF
    echo "[codebase-guide] $f.md 骨架已生成"
  else
    echo "[codebase-guide] $f.md 已存在，跳过"
  fi
done

echo "[codebase-guide] 完成。骨架已就位，请人工/AI 补充实质内容（知识工程是底座）。"
