# Flow Definition — Harness 接力赛规则

> 最形象的理解不是流程图，而是**接力赛**：上游跑完棒，下游接着跑；信息流单向；改了上游都不知道是最典型的反模式。
> 本文件是 `transitions.json` 的人类可读注释，PM 调度时以 `transitions.json` 为准。

## 编排模式：Supervisor / Worker

本 Harness 选 **Supervisor/Worker**（中心调度）：
- PM Agent 是 Supervisor（主会话扮演），只做路由。
- BA/SA/RR/Dev/CR/TE 是 Workers（Sub-agent 调度）。

**为什么不用其他模式**（Sequential / Concurrent / Handoff / Group Chat）：
- 嵌套限制 → 子代理内嵌套有限制，Supervisor/Worker 单层最稳。
- 需要人工卡点 → PM 必须在主会话才能抛人工审批。
- 确定性流程 → 不需要动态路由，固定角色 + 固定流程即可预测、可调试、易落地。

选型原则：用能可靠满足需求的、最低复杂度方案。

## 完整 8 步流程

```
0 初始化          init-task.sh + board 登记 + baseline snapshot(refactor)
  │
1 BA 需求分析     requirements.md ## 结论 PASS     ── BLOCK ↓ 回退(信息不足)
  │
2 SA 方案设计     design.md ## 结论 PASS           ── BLOCK ↓ 回退(方案不可行/超范围)
  │  (refactor 档前置：SA impact-analysis.md)
  │
3 RR 就绪评审     readiness-review.md ## 结论 PASS ── BLOCK ↓ 回退(暗知识/契约不兼容)
  │  (quick 档跳过，看 design.md ## 就绪自评)
  │
[人工卡点 1]      审阅 readiness-review.md
  │
4 Dev 开发实现    dev-log.md + 代码 + developer hook verdict=PASS ── FAIL(bug) ↓ 回退 Dev
  │
5 CR 代码审查     code-review.md ## 结论 PASS      ── REJECT ↓ 按归属路由
  │
6 TE 测试验证     test-report.md ## 结论 PASS      ── FAIL(实现级) ↓ Dev；FAIL(需求级) ↓ 升级人
  │
[人工卡点 2]      审阅 deliverables/<task>/
  │
7 PM 归档交付     Spec Merge + mv 归档 + board DONE + check-harness 终检
```

## 信息流单向（反模式警告）

```
✅ 正向：proposal → requirements → design → 代码 → 测试 → 归档
   每棒的产出是下一棒的输入；下游只读上游，不改上游。

❌ 反模式：Dev 改了 requirements 自己没说 → SA/RR 基于旧需求审 → TE 按旧需求测
   "改了上游都不知道" → 全链路失真，复盘时无法追溯。
   正确做法：发现上游问题 → BLOCK/REJECT → PM 打回上游重跑（不跨界）。
```

## 三段命令边界

| 命令 | 链路 | 人工卡点 | 跨界处理 |
|---|---|---|---|
| `/harness-propose` | init → BA → SA → RR | 卡点 1（审 readiness-review） | apply 内发现需求错 → 升级人改 proposal → 重跑 propose |
| `/harness-apply` | Dev → CR → TE | 卡点 2（审 deliverables） | TE FAIL(需求级) → 升级人 → 改 proposal → 重跑 propose |
| `/harness-archive` | Spec Merge + 归档 + board DONE | — | check-harness 终检 FAIL → PM 修，3 轮修不动回滚升级 |

**铁律 4**：跨命令边界不自主回退。apply 阶段发现需求层问题，PM 必须升级给人，不能自己悄悄回 propose——否则 propose 的产出与 apply 的实现会脱节，无法追溯。

## 反馈循环（Planner → Generator ⇄ Evaluator）

本 Harness 的角色制衡对应经典三段式：
- **Planner**：PM（整体调度）+ BA/SA（规划需求与方案）
- **Generator**：Dev（写代码）
- **Evaluator**：CR + TE（交叉互审，不让同一 Agent 又写又审）

生成与评估形成反馈回路，不断互相纠偏：CR REJECT → Dev 修 → CR 复审；TE FAIL → Dev 修 → TE 复测。

## Skills 固化流程

固定步骤下沉成 Skill，不再临场发挥：
- `build-test` Skill：Dev/TE 跑构建 + 测试 SOP
- `post-verify` Skill：事后验证 SOP（npm test + verify + baseline）
- `code-review` Skill：CR 审查 SOP
- `test-e2e` Skill：TE 从 Scenario 生成 Playwright E2E

**价值**：固定步骤不依赖 AI 临场发挥，每次输出一致，质量可预测可控；维护集中（改一处即生效）。
