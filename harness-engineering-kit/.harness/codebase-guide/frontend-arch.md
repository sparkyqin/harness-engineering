# Frontend Architecture — 前端架构

> SA/Dev/CR 必读。React + RTK Query + 路由。

## 分层

```
components/    → 通用组件
screens/       → 页面（须注册进 index.js 路由）
features/      → 业务模块（含 slice / apiSlice injectEndpoints）
api/           # apiSlice 定义（createApi + injectEndpoints）
middleware/    → errorMiddleware 等中间件
store.js       # Redux store 配置（注册 errorMiddleware）
```

## 数据流

```
UI 触发
  → RTK Query hook (useXxxQuery/mutation)
  → apiSlice (injectEndpoints 定义 endpoint)
  → HTTP → 后端
  → RTK Query 缓存管理
  → 组件 re-render
```

**禁止**：前端直接 `fetch`/`axios`（C6 WARN）。所有数据走 RTK Query。

## 规范要点（verify.sh C 类对照）

- Screen 注册进 `index.js`（路由/导航）：C2 FAIL。
- API Slice 用 `injectEndpoints`：C4 FAIL。
- errorMiddleware 注册进 store.js：C5 FAIL。
- 前端无直接 fetch/axios：C6 WARN。

## 状态管理

- 服务器状态：RTK Query（缓存、失效、重试）。
- 客户端 UI 状态：RTK slice 或局部 useState。
- 不滥用全局 store；能用 RTK Query 缓存的不另开 slice。

## 构建

- `build-stamp.sh` 戳记：源文件指纹命中则跳过重建。
- verify.sh B1：`npm run build` 必须成功（FAIL）。

<!-- TODO: 人工补充 — 路由表、关键 Screen 清单、UI 语言/i18n 约定 -->
