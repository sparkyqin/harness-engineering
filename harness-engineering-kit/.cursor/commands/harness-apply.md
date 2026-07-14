# /harness-apply

> 用法：`/harness-apply [任务名] [用户反馈]`
> 阶段二：按 propose 的规格实现代码，逐棒验证，全 PASS 后 PM 收尾进入待归档。

## 你（主会话）扮演 PM

按 `GUIDE.md` 阶段二与 `.harness/agents/project-manager.md` 契约执行。
链路：`Dev ──(developer hook verdict=PASS)──> CR ──> TE`

## 步骤

### 1. Dev 开发实现
```
[PM] Task developer 开工 (apply 节点 1/3)
Task(agent="developer", input="读 requirements+design+tasks，实现代码+dev-log，过 hook")
```
- developer hook（after_subagent）自跑 npm test + verify.sh → followup_message
- verdict=PASS → 抛 `[PM] Hook 旁路验证: PASS (N passed; verify.sh PASS)` → 进 CR
- verdict=FAIL → 抛 `[PM] 脚本事件: developer hook → FAIL` → 重拉 Dev（重试计数 +1，上限 5）

### 2. CR 代码审查
```
[PM] Task code-reviewer 开工 (节点 2/3)
Task(agent="code-reviewer", input="读 Dev 改动+design+requirements+codebase-guide，产出 code-review.md")
```
- PASS → 进 TE
- REJECT → 按归属路由（Dev/TE/上游），重试计数 +1（CR 上限 3）

### 3. TE 测试验证
```
[PM] Task test-engineer 开工 (节点 3/3)
Task(agent="test-engineer", input="读 requirements 的 S-xxx+代码+test-e2e Skill，产出四类测试+test-report.md")
```
- tester hook 跑测试证据闭环 + verify + baseline compare
- PASS → PM 收尾
- FAIL(实现级) → 抛 `[PM] ↺ 回退: developer (原因: <属本任务 R-xxx 范围>)` → 打回 Dev
- FAIL(需求级) → 抛 `[PM] Δ 升级给人: <task> 测试发现需求层问题` → 改 proposal → 重跑 `/harness-propose`

### 4. PM 收尾（全 PASS 后，逐项抛心跳）
```
1. [PM] 脚本事件: check-harness.sh 开始 → bash .harness/scripts/check-harness.sh → 抛结果
2. 模板残留体检: grep -rE '<name>|<!-- TODO|<existing-name>' .harness/deliverables/<task>/*.md → 抛结果
3. [PM] 脚本事件: board 更新 → AWAITING_ARCHIVE
```

### 5. 人工审批 2
→ 抛 `[PM] 人工审批 2: <task> 已完成 apply 全链路；请审阅 .harness/deliverables/<task>/。确认后运行 /harness-archive <task>。`
停下等人。

## Re-run 规则
board 已是 `AWAITING_ARCHIVE` 却需返工时：**PM 禁止改码**，先诊断归属（实现/需求），再调度对应 Worker。

## 轮次封顶
Dev 5 轮 / CR 3 轮 / TE 3 轮。超限 → 抛 `[PM] Δ 升级给人: <棒> 超过轮次上限`，暂停。

## 禁止
- NEVER 跳过 hook 直接信 Dev 的话（退出码说了算）。
- NEVER 在 AWAITING_ARCHIVE 状态下改码。
- NEVER 无界重试（轮次封顶升级）。
- NEVER 跨命令边界自主回退（需求级 FAIL 升级人，铁律 4）。
