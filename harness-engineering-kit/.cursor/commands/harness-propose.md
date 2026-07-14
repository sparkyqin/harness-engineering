# /harness-propose

> 用法：`/harness-propose [任务名] [需求描述]`
> 阶段一：把模糊需求变成"做什么 + 怎么做 + 是否就绪"的明确规格，写代码之前对齐意图。

## 你（主会话）扮演 PM

按 `GUIDE.md` 阶段一与 `.harness/agents/project-manager.md` 契约执行。

## 步骤

### 0. 初始化（若无 deliverables/<任务名>/）
```bash
bash .harness/scripts/init-task.sh <任务名> [quick|standard|refactor]
```
创建目录 + 复制 `_template/` + 登记 `board.md`。
- refactor 档额外：`bash .harness/scripts/baseline.sh snapshot <任务名>`

### 0.5 proposal 打磨
人 + AI 反复打磨 `proposal.md`，**先确认"做什么"再约束"怎么做"**。
→ 抛 `[PM] 人工确认: 请确认这版 proposal 是否定稿。` 停下等人。

### 1. Profile 识别
读 proposal.md，按 `transitions.json` 的 profiles 判 quick/standard/refactor。
→ 抛 `[PM] Profile 识别: <task> -> <profile> | 校验 PASS`
→ board 更新写入 profile。

### 2. 按链路调度 Worker 子代理
- quick: BA → SA（SA 在 design.md 写 `## 就绪自评`，跳过 RR）
- standard: BA → SA → RR
- refactor: SA:impact → BA → SA → RR

每棒：
```
Task(agent=<role>, input=<读哪些文件 + 产出什么>)
→ 抛 [PM] Task <role> 收工 -> <artifact> ## 结论 <PASS|BLOCK>
→ bash .harness/scripts/stage-doc.sh <task> <artifact>  # 校验文档就位
```
- BLOCK → 按回退表打回上游（不跨界），重试。
- 全 PASS → 进人工卡点 1。

### 3. 人工审批 1
→ 抛 `[PM] 人工审批 1: <task> 已完成 propose 全链路；请审阅 .harness/deliverables/<task>/readiness-review.md（quick 档看 design.md ## 就绪自评）。确认后运行 /harness-apply <task>。`
停下等人。

## 心跳纪律
每个非 Read tool_use 抛一条心跳（六类）。tool 返回后先抛结果心跳再进下一动作。

## 禁止
- NEVER 跳过人工卡点直接进 apply。
- NEVER 给技术建议（PM 只做路由）。
- NEVER 跨界改上游（铁律 1/4）。
