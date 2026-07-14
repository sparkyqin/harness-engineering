# Test Report — <task>

<!-- TE 产出（CR 之后，apply 最后一棒）。从 requirements 的 Scenario 逐条生成 B 类 E2E。 -->

## 测试矩阵
| 类别 | 用例数 | 通过 | 失败 | 跳过 |
|---|---|---|---|---|
| A. API | 0 | 0 | 0 | 0 |
| B. 功能验收(E2E) | 0 | 0 | 0 | 0 |
| C. 回归 | 0 | 0 | 0 | 0 |
| D. 工程验证 | 0 | 0 | 0 | 0 |

## B 类用例 ↔ Scenario 映射
| 测试用例 | 对应 R-xxx/S-xxx | 结果 | 备注 |
|---|---|---|---|

## 失败详情
<!-- 每个失败用例：复现步骤 + 期望 vs 实际 + 归属判定。 -->

## 归属判定
- 实现级 FAIL（Dev 没做好）→ 打回 Dev
- 需求级 FAIL（需求本身矛盾/缺失）→ 升级人 → 改 proposal → 重跑 propose

## 证据闭环
- npm test: <PASS|FAIL> (N passed)
- Playwright E2E: <PASS|FAIL> (N passed)
- verify.sh: <PASS|FAIL>
- baseline.sh compare: <未新增 FAIL|新增 N FAIL>

## 结论 PASS
<!-- 若 FAIL 则写 ## 结论 FAIL + 归属(实现级/需求级) + 失败摘要。 -->
