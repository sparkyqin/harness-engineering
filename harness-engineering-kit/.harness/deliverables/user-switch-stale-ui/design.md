# Design — user-switch-stale-ui

<!-- SA 产出。读 requirements + specs + codebase-guide。决定"怎么做"，不改 requirements（铁律1）。 -->

## Context

登录成功回调当前逻辑：`setUiLanguage(res.uiLanguage || 'zh')`。这会在任何登录成功时用账户语言覆盖当前界面语言，破坏换号场景的"保留当前选择"语义（S-023）。约束：纯前端，不动后端，不动 i18n 持久化机制。

## Goals / Non-Goals
**Goals:**
- 换号登录时保留当前界面语言（S-023）。
- 首次登录时仍用账户语言初始化（S-024，保留原行为）。

**Non-Goals:**
- 不重写 i18n 持久化机制。
- 不改账户语言偏好 UI。
- 不动后端鉴权流程、不升级依赖、不改表结构。

## Decisions

决策：登录成功回调按"本地是否已有界面语言"分支。
- 有本地语言 → 保留，仅更新账户偏好到 profile（不调 `setUiLanguage` 覆盖）。
- 无本地语言 → `setUiLanguage(res.uiLanguage || 'zh')`（原逻辑，覆盖 S-024 首次登录）。

判定"本地是否已有界面语言"用已有的本地读取入口 `hasLocalUiLanguage()`（语义化命名，不引入新状态字段）。

备选：始终不覆盖 → 否决，会破坏首次登录用账户语言的 S-024。
备选：新增"换号中"标志位 → 否决，过度设计，分支已足够表达语义。

## Risks / Trade-offs
- [风险] 本地语言记录与访客语言混淆 → [缓解] `hasLocalUiLanguage()` 只认用户主动切换留下的记录，访客态不计入。
- [风险] 旧用户升级后行为变化 → [缓解] 仅换号场景变化，首次登录行为不变，无数据迁移。

## Migration Plan

纯前端改动，无数据迁移、无部署步骤。回滚策略：还原登录成功回调为单行 `setUiLanguage(res.uiLanguage || 'zh')` 即可恢复旧行为。

## 任务拆解（tasks.md 依据）

1. 登录成功回调改为按 `hasLocalUiLanguage()` 分支：有则保留、无则 `setUiLanguage(res.uiLanguage || 'zh')`。
2. 补 E2E：S-023 换号保留、S-024 首次登录用账户语言，各 1 条。

## 就绪自评
<!-- quick 档替代 RR；standard/refactor 档 RR 会复核此处。 -->
- [x] 需求全部有方案覆盖（R-012 → 分支修正）
- [x] 无超范围改动（仅回调分支 + E2E）
- [x] 风险均有缓解
- [x] 任务可被 Dev 一次性执行（无暗知识）
- [x] 兼容现有公共契约（不改 i18n spec 既有 Requirement，仅 ADDED 新条）

## 结论 PASS
