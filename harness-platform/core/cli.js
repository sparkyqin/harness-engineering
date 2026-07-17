// core/cli.js — 最小 CLI 入口(让 generate 可从命令行跑;GUI M1 阶段后补)
//
// 用法:
//   node core/cli.js <projectRoot> <level> [agents...] [--ai] [--key=XXX]
//   例: node core/cli.js ../my-project L3 claude opencode
//       node core/cli.js . L1 claude --ai --key=sk-...
//
// 进度打到 stderr,结果摘要打到 stdout。

import { generate } from "./index.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error("用法: node core/cli.js <projectRoot> <level> [agents...] [--ai] [--mock] [--key=XXX] [--base=URL] [--model=NAME]");
    console.error("  level: L1 | L2 | L3 | L4");
    console.error("  agents: claude opencode (默认两个都生成)");
    console.error("  --ai: 启用 AI 填特异(需 key 或 --mock)");
    console.error("  --mock: 用合成数据走 fill 管线(无需 LLM key,验证用)");
    console.error("  --base=URL: OpenAI 兼容 endpoint(如智谱 GLM https://open.bigmodel.cn/api/paas/v4/chat/completions)");
    console.error("  --model=NAME: 模型名(配合 --base,如 glm-5.2)");
    process.exit(1);
  }
  const projectRoot = args[0];
  const level = args[1];
  let agents = [];
  let useAI = false;
  let mock = false;
  let llmKey = null;
  let baseUrl = null;
  let model = null;
  for (const a of args.slice(2)) {
    if (a === "--ai") useAI = true;
    else if (a === "--mock") { useAI = true; mock = true; }
    else if (a.startsWith("--key=")) llmKey = a.slice(6);
    else if (a.startsWith("--base=")) baseUrl = a.slice(7);
    else if (a.startsWith("--model=")) model = a.slice(8);
    else agents.push(a);
  }
  // 自定义 endpoint:设 env 供所有 fill 子模块读取(resolveProvider 读 env)
  if (baseUrl) {
    process.env.HARNESS_LLM_BASE_URL = baseUrl;
    process.env.HARNESS_LLM_API_KEY = llmKey || process.env.HARNESS_LLM_API_KEY || "";
    if (model) process.env.HARNESS_LLM_MODEL = model;
  }
  if (agents.length === 0) agents = ["claude", "opencode"];
  return { projectRoot, level, agents, useAI, mock, llmKey };
}

const opts = parseArgs(process.argv);
const validLevels = ["L1", "L2", "L3", "L4"];
if (!validLevels.includes(opts.level)) {
  console.error(`错误: level 须为 ${validLevels.join("/")},得到 ${opts.level}`);
  process.exit(1);
}

console.error(`[generate] projectRoot=${opts.projectRoot} level=${opts.level} agents=${opts.agents.join(",")} useAI=${opts.useAI}`);

generate({
  projectRoot: opts.projectRoot,
  level: opts.level,
  agents: opts.agents,
  useAI: opts.useAI,
  mock: opts.mock,
  llmKey: opts.llmKey,
  onProgress: (stage, detail) => {
    if (stage.endsWith(":done") || stage === "validate:done") {
      console.error(`  [${stage}] ${typeof detail === "object" ? JSON.stringify(detail) : detail}`);
    }
  },
})
  .then((result) => {
    console.error("");
    console.error("=== 生成完成 ===");
    console.error(`profile: ${result.profile.primary} / ${result.profile.runtime} / ${result.profile.moduleSystem}`);
    console.error(`写入文件: ${result.written.length}`);
    console.error(`自检: ${result.validation.ok ? "PASS" : "FAIL"} (pass=${result.validation.checks.pass} fail=${result.validation.checks.fail})`);
    if (result.validation.checks.missing.length) {
      console.error("缺失项:");
      for (const m of result.validation.checks.missing) console.error("  - " + m);
    }
    console.log(JSON.stringify({ ok: result.validation.ok, files: result.written.length, level: opts.level }, null, 2));
    process.exit(result.validation.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error("生成失败: " + e.message);
    console.error(e.stack);
    process.exit(2);
  });
