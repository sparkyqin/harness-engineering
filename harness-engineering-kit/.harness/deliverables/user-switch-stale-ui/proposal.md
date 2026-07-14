# Proposal — user-switch-stale-ui

## Why

换号登录后，界面语言被账户语言强制覆盖：john 把界面切到英文并登出，jane 登录后 Header 语言被强制回退到 jane 的账户语言 zh，破坏了用户当前已选的界面语言。这是一个影响多账号共用设备的真实体验缺陷，现在修是因为它属于"登录语言"这条 capability 的行为错误，且和即将做的"访客语言"特性耦合，越拖越乱。

## What Changes

- 登录成功回调不再无条件用账户语言覆盖当前界面语言；改为按"本地是否已有界面语言"分支。
- 首次登录（本地无界面语言记录）仍用账户语言初始化——保留原行为。
- 新增一条 i18n 能力 Requirement 描述"换号登录保留当前界面语言"。

## Capabilities

### New Capabilities
- `i18n`: 换号登录时保留当前界面语言（作为 ADDED 条目并入现有 i18n capability）

### Modified Capabilities
- `i18n`: 登录成功回调的语言应用逻辑从"无条件覆盖"改为"有本地语言则保留、无则用账户语言初始化"

## Impact

受影响代码：登录成功回调（前端，LoginScreen / auth 回调层）。不涉及后端、数据模型、公共 API 契约、依赖。不涉及数据迁移。

## 范围边界（防小题大做）

不做：重写 i18n 持久化机制；改账户语言偏好 UI；动后端鉴权流程；升级 i18n 相关依赖。只改登录成功回调这一个分支 + 补对应 E2E。

---
> 定稿后由人确认，PM 进入 propose 链路（BA → SA → RR）。
> Profile 识别：不涉及后端/数据模型/公共契约变更 → standard（非 refactor）。
