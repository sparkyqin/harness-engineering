# Code Review — user-switch-stale-ui

<!-- CR 产出（Dev 之后）。独立审查，与 TE 分离（不让同一 Agent 又写又审）。 -->

## 审查维度

### 1. 实现对照 design
登录成功回调已按 design 决策实现 `hasLocalUiLanguage()` 分支：有本地语言 → 保留、仅更新账户偏好；无本地语言 → `setUiLanguage(res.uiLanguage || 'zh')`。与 design 的 Decisions 一致，未偏离。备选方案未混入实现。

### 2. 规范符合
ES Module（type=module）✅；无残留 console.log ✅；改动文件单文件 ≤300 行 ✅；无硬编码端口。改动未引入 asyncHandler 相关后端路由（本任务纯前端，不适用）。

### 3. 工程一致性
改动不涉及路由注册 / Screen 入口 / Model export / API Slice / errorMiddleware / 前端 fetch（纯回调逻辑分支，C 类不适用）。未破坏既有工程一致性。

### 4. 安全
未引入新鉴权路径，未动后端，无硬编码密钥，无输入校验回归。改动仅前端语言分支，无安全风险。

### 5. 可维护性
`hasLocalUiLanguage()` 命名语义化，分支意图清晰。未引入冗余抽象、无重复代码、无多余注释。可维护。

### 6. 范围合规
改动仅回调分支 + 2 条 E2E，未超 proposal/design 范围。无升级依赖、无重命名 API、无改表结构。范围合规。

## 问题清单
| # | 维度 | 严重度(FAIL/WARN) | 文件:行 | 问题 | 建议归属(Dev/TE/上游) |
|---|---|---|---|---|---|
| — | — | — | — | 无 FAIL/WARN 级问题 | — |

## 结论 PASS
