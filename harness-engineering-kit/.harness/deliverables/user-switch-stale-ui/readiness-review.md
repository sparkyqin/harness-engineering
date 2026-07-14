# Readiness Review — user-switch-stale-ui

<!-- RR 产出（standard/refactor 档；quick 档跳过，看 design.md ## 就绪自评）。开发前独立可行性把关。 -->

## 评审项

### 1. 需求可测性
R-012 有 S-023（换号正向）+ S-024（首次登录）两个 Scenario，均为 GIVEN/WHEN/THEN，可直接推导成 E2E 用例，无需翻译。异常分支（S-024 首次登录）已覆盖——这正是 bug 的边界。可测。

### 2. 方案可行性
design 的"按 `hasLocalUiLanguage()` 分支"决策技术可行：有本地语言则保留、无则用账户语言初始化。两个备选已否决并给出理由。无未解决技术风险。

### 3. 范围合规
改动仅登录成功回调分支 + 2 条 E2E，未超出 proposal 的"What Changes"。无升级依赖、无重命名 API、无改表结构。Non-Goals 钉死了不重写 i18n 持久化、不改账户语言 UI。范围合规。

### 4. 暗知识检查
任务拆解两步：改回调分支、补 E2E。`hasLocalUiLanguage()` 是已有入口，非新增概念，Dev 无需"你应该知道"的隐含前提。可被 Dev 一次性执行。

### 5. 契约兼容
仅 ADDED 一条 i18n Requirement（R-012），不改既有 Requirement。首次登录用账户语言的原行为（S-024）显式保留。契约兼容。

### 6. 基线与回滚（refactor 档）
本任务 standard 档，非 refactor，不要求 baseline。回滚策略明确（还原单行回调）。不适用。

## 阻塞列表
本轮非 BLOCK，无阻塞项。

## 结论 PASS
