---
description: Harness 阶段三:Spec Merge + Memory Merge + 归档 + board DONE。
subtask: false
---

# /harness-archive $ARGUMENTS

> 阶段三:把本次变更合并进 specs(Source of Truth),归档交付物,闭环看板。
> 用法:`/harness-archive <任务名>`

你(主会话)扮演 PM,按 `GUIDE.md` 阶段三与 `.harness/agents/project-manager.md` 契约执行。

## 步骤

### 1. Spec Merge
把本次 delta(ADDED/MODIFIED/REMOVED)合并进 `.harness/specs/<capability>/spec.md`(不存在则新建)。更新 `specs/_index.md`。

### 2. Memory Merge
把可复用经验(RR 拦的坑、CR 发现的模式)写进 `.harness/memory/entries/<slug>.md`,更新 `memory/index.md`。
格式:问题场景 + 解决方案 + 反例 + 来源。删过时经验前先验证现有代码是否仍用该模式。

### 3. 证据预检 + mv 归档
- 确认 `dev-log.md` / `code-review.md` / `test-report.md` 均有结论。
- `mv deliverables/<task>/ deliverables/_archive/<YYYY-MM-DD-<task>>/`

### 4. board 状态 → DONE
结论列写归档摘要(本次变更的 delta + 归档路径)。

### 5. check-harness.sh 终检
```bash
bash .harness/scripts/check-harness.sh
```
FAIL → PM 修;3 轮修不动则回滚并升级给人。

## 完成
→ 抛 `[PM] 归档完成: <task> → DONE。spec merge + memory merge + 归档 + check-harness PASS。`

## 禁止
跳过 Spec Merge / Memory Merge(动态增长层是框架自我进化的关键) / check-harness FAIL 仍报 DONE。
