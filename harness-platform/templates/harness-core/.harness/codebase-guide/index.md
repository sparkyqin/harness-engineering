# codebase-guide/index.md — 模块化知识地图入口

> 渐进式披露的关键:先读本 index,按角色决定读哪几份子文件,不一次全读。
>
> **填充状态**:overview/backend-arch/frontend-arch/deps/dev-recipes 五份由平台 fill 阶段(AI 或人)填充;
> 无 AI 时为带指引的空模板,仍可手动填写。harness-roles 是通用的,已填好。

## 按角色必读(渐进式披露)

| 角色 | 必读子文档 |
|---|---|
| BA(需求分析) | overview + harness-roles |
| SA(方案设计) | overview + backend-arch + frontend-arch + deps |
| RR(就绪评审) | overview + harness-roles |
| Dev(开发) | overview + dev-recipes + backend-arch + frontend-arch |
| CR(代码审查) | backend-arch + frontend-arch + deps |
| TE(测试) | dev-recipes + harness-roles |

## 子文档清单

| 文档 | 内容 | 填充者 |
|---|---|---|
| [overview.md](overview.md) | 项目架构总览、技术栈、目录布局 | AI/人 |
| [backend-arch.md](backend-arch.md) | 后端架构、入口、路由、数据模型约定 | AI/人 |
| [frontend-arch.md](frontend-arch.md) | 前端架构、状态管理、组件约定 | AI/人 |
| [deps.md](deps.md) | 依赖清单与版本锁定、关键库 | AI/人 |
| [dev-recipes.md](dev-recipes.md) | 开发场景配方:如何加 API/页面/模型 | AI/人 |
| [harness-roles.md](harness-roles.md) | 七角色职责速查 | 通用(已填) |
