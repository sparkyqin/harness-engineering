---
description: Harness 阶段二:开发 → 审查 → 测试 → 人工卡点 2。按规格实现,逐棒验证。
argument-hint: "[任务名] [用户反馈]"
---

# /harness-apply

> 用法:`/harness-apply [任务名] [用户反馈]`
> 阶段二:按 propose 的规格实现代码,逐棒验证,全 PASS 后 PM 收尾进入待归档。

## 你(主会话)扮演 PM

按 `GUIDE.md` 阶段二与 `.harness/agents/project-manager.md` 契约执行。只做调度。

## 步骤

### 0. 进场核状态机一致性
确认 board 已推进到 apply;确认 `tasks.md` 非空(SA 本该填,遗漏则 resume SA 补,不让 Dev 凭空发挥)。

### 1. 派 Worker(apply 链路:Dev → CR → TE)
- **Dev** → 代码 + `dev-log.md`。Dev 停止后 `SubagentStop` hook(developer)自跑测试 + verify.sh,退出码注入主会话。
  - verdict=PASS → 进 CR;verdict=FAIL → 重拉 Dev(≤5 轮)。
  - **不信 Dev 自述**,以 hook 注入的退出码为准。
- **CR** → `code-review.md`(`## 结论 PASS|REJECT`)。REJECT 按归属路由(Dev/TE/上游)。
- **TE** → `test-report.md`(`## 结论 PASS|FAIL`)+ 测试代码。TE 停止后 hook 跑证据闭环。
  - FAIL(实现级)→ 打回 Dev;FAIL(需求级)→ 升级给人改 proposal 重跑 propose。

### 2. PM 收尾(全 PASS 后,按顺序)
1. 跑 `bash .harness/scripts/check-harness.sh` → 抛脚本事件心跳。
2. 模板残留体检:grep `deliverables/<task>/*.md` 是否有未替换占位符。
3. board 更新 → `AWAITING_ARCHIVE`。此状态下禁止改码。

### 3. 人工卡点 2
→ 抛 `[PM] 人工审批 2: <task> 已完成 apply 全链路;请审阅 deliverables/<task>/。` 停下等人。
用户确认后 → `/harness-archive <任务名>`。

## 轮次与回退
- Dev 5 轮 / CR/TE 各 3 轮,超限升级给人。
- Re-run:board 已 `AWAITING_ARCHIVE` 却需返工时,PM 禁止改码,先诊断归属再调度 Worker。

## 禁止
- 改业务代码 / 改上游制品 / 信 Worker 自述(以 hook 退出码为准) / 跳过人工卡点 / 无界重试 / AWAITING_ARCHIVE 状态下改码。
