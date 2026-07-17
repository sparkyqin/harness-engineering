# Subagent Orchestration — 子代理编排规则

> PM(Supervisor)如何派 Worker(Sub-agent)、如何收结论、如何在两套 agent(Claude Code / OpenCode)下对齐。

## 派 Worker 的四条铁律(并行前提)

多任务要并行得起来,前提是拆得对:
1. **文件不重叠** — 每个子代理给独立目录或文件清单,绝不共享。
2. **无强依赖** — B 不需要等 A 的输出,有依赖就串行(propose/apply 链路本就是串行接力)。
3. **Scope 明确** — 每个子任务一句话能讲清"做完是什么样"(五要素契约的完成条件)。
4. **主代理验证** — 子代理只交付,跑不跑测试、合不合格由主代理(PM)独立判定,不信任子代理自述。

反模式:同时改一个文件(merge 冲突);强依赖却并行("先建表再写 API"必须串行);一拆拆 10 个(token 爆炸,先三个起步)。

## 主代理验证 = harness 思维的缩影

子代理只交付,PM 不信自述:
- Dev 自报 PASS 不算 → developer hook 程序自跑测试 + verify.sh,退出码说了算。
- TE 自报 PASS 不算 → tester hook 程序自跑证据闭环 + verify + baseline。
- 这是第 4 层"退出码无法伪造"的体现。

## 双 agent 载体对齐

PM 派 Worker 在两套 agent 下语义等价,差异在载体与 hook 机制:

| 维度 | Claude Code | OpenCode |
|---|---|---|
| 派子代理 | Task 工具(subagent_type=角色) | task 工具(subagent_type=角色) |
| 角色定义 | `.claude/agents/<role>.md` | `.opencode/agents/<role>.md`(用 `{file:./.harness/agents/<role>.md}` 引用共享契约) |
| Dev 停止后自跑验证 | SubagentStop hook(matcher=developer) | plugin `tool.execute.after`(tool=task, args.subagent_type=developer) |
| TE 停止后自跑验证 | SubagentStop hook(matcher=test-engineer) | plugin `tool.execute.after`(args.subagent_type=test-engineer) |

两套载体都引用 IDE 无关的 `.harness/agents/<role>.md` 五要素契约 + `.harness/scripts/` 硬门禁。`.harness/` 是单一来源,`.claude/` / `.opencode/` 是载体。

## 五要素契约(每个 Worker 内嵌)

角色不是靠自然语言描述,是靠结构化字段约束(见 `.harness/agents/<role>.md`):
1. 身份宣言 — 我是谁、职责边界
2. 必读文件清单 — 精确到路径(多了浪费,少了缺)
3. 输出格式模板 — 固定结构,下游能解析
4. 禁止事项 — NEVER 标记红线
5. 完成条件 — 何时可停

`check-harness.sh` 校验每个 agent 文件里这些段落全不全——契约和角色绑定,元检查保证完整性。
