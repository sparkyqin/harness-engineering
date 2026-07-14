# Proposal — user-switch-stale-ui

> 本目录是**示例交付物**，演示一个 standard 档任务从 propose 到 apply 的完整文档流转。
> 对应日志：`/harness-apply user-switch-stale-ui`（TE FAIL 回退 Dev 后重试闭环）。

## Why
同一会话内换号登录（john 登出后 jane 登录）时，Header 语言被强制回退到 jane 的账户语言（zh），
破坏了用户当前已选择的界面语言（英文）。属于界面状态在账户切换时的串扰缺陷。

## What Changes
- 修正登录成功回调：换号登录时保留当前界面语言，不覆盖。
- 仅在首次登录（无本地界面语言）时用账户语言初始化。
- 补 B 类 E2E：john 英文登出 → jane 登录 → Header 保持英文。

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `i18n`: 新增"换号登录保留当前界面语言"Requirement（实为 ADDED，因原 spec 无此条）。

## Impact
- 前端：登录成功回调（`res.uiLanguage || 'zh'` 逻辑）。
- 不涉及后端 / 数据模型 / 公共契约变更 → profile=standard（非 refactor）。

## 范围边界（防小题大做）
- **不做**：i18n 整体重构、语言持久化机制重写、账户语言偏好 UI 改造。
- 仅修正换号登录的语言覆盖分支 + 补对应 E2E。
