# Harness Platform 架构

> 本文件是平台自身的架构说明。生成出来的 harness 套件的设计见 `templates/harness-core/` 各文件内注释与上游 [PLAN.md](../../PLAN.md)。

## 1. 三层职责

```
┌─────────────────────────────────────────────────────┐
│  app/  Tauri+React GUI                              │  一步步引导,预览,review
│   ├─ main (Rust): 文件IO/子进程/读代码               │  M1 起填
│   └─ renderer (React): 向导 UI                      │
├─────────────────────────────────────────────────────┤
│  core/  生成流水线(与 UI 解耦,可被 CLI 复用)        │
│   detect → scaffold → fill → carriers → validate   │  M0 编排骨架,L1+ 实现
├─────────────────────────────────────────────────────┤
│  templates/  静态骨架源(从头重写,去项目特异化)     │  M0 主体
│   harness-core / carrier-claude / carrier-opencode  │
└─────────────────────────────────────────────────────┘
```

GUI 只调 `core/generate(opts)`,`core` 不依赖 GUI。未来要加 CLI,直接复用 `core`。

## 2. 生成流水线

| 阶段 | 输入 | 输出 | 依赖模型? | Level 起填 |
|---|---|---|---|---|
| detect | projectRoot | project-profile.json | 否(纯探测) | L1 |
| scaffold | {root, level, profile} | .harness/ 静态文件 | 否 | L1 |
| fill | {root, profile, llmKey} | 项目特异内容 | **可选**(无 key 跳过,退化基线) | L2 |
| carriers | {root, agents, level} | .claude/ + .opencode/ | 否 | L2 |
| validate | projectRoot | check-harness 结果 | 否 | L1 |

## 3. 静态 vs 项目特异的边界

`templates/harness-core/` 里 ~85% 是静态通用(四层骨架/角色契约/状态机/脚本框架/文档模板),直接拷贝。项目特异的只有:

| 项目特异内容 | 谁填 | 怎么填 |
|---|---|---|
| codebase-guide 5 份(overview/arch/deps/recipes) | AI 或人 | AI 产结构化段落,平台按模板填;无 AI 留空模板带指引 |
| verify.sh A/C 检查项 | AI 或人 | AI 产 `{id,category,severity,type,pattern,desc}`,平台渲染成 shell |
| AGENTS.md 项目描述 | AI 或人 | AI 产段落填入框架 |

**AI 产数据,平台产脚本**——AI 不直接写 shell,避免语法错;AI 产出必经 GUI review,不静默写入。

## 4. 双 agent 载体映射

两套载体都引用 IDE 无关的 `.harness/` 核心,差异在 hooks 机制:

| 维度 | Claude Code (`.claude/`) | OpenCode (`.opencode/`) |
|---|---|---|
| 指令 | CLAUDE.md | AGENTS.md(亦认 CLAUDE.md) |
| 角色 | agents/*.md(frontmatter name/desc/model) | agents/*.md(frontmatter desc/mode/permission) + `{file:...}` 引用 |
| 命令 | commands/*.md | commands/*.md(template/$ARGUMENTS/`!cmd`) |
| Skills | skills/*/SKILL.md | skills/(兼容 Claude 格式) |
| **Hooks** | settings.json:SubagentStop/PostToolUse/PreToolUse/SessionStart | **plugins/harness-hooks.ts**(tool.execute.before/after + session.created) |

### OpenCode hooks 关键事实(2026-07-17 源码确认)
- 子代理经 `task` 工具发起,目标 agent 标识字段 = **`args.subagent_type`**(非 agent/description)。
- `tool.execute.after` input = `{tool, sessionID, callID, args}`,output = `{title, output, metadata}`。
- `tool.execute.before` 抛错 = 阻止执行(等价 Claude hook exit 2)。
- plugin 用 `$`(Bun shell)自跑验证脚本读 exitCode——退出码无法伪造,与 Claude hook 同构。

## 5. Level 分级(向后兼容,升 Level 只追加)

| Level | 新增 | 即时价值 |
|---|---|---|
| L1 | AGENTS.md + verify.sh(最小通用检查)+ check-harness.sh | agent 有地图;交付有退出码判据 |
| L2 | 4 Skills + 双载体骨架 + AI 填 codebase-guide | SOP 固化;知识地图 |
| L3 | 七角色 + 状态机 + 三命令 | 角色制衡 Planner→Generator⇄Evaluator |
| L4 | baseline + hooks(Claude)/plugin(OpenCode)+ verify 完整 + memory | 退出码无法伪造,完整四层 |

## 6. 设计原则(从 kit 继承的已验证实践)
- scripts:`set -uo pipefail` + `$(dirname)` 路径解析 + rg→grep 降级
- hooks 用 `.cjs` 后缀(项目根常 `type:module`,`.js` 会被当 ESM 致 require 报错)
- `.harness/` 是 IDE 无关单一来源;`.claude`/`.opencode` 是载体
- FAIL 阻塞交付,WARN 只记录;退出码 0/1 硬判定
