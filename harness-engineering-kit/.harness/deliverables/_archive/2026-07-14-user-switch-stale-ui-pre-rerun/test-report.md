# Test Report — user-switch-stale-ui

> 日志：首次 TE FAIL(B-E2E-13) → 回退 Dev → 重试后 PASS

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
| 换号登录保留英文 | R-012/S-023 | PASS | john→jane，Header 保持英文 |
| 首次登录应用账户语言 | R-012/S-024 | PASS | 无本地语言时用 zh |

## 失败详情
（首次执行时 B-E2E-13 FAIL，回退 Dev 后重试已闭环）
- 首次失败：john 英文登出后 jane 登录，Header 语言回到中文；LoginScreen 用 `res.uiLanguage || 'zh'` 覆盖访客语言。
- 归属：实现级（Dev 未实现 R-012 的保留分支）→ 打回 Dev。
- 重试后：Dev 修正回调分支 → S-023 PASS。

## 归属判定
首次 FAIL 为实现级 → 打回 Dev（已闭环）。无需求级问题。

## 证据闭环
- npm test: PASS (259 passed)
- Playwright E2E: PASS (2 passed)
- verify.sh: PASS (通过 26 / 警告 4 / 失败 0)
- baseline.sh compare: 跳过（standard 档）

## 结论 PASS
