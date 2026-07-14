---
name: code-standards
description: 编码规范（后端+前端源码）。编辑 src/ 源码时对照 verify.sh 的 A 类（静态规范）与 C 类（工程一致性）。违反 FAIL 项 = 阻塞交付。
paths: "src/**/*.{js,jsx,ts,tsx}"
---

# code-standards — 编码规范

> 编辑 src/ 下源码时激活。对照 verify.sh 的 A 类（静态规范）与 C 类（工程一致性）。
> 违反 A/C 类 FAIL 项 = 阻塞交付。

## 后端（Node/Express/Mongoose）

- ES Module：`package.json` type=module，import/export（A1 FAIL）。
- asyncHandler 包裹所有异步控制器（A2 WARN）。
- Mongoose Schema 配 `{ timestamps: true }`（A3 FAIL）。
- 路由有对应 Controller，业务逻辑不进 router（A6 FAIL）。
- 后端无硬编码端口：`app.listen(process.env.PORT || 5000)`（A8 FAIL）。
- errorMiddleware 注册进 app.js/server.js（C5 FAIL）。
- 认证路由引入 protect 中间件（A7 WARN）。
- 单文件 ≤ 300 行（A5 WARN）；无残留 console.log（A4 WARN）。

## 前端（React/RTK Query）

- Screen 注册进 index.js 路由/导航（C2 FAIL）。
- API Slice 用 injectEndpoints（C4 FAIL）。
- Model 文件 export default（C3 FAIL）。
- 前端无直接 fetch/axios，走 RTK Query（C6 WARN）。
- errorMiddleware 注册进 store.js（C5 FAIL）。

## 通用

- 路径用 path.join / path.resolve，不硬编码斜杠（跨平台）。
- 锁定版本号（见 codebase-guide/deps.md），不臆造版本。
- 错误信息自带修复指令（如可能）。
- 改 schema/模板/生成代码后，先跑迁移/生成/构建，再跑测试（不跳步）。
