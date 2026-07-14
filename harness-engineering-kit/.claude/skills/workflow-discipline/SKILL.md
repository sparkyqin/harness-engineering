---
name: workflow-discipline
description: 流程纪律。PM 与各角色接力规则——下游不改上游、PM 只调度、每棒有产出、跨边界不自主回退、轮次封顶。
---

# workflow-discipline — 流程纪律

> 接力赛规则：信息流单向，改了上游都不知道是最典型反模式。

## 接力赛四铁律（GUIDE.md 铁律 1-4）

1. **下游不改上游制品**——方案觉得需求有问题，只能 BLOCK 让 PM 打回，不能自己改 requirements/proposal。
2. **PM 只做调度**——决定下一棒交给谁、何时停；不给技术建议、不替别人做专业判断。
3. **每一棒必须有文档产出**——写进 `deliverables/<需求名>/` 对应文件，`## 结论 PASS` 才算交棒。
4. **跨命令边界不自主回退**——apply 发现需求问题，PM 必须升级给人，不能悄悄回 propose。

## 信息流单向（反模式警告）

```
✅ proposal → requirements → design → 代码 → 测试 → 归档
   下游只读上游，不改上游。

❌ Dev 改了 requirements 没说 → SA/RR 基于旧需求审 → TE 按旧需求测 → 全链路失真。
   正确：发现上游问题 → BLOCK/REJECT → PM 打回上游重跑（不跨界）。
```

## 回退表（PM 按 table 执行）

| 失败 | 打回谁 | 跨界? |
|---|---|---|
| propose BLOCK | 上游棒 | 否 |
| CR REJECT | Dev/TE/上游（按归属） | 否 |
| TE FAIL(实现级) | Dev | 否 |
| TE FAIL(需求级) | 人（改 proposal 重跑 propose） | 是 |

## 轮次封顶

- Dev 5 轮 / CR 3 轮 / TE 3 轮。超限 → PM 暂停升级给人。禁止无界重试。

## 心跳纪律（铁律 6）

一条心跳只绑定一个非 Read tool_use。tool 返回后先抛结果心跳，再进入下一动作。
Read tool_use 不单独抛心跳（避免噪音）。
