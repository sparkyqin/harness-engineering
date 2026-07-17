# Flow Definition — Harness 接力赛规则

> 最形象的理解不是流程图,而是**接力赛**:上游跑完棒,下游接着跑;信息流单向;改了上游都不知道是最典型的反模式。
> 本文件是 `transitions.json` 的人类可读注释,PM 调度时以 `transitions.json` 为准。

## 编排模式:Supervisor / Worker

本 Harness 选 **Supervisor/Worker**(中心调度):
- PM Agent 是 Supervisor(主会话扮演),只做路由。
- BA/SA/RR/Dev/CR/TE 是 Workers(Sub-agent 调度)。

**为什么不用其他模式**(Sequential / Concurrent / Handoff / Group Chat):
- 嵌套限制 → 子代理内嵌套有限制,Supervisor/Worker 单层最稳。
- 需要人工卡点 → PM 必须在主会话才能抛人工审批。
- 确定性流程 → 不需要动态路由,固定角色 + 固定流程即可预测、可调试、易落地。

选型原则:用能可靠满足需求的、最低复杂度方案。

## 完整 8 步流程

```
0 初始化          init-task.sh + board 登记 + baseline snapshot(refactor)
  │
1 BA 需求分析     requirements.md ## 结论 PASS     ── BLOCK ↓ 回退(信息不足)
  │
2 SA 方案设计     design.md ## 结论 PASS           ── BLOCK ↓ 回退(方案不可行/超范围)
  │  (refactor 档前置:SA impact-analysis.md)
  │
3 RR 就绪评审     readiness-review.md ## 结论 PASS ── BLOCK ↓ 回退(暗知识/契约不兼容)
  │  (quick 档跳过,看 design.md ## 就绪自评)
  │
  ▼ 人工审批 1:审阅 readiness-review.md
  │
4 Dev 开发实现    代码 + dev-log.md                ── hook FAIL ↓ 重拉(≤5 轮)
  │
5 CR 代码审查     code-review.md ## 结论 PASS      ── REJECT ↓ 按归属路由
  │
6 TE 测试验证     test-report.md ## 结论 PASS      ── FAIL(实现)↓ 打回 Dev / FAIL(需求)↑ 升级
  │
  ▼ 人工审批 2:审阅 deliverables/<task>/ 全量
  │
7 PM 归档         spec merge + memory merge + mv _archive + board DONE
```

## 三段命令,两个人工卡点

```
/harness-propose <任务名> [需求描述]   → init → BA → SA → RR → [人工卡点 1]
/harness-apply   <任务名> [用户反馈]   → Dev → CR → TE → [人工卡点 2]
/harness-archive <任务名>              → Spec Merge + 归档 + board DONE
```

两个人工卡点不可跳过:propose 走完人审 readiness-review;apply 走完人审全量 deliverables。深度逻辑交给人审,再放 agent 执行。

## 信息流单向:下游不改上游

proposal → requirements → design → 代码 → 测试 → 归档,信息单向流动。下游只读上游不改上游。

反模式:Dev 改了 requirements 没说 → SA/RR 基于旧需求审 → TE 按旧需求测 → 全链路失真,复盘无法追溯。
正确:发现上游问题 BLOCK/REJECT,让 PM 打回上游重跑,绝不跨界。apply 发现需求层问题 → 升级给人改 proposal 重跑 propose,不能自己悄悄回 propose。

## 回退表与轮次封顶

详见 `transitions.json` 的 `rollback_table` 与 `round_caps`。核心:
- Dev 最多 5 轮,CR/TE 各最多 3 轮,超限升级给人,禁止无界重试。
- PM 只在当前命令内部打回相邻上游棒;跨命令边界必须升级给人。

## 七条铁律

1. 下游不改上游制品
2. PM 只做调度
3. 每一棒必须有文档产出(`## 结论 PASS` 才算交棒)
4. 跨命令边界不自主回退
5. FAIL = 阻塞(verify.sh FAIL 项阻塞交付;WARN 只记录)
6. 心跳绑定单一工具(一条心跳只绑定一个非 Read tool_use)
7. 轮次封顶(Dev 5 / 其他 3,超限升级)
