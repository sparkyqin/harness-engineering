# Harness Roles — 角色职责速查

> 所有角色必读。完整契约见 `.harness/agents/<role>.md`。本文件是速查卡。

## 角色一览（PM + 6 Worker）

| 角色 | 全称 | 阶段 | 档位 | 产出 | 一句话职责 |
|---|---|---|---|---|---|
| PM | Project Manager | 全程 | 中等 | board + 心跳 | 总调度，只路由不做专业判断 |
| BA | Business Analyst | propose | 旗舰 | requirements.md | 需求 → SHALL + GWT |
| SA | Solution Architect | propose | 旗舰 | design.md (+impact-analysis) | 方案 → 技术决策 + 就绪自评 |
| RR | Readiness Reviewer | propose | 旗舰 | readiness-review.md | 开发前独立可行性把关 |
| Dev | Developer | apply | 旗舰 | 代码 + dev-log.md | 按 design 实现，过 hook |
| CR | Code Reviewer | apply | 旗舰 | code-review.md | 独立审查，REJECT 按归属路由 |
| TE | Test Engineer | apply | 旗舰 | test-report.md + 测试代码 | 四类测试，下最终验收结论 |

## 三段式对应（Planner → Generator ⇄ Evaluator）

- **Planner**：PM + BA/SA（规划）
- **Generator**：Dev（写代码）
- **Evaluator**：CR + TE（交叉互审，不让同一 Agent 又写又审）

## 链路（接力赛，信息流单向）

```
propose: init → [SA-impact(refactor)] → BA → SA → RR → [人工卡点1]
apply:   Dev → CR → TE → [人工卡点2]
archive: Spec Merge + 归档 + board DONE
```

## 失败回退（PM 按表执行，不跨界）

| 失败 | 打回谁 | 执行者 | 跨界? |
|---|---|---|---|
| propose BLOCK | 上游棒（BA/SA） | PM 自主 | 否 |
| CR REJECT | Dev/TE/上游（按归属） | PM 自主 | 否 |
| TE FAIL(实现级) | Dev | PM 自主 | 否 |
| TE FAIL(需求级) | 人（改 proposal 重跑 propose） | 人工 | 是 |

## 轮次上限

- Dev：5 轮
- CR / TE：各 3 轮
- 超限 → PM 暂停升级给人（禁止无界重试）

## 模型档位建议

- PM：中等模型（只做路由）
- BA/SA/RR/Dev/CR/TE：旗舰模型（专业判断）
- 原则：为每个 Agent 分配匹配复杂度的模型，最小权限。

## 心跳行（PM 抛，六类）

```
[PM] Profile 识别 / 文档就位 / Task 开工 / 脚本事件 / Task 收工 / 异常告警
```
一条心跳只绑定一个非 Read tool_use。
