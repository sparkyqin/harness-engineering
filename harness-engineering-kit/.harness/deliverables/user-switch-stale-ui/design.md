# Design — user-switch-stale-ui

## Context
登录成功回调当前逻辑：`setUiLanguage(res.uiLanguage || 'zh')`。
这会在任何登录成功时用账户语言覆盖当前界面语言，破坏换号场景的"保留当前选择"语义。

## Goals / Non-Goals
**Goals:**
- 换号登录（本地已有界面语言）时保留当前界面语言。
- 首次登录（无本地界面语言）时仍用账户语言初始化。

**Non-Goals:**
- 不重写 i18n 持久化机制。
- 不改账户语言偏好 UI。

## Decisions
**决策：登录成功回调按"本地是否已有界面语言"分支**
- 有本地语言 → 保留，仅更新账户偏好到 profile（不调 setUiLanguage 覆盖）。
- 无本地语言 → `setUiLanguage(res.uiLanguage || 'zh')`（原逻辑）。

备选：始终不覆盖 → 否决，会破坏首次登录用账户语言的 S-024。

## Risks / Trade-offs
- [风险] 账户语言与本地语言长期不一致 → [缓解] 这是预期行为（用户当前选择优先），账户偏好仅作首次初始化。

## Migration Plan
纯前端逻辑分支修正，无数据迁移。回滚 = revert 该回调分支。

## 任务拆解（tasks.md 依据）
1. 改登录成功回调分支。
2. 补 Playwright E2E（S-023 + S-024）。
3. 跑 npm test + verify.sh。

## 就绪自评
- [x] 需求全部有方案覆盖（R-012 → 分支修正）
- [x] 无超范围改动（仅回调分支 + E2E）
- [x] 风险均有缓解
- [x] 任务可被 Dev 一次性执行（无暗知识）
- [x] 兼容现有公共契约（不改 i18n spec 既有 Requirement，仅 ADDED 新条）

## 结论 PASS
