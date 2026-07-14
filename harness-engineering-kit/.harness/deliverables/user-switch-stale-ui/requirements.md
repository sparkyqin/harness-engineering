# Requirements — user-switch-stale-ui

## 背景与范围
修正换号登录时界面语言被账户语言强制覆盖的缺陷。范围限于登录成功回调的语言分支 + 对应 E2E。

## 需求条目

### Requirement: R-012 换号登录保留当前界面语言
系统 SHALL 在同一会话内换号登录（A 登出后 B 登录）时，保留当前界面语言，而非用 B 的账户语言覆盖。

#### Scenario: S-023 john 英文登出后以 jane 登录
- GIVEN john 已将界面切换为英文并登出，jane 的账户语言偏好为 zh
- WHEN jane 登录成功
- THEN Header 语言保持英文（保留当前界面语言），不回退到中文

#### Scenario: S-024 首次登录应用账户语言
- GIVEN 一个无本地界面语言记录的新会话，jane 账户语言偏好为 zh
- WHEN jane 登录成功
- THEN 界面应用 zh（首次登录用账户语言初始化）

## 依赖与约束
- 依赖现有 i18n capability（访客语言 + 登录用户语言）。
- 不破坏 S-024（首次登录仍用账户语言）。
- 不改后端、不改数据模型。

## 结论 PASS
