# Subagent Orchestration — 子代理调度手册

> PM（主会话）如何拉起、传递、回收 Worker 子代理。
> 适配 Cursor（`.cursor/agents/`）与 Claude Code（`.claude/agents/`）两种 IDE。

## 子代理运作机制

```
构建方式：.cursor/agents/<name>.md  (或 .claude/agents/<name>.md)
          --- frontmatter (name/description/tools/model) ---
          （Markdown 正文：角色契约，见 .harness/agents/<role>.md）

调用流程（Task 工具）：
  1. 主会话(PM) 调用 Task(agent="developer", input=<上游产出>)
  2. IDE 创建新的独立上下文窗口
  3. Sub-agent 加载自己的 .md 契约 + 必读文件
  4. Sub-agent 独立执行（看不到主会话历史 → 上下文隔离）
  5. 执行结束，结果摘要返回主会话
  6. PM 读结果 → 抛心跳 → 决定下一棒
```

## 上下文隔离的意义

- 每个 Sub-agent 有独立上下文窗口，不互相污染。
- 主会话上下文不被 Worker 的细节操作撑满——只回传摘要。
- 类比微服务：进程隔离 + 接口通信，而非共享内存。
- 长期状态外部持久化（文件：deliverables/、board.md、memory/），不依赖会话记忆。

## 契约设计五必备字段

每个 Worker 的 `.harness/agents/<role>.md` 内嵌：

1. **身份宣言**——我是谁、职责边界
2. **必读文件清单**——精确到路径（多了浪费，少了缺）
3. **输出格式模板**——固定结构，下游能解析（PM 据此判定结论）
4. **禁止事项**——用 NEVER 标记红线
5. **完成条件**——什么情况下可以停止

## 调度模板（PM 用）

### propose 链路（standard 档示例）

```
# 1. Profile 识别（PM 自行，不拉子代理）
读 proposal.md → 判 profile → board 写 profile → 抛心跳

# 2. BA
Task(agent="business-analyst",
     input="读 .harness/deliverables/<task>/proposal.md + .harness/specs/ + codebase-guide/overview.md，
           产出 requirements.md，末尾 ## 结论 PASS")
→ 收 requirements.md → 抛 [PM] Task business-analyst 收工 -> requirements.md ## 结论 PASS

# 3. SA
Task(agent="solution-architect",
     input="读 requirements.md + specs + codebase-guide/{backend,frontend}-arch.md，
           产出 design.md 含 ## 就绪自评，末尾 ## 结论 PASS")
→ 抛收工心跳

# 4. RR (standard/refactor)
Task(agent="readiness-reviewer",
     input="读 requirements.md + design.md + specs + codebase-guide，
           产出 readiness-review.md，六项评审，末尾 ## 结论 PASS")
→ 抛收工心跳 → 抛 [PM] 人工审批 1
```

### apply 链路

```
# 1. Dev
[PM] Task developer 开工 (apply 节点 1/3)
Task(agent="developer", input="读 requirements+design+tasks，实现代码+dev-log，过 hook")
→ after_subagent hook 自跑 npm test + verify.sh → followup_message
→ [PM] Hook 旁路验证: PASS (N passed; verify.sh PASS)  或  FAIL → 重拉 Dev (cap 5)

# 2. CR
[PM] Task code-reviewer 开工 (节点 2/3)
Task(agent="code-reviewer", input="读 Dev 改动 + design + requirements + codebase-guide，
                                产出 code-review.md ## 结论 PASS/REJECT")
→ PASS 进 TE / REJECT 按归属路由

# 3. TE
[PM] Task test-engineer 开工 (节点 3/3)
Task(agent="test-engineer", input="读 requirements 的 S-xxx + 代码 + test-e2e Skill，
                               产出四类测试 + test-report.md ## 结论 PASS/FAIL+归属")
→ tester hook 跑证据闭环 →
   PASS → PM 收尾 (check-harness + 模板体检 + board AWAITING_ARCHIVE + 人工审批 2)
   FAIL(实现级) → 打回 Dev
   FAIL(需求级) → 升级人改 proposal
```

## 嵌套限制注意

- Cursor Sub-agent 内部无法再拉起其他 Sub-agent。
- Claude Code 的 Task tool 没有嵌套限制，但仍建议保持单层（PM → Worker），避免复杂度。
- 本 Harness 设计为**单层 Supervisor/Worker**：PM 拉 Worker，Worker 不再拉子代理。

## 上下文管理（最易出错）

- 必读清单太多 → 上下文窗口被挤占，Agent 表现下降。
- 必读清单太少 → 缺关键信息，输出跑偏。
- 传递上下文时选择：完整原文 vs 压缩摘要（长会话用压缩）。
- 多次 Agent 切换 → 上下文增长快 → 用文件持久化（deliverables/）+ 摘要回传。

## 工程实践

- **可靠性**：验证 Worker 输出格式后再传递给下一棒（低置信度/格式错误会级联传播）。
- **成本与安全**：为每个 Agent 分配匹配复杂度的模型（PM 中等档，BA/SA/RR/Dev/CR/TE 旗舰档）；最小权限（Worker 只访问需要的资源）。
