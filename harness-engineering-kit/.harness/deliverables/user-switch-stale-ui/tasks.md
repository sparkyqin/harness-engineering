# Tasks — user-switch-stale-ui

## 1. 登录回调分支修正

- [x] 1.1 改登录成功回调：检测本地是否已有界面语言，有则保留、无则用账户语言初始化
- [x] 1.2 移除 `res.uiLanguage || 'zh'` 对本地语言的强制覆盖

## 2. B 类 E2E

- [x] 2.1 补 S-023 用例：john 英文登出 → jane 登录 → Header 保持英文
- [x] 2.2 补 S-024 用例：首次登录 → 应用账户语言

## 3. 验证闭环

- [x] 3.1 npm test
- [x] 3.2 verify.sh
- [x] 3.3 Playwright E2E（ensure-playwright.sh 后跑）
