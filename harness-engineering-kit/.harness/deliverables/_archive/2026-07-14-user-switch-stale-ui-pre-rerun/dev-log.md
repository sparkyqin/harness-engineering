# Dev Log — user-switch-stale-ui

> 对应日志：`/harness-apply user-switch-stale-ui`
> 本任务经历一次 TE FAIL(实现级) 回退 Dev 后重试闭环。

## 一句话总结
修正登录成功回调，使换号登录保留当前界面语言；首次登录仍用账户语言初始化。

## 测试执行摘要
- npm test: PASS (259 passed)
- verify.sh: PASS (通过 26 / 警告 4 / 失败 0)
- baseline compare: 跳过（standard 档，无基线）

## 改动清单
- `src/client/.../loginScreen.jsx`：登录成功回调分支修正（本地有语言则保留）
- `e2e/user-switch-stale-ui.spec.js`：新增 S-023 / S-024 用例

## 遗留/风险
- 无。S-023/S-024 E2E 均通过。

---
> 重试记录（来自日志）：
> 首次 TE FAIL(B-E2E-13)：john 英文登出后 jane 登录，Header 语言回到中文——
>   诊断：换号登录须保留当前界面语言，属本任务 requirements R-012 范围 → 打回 Dev（实现级）
>   `[PM] ↺ 回退: developer (原因: 换号登录须保留当前界面语言, 属本任务 requirements R-012 范围)`
> 重试 1：Dev 修复登录语言覆盖 → developer hook 旁路验证 PASS (259 passed; verify.sh PASS)
> CR retry：`CR retry login language fix` → PASS
