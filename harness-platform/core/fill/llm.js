// core/fill/llm.js — LLM provider 抽象层(多 provider,零 SDK 依赖,走 node fetch)
//
// 统一接口: chat(messages, opts) -> { text, raw }
//   messages: [{role:"system"|"user"|"assistant", content:string}]
//   opts: { model?, temperature?, maxTokens?, json?:true(强约束 JSON 输出) }
//   返回: { text: string, raw: object }
//
// provider 选择(按优先级):
//   1. HARNESS_LLM_BASE_URL + HARNESS_LLM_API_KEY → openai-compat(自定义 OpenAI 兼容 endpoint,如智谱 GLM)
//   2. HARNESS_LLM_PROVIDER 环境变量(anthropic|openai|local)
//   3. 有 ANTHROPIC_API_KEY → anthropic
//   4. 有 OPENAI_API_KEY → openai
//   5. HARNESS_LOCAL_LLM_URL → local(OpenAI 兼容 endpoint,如 ollama/llama.cpp)
//   6. 显式传入的 key 参数(ANTHROPIC_API_KEY 默认)
//
// 模型默认:
//   anthropic: claude-opus-4-8(旗舰,检查项推导需强推理)
//   openai:    gpt-4o
//   openai-compat: HARNESS_LLM_MODEL(必填,如 glm-5.2)
//   local:     HARNESS_LOCAL_LLM_MODEL

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * 选 provider + key。
 * @param {string} [explicitKey]  显式传入的 key(优先级最高)
 * @param {object} [cfg]          显式配置 {baseUrl, key, model}(CLI 传入,优先级最高)
 */
export function resolveProvider(explicitKey, cfg = {}) {
  const env = process.env;
  // 优先级 1:显式 cfg(CLI --base/--key/--model 直接传入)
  if (cfg.baseUrl && cfg.key) {
    return { provider: "openai-compat", key: cfg.key, url: cfg.baseUrl, model: cfg.model };
  }
  // 优先级 2:env HARNESS_LLM_BASE_URL(自定义 OpenAI 兼容 endpoint,如智谱 GLM)
  //   此分支必须在 explicitKey 的 anthropic 分支之前,否则传了 key 会误走 anthropic
  if (env.HARNESS_LLM_BASE_URL && (env.HARNESS_LLM_API_KEY || explicitKey)) {
    return {
      provider: "openai-compat",
      key: env.HARNESS_LLM_API_KEY || explicitKey,
      url: env.HARNESS_LLM_BASE_URL,
      model: env.HARNESS_LLM_MODEL,
    };
  }
  // 优先级 3:显式 key 或 anthropic env
  const explicit = env.HARNESS_LLM_PROVIDER;
  if (explicitKey || env.ANTHROPIC_API_KEY) {
    if (explicit === "openai" && env.OPENAI_API_KEY) {
      return { provider: "openai", key: env.OPENAI_API_KEY };
    }
    return { provider: "anthropic", key: explicitKey || env.ANTHROPIC_API_KEY };
  }
  if (env.OPENAI_API_KEY) return { provider: "openai", key: env.OPENAI_API_KEY };
  if (env.HARNESS_LOCAL_LLM_URL) {
    return { provider: "local", key: "local", url: env.HARNESS_LOCAL_LLM_URL };
  }
  return null;
}

/**
 * 调 LLM。
 * @param {Array} messages
 * @param {{key?:string, model?:string, temperature?:number, maxTokens?:number, json?:boolean, provider?:string, url?:string, baseUrl?:string}} opts
 */
export async function chat(messages, opts = {}) {
  const resolved = resolveProvider(opts.key, { baseUrl: opts.baseUrl, key: opts.key, model: opts.model });
  if (!resolved) {
    throw new Error("fill: 无 LLM provider 可用。设置 HARNESS_LLM_BASE_URL+HARNESS_LLM_API_KEY+HARNESS_LLM_MODEL,或 ANTHROPIC_API_KEY / OPENAI_API_KEY,或显式传 baseUrl+key。");
  }
  const provider = opts.provider || resolved.provider;
  if (provider === "anthropic") return chatAnthropic(messages, opts, resolved.key);
  if (provider === "openai") return chatOpenAI(messages, opts, resolved.key, OPENAI_URL);
  if (provider === "openai-compat") {
    return chatOpenAI(messages, { ...opts, model: opts.model || resolved.model }, resolved.key, resolved.url);
  }
  if (provider === "local") return chatLocal(messages, opts, resolved.url);
  throw new Error("未知 provider: " + provider);
}

// ---- Anthropic Messages API ----
async function chatAnthropic(messages, opts, key) {
  const model = opts.model || "claude-opus-4-8";
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const conv = messages.filter((m) => m.role !== "system");
  const body = {
    model,
    max_tokens: opts.maxTokens || 4096,
    system: system || undefined,
    messages: conv.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
  };
  if (opts.json) {
    // 强约束 JSON:不直接支持 response_format,靠 system 指令 + 解析时兜底
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 300)}`);
  }
  const raw = await res.json();
  const text = (raw.content || []).map((b) => b.text || "").join("");
  return { text, raw };
}

// ---- OpenAI Chat Completions(含自定义兼容 endpoint:智谱 GLM 等)----
async function chatOpenAI(messages, opts, key, url) {
  const model = opts.model || "gpt-4o";
  const endpoint = url || OPENAI_URL;
  // 推理模型(如 GLM-5.2)reasoning 占大量 token,默认给足;非推理模型用 4096 也够
  const maxTokens = opts.maxTokens || (url ? 8000 : 4096);
  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.2,
    max_tokens: maxTokens,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  // 推理模型(智谱 GLM-5.2 等)默认关推理:fill 任务是结构化产出,无需深度思考,
  // 关掉避免 reasoning 耗尽 max_tokens 导致 content 空。opts.thinking 可覆盖(undefined=关)。
  // 仅对自定义 endpoint(openai-compat)生效;标准 OpenAI 不带此字段。
  if (url && opts.thinking === undefined) {
    body.thinking = { type: "disabled" };
  } else if (opts.thinking !== undefined) {
    body.thinking = opts.thinking;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI-compat API ${endpoint} ${res.status}: ${t.slice(0, 300)}`);
  }
  const raw = await res.json();
  const msg = raw.choices?.[0]?.message || {};
  let text = msg.content || "";
  const finishReason = raw.choices?.[0]?.finish_reason;
  // 推理模型(如 GLM-5.2):content 可能为空,因 reasoning_tokens 耗尽 max_tokens(finish_reason=length)
  if (!text && finishReason === "length") {
    const usage = raw.usage || {};
    throw new Error(
      `LLM 返回空 content(finish_reason=length):推理模型 reasoning_tokens=${usage.completion_tokens_details?.reasoning_tokens || "?"} 耗尽 max_tokens=${maxTokens}。` +
        `调高 maxTokens 或精简 prompt。reasoning 预览: ${(msg.reasoning_content || "").slice(0, 200)}`,
    );
  }
  if (!text && msg.reasoning_content) {
    // 推理有产出但 content 空(未到 stop):提示
    text = ""; // 保持空,parseJSON 会报明确错
  }
  return { text, raw };
}

// ---- Local(OpenAI 兼容,如 ollama / llama.cpp / vLLM)----
async function chatLocal(messages, opts, baseUrl) {
  const model = opts.model || process.env.HARNESS_LOCAL_LLM_MODEL || "local";
  const url = baseUrl.replace(/\/$/, "") + "/v1/chat/completions";
  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens || 4096,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Local LLM ${url} ${res.status}: ${t.slice(0, 300)}`);
  }
  const raw = await res.json();
  const text = raw.choices?.[0]?.message?.content || "";
  return { text, raw };
}

/**
 * 调 LLM 并解析 JSON(强约束:system 要求只产 JSON,解析时剥离 markdown 代码块)。
 * @returns {Promise<object>}
 */
export async function chatJSON(messages, opts = {}) {
  const { text } = await chat(messages, { ...opts, json: true });
  return parseJSON(text);
}

export function parseJSON(text) {
  let t = (text || "").trim();
  if (!t) {
    throw new Error("LLM 返回空内容,无法解析 JSON(可能是推理模型 reasoning 耗尽 token,或 response_format 不兼容)。");
  }
  // 剥离 ```json ... ``` 代码块
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // 找第一个 { 到最后一个 }(容错:LLM 可能前后带说明)
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}
