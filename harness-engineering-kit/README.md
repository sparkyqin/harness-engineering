# Harness Engineering 工程化实践（基于 OpenSpec 扩展）

> 本目录是从 PDF《AI 时代研发效能提升落地实战》中"Harness Engineering 落地实践案例"还原的完整工程。
> 核心理念：**Agent = Model + Harness**。模型决定上限，Harness 决定底线。
> 本 Harness 用"四层防线 + 角色接力 + 硬门禁脚本"把"是否完成"从 Agent 的主观汇报，变成可检查的客观成果。

---

## 这是什么

一套围绕 AI Coding Agent 的工程化落地框架，把"写代码"升级为"交付系统"。它解决 Agent 失控时反复出现的七类问题：

| 失控问题 | Harness 拦截手段 |
|---|---|
| 虚报进展（happy path 跑通就报"完成"） | TE 真实浏览器 E2E + verify.sh + baseline compare |
| 约束规避（曲解指令给自己开脱） | Rules 强语气 + Skills 固化步骤 + Scripts 硬判定 |
| 降低标准改测试（不改问题改测试） | verify.sh C 类 + test-e2e Skill 从 Scenario 生成用例 |
| 上下文失忆（修完转头又错） | memory/ + specs/ Source of Truth + 每棒文档产出 |
| 跳过预构建/迁移 | baseline.sh snapshot/compare + build-test Skill |
| 伪造验证（没跑也敢说"已验证"） | after_subagent hook 程序自跑，退出码无法伪造 |
| 错误死磕（围着症状打补丁） | PM 轮次封顶（Dev 5 / 其他 3），超限升级给人 |
| 小题大做（小需求做成大重构） | proposal 先定"做什么" + RR 拦截超范围方案 |

## 与 OpenSpec 的关系

本 Harness **复用** OpenSpec 的核心思想：
- `specs/` 作为 Source of Truth（系统能力契约）
- `proposal → apply → archive` 三段式
- SHALL + GWT（Given/When/Then）需求格式，需求→测试用例零翻译成本
- delta merge（ADDED/MODIFIED/REMOVED）

**扩展**了：
- **角色制衡**：PM + BA/SA/RR/Dev/CR/TE 七角色接力（Supervisor/Worker 模式）
- **轮次封顶与回退表**：防 Agent 死磕与无界重试
- **硬门禁脚本**：verify.sh / baseline.sh / check-harness.sh（退出码无法伪造）
- **四层防线**：Rules → Skills → Agents/Workflow → Scripts（意图→SOP→硬约束逐层兜底）
- **模块化知识地图 + 记忆库**：动态增长层（静态防线 + 动态记忆 = 自我进化）

## 四层防线架构

```
第1层 Rules（软约束）          harness-core.mdc 三步验证底线
  ↓ 声明≠执行                  code-standards.mdc 编码规范
第2层 Skills（SOP 手册）       workflow-discipline.mdc 流程纪律
  ↓ 步骤可被跳步               build-test / post-verify / code-review / test-e2e
第3层 Agents+Workflow（角色）   PM + 6 Worker 接力，下游不改上游
  ↓ 角色制衡                   transitions.json 状态机 + 回退表
第4层 Scripts（硬门禁）        verify.sh / baseline.sh / check-harness.sh / init-task.sh
  ↓ 退出码无法伪造             FAIL = 阻塞交付
```

## 目录结构

```
harness-engineering-kit/
├── AGENTS.md / CLAUDE.md      ← 项目入口（AI 读的第一份文件）
├── GUIDE.md                   ← 工作流总览（propose/apply/archive + 七铁律）
├── README.md                  ← 本文件
├── .cursor/                   ← Cursor IDE 配置（rules/skills/agents/commands/hooks/mcp）
├── .claude/                   ← Claude Code 配置（与 .cursor/ 并行，双 IDE 共存）
│   ├── commands/              ← 3 个斜杠命令（harness-propose / harness-apply / harness-archive）
│   ├── agents/                ← 6 个 Worker 子代理入口（BA/SA/RR/Dev/CR/TE）
│   ├── skills/                ← 6 个 skill（4 SOP + code-standards + workflow-discipline）
│   └── settings.json          ← hooks 配置（SubagentStop / PostToolUse / PreToolUse / SessionStart）
├── .harness/                  ← 核心工程工作流目录（IDE 无关，单一来源）
│   ├── agents/                ← 7 个角色定义（含 PM），每个内嵌五要素契约
│   ├── workflow/              ← transitions.json + flow-definition.md + subagent-orchestration.md
│   ├── scripts/               ← 10 个脚本（硬门禁 + 脚手架 + 备份）
│   ├── hooks/                 ← 4 个 hook 实现（verify-after-developer / tester-evidence / guard-dangerous / format-on-edit）
│   ├── specs/                 ← 系统能力 Source of Truth（_index + i18n/orders 示例）
│   ├── deliverables/          ← 任务文档产出 + _template + _archive + user-switch-stale-ui 示例
│   ├── codebase-guide/        ← 模块化知识地图（6 子文档）
│   ├── memory/                ← 记忆库（entries + templates + index）
│   └── board.md               ← 任务看板（状态机真实来源）
└── mcp-server/index.js        ← 8 个 MCP 工具接口（Claude Code 默认未启用，Agent 直接调 bash 等价）
```

## 工作流三步

```
/harness-propose <任务名> [需求描述]   → 需求 → 方案 → 评审 → [人工卡点 1]
/harness-apply   <任务名> [用户反馈]   → 开发 → 审查 → 测试 → [人工卡点 2]
/harness-archive <任务名>              → Spec Merge + 归档 + board DONE
```

详见 `GUIDE.md`。

## 完整 8 步流程

```
0 初始化 → 1 BA需求 → 2 SA方案 → 3 RR评审 → [人工卡点1]
→ 4 Dev开发 → 5 CR审查 → 6 TE测试 → [人工卡点2] → 7 PM归档
```

对应 Planner → Generator ⇄ Evaluator：PM 调度，Dev 写，CR+TE 交叉互审（不让同一 Agent 又写又审）。

## 七角色

| 角色 | 全称 | 阶段 | 档位 | 产出 |
|---|---|---|---|---|
| PM | Project Manager | 全程 | 中等 | board + 心跳（总调度，只路由） |
| BA | Business Analyst | propose | 旗舰 | requirements.md（SHALL + GWT） |
| SA | Solution Architect | propose | 旗舰 | design.md + impact-analysis（refactor） |
| RR | Readiness Reviewer | propose | 旗舰 | readiness-review.md |
| Dev | Developer | apply | 旗舰 | 代码 + dev-log.md |
| CR | Code Reviewer | apply | 旗舰 | code-review.md |
| TE | Test Engineer | apply | 旗舰 | test-report.md + 测试代码 |

## 快速上手（在真实项目上跑）

> kit 是**项目无关的 harness 框架**——它不含业务代码，要真实跑通完整 propose→apply→archive（含 `npm test`/build/E2E），需把它接入一个有 `package.json` + 测试脚本的真实项目。
> **Claude Code（Windows）**：脚本走 Git Bash（原生 cmd 不支持）。依赖：node / npm / bash / git。
> **Cursor**：用 `.cursor/` 配置，命令/代理/skills 在对应目录。

### 0. 接入真实项目（首次）
把 kit 内容并入你的项目根目录（与 `package.json` 同级）：
```
your-project/
├── package.json            ← 你已有的项目
├── src/  server.js  ...    ← 你的业务代码
├── AGENTS.md  CLAUDE.md  GUIDE.md   ← 从 kit 复制
├── .claude/                ← 从 kit 复制（Claude Code 配置）
├── .cursor/                ← 从 kit 复制（Cursor 用，Claude Code 可不留）
├── .harness/               ← 从 kit 复制（核心工作流，IDE 无关）
└── mcp-server/             ← 从 kit 复制（可选）
```
> 若不想污染项目根，也可把整个 `harness-engineering-kit/` 作为子目录，但 `verify.sh` 的路径探测以仓库根为准，放项目根最省事。

### 1. 在项目根启动 Claude Code
```bash
cd your-project
claude
```
会话启动自动读 `CLAUDE.md` + `.claude/settings.json`（hooks 生效）。

### 2. 生成知识地图骨架（首次）
```bash
bash .harness/scripts/codebase-guide-init.sh
```
探测真实项目技术栈，生成 `codebase-guide/` 骨架（已存在的文件会跳过，不覆盖）。**随后人工/AI 补充实质内容**（架构、模块依赖、开发配方）——这是 Worker 各棒必读的上下文底座。

### 3. 校验 Harness 完整性
```bash
bash .harness/scripts/check-harness.sh
```
应 PASS（71 项）。

### 4. 开新任务
```bash
bash .harness/scripts/init-task.sh my-feature standard
```
创建 `deliverables/my-feature/` + 模板 + 登记 `board.md`。

### 5. 打磨 proposal.md 后
```
/harness-propose my-feature <需求描述>
```

### 6. 人工审批 1 后
```
/harness-apply my-feature
```

### 7. 人工审批 2 后
```
/harness-archive my-feature
```

> **Windows 注意**：所有脚本用 Git Bash 跑（`bash .harness/scripts/xxx.sh`）；路径一律正斜杠。`verify.sh` 的 A/C 类检查针对 Mongoose/Express/RTK Query 栈，非该栈会大量输出"跳过"——属预期，按你的实际栈校准 FAIL 项含义。

## 成熟度等级（你在哪一级？）

| Level | 描述 | 特征 |
|---|---|---|
| 0 | 裸奔模式 | 直接让 AI 写代码，无约束 |
| 1 | 规则约束 | 有 Rules 但无验证 |
| 2 | 脚本门禁 | 有 verify.sh 等自动化检查 |
| 3 | 角色分工 | 多 Agent 协同 + 工作流编排 |
| 4 | 完整 Harness | 意图+编排+护栏+审批+可观测全覆盖 ← **本工程目标** |

## 设计逻辑总结

- 选择**结构化 Agent 调度**而非自由协商；固定角色而非动态生成（灵活性让步于可维护性）。
- **契约嵌在 Agent 文件里**而不是单独一份（五要素内嵌）。
- **verify.sh 区分 FAIL 阻塞 / WARN 记录**。
- **specs/ 作为 Source of Truth**，做好归档和可追溯。
- **proposal 在执行之前**，先明确"做什么"——所有执行都是无源之水，若 proposal 不知"做什么"。

> 模型决定上限，Harness 决定底线。
> Harness 不是让 AI 变聪明，而是让 AI 没有太多偷懒空间。
> 把"是否完成"从 AI 的主观汇报，变成可检查的客观成果——这就是 Harness Engineering 的关键点。
