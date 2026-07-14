# Tasks — user-switch-stale-ui

<!-- SA 拆解，Dev 执行。apply 阶段按勾选跟踪进度。任务可被 Dev 一次性执行（无暗知识）。 -->

## 1. 登录成功回调分支修正

- [x] 1.1 登录成功回调改为按 `hasLocalUiLanguage()` 分支：有本地语言 → 保留、仅更新账户偏好；无本地语言 → `setUiLanguage(res.uiLanguage || 'zh')`（原逻辑）
- [x] 1.2 自查未改动后端鉴权、未升级依赖、未动 i18n 持久化

## 2. E2E 补充

- [x] 2.1 S-023 换号保留：john 英文登出 → jane 登录 → Header 保持英文
- [x] 2.2 S-024 首次登录：无本地语言 → jane 登录 → 界面应用 zh
- [x] 2.3 跑 npm test + verify.sh，结果写入 dev-log

<!--
重试记录：
- 首次 Dev 实现未加分支（仍 `res.uiLanguage || 'zh'` 覆盖）→ developer hook verdict=FAIL → TE B-E2E-13 FAIL(实现级) → 打回 Dev
- 重试 1：Dev 补分支 → developer hook verdict=PASS (259 passed; verify.sh PASS) → 进 CR
-->
