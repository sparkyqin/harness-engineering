# Code Review — <task>

<!-- CR 产出（Dev 之后）。独立审查，与 TE 分离（不让同一 Agent 又写又审）。 -->

## 审查维度

### 1. 实现对照 design
<!-- 每个任务点是否按 design 实现？有无偏离？ -->

### 2. 规范符合
<!-- code-standards.mdc：ES Module / asyncHandler / timestamps / 路由有 Controller / 单文件 ≤300 行 / 无残留 console.log -->

### 3. 工程一致性
<!-- C 类：路由进 app.js / Screen 进 index.js / Model export default / API Slice injectEndpoints / errorMiddleware 注册 / 前端无直接 fetch -->

### 4. 安全
<!-- 认证路由引入 protect、无硬编码密钥、输入校验、SQL/注入。 -->

### 5. 可维护性
<!-- 命名、抽象层次、重复代码、注释必要性。 -->

### 6. 范围合规
<!-- 是否超 proposal/design 范围（小题大做检查）。 -->

## 问题清单
| # | 维度 | 严重度(FAIL/WARN) | 文件:行 | 问题 | 建议归属(Dev/TE/上游) |
|---|---|---|---|---|---|

## 结论 PASS
<!-- 若 REJECT 则写 ## 结论 REJECT + 主要问题 + 归属路由(Dev/TE/上游)。 -->
