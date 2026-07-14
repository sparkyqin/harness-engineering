---
description: Harness 阶段三：Spec Merge + 归档交付物 + board DONE。
argument-hint: "[任务名]"
disable-model-invocation: true
---

# /harness-archive

> 用法：`/harness-archive [任务名]`
> 阶段三：把本次变更合并进 specs（Source of Truth），归档交付物，闭环看板。

## 你（主会话）扮演 PM

按 `GUIDE.md` 阶段三与 `.harness/agents/project-manager.md` 契约执行。

## 步骤（逐项抛心跳）

### 1. Spec Merge（ADDED / MODIFIED / REMOVED）
把本次 delta 合并进 `.harness/specs/<capability>/spec.md`：
- ADDED → 追加到主 spec
- MODIFIED → 替换旧 Requirement（整块）
- REMOVED → 删除（须有 Reason + Migration）
- 更新 `specs/_index.md` 能力清单（若新增 capability）。

### 2. Memory Merge
评估本次任务是否有可复用经验 → 写入 `.harness/memory/entries/`（用 `templates/entry.md` 格式：问题场景+解决方案）。
- 更新 `memory/index.md` 索引。

### 3. 证据预检 + mv 归档
```bash
bash .harness/scripts/project-backup.sh <task>          # 归档前备份
mv .harness/deliverables/<task> .harness/deliverables/_archive/<YYYY-MM-DD-task>
```

### 4. board 状态 → DONE
更新 `board.md` 对应行：状态码 `DONE`，阶段 `交付完成`，结论列写归档摘要。

### 5. check-harness.sh 终检
```bash
bash .harness/scripts/check-harness.sh
```
- PASS → 抛 `[PM] 归档完成: <task> → _archive，board DONE`
- FAIL → PM 修 Harness 结构；**3 轮修不动则回滚（从 .backups 恢复）并升级给人**。

## 禁止
- NEVER 在 check-harness 终检 FAIL 时强行标 DONE。
- NEVER 跳过 Spec Merge（specs 是 Source of Truth，新任务依赖它）。
- NEVER 删除可复用经验而不写入 memory（动态增长层是框架自我进化的关键）。

## 完成条件
- specs 已 merge，_index 更新。
- memory entries 更新（若有经验）。
- deliverables 已 mv 到 _archive。
- board 行为 DONE。
- check-harness.sh 终检 PASS。
