# GUIDE.md — Harness 工作流总览

> 本文件定义 `/harness-propose`、`/harness-apply`、`/harness-archive` 三个阶段的工作流逻辑。
> PM(项目经理,主会话扮演)按本文件调度各角色 Worker 子代理。
> 完整状态机见 `.harness/workflow/transitions.json`,角色契约见 `.harness/agents/`。

---

## 阶段一:`/harness-propose [任务名] [需求描述]`

> 目标:把模糊需求变成"做什么 + 怎么做 + 是否就绪"的明确规格,在写代码之前对齐意图。

```
第0步:init-task.sh  →  创建 deliverables/<任务名>/ + 复制 _template/ + 登记 board.md + baseline.sh snapshot
        │
        ▼
人 + AI 反复打磨 proposal.md(先确认"做什么"再约束"怎么做")
        │  人工确认 proposal 定稿
        ▼
Profile 识别(quick / standard / refactor)
        │
        ├─ quick:    BA → SA (design.md 含 ## 就绪自评)
        ├─ standard: BA → SA → RR
        └─ refactor: SA-impact → BA → SA → RR   (先跑 baseline.sh snapshot)
        任一棒 BLOCK → PM 按回退表打回上游(不跨界)
        │  每棒产出文档写入 deliverables/<任务名>/
        ▼
人工审批 1:审阅 readiness-review.md(quick 档改看 design.md 的 ## 就绪自评)
        │
        ▼  用户确认后运行 /harness-apply
```

**propose 链路产出物**(每棒必有文档,写进 `deliverables/<任务名>/`):

| 棒 | 角色 | 输入 | 输出文档 | 阻塞条件 |
|---|---|---|---|---|
| 需求分析 | BA | proposal + specs + codebase-guide | requirements.md(`## 结论 PASS`) | 需求矛盾 / 信息不足 |
| 影响面分析 | SA(refactor 前置) | proposal + 代码 | impact-analysis.md(`## 结论 PASS`) | 影响面不可控 |
| 方案设计 | SA | requirements + specs | design.md(`## 结论 PASS`) | 方案不可行 / 超范围 |
| 就绪评审 | RR | requirements + design | readiness-review.md(`## 结论 PASS`) | 就绪自评不达标 |

**Profile 档位**:
- `quick`:小需求,BA → SA 即可,SA 在 design.md 写 `## 就绪自评` 替代独立 RR。
- `standard`:常规需求,完整 BA → SA → RR。
- `refactor`:涉及重构/大改,**先跑 `baseline.sh snapshot`**,再 SA 做 impact-analysis,然后 BA → SA → RR。

---

## 阶段二:`/harness-apply [任务名] [用户反馈]`

> 目标:按 propose 的规格实现代码,逐棒验证,全 PASS 后 PM 收尾进入待归档。

```
Dev ──(developer hook verdict=PASS)──> CR ──> TE
        │                                 │      │
        │  REJECT/FAIL(bug)               │      │ FAIL(实现级) → 打回 Dev
        ▼                                 ▼      ▼ FAIL(需求级) → 改 proposal → 重跑 propose
  PM 轮次封顶:Dev 5 轮 / 其他 Worker 3 轮
  超限 → 暂停升级给人
  Re-run:board 为 AWAITING_ARCHIVE 时 PM 禁止改码,诊断归属后调度 developer
  tester hook 跑测试证据闭环 + verify + baseline
        │
        ▼  全 PASS 后 PM 收尾:
   1. check-harness.sh(Harness 完整性)
   2. 模板残留体检(grep deliverables/*.md)
   3. board 更新 → AWAITING_ARCHIVE
        │
        ▼
人工审批 2:审阅 deliverables/<任务名>/
        │
        ▼  用户确认后运行 /harness-archive
```

**apply 链路产出物**:

| 棒 | 角色 | 输入 | 输出文档 | 失败动作 |
|---|---|---|---|---|
| 开发实现 | Dev | requirements + design + tasks | dev-log.md + 代码 | hook verdict≠PASS → PM 重拉 Dev |
| 代码审查 | CR | 代码 + design | code-review.md(`## 结论 PASS/REJECT`) | REJECT → 按归属路由 |
| 测试验证 | TE | requirements 的 Scenario + 代码 | test-report.md(`## 结论 PASS/FAIL`) | FAIL(实现级)→ 打回 Dev;FAIL(需求级)→ 改 proposal 重跑 |

**轮次与回退**:
- Dev 最多 5 轮,CR/TE 各最多 3 轮。超限 → PM 暂停并升级给人。
- `developer hook`:Developer 停止后程序自跑测试 + `verify.sh`,退出码无法伪造。
- `tester hook`:TE 停止后跑测试证据闭环 + verify + baseline compare。

---

## 阶段三:`/harness-archive [任务名]`

> 目标:把本次变更合并进 specs(Source of Truth),归档交付物,闭环看板。

```
1. Spec Merge(ADDED / MODIFIED / REMOVED)
   └─ PM 把本次 delta 合并进 .harness/specs/<capability>/spec.md
2. Memory Merge(可复用经验 → memory/entries)
3. 证据预检 + mv 归档(deliverables/<任务> → _archive/<日期-任务名>/)
4. board 状态 → DONE(结论列写归档摘要)
5. check-harness.sh 终检(FAIL → PM 修)
   └─ 3 轮修不动则回滚并升级给人
```

---

## 七条铁律(流程纪律,PM 必须强制执行)

1. **下游不改上游制品**——方案觉得需求有问题,只能 BLOCK 让 PM 打回,不能自己改 requirements。
2. **PM 只做调度**——决定下一棒交给谁、何时停;不给技术建议、不替别人做专业判断。
3. **每一棒必须有文档产出**——写进 `deliverables/<需求名>/`,`## 结论 PASS` 才算交棒。
4. **跨命令边界不自主回退**——apply 发现需求问题,PM 必须升级给人,不能悄悄回 propose。
5. **FAIL = 阻塞**——verify.sh 的 FAIL 项阻塞交付;WARN 只记录不阻塞。
6. **心跳绑定单一工具**——每一步 PM 按实事务抛对应的 `[PM] ...` 心跳行。
7. **轮次封顶**——Dev 5 轮 / 其他 3 轮,超限即暂停升级给人,禁止无界重试。

---

## board.md 状态机(看板,全程真实来源)

```
PENDING → IN_PROGRESS(proposal) → [人工审批1]
       → IN_PROGRESS(开发实现) → IN_PROGRESS(代码审查) → IN_PROGRESS(测试验证)
       → AWAITING_ARCHIVE → [人工审批2] → DONE
```

- 任意棒 FAIL/REJECT/BLOCK → 阶段回退,但状态码保持 IN_PROGRESS(重试计数 +1)。
- `AWAITING_ARCHIVE`:全 PASS + PM 收尾完成,等待人工归档。此状态下 PM 禁止改码。
- `DONE`:归档完成,结论列写归档摘要。

详见 `.harness/workflow/transitions.json`。
