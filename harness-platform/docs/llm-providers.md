# LLM Provider 接入指南

> fill 阶段(AI 填项目特异)需要 LLM。本文档说明如何接入各类 provider。
>
> 无 LLM key 时,fill 自动退化为静态基线(Level 1-2 仍完整可用,verify 仅跑通用检查)。

## 快速开始:智谱 GLM-5.2(OpenAI 兼容)

GLM-5.2 是推理模型,已实测可用。CLI 直接传参:

```bash
node core/cli.js <项目目录> L2 claude --ai \
  --base=https://open.bigmodel.cn/api/paas/v4/chat/completions \
  --model=glm-5.2 \
  --key=<你的API key>
```

或用环境变量(推荐,所有 fill 子模块都读):

```bash
export HARNESS_LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
export HARNESS_LLM_API_KEY=<你的API key>
export HARNESS_LLM_MODEL=glm-5.2
node core/cli.js <项目目录> L2 claude opencode --ai
```

### 推理模型注意:thinking 自动关闭

GLM-5.2 等推理模型会把大量 token 花在 `reasoning_content` 上,导致 `content` 为空(`finish_reason:"length"`)。

平台对自定义 endpoint(openai-compat)**默认传 `thinking:{type:"disabled"}`** 关闭推理。fill 是结构化产出(检查项/codebase-guide),不需要深度思考,关掉反而更快更省:

- 关 thinking:fillChecks ≈14s 产出 5 个高质量检查项
- 不关:reasoning 耗尽 max_tokens(12000 时 reasoning 用掉 11884),content 空,解析失败

如需开启推理(例如想要更深的质量权衡),传 `opts.thinking` 覆盖——但需相应调大 `maxTokens`。

## 支持的 Provider

| Provider | 适用 | 配置方式 | 模型默认 |
|---|---|---|---|
| **openai-compat** | 智谱 GLM / DeepSeek / 通义 / 任何 OpenAI 兼容 endpoint | `--base=URL --model=NAME --key=KEY` 或 env `HARNESS_LLM_BASE_URL`+`HARNESS_LLM_API_KEY`+`HARNESS_LLM_MODEL` | 必填 |
| **anthropic** | Claude 官方 | env `ANTHROPIC_API_KEY` 或 `--key=` | claude-opus-4-8 |
| **openai** | OpenAI 官方 | env `OPENAI_API_KEY` | gpt-4o |
| **local** | ollama / llama.cpp / vLLM(OpenAI 兼容) | env `HARNESS_LOCAL_LLM_URL` + `HARNESS_LOCAL_LLM_MODEL` | 由 env 指定 |

## 优先级

`core/fill/llm.js` 的 `resolveProvider` 按以下优先级选 provider:

1. **CLI 显式配置**(`--base` + `--key`)→ openai-compat
2. **env `HARNESS_LLM_BASE_URL`** → openai-compat(智谱 GLM 等)
3. **显式 key 或 `ANTHROPIC_API_KEY`** → anthropic
4. **`OPENAI_API_KEY`** → openai
5. **`HARNESS_LOCAL_LLM_URL`** → local

> 注意:env `HARNESS_LLM_BASE_URL` 优先级高于 `ANTHROPIC_API_KEY`。若同时设了两者,走 BASE_URL(openai-compat)。

## CLI 参数

```bash
node core/cli.js <projectRoot> <level> [agents...] [options]
```

| 参数 | 说明 |
|---|---|
| `<projectRoot>` | 目标项目根目录 |
| `<level>` | L1 / L2 / L3 / L4 |
| `[agents]` | `claude` `opencode`(默认两个都生成) |
| `--ai` | 启用 AI 填特异(需 key 或 --mock) |
| `--mock` | 用合成数据走 fill 管线(无需 key,验证用) |
| `--key=XXX` | LLM API key |
| `--base=URL` | OpenAI 兼容 endpoint(配合 --model) |
| `--model=NAME` | 模型名(配合 --base) |

## 实测产出质量(GLM-5.2)

在 MERN 项目(express+mongoose+react+jest+ESM)上,fill 产出:

- **5 个项目特异检查项**(全过 schema 校验 + bash -n 语法检查):
  - C1 FAIL:Express 路由挂载到 app(`entry_grep app.use(`)
  - C2 FAIL:入口导出 app 实例
  - C3/A2 WARN:Mongoose Schema + timestamps
  - C4 WARN:routes 目录存在
- **5 份 codebase-guide**:overview 准确识别 MERN 栈,诚实标注"抽样仅含 server.js,routes 为推断"
- **AGENTS.md 描述**:"基于Express+Mongoose的轻量后端API服务,使用Node.js ESM模块系统。"

总耗时约 14s/次 LLM 调用,fill 全流程(checks+guide+carriers)约 1 分钟。

## 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| `fill: skipped no-llm-key` | hasKey 判断未识别你的配置 | 确认 env 含 `HARNESS_LLM_BASE_URL`+`HARNESS_LLM_API_KEY`,或 CLI 传 `--base`+`--key` |
| `Anthropic API 403` 但你用的是 GLM | resolveProvider 误走 anthropic | 确认 `HARNESS_LLM_BASE_URL` 已设(它优先于 key 的 anthropic 分支) |
| `LLM 返回空 content (finish_reason=length)` | 推理模型 reasoning 耗尽 token | 平台默认已关 thinking;若仍出现,精简 prompt 或换非推理模型 |
| `parseJSON: Unexpected end of JSON input` | LLM 未产 JSON(被 reasoning 吃掉或 response_format 不兼容) | 见上一行;或检查模型是否支持 `response_format:json_object` |
| 检查项被 `failed` 过滤 | AI 产的 probe type 不在枚举内 | 正常防护——`isValidCheck` 只接受 entry_grep/grep_src/file_exists/package_json_field 四种 |
