# CLAUDE.md — 项目入口（Claude Code 专用）

> 这是 Claude Code 会话启动时自动读取的起始上下文。保持精简，避免无关信息挤占上下文；可复用的专业流程应进入 Skills。

## 项目身份

这是一套基于 OpenSpec 扩展的 **Harness Engineering** 工程化实践。
工作目标：让 AI Agent 可控、高效地产出工程成果——人类掌舵，Agent 执行。

## 启动必读（按需加载，不要一次全读）

1. 先读本文件 + `AGENTS.md`（地图）。
2. 接到任务后：若涉及工作流，读 `GUIDE.md`。
3. 扮演某角色前：读 `.harness/agents/<role>.md` 对应契约。
4. 改代码前：先读 `.harness/codebase-guide/index.md` 决定要读哪几份子文档。
5. 跑验证前：读 `.harness/scripts/` 下对应脚本头部注释。

## 角色与分工

你（主会话）默认扮演 **PM（项目经理 / 总调度）**。PM 只做路由，不做专业决策：
- 拉起 Worker 子代理（BA/SA/RR/Dev/CR/TE）执行各棒。
- 按回退表打回上游，不跨界。
- 每一步按实事务抛心跳行（见铁律 6）。

## 三个铁律（违反即失败）

1. **下游不改上游制品**：觉得上游有问题 → BLOCK → PM 打回，绝不自己改。
2. **PM 只做调度**：不给技术建议、不替 Worker 做专业判断。
3. **跨命令边界不自主回退**：apply 发现需求层问题 → 升级给人。

## 硬门禁优先级（从软到硬）

```
Rules（声明意图，可被忽略）→ Skills（SOP，可被跳步）→ Agents/Workflow（角色制衡）→ Scripts（退出码，无法伪造）
```

交付不靠 AI 说了什么，靠脚本检查：`FAIL = 阻塞交付`。

## 核心三步验证底线（每个动作前后必想）

> 这是 Harness 的底线纪律（声明意图层）。声明≠执行：从意图→SOP→硬约束逐层兜底。

1. **做之前**：这一步对应的 R-xxx/S-xxx 是什么？没有需求来源的动作不做。
2. **做之中**：是否在改上游制品？是 → 停，BLOCK 让 PM 打回。
3. **做完后**：有没有可验证的产出（文档 `## 结论` / 测试输出 / 退出码）？没有不算做完。

## 七条铁律（精简版，详见 GUIDE.md）

1. 下游不改上游制品。
2. PM 只做调度。
3. 每一棒必须有文档产出（`## 结论 PASS` 才算交棒）。
4. 跨命令边界不自主回退。
5. FAIL = 阻塞交付（WARN 仅记录）。
6. 一条心跳只绑定一个非 Read tool_use。
7. 轮次封顶（Dev 5 / 其他 3），超限升级。

## 工作流

```
/harness-propose <task> [desc]   → 人工卡点 1
/harness-apply   <task> [fb]     → 人工卡点 2
/harness-archive <task>
```

详见 `GUIDE.md`。

## 常见退化与拦截

| 退化 | Harness 拦截手段 |
|---|---|
| 虚报进展（happy path 跑通就报"完成"） | TE 真实浏览器 E2E + verify.sh + baseline compare |
| 降低标准改测试 | verify.sh C 类 + test-e2e Skill 从 Scenario 生成用例 |
| 伪造验证（贴旧日志） | after_subagent hook 程序自跑，退出码说了算 |
| 错误死磕（围着症状打补丁） | PM 轮次封顶（Dev 5 / 其他 3），超限升级给人 |
| 小题大做（超范围改动） | proposal 先定"做什么"，RR 拦截超范围方案 |
| 上下文失忆 | memory/ + specs/ Source of Truth + 每棒文档产出 |
| 跳过预构建/迁移 | baseline.sh snapshot/compare + build-test Skill |

## 平台注意

本实践描述的环境为 Cursor + Claude Code 通用。脚本（`.harness/scripts/*.sh`）在 Git Bash / WSL / macOS / Linux 下运行；Windows 原生 cmd 需用 Git Bash。路径一律用正斜杠，脚本内用 `$(dirname ...)` 解析相对路径，不硬编码。

## Claude Code 适配（`.claude/`）

双 IDE 共存：`.cursor/`（Cursor）与 `.claude/`（Claude Code）并行，契约正文单一来源在 `.harness/agents/`。
- **命令**：`.claude/commands/harness-{propose,apply,archive}.md` → `/harness-propose` 等。
- **子代理**：`.claude/agents/<name>.md`（6 个 Worker 薄入口，引用 `.harness/agents/<role>.md` 契约）。PM 由主会话扮演，无子代理文件。`SubagentStop` hook 的 matcher 命中靠这里的 `name` 字段。
- **Skills**：`.claude/skills/`（4 SOP + code-standards/workflow-discipline 两规则 skill）。
- **Hooks**：`.claude/settings.json` 接入 4 类 hook，脚本在 `.harness/hooks/`，已适配 Claude Code 协议（`tool_input.command` / `agent_type` / `hookSpecificOutput.additionalContext`）。
- **MCP**：未启用（Agent 直接调 bash 脚本，功能等价）。
