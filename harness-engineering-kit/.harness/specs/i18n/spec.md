# i18n Specification

## Purpose
界面语言（中文/英文）的识别、持久化与切换。覆盖访客语言、登录用户语言、换号登录后的语言保留。

## Requirements

### Requirement: 访客界面语言
系统 SHALL 在用户未登录时，依据浏览器/显式选择确定界面语言，并持久化于本地。

#### Scenario: 首次访问按浏览器语言
- GIVEN 一个未登录用户，浏览器语言为 zh
- WHEN 用户首次访问站点
- THEN 界面渲染为中文

#### Scenario: 访客手动切换语言
- GIVEN 一个未登录用户当前界面为中文
- WHEN 用户点击语言切换为英文
- THEN 界面渲染为英文，且选择被本地持久化

### Requirement: 登录用户界面语言
系统 SHALL 在用户登录时，以用户账户语言偏好覆盖访客语言，并反映在 Header 等全局组件。

#### Scenario: 登录成功应用账户语言
- GIVEN 一个账户语言偏好为 zh 的用户，当前访客语言为 en
- WHEN 用户登录成功
- THEN Header 等全局组件语言回到 zh

### Requirement: 换号登录保留当前界面语言
系统 SHALL 在同一会话内换号登录（A 登出后 B 登录）时，**保留当前界面语言**，而非强制回退到 B 的账户语言。

#### Scenario: john 英文登出后以 jane 登录
- GIVEN john 已将界面切换为英文并登出，jane 的账户语言偏好为 zh
- WHEN jane 登录成功
- THEN Header 语言保持英文（保留当前界面语言），不回退到中文

> 注：本 Requirement 由 user-switch-stale-ui 任务引入（修正原 `res.uiLanguage || 'zh'` 覆盖访客语言的缺陷）。
