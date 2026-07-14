# Overview — 项目架构总览

> 本文件是项目身份卡。BA/SA/RR 启动时先读它建立全局视图，再深入具体模块。
> 内容由 `codebase-guide-init.sh` 自动探测骨架，需人工/AI 补充实质。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 后端 | Node.js + Express | ESM，asyncHandler 统一异步错误捕获 |
| 数据库 | MongoDB + Mongoose | Schema 含 timestamps |
| 前端 | React + RTK Query | API Slice injectEndpoints，禁止直接 fetch/axios |
| 构建 | Vite / Webpack | build-stamp.sh 戳记避免重复构建 |
| 测试 | Vitest + Playwright | A(API)/B(E2E)/C(回归)/D(工程) 四类 |

## 目录结构（顶层）

```
<project-root>/
├── src/                    # 源码
│   ├── server/  (后端)     # routes/ controllers/ models/ middleware/
│   └── client/  (前端)     # components/ screens/ features/ (apiSlice)
├── .harness/               # 本工程化工作流目录
├── .cursor/  /  .claude/   # Rules / Skills / Agents / Commands
├── mcp-server/             # MCP 工具接口（可选）
├── seeder/                 # 种子数据
└── package.json
```

## 核心业务域

<!-- TODO: 人工补充。列出顶层 capability（对应 .harness/specs/<name>/）：
- user-auth — 认证与会话
- products — 商品目录
- orders — 下单与履约
- ... -->

## 全局约束（所有角色必知）

- **仓库即事实源**：specs/ 是系统能力的 Source of Truth，新任务读它而非从代码推断。
- **跨平台**：路径用 path.join；脚本在 Git Bash/WSL/macOS/Linux 运行。
- **不硬编码端口**：后端用 `process.env.PORT`。
- **前端数据走 RTK Query**：不直接 fetch/axios。
