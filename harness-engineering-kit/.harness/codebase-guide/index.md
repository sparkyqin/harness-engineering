# Codebase Guide — 知识地图入口

> 渐进式披露入口。先读本文件，按角色决定要读哪几份子文件，**不要一次全读**。
> RoleContract 控制：避免一次性灌入全部上下文（Agent 会模式匹配而非有意识导航）。
> 上下文是稀缺资源——过多指导反而无效。

## 按角色必读（RoleContract）

| 角色 | 必读子文档 | 理由 |
|---|---|---|
| BA（需求分析） | overview.md, harness-roles.md | 需求边界对齐，了解角色分工 |
| SA（方案设计） | overview.md, backend-arch.md, frontend-arch.md, deps.md | 架构设计需全栈视野 |
| RR（就绪评审） | overview.md, harness-roles.md | 复核可行性，不深入实现 |
| Dev（开发实现） | overview.md, dev-recipes.md, backend-arch.md, frontend-arch.md | 落地实现需配方 + 架构 |
| CR（代码审查） | backend-arch.md, frontend-arch.md, deps.md | 审查对照架构与规范 |
| TE（测试验证） | dev-recipes.md, harness-roles.md | E2E 路径与场景映射 |

## 子文档清单

- **index.md**（本文件）— 入口索引，让 Agent 获知"我该去读哪几份子文件"
- **overview.md** — 项目架构总览（技术栈、目录结构）
- **backend-arch.md** — 后端架构（Express + MongoDB + 中间件链）
- **frontend-arch.md** — 前端架构（React + RTK Query + 路由）
- **deps.md** — 依赖与版本锁定
- **dev-recipes.md** — 开发场景配方（如何加路由/Model/Screen）
- **harness-roles.md** — 角色职责速查

## 维护

- 用 `bash .harness/scripts/codebase-guide-init.sh` 生成骨架。
- 每次交付归档时，若架构有变，PM 触发 memory merge + 更新对应子文档。
- 知识工程是底座——上层流程每一环都依赖它提供准确、结构化的业务上下文。
