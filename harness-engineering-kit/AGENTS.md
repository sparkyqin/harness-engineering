# AGENTS.md — 项目入口

> 这是 AI Agent 读的第一份文件。保持精简，只放地图与关键"坑点"。详细规则见 `.cursor/rules/`，专业流程见 `.cursor/skills/`，角色契约见 `.harness/agents/`。

## 这是什么

本项目是一套 **Harness Engineering** 工程化落地实践，基于 OpenSpec 扩展而来。
核心理念：`Agent = Model + Harness`。模型决定上限，Harness 决定底线。
本 Harness 用"四层防线 + 角色接力 + 硬门禁脚本"把"是否完成"从 Agent 的主观汇报，变成可检查的客观成果。

## 仓即事实源（Repo is the Source of Truth）

- 一切必须入仓库：代码、Markdown、可执行计划、决策记录 → 全部版本化。
- 禁止依赖：Google Docs / Slack 聊天 / 人脑中的知识 / 临时口头指令。
- Agent 看不到的 = 不存在的。

## 目录地图（先读这个，按需深入）

```
AGENTS.md / CLAUDE.md          ← 你正在读的入口
.cursor/                       ← Cursor IDE 配置（rules/skills/agents/commands/hooks/mcp）
.claude/                       ← Claude Code 等价配置（commands/agents/skills/settings.json）
  ├── commands/                ← 斜杠命令：harness-propose / harness-apply / harness-archive
  ├── agents/                  ← 第3层 Worker 子代理入口（BA/SA/RR/Dev/CR/TE，引用 .harness/agents 契约）
  ├── skills/                  ← 第2层 Skills（build-test/post-verify/code-review/test-e2e + code-standards/workflow-discipline）
  └── settings.json            ← Hooks 配置（SubagentStop/PostToolUse/PreToolUse/SessionStart）
.harness/                      ← 核心工程工作流目录（IDE 无关，单一来源）
  ├── agents/                  ← 7 个角色定义（含 PM），每个内嵌五要素契约
  ├── hooks/                   ← Hook 实现（guard-dangerous / verify-after-developer / tester-evidence / format-on-edit）
  ├── workflow/                ← flow-definition / transitions.json / subagent-orchestration
  ├── scripts/                 ← 第4层 Scripts 硬门禁：verify.sh / baseline.sh / check-harness.sh / init-task.sh ...
  ├── specs/                   ← 系统能力 Source of Truth（随交付 merge）
  ├── deliverables/            ← 任务文档产出 + _template + _archive
  ├── codebase-guide/          ← 模块化知识地图（6 个子文档）
  └── memory/                  ← 记忆库（entries / templates / index.md）
mcp-server/                    ← 8 个 MCP 工具接口（可选增强，非硬依赖；Claude Code 默认未启用）
GUIDE.md                       ← 工作流总览（propose / apply / archive 三阶段）
```

> 双 IDE 共存：`.cursor/` 给 Cursor，`.claude/` 给 Claude Code，二者都引用 `.harness/` 下的契约与脚本（单一来源）。详见 CLAUDE.md「Claude Code 适配」段。

## 工作流三步（记住这个就够了）

```
/harness-propose <任务名> [需求描述]   → 需求 → 方案 → 评审 → [人工卡点 1]
/harness-apply   <任务名> [用户反馈]   → 开发 → 审查 → 测试 → [人工卡点 2]
/harness-archive <任务名>              → Spec Merge + 归档 + board DONE
```

## 三个必避的坑

1. **下游不改上游制品**：方案觉得需求有问题，只能 BLOCK 让 PM 打回，不能自己改 proposal。
2. **PM 只做调度**：决定下一棒交给谁、何时停；不给技术建议、不替别人做专业判断。
3. **跨命令边界不自主回退**：apply 阶段若发现需求层问题，PM 必须升级给人，不能自己悄悄回 propose。

## 详细指引

- 工作流总览与铁律：见 `GUIDE.md`
- 角色契约与调度：见 `.harness/agents/project-manager.md`（PM 是主控）
- 状态机与流转：见 `.harness/workflow/transitions.json`
- 质量门禁清单：见 `.harness/scripts/verify.sh`
- 代码库知识地图：见 `.harness/codebase-guide/index.md`

## 与 OpenSpec 的关系

本 Harness 复用了 OpenSpec 的核心思想（specs 作为 Source of Truth、proposal → apply → archive 三段式、SHALL/GWT 格式、delta merge），并在此基础上扩展了：
- **角色制衡**（PM + BA/SA/RR/Dev/CR/TE 七角色接力）
- **轮次封顶与回退表**（防止 Agent 死磕与无界重试）
- **硬门禁脚本**（verify.sh / baseline.sh / check-harness.sh）
- **模块化知识地图 + 记忆库**（动态增长层）
