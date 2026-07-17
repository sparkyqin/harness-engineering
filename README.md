# Harness Engineering

> `Agent = Model + Harness`。模型决定上限,Harness 决定底线。
>
> 把"是否完成"从 Agent 的主观汇报,变成可检查的客观成果。

本仓含两样东西:

| 目录 | 说明 |
|---|---|
| [`harness-platform/`](./harness-platform) | **Harness 套件生成平台**——开箱即用的 CLI/exe,读你的项目 → 生成适配的 harness 套件 → Claude Code/OpenCode 可用 |
| [`harness-engineering-kit/`](./harness-engineering-kit) | 参考实现:还原自课程案例的完整 harness 工程化落地(四层防线 + 七角色 + 硬门禁) |

---

## Harness 套件生成平台

开箱即用的交互式 CLI,为你的项目生成一套 Harness 工程设施(四层防线:Rules → Skills → Agents+Workflow → Scripts)。**CLI 是一次性生成器**:跑完把套件写进项目仓库就退场,后续在 agent 里跑 `/harness-propose`。

- **静态骨架确定**:四层防线、七角色契约、状态机、脚本框架——通用部分开箱即用,不依赖模型
- **AI 填项目特异**:codebase-guide 知识地图、verify.sh 检查项、dev-recipes——AI 读你的项目填(可选;无 key 退化为静态基线)
- **双 agent 适配**:Claude Code(`.claude/`)+ OpenCode(`.opencode/`),共用 IDE 无关的 `.harness/` 核心
- **退出码无法伪造**:第 4 层 hook/plugin 程序自跑验证,不问 Agent

### 下载与使用

👉 **[下载 create-harness-windows-x64.exe](https://github.com/sparkyqin/harness-engineering/releases/latest)**(单文件 94MB,自带 Node runtime + 65 个模板,免装 Node,生成阶段零 bash 依赖)

```bash
# A. 交互向导(推荐,双击或无参运行):5 步引导选目录/Level/agent/AI/预览
create-harness-windows-x64.exe

# B. 参数式(脚本/CI):一条命令直接生成
create-harness-windows-x64.exe <你的项目目录> L3 claude opencode

# 带 AI 填特异(智谱 GLM-5.2 实测可用):
create-harness-windows-x64.exe ./myproj L3 claude opencode --ai \
  --base=https://open.bigmodel.cn/api/paas/v4/chat/completions \
  --model=glm-5.2 --key=<你的key>
```

无 LLM key 也能跑(纯静态基线,L1-L2 完整可用)。也可[从源码跑](./harness-platform/README.md#快速使用)(需 Node ≥20 或 Bun)。

### 生成后在 agent 里跑(CLI 退场)

```bash
cd <你的项目目录>
claude          # 或 opencode
/harness-propose <任务名> [需求描述]   # 需求→方案→评审→[人工卡点1]
/harness-apply   <任务名>              # 开发→审查→测试→[人工卡点2]
/harness-archive <任务名>              # Spec Merge + 归档 + board DONE
```

### Level 1-4 分级(向后兼容,升 Level 只追加)

| Level | 内容 |
|---|---|
| L1 | Rules + 最小 verify(开箱即用,零模型) |
| L2 | Skills + 双载体 + AI 填特异 |
| L3 | 七角色 + 状态机(propose/apply/archive 接力) |
| L4 | hooks 闭环(Dev 停 → 程序自跑验证,退出码无法伪造) |

### 设计原则

1. **静态必跑,AI 可选**:通用四层无模型依赖;AI 只填项目特异,失败退化静态基线
2. **AI 产数据,平台产脚本**:AI 不直接写 shell,只产结构化检查项数据,平台渲染成 verify.sh
3. **`.harness/` 是 IDE 无关单一来源**:`.claude/` / `.opencode/` 都是载体
4. **退出码无法伪造**:第 4 层 hook(Claude)/plugin(OpenCode)程序自跑验证

### 文档

- [平台 README](./harness-platform/README.md) — 完整使用 + 打包说明
- [架构文档](./harness-platform/docs/architecture.md) — 三层职责 / 流水线 / 双载体映射
- [LLM Provider 接入](./harness-platform/docs/llm-providers.md) — GLM/Anthropic/OpenAI/本地 + 故障排查
- [方案设计 PLAN.md](./PLAN.md) — 完整设计推演
- [平台实现详情](./harness-platform/README.md#打包成-exe开发者) — 打包成 exe

---

## 参考实现:harness-engineering-kit

还原自《AI 时代研发效能提升落地实战》课程案例的完整工程化落地框架,是平台 `templates/` 的设计参照。可直接 `git clone` 后跑起来:

```bash
cd harness-engineering-kit
bash .harness/scripts/check-harness.sh          # 校验 Harness 完整性
bash .harness/scripts/init-task.sh my-feature standard   # 开新任务
```

工作流三步:`/harness-propose` → `/harness-apply` → `/harness-archive`,详见 [`harness-engineering-kit/GUIDE.md`](./harness-engineering-kit/GUIDE.md)。

## 来源

课程:《AI 时代研发效能提升落地实战》
