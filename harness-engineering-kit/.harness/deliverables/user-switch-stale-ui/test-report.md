# Test Report — user-switch-stale-ui

<!-- TE 产出（CR 之后，apply 最后一棒）。从 requirements 的 Scenario 逐条生成 B 类 E2E。 -->

## 测试矩阵
| 类别 | 用例数 | 通过 | 失败 | 跳过 |
|---|---|---|---|---|
| A. API | 8 | 8 | 0 | 0 |
| B. 功能验收(E2E) | 2 | 2 | 0 | 0 |
| C. 回归 | 12 | 12 | 0 | 0 |
| D. 工程验证 | 3 | 3 | 0 | 0 |

## B 类用例 ↔ Scenario 映射
| 测试用例 | 对应 R-xxx/S-xxx | 结果 | 备注 |
|---|---|---|---|
| B-E2E-13 换号保留界面语言 | R-012 / S-023 | PASS（重试后） | 首次 FAIL，Dev 补分支后 PASS |
| B-E2E-14 首次登录用账户语言 | R-012 / S-024 | PASS | 原行为保留 |

## 失败详情

首次失败（B-E2E-13）：
- 复现：john 将界面切英文并登出 → jane 登录 → 期望 Header 保持英文，实际回到中文。
- 期望 vs 实际：期望保留当前界面语言（英文），实际 LoginScreen 用 `res.uiLanguage || 'zh'` 覆盖为 zh。
- 归属判定：实现级——R-012 需求清晰、design 已给分支方案，是 Dev 未实现保留分支，非需求矛盾。

回退闭环：
- `[PM] ↺ 回退: developer (原因: 换号登录须保留当前界面语言, 属本任务 requirements R-012 范围)`
- 重试 1：Dev 补 `hasLocalUiLanguage()` 分支 → developer hook 旁路验证 PASS (259 passed; verify.sh PASS)
- CR retry：`CR retry login language fix` → PASS
- TE 复测：B-E2E-13 PASS、B-E2E-14 PASS

## 归属判定
- 首次 FAIL 判定为实现级（Dev 未实现 R-012 保留分支）→ 打回 Dev（已闭环）。
- 无需求级 FAIL，不升级人、不改 proposal。

## 证据闭环
- npm test: PASS (259 passed)
- Playwright E2E: PASS (2 passed)
- verify.sh: PASS (通过 26 / 警告 4 / 失败 0)
- baseline.sh compare: 跳过（standard 档）

## 结论 PASS
