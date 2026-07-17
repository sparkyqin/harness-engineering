# Harness Platform — 实现方案

> 目标:做一个**开箱即用、交互式 CLI 一步步引导**的平台,读完用户项目 → 生成适配该项目的 harness 套件 → 在 **Claude Code + OpenCode** 主流 agent 下可用。按 **Level 1→4 分级渐进**交付。定制机制 = **静态骨架(确定)+ AI 填项目特异(可选,AI 不可用退化静态基线)**。

---

## 0. 关键事实(已核实,决定架构)

### 0.1 kit 结构:静态 vs 项目特异的边界(生成的核心)
现有 `harness-engineering-kit/` 共 ~108 文件。切开:

| 类别 | 内容 | 静态(可原样拷贝) | 项目特异(需 detect/fill) |
|---|---|---|---|
| 四层骨架 | Rules/Skills/Agents+Workflow/Scripts 的**框架与流程** | ✅ 全部 | — |
| 七角色契约 | `.harness/agents/*.md` 五要素(身份/输入/输出/禁止/完成) | ✅ 全部 | — |
| 状态机 | `workflow/transitions.json` + 回退表 + 轮次封顶 | ✅ 全部 | — |
| 脚本框架 | `verify.sh`/`baseline.sh`/`check-harness.sh`/`init-task.sh` 的**结构** | ✅ 框架 | 检查**项** A1-A8/C1-C6 |
| 模板 | `deliverables/_template/*.md` | ✅ 全部 | — |
| `codebase-guide/` | overview/backend-arch/frontend-arch/deps/harness-roles/dev-recipes | harness-roles ✅ | 其余 5 份 |
| `dev-recipes.md` | "如何加 API/Screen/Model" | — | ✅ 全部 |
| `AGENTS.md`/`GUIDE.md` | 入口与工作流总览 | ✅ 框架 | 项目名/栈描述 |

**结论**:`.harness/` 核心 + 角色契约 + 状态机 + 脚本框架 + 模板 = **确定可拷贝**(占 ~85% 文件)。真正"读项目才有"的只有:**codebase-guide 5 份 + verify.sh A/C 检查项 + dev-recipes + AGENTS.md 项目描述**。这正是"静态骨架 + AI 填特异"的可行性基础。

### 0.2 目标 agent 载体映射(Claude Code + OpenCode)

| 维度 | Claude Code | OpenCode |
|---|---|---|
| 项目指令 | `CLAUDE.md`(会话启动自动读) | `AGENTS.md`(同义,OpenCode 也认 CLAUDE.md 作 fallback) |
| 角色子代理 | `.claude/agents/<role>.md`(frontmatter: name/description/model/tools) | `.opencode/agents/<role>.md`(frontmatter: description/mode/prompt/permission/model) |
| 命令 | `.claude/commands/*.md` | `.opencode/commands/*.md`(frontmatter: template/description/agent/subtask + `$ARGUMENTS`/`$1`/`` !`cmd` ``) |
| Skills | `.claude/skills/<name>/SKILL.md`(frontmatter description) | `.opencode/skills/`(兼容 Claude Code skills 格式) |
| **Hooks** | ✅ `.claude/settings.json`:SubagentStop/PostToolUse/PreToolUse/SessionStart | ✅ **plugin**(JS/TS 模块,放 `.opencode/plugins/`) |
| 共享契约 | 引用 `.harness/` 路径 | `{file:./.harness/agents/xxx.md}` 语法引用 |

**OpenCode hooks 实现方式**(核实自 opencode.ai/docs/plugins + permissions):OpenCode **有完整 plugin hook 系统**,比 Claude Code 的声明式 settings.json 更强。plugin 是导出函数的 JS/TS 模块,返回 hooks 对象;放在 `.opencode/plugins/` 启动自动加载;用 `$`(Bun shell)跑命令。可用事件:

| OpenCode 事件 | 对应 Claude Code hook | kit 用途 |
|---|---|---|
| `tool.execute.before` | PreToolUse(matcher=Bash) | guard-dangerous 拦危险命令(抛错阻止执行 = exit 2) |
| `tool.execute.after` | PostToolUse(Write\|Edit) | format-on-edit 跑 prettier |
| `tool.execute.after`(tool===task,按 agent 名路由) | SubagentStop(developer / test-engineer) | verify-after-developer / tester-evidence 自跑验证 |
| `session.created` | SessionStart | 加载上下文 |

> 还可用 `session.idle`(会话空闲)、`file.edited`(文件改动)等——kit 不需要,但 Level 4 扩展时可利用。

**关键设计:复用 `.harness/hooks/*.cjs`,plugin 只做事件桥接**。OpenCode 侧不重写验证逻辑,plugin 在 `tool.execute.after` 里用 `$` 自跑薄包装脚本 `verify-after-developer.sh`(内部调同名 `.cjs`),读退出码注入主会话。`.harness/hooks/` 保持 IDE 无关单一来源,与 kit "`.harness/` 是核心"原则一致。

**SubagentStop 的等价**:OpenCode 无 `SubagentStop` 事件,但子代理调用经 `task` 工具发起,在 `tool.execute.after` 判定 `input.tool === "task"` 且 agent 名匹配即等价"该子代理停止后"。

**⚠️ 唯一实测项**:`task` 工具 args 里 agent 标识字段的确切名字文档未明示。生成器代码用 `args.agent ?? args.description` 兜底,需在真实 OpenCode 跑一次确认——**这是 Level 4 唯一不确定性,不影响 Level 1-3**。

### 0.3 AI 填特异的"退化"承诺(用户选的混合机制)
- 无 API key / 用户跳过 AI → 只产出**静态基线**:通用四层 + 角色契约 + 状态机 + verify.sh **最小通用检查**(目录结构/无 console.log 残留/构建能过 这类栈无关项)+ codebase-guide 的**空模板带填写指引**。Level 1-2 仍完整可用。
- 有 API key → AI 读完项目,追加**项目特异**检查项与 codebase-guide/dev-recipes 真实内容。AI 产出**必经人工 review 步骤**(交互式 CLI 内逐项确认),不静默写入。

---

## 1. 平台形态:交互式 CLI

交付形态为**交互式 CLI**(非 GUI)。CLI 是一次性生成器:读用户项目 → 生成 harness 套件写进仓库 → 退出。生成后用户在 agent(Claude Code/OpenCode)里跑 `/harness-propose`,CLI 不再参与(时序接力,不同时运行)。

**为什么 CLI 而非 GUI**:
1. **低频一次性工具**——用户生成完就用不上了,GUI 的开发/分发成本对一次性工具不划算。GUI 价值在常驻使用,这里没有。
2. **目标用户是开发者,同类工具全 CLI**——Spec Kit `specify init` / OpenSpec `openspec init` / BMAD `npx bmad-method install` / Claude Code `/init` 无一例外。开发者本就在终端工作。
3. **核心操作是 CLI 主场**——读代码、写仓库、跑 bash 子进程、调 LLM API。GUI 要套壳调同样逻辑。
4. **强先例:shadcn CLI**——同场景(读项目→生成配置→写仓库→组件选择),用交互式 CLI(clack)成功。
5. **CLI 独立性是设计原则**——agent 无关(不依赖用户装了哪个 agent)、可脚本化(进 CI/新项目自动生成)、无循环依赖(不靠 agent 生成 harness)。GUI 不带来额外价值,反增窗口开关负担。

**CLI 与 agent 的边界**:CLI 调 LLM 只在 fill 阶段(可选,填项目特异);agent 调 LLM 在运行时(角色接力)。两者时序接力,不互相调用。详见 [docs/llm-providers.md](harness-platform/docs/llm-providers.md) 与 [docs/architecture.md](harness-platform/docs/architecture.md)。

形态:

```
harness-platform/
├── core/                     # 平台核心逻辑(与 UI 解耦)
│   ├── detect/               # 项目探测(语言/栈/入口/测试框架/构建)
│   ├── scaffold/             # 静态骨架拷贝(从 templates/ 拷到目标项目)
│   ├── fill/                 # AI 填特异(prompt 模板 + 调 LLM + 写文件,可选)
│   ├── carriers/             # 双 agent 载体生成(.claude / .opencode)
│   ├── validate/             # 生成后跑 check-harness.sh 自检
│   ├── wizard.js             # 交互式向导(clack,给人用)
│   └── cli.js                # 参数式 CLI(给脚本/CI 用)
├── templates/                # 静态骨架源(从头重写,去项目特异化)
│   ├── harness-core/         # .harness/ 通用核心(角色/状态机/脚本框架/模板)
│   ├── carrier-claude/       # .claude/ 载体模板
│   └── carrier-opencode/     # .opencode/ 载体模板
└── docs/                     # 平台自身文档
```

**分发**:`npx create-harness` 一条命令,零安装。core 逻辑 wizard.js(交互)与 cli.js(参数)并存,复用同一 `generate()`。

---

## 2. 分级渐进路线(Level 1→4)

用户选了**分级渐进**。每级是一个可独立交付、即时可用的台阶,契合笔记"成熟度模型 Level 0-4"与"落地路径先补 1+4 层"。

### Level 1:Rules + 最小 verify(开箱即用,零模型依赖)
**生成物**:`AGENTS.md`/`CLAUDE.md`(项目地图)+ `verify.sh`(栈无关最小检查)+ `.harness/scripts/check-harness.sh`。
**向导步骤**:选项目目录 → 自动 detect 栈 → 预览 AGENTS.md → 确认 → 写入。
**即时价值**:agent 进项目有地图;交付有客观判据(退出码)。对应笔记 Level 1-2。

### Level 2:Skills 下沉 + 双载体骨架
**新增**:4 个 Skill(build-test/post-verify/code-review/test-e2e)+ `.claude/` & `.opencode/` 载体(agents/commands/skills 目录结构)+ AI 填 codebase-guide 5 份(dev-recipes 优先)。
**向导步骤**:在 Level 1 基础上勾选要生成的 Skills → (可选)接入 LLM key 让 AI 读项目填 codebase-guide → 人工 review AI 产出 → 写入。

### Level 3:角色分工 + 状态机
**新增**:七角色 `.harness/agents/*.md`(五要素契约)+ `workflow/transitions.json` + 回退表 + 轮次封顶 + `board.md` + `init-task.sh` + 三命令(propose/apply/archive)+ 双载体的 command/agent 映射。
**即时价值**:多 agent 角色制衡,Planner→Generator⇄Evaluator。对应 Level 3。

### Level 4:硬门禁闭环 + 双 agent hooks 等价
**新增**:`baseline.sh` + verify.sh A/B/C 完整检查项(AI 填项目特异部分)+ memory 库骨架 + **两套等价的 hooks 载体**:

- **Claude Code**:`.claude/settings.json` 注册 SubagentStop(developer/test-engineer)/PostToolUse(Write|Edit)/PreToolUse(Bash)/SessionStart,指向 `.harness/hooks/*.cjs`(现有 kit 已验证)。
- **OpenCode**:`.opencode/plugins/harness-hooks.ts` 一个 plugin 文件实现全部四个等价 hook(`tool.execute.before` 拦危险命令 / `tool.execute.after` 格式化 + 子代理停止自跑验证 / `session.created` 加载上下文),用 `$` 自跑薄包装脚本读退出码注入主会话。
- **共享**:`.harness/scripts/` 新增 `verify-after-developer.sh`、`tester-evidence.sh` 两个薄包装(内部调同名 `.cjs`),两个 agent 共用同一份验证逻辑——退出码无法伪造的本质在两侧都成立。

**即时价值**:退出码无法伪造,完整四层防线,**两个 agent 上等价**。对应 Level 4。

> Level 之间**向后兼容**:升 Level 只追加文件,不破坏已生成的低层。

---

## 3. 三大核心模块设计

### 3.1 detect(项目探测)——静态、确定、无模型
输入:项目根目录。产出:`project-profile.json`:
```json
{
  "languages": ["js","jsx"], "primary": "javascript",
  "runtime": "node", "pkgManager": "npm",
  "frameworks": {"backend": "express", "frontend": "react", "orm": "mongoose"},
  "entryFiles": ["backend/server.js"], "srcDirs": ["backend","frontend/src"],
  "testFramework": "jest", "testCmd": "npm test", "buildCmd": "npm run build",
  "isMonorepo": false, "esm": true, "moduleSystem": "esm"
}
```
**手段**:读 `package.json`/`pyproject.toml`/`go.mod` 等 → 依赖指纹;探测入口文件存在性(复用 kit verify.sh 里 `ENTRY_FILES`/`SRC_DIRS` 的探测思路);读 test/build script。**纯脚本逻辑,确定性**,是 AI 填特异的**事实输入**。

### 3.2 scaffold(静态骨架拷贝)——从 templates/ 拷到目标
把现有 kit **去项目特异化**后存进 `templates/harness-core/`:
- 角色契约、状态机、脚本框架、模板**原样保留**(它们本就通用)。
- `verify.sh` 拆成 **框架 + 检查项注册表**:框架是静态,检查项由 `project-profile.json` + AI 决定挂哪些。通用最小检查项(目录存在/构建过/无 console.log)始终挂;项目特异项(路由入入口/injectEndpoints/timestamps)按栈 + AI 填。
- `codebase-guide/` 保留 `index.md`+`harness-roles.md`(通用),其余 5 份留**带填写指引的空模板**(AI 填或人填)。

### 3.3 fill(AI 填项目特异)——可选,有 key 才跑
**输入**:`project-profile.json` + 关键源文件抽样(入口/路由/模型,控量)。**输出**:codebase-guide 5 份 + verify.sh 特异检查项 + dev-recipes。
**prompt 设计原则**(沿用笔记 2.1 约束比鼓励重要):给 AI **结构化 schema** 约束产出,例如 verify.sh 检查项必须返回 `{id, category(A|B|C), severity(FAIL|WARN), pattern, description}`,平台再渲染成 shell。**AI 只产数据,平台产脚本**——避免 AI 直接写 shell 引入语法错。产出**进交互式 CLI review**(逐项确认),人确认才写入。

### 3.4 carriers(双载体生成)
一个 `project-profile.json` + 选择的 Level → 生成两套载体:
- `.claude/`(agents/commands/skills/settings.json)——现有 kit 已验证,直接模板化。
- `.opencode/`(agents/commands/skills/plugins + `opencode.json`)——按 0.2 映射;agent 用 `{file:./.harness/agents/xxx.md}` 引用共享契约;**hooks 用 `.opencode/plugins/harness-hooks.ts` plugin 实现,等价于 Claude 侧 settings.json**(Level 4,详见 0.2)。

---

## 4. 交互式 CLI 向导流程("指引用户一步一步操作")

`core/wizard.js` 用 @clack/prompts 实现向导式 5 步(每步可回退、可预览):

```
[1] 选项目        → 输入/确认项目目录 → detect 跑出 project-profile.json → 展示"识别到:Express+React/Mongoose/jest"
[2] 选范围        → Level 1/2/3/4 单选(显示每级生成什么、即时价值) + 目标 agent 多选(Claude Code✓ OpenCode✓)
[3] AI 填特异?    → 开关:无 key=纯静态基线 / 填 key+base+model=AI 读项目填特异(展示将读哪些文件、约多少 token)
[4] 预览 & review → 预览将写入的文件清单;AI 产出的检查项逐项 confirm 接受/拒绝(可编辑)
[5] 生成 & 自检   → 写入 → 自动跑 check-harness.sh → 绿/红结果 + "在 Claude Code / OpenCode 里如何起步"说明
```

**参数式入口** `core/cli.js`(给脚本/CI):`node core/cli.js <root> <level> [agents] [--ai --base= --model= --key= --mock]`,无交互,直接生成。wizard.js 与 cli.js 复用同一 `generate()`。

**"开箱即用"落点**:`npx create-harness` 零安装;detect/scaffold 是 node 内置;fill 只需一个 LLM API key 且可选;生成完直接给出"在你的项目里跑 `claude` 或 `opencode`,然后 `/harness-propose <task>`"的起步指引。

---

## 5. 里程碑(交付节奏)

| 里程碑 | 交付 | 验收 |
|---|---|---|
| **M0 脚手架** | `harness-platform/` 骨架 + `templates/harness-core/`(从 kit 抽离去特异化) | templates 能被 scaffold 原样拷出一份可跑的静态 kit |
| **M1 Level 1** | detect + scaffold + wizard 步骤 1/2/5(无 AI) | 选一个真实项目 → 生成 AGENTS.md+verify.sh → `claude` 进去能读地图、verify.sh 退出码正确 |
| **M2 Level 2** | Skills 模板 + 双载体骨架 + fill 模块(AI 填 codebase-guide)+ wizard 步骤 3/4 | 带 key 跑完 → codebase-guide 5 份有真实内容、经 review 写入;`.claude`&`.opencode` 都能加载 skills |
| **M3 Level 3** | 七角色 + 状态机 + 三命令 + 双载体 agent/command 映射 | `/harness-propose` 在两个 agent 里都能拉起 BA→SA→RR 接力 |
| **M4 Level 4** | baseline + 双 agent hooks(Claude settings.json + OpenCode plugin)+ verify 完整检查项 + memory | Dev 停 → 两 agent 各自的 hook 机制自跑 verify,退出码闭环;两侧等价 |

**先做 M0+M1**:验证"静态骨架可拷贝 + detect 准确 + CLI 可用"这根主梁,再往上叠。M1 出来就是可用的 Level 1 产品。

---

## 6. 待确认/风险

1. ~~OpenCode hooks 的 `task` 工具字段名~~ **已确认(2026-07-17,查 OpenCode 源码 `packages/opencode/src/tool/task.ts`)**:子代理调用经 `task` 工具发起,目标 agent 标识字段是 **`args.subagent_type`**(必需,调度键;agent 经 `agent.get(params.subagent_type)` 解析),非 `agent`/`description`。完整 args:`subagent_type` / `description`(3-5 词标签)/ `prompt` / 可选 `task_id`(resume)/ `command` / `background`。`tool.execute.after` 的 input 形状为 `{ tool, sessionID, callID, args }`,output 为 `{ title, output, metadata }`。**Level 4 的 OpenCode plugin 据此确定写法,无需再实测**:`if (input.tool === "task" && /developer/i.test(input.args?.subagent_type))`。无需真跑 OpenCode 实测——源码已给确定答案,省一次 LLM 调用。Level 4 零不确定性。
2. **AI 填 verify.sh 检查项的可靠性**:AI 产数据、平台产 shell(不让 AI 直接写 shell),降低语法错风险;但检查项语义可能误报 → 靠交互式 CLI review + verify.sh 本身 WARN/FAIL 分级 + baseline.sh 兜底。
3. **CLI 技术栈已定**:**交互式 CLI(@clack/prompts 向导 + 参数式 cli.js)**,放弃原 Tauri+React GUI 方案(理由见 §1:低频一次性工具、开发者习惯、CLI 主场、shadcn 先例、CLI 独立性原则)。`core/` 逻辑与入口解耦,wizard/cli 复用同一 `generate()`。

---

## 7. 不做什么(范围控制)
- 不做托管多租户/账号体系(本地优先)。
- 首版不生成 MCP server(kit 里 MCP 是"可选增强非硬依赖")。
- 不做模型训练/微调;AI 填特异走通用 LLM API。
- 不替代 OpenSpec/Spec Kit 的 SDD 命令;平台生成的是 harness 设施,可与其并存。
