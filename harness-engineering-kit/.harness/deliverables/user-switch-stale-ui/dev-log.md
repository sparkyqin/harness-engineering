# Dev Log — user-switch-stale-ui

<!-- Dev 产出。读 requirements + design + tasks。过 developer hook（after_subagent 自跑 npm test + verify.sh）。 -->

## 一句话总结

登录成功回调改为按"本地是否已有界面语言"分支，换号登录保留当前界面语言，首次登录仍用账户语言初始化。

## 测试执行摘要
- npm test: PASS (259 passed)  <!-- 重试 1 后 -->
- verify.sh: PASS (通过 26 / 警告 4 / 失败 0)
- baseline compare: 跳过（standard 档）

## 重试记录（来自日志）

> 首次实现（FAIL）：
>   回调仍为 `setUiLanguage(res.uiLanguage || 'zh')`，未加 `hasLocalUiLanguage()` 分支。
>   developer hook verdict=FAIL —— npm test 中 B-E2E-13 失败：john 英文登出后 jane 登录，Header 语言回到中文。
>   `[developer hook] verdict=FAIL → npm test: FAIL (258 passed, 1 failing) → PM 行动：重拉 Developer（重试计数 1/5）；不要信任 Dev 自述。`
>
> 重试 1（PASS）：
>   补分支：有本地语言 → 保留、仅更新账户偏好；无本地语言 → `setUiLanguage(res.uiLanguage || 'zh')`。
>   `[developer hook] verdict=PASS → npm test: PASS (259 passed) / verify.sh: PASS → PM 行动：进入 CR（code-reviewer）。`

## 改动清单
- `src/features/auth/loginCallback.ts`（登录成功回调：单行覆盖 → `hasLocalUiLanguage()` 分支）
- `e2e/login-language.spec.ts`（新增 S-023 / S-024 两条 E2E）

## 遗留/风险
- `hasLocalUiLanguage()` 语义依赖本地存储的"用户主动切换"记录，TE 需重点验访客态不计入。
- 无其他遗留。

---
> developer hook 会自动复核 npm test + verify.sh，退出码无法伪造。
> verdict=PASS → PM 进 CR；verdict=FAIL → PM 重拉 Dev（最多 5 轮）。
