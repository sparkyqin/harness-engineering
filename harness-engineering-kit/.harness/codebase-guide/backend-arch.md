# Backend Architecture — 后端架构

> SA/Dev/CR 必读。后端 Express + MongoDB + 中间件链。

## 分层

```
routes/        → 路由定义（router.get/post/...，引入 protect 中间件）
controllers/   → 控制器（业务编排，用 asyncHandler 包裹）
models/        → Mongoose Schema（含 timestamps，export default）
middleware/    → 中间件（protect 认证 / errorHandler 错误兜底 / notFound）
config/        # 配置（db 连接、env）
```

## 请求链路

```
HTTP 请求
  → middleware (protect? / logging)
  → router (app.use 挂载)
  → controller (asyncHandler 包裹异步)
  → model (Mongoose 查询)
  → controller 响应
  → errorMiddleware (兜底)
```

## 规范要点（verify.sh A/C 类对照）

- ES Module：`package.json` type=module，import/export。
- asyncHandler：所有异步控制器包裹，否则 reject 不被捕获。
- timestamps：所有 Schema 配 `{ timestamps: true }`。
- 路由有对应 Controller：不把业务逻辑写进 router。
- 单文件 ≤ 300 行（WARN）。
- 无残留 console.log（WARN）。
- 后端无硬编码端口（FAIL）：`app.listen(process.env.PORT || 5000)`。
- errorMiddleware 注册进 app.js/server.js（FAIL）。

## 认证

- `protect` 中间件校验 JWT，挂 `req.user`。
- 认证路由必须引入 protect（A7 WARN）。
- 密钥走 env，不硬编码。

## 数据迁移

- 改 schema → 先跑 `npm run data:import` 重建种子（B2），再跑测试。
- refactor 档：propose 前跑 `baseline.sh snapshot`，apply 后跑 `compare`。

<!-- TODO: 人工补充 — 具体路由清单、关键业务规则、公共契约 -->
