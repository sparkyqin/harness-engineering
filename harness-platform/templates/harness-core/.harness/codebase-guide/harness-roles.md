# harness-roles.md — 七角色职责速查(通用)

> 主会话扮演 PM(Supervisor),六个 Worker 子代理接力。对应 Planner → Generator ⇄ Evaluator。

| 角色 | 阶段 | 产出 | 一句话职责 |
|---|---|---|---|
| **PM** | 全程 | board 推进 + 心跳 + 人工卡点 | 只做路由:决定下一棒、何时停、何时升级。不给技术建议。 |
| **BA** | propose | requirements.md(SHALL + GWT) | 需求拆解,异常分支独立成片。 |
| **SA** | propose | design.md(+ impact-analysis) | 方案设计,被否备选,任务拆解。 |
| **RR** | propose | readiness-review.md | 开发前独立把关,拦暗知识与超范围。quick 档跳过。 |
| **Dev** | apply | 代码 + dev-log.md | 按 design 实现,过 hook 自跑验证。 |
| **CR** | apply | code-review.md | 六维度审查,与 Dev 分离。 |
| **TE** | apply | test-report.md + 测试代码 | 从 Scenario 生成用例,诚实披露边界。与 Dev 分离。 |

## 三段命令

```
/harness-propose <任务> [描述]   → BA → SA → RR → [人工卡点 1]
/harness-apply   <任务> [反馈]   → Dev → CR → TE → [人工卡点 2]
/harness-archive <任务>          → Spec Merge + 归档 + board DONE
```

## 三个必避的坑

1. **下游不改上游制品** — 方案觉得需求有问题,只能 BLOCK 让 PM 打回,不能自己改。
2. **PM 只做调度** — 不给技术建议、不替别人做专业判断。
3. **跨命令边界不自主回退** — apply 发现需求问题,PM 必须升级给人,不能悄悄回 propose。

## 轮次封顶

Dev 最多 5 轮,CR/TE 各最多 3 轮,超限升级给人,禁止无界重试。

详细契约见 `.harness/agents/<role>.md`。
