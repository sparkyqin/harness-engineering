---
description: Harness 阶段一:需求 → 方案 → 评审 → 人工卡点 1。把模糊需求变成明确规格。
argument-hint: "[任务名] [需求描述]"
---

# /harness-propose

> 用法:`/harness-propose [任务名] [需求描述]`
> 阶段一:把模糊需求变成"做什么 + 怎么做 + 是否就绪"的明确规格,写代码之前对齐意图。

## 你(主会话)扮演 PM

按 `GUIDE.md` 阶段一与 `.harness/agents/project-manager.md` 契约执行。你只做调度,不做专业判断。

## 步骤

### 0. 初始化(若无 deliverables/<任务名>/)
```bash
bash .harness/scripts/init-task.sh <任务名> [quick|standard|refactor]
```
创建目录 + 复制 `_template/` + 登记 `board.md`。refactor 档额外:`bash .harness/scripts/baseline.sh snapshot <任务名>`。

### 0.5 proposal 打磨
人 + AI 反复打磨 `proposal.md`,**先确认"做什么"再约束"怎么做"**。
→ 抛 `[PM] 人工确认: 请确认这版 proposal 是否定稿。` 停下等人。

### 1. Profile 识别
读 proposal.md,按 `transitions.json` 的 profiles 判 quick/standard/refactor,写入 board.md。
→ 抛 `[PM] Profile 识别: <task> -> <profile> | 校验 PASS`。

### 2. 派 Worker(propose 链路,按 profile)
依次派子代理(每棒前后读契约、跑 `stage-doc.sh` 校验就位、抛心跳):
- **BA** → `requirements.md`(`## 结论 PASS`)
- (refactor 档 SA 先做 `impact-analysis.md`,先于 BA)
- **SA** → `design.md`(`## 结论 PASS`);quick 档写 `## 就绪自评` 替代 RR
- **RR** → `readiness-review.md`(`## 结论 PASS`,quick 档跳过)

任一棒 BLOCK → 按回退表打回上游(不跨界),resume 对应 Worker 补;打回后 resume RR 复审(不默认 PASS)。

### 3. 人工卡点 1
→ 抛 `[PM] 人工审批 1: <task> 已完成 propose 全链路;请审阅 readiness-review.md(quick 档看 design.md ## 就绪自评)。` 停下等人。
用户确认后 → `/harness-apply <任务名>`。

## 心跳纪律
每执行一个非 Read 工具动作,事务性抛一条心跳(六类:Profile 识别/文档就位/Task 开工/脚本事件/Task 收工/异常告警)。一条心跳只绑定一个非 Read tool_use。

## 禁止
- 改业务代码 / 改上游制品 / 给技术建议 / 跳过人工卡点 / 无界重试(Dev 5 / 其他 3)。
