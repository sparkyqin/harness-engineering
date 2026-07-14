# Dependencies — 依赖与版本

> SA/CR 必读。锁定版本号，避免 Agent 臆造或擅自升级（小题大做）。

## 后端

| 依赖 | 版本 | 用途 |
|---|---|---|
| express | ^4.x | Web 框架 |
| mongoose | ^8.x | ODM |
| jsonwebtoken | ^9.x | JWT |
| bcryptjs | ^2.x | 密码哈希 |
| dotenv | ^16.x | env 加载 |

## 前端

| 依赖 | 版本 | 用途 |
|---|---|---|
| react / react-dom | ^18.x | UI |
| @reduxjs/toolkit | ^2.x | 状态管理 + RTK Query |
| react-redux | ^9.x | React 绑定 |
| react-router-dom | ^6.x | 路由 |
| @playwright/test | ^1.x | B 类 E2E（dev 依赖） |

## 工具链

| 依赖 | 版本 | 用途 |
|---|---|---|
| vitest | ^1.x | 单元测试 |
| vite / webpack | — | 构建 |
| eslint / prettier | — | 规范（Hook 自动格式化） |

## 升级原则（防小题大做）

- **用户只要补字段，不要顺手升级依赖**——升级须单独的 refactor 任务 + impact-analysis。
- 版本号写进本文件 + package.json，Agent 不得臆造版本。
- 重大版本升级须 RR 评审 + baseline 前后对比。

<!-- TODO: 人工补充 — 实际 package.json 版本核对、scripts 清单（test/build/data:import/test:e2e） -->
