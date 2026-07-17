# Harness Platform

> 平台介绍、exe 下载与完整用法见[根 README](../README.md#harness-套件生成平台)。本文件聚焦开发者关心的源码运行、目录结构、打包与实现细节。

## 状态

按 Level 分级渐进交付(见 [PLAN.md](../PLAN.md)):

| Level | 内容 | 状态 |
|---|---|---|
| M0 | 脚手架 + templates | ✅ 完成 |
| L1 | Rules + 最小 verify | ✅ 完成 |
| L2 | Skills + 双载体 + AI 填特异 | ✅ 完成(GLM-5.2 实测) |
| L3 | 七角色 + 状态机 | ✅ 完成(propose 链路实测) |
| L4 | 硬门禁 hooks 闭环 | 🚧 待(OpenCode plugin 原型已就绪) |

## 目录结构

```
harness-platform/
├── app/                 # Tauri + React GUI(M1 起填)
│   ├── main/            # Rust 主进程:文件/子进程/读代码
│   └── renderer/        # React 向导 UI
├── core/                # 平台核心逻辑(与 UI 解耦,可被 CLI 复用)
│   ├── detect/          # 项目探测 → project-profile.json
│   ├── scaffold/        # 静态骨架拷贝(templates → 目标项目)
│   ├── fill/            # AI 填项目特异(prompt 模板 + LLM + 写文件)
│   ├── carriers/        # 双 agent 载体生成(.claude / .opencode)
│   └── validate/        # 生成后跑 check-harness.sh 自检
├── templates/           # 静态骨架源(从头重写,去项目特异化)
│   ├── harness-core/    # .harness/ 通用核心
│   ├── carrier-claude/  # .claude/ 载体模板
│   └── carrier-opencode/# .opencode/ 载体模板
└── docs/                # 平台自身文档
```

## 快速使用

👉 平台介绍、exe 下载与完整用法见[根 README](../README.md#harness-套件生成平台)。本文件聚焦开发者关心的源码运行与打包。

### 从源码跑(需 Node ≥20 或 Bun)

```bash
cd harness-platform
node core/wizard.js [项目目录]              # 交互向导(或 npm start)
node core/cli.js <目录> L3 claude opencode  # 参数式(脚本/CI)
node core/cli.js <目录> L2 claude opencode --ai --mock   # 无 key 验证 fill 管线
```

参数式选项:`--ai --base=URL --model=NAME --key=KEY --mock`。无 key 时 fill 跳过,生成静态基线。LLM provider 配置详见 [docs/llm-providers.md](docs/llm-providers.md)。

## CLI 与 agent 的关系

CLI 是**一次性生成器**,agent 是**运行时**,两者时序接力、不同时运行、不互相调用:

```
1. 跑 CLI(一次性)  → 生成 .harness/ + .claude/ + .opencode/ 进仓库 → CLI 退出
2. 启动 agent        → agent 读载体,加载角色契约/命令
3. /harness-propose  → agent 扮演 PM,七角色接力(CLI 不参与)
```

CLI 只在 fill 阶段可选调 LLM(填项目特异);agent 在运行时调 LLM(角色接力)。两者各管一段。CLI 独立性是设计原则:agent 无关、可脚本化、无循环依赖。

## 设计原则

1. **静态必跑,AI 可选**:通用四层 + 角色契约 + 状态机 + 脚本框架是确定的,无模型依赖;AI 只填项目特异,失败退化静态基线。
2. **AI 产数据,平台产脚本**:AI 不直接写 shell(避免语法错),只产结构化检查项数据,平台渲染成 verify.sh。
3. **`.harness/` 是 IDE 无关单一来源**:`.claude/` / `.opencode/` 都是载体,引用 `.harness/` 下的契约与脚本。
4. **退出码无法伪造**:第 4 层的 hook(Claude)/plugin(OpenCode)程序自跑验证,不问 Agent。
5. **参照已验证实践**:scripts 用 `set -uo pipefail` + `$(dirname)` 路径解析 + rg/grep 降级;hooks 用 `.cjs` 后缀避 ESM 冲突。

详见 [PLAN.md](../PLAN.md) 与 [docs/architecture.md](docs/architecture.md)。

## 打包成 exe(开发者)

单文件 exe 用 `bun --compile`,模板内联进 bundle(无需外部 templates/ 目录):

```bash
cd harness-platform
npm run build:exe        # = gen-bundle + bun --compile → create-harness.exe
```

产物 `create-harness.exe`(~98MB,含 bun runtime + 65 个模板文件)。双模式:无参=交互向导,带参=参数式。

发 release:推 tag 触发 GitHub Actions(见 `../.github/workflows/release.yml`):

```bash
git tag v0.1.0 && git push origin v0.1.0
# → CI 打 Windows exe + 发 GitHub Release
```

### 为什么 exe 不依赖 bash

生成阶段(validate)用纯 node 实现完整性检查(等价 check-harness.sh),不调 bash。.sh 脚本(verify.sh/baseline.sh 等)是**写进用户仓库给 agent 运行时执行**的——agent(Claude Code/OpenCode)生态自带 bash prerequisite,不是 exe 的依赖。详见 [docs/llm-providers.md](docs/llm-providers.md) 的"CLI 与 agent 边界"。
