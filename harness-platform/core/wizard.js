#!/usr/bin/env node
// core/wizard.js — 入口(交互式向导 + 参数式双模式)
//
// 无参数(或只传目录):交互式向导(clack 5 步)。
// 带 <projectRoot> <level> [agents...] [options]:参数式(脚本/CI,无交互)。
//   例: create-harness ./myproj L3 claude opencode --ai --base=... --model=glm-5.2 --key=...
//   options: --ai --mock --key= --base= --model=
//
// 这样单 exe 双模式:双击/无参=向导,带参=脚本式。

import * as p from "@clack/prompts";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { generate } from "./index.js";

const LEVELS = [
  { value: "L1", label: "L1 — Rules + 最小 verify", hint: "AGENTS.md + verify.sh + check-harness。开箱即用,零模型。" },
  { value: "L2", label: "L2 — Skills + 双载体 + AI 填特异", hint: "加 4 Skills + .claude/.opencode + AI 填 codebase-guide/检查项" },
  { value: "L3", label: "L3 — 七角色 + 状态机", hint: "加 BA/SA/RR/Dev/CR/TE 接力 + transitions.json + 三命令" },
  { value: "L4", label: "L4 — 硬门禁 hooks 闭环", hint: "加 baseline + hooks(退出码无法伪造)" },
];

// ---- 参数式模式 ----
function isParamMode(argv) {
  // argv[2] 是目录且 argv[3] 是 Level → 参数式
  const a = argv[2], b = argv[3];
  return a && b && /^L[1-4]$/.test(b);
}

async function runParamMode(argv) {
  const projectRoot = path.resolve(argv[2]);
  const level = argv[3];
  let agents = [], useAI = false, mock = false, llmKey = null, baseUrl = null, model = null;
  for (const a of argv.slice(4)) {
    if (a === "--ai") useAI = true;
    else if (a === "--mock") { useAI = true; mock = true; }
    else if (a.startsWith("--key=")) llmKey = a.slice(6);
    else if (a.startsWith("--base=")) baseUrl = a.slice(7);
    else if (a.startsWith("--model=")) model = a.slice(8);
    else agents.push(a);
  }
  if (agents.length === 0) agents = ["claude", "opencode"];
  if (baseUrl) {
    process.env.HARNESS_LLM_BASE_URL = baseUrl;
    process.env.HARNESS_LLM_API_KEY = llmKey || process.env.HARNESS_LLM_API_KEY || "";
    if (model) process.env.HARNESS_LLM_MODEL = model;
  }
  if (!existsSync(projectRoot)) { console.error("目录不存在: " + projectRoot); process.exit(1); }
  console.error(`[generate] ${projectRoot} ${level} agents=${agents.join(",")} useAI=${useAI}`);
  try {
    const result = await generate({
      projectRoot, level, agents, useAI, mock, llmKey,
      onProgress: (stage, detail) => {
        if (stage.endsWith(":done")) console.error(`  [${stage}] ${typeof detail === "object" ? JSON.stringify(detail) : detail}`);
      },
    });
    console.error(`\n=== 生成完成 ===\nprofile: ${result.profile.primary}/${result.profile.runtime}/${result.profile.moduleSystem}\n写入: ${result.written.length} 文件\n自检: ${result.validation.ok ? "PASS" : "FAIL"} (pass=${result.validation.checks.pass} fail=${result.validation.checks.fail})`);
    process.exit(result.validation.ok ? 0 : 1);
  } catch (e) {
    console.error("生成失败: " + e.message); process.exit(2);
  }
}

// ---- 入口分发 ----
if (isParamMode(process.argv)) {
  runParamMode(process.argv);
} else {
  main(); // 交互式向导
}

const AGENTS = [
  { value: "claude", label: "Claude Code", hint: ".claude/ 载体" },
  { value: "opencode", label: "OpenCode", hint: ".opencode/ 载体" },
];

async function main() {
  p.intro("◆ Harness Platform — 生成适配你项目的 harness 套件");

  const argRoot = process.argv[2];

  try {
    // ---- Step 1: 选项目目录 ----
    let projectRoot;
    if (argRoot && existsSync(argRoot) && statSync(argRoot).isDirectory()) {
      projectRoot = path.resolve(argRoot);
      p.log.step(`项目目录(来自参数): ${projectRoot}`);
    } else {
      const dir = await p.text({
        message: "项目目录(绝对或相对路径)",
        defaultValue: process.cwd(),
        placeholder: process.cwd(),
        validate: (v) => {
          if (!v) return "请输入目录";
          if (!existsSync(v)) return "目录不存在";
          if (!statSync(v).isDirectory()) return "不是目录";
        },
      });
      if (p.isCancel(dir)) return cancel();
      projectRoot = path.resolve(dir);
    }

    // ---- Step 2: 选 Level + agent ----
    const level = await p.select({
      message: "生成到哪个 Level?",
      options: LEVELS,
    });
    if (p.isCancel(level)) return cancel();

    const agents = await p.multiselect({
      message: "目标 agent(可多选)",
      options: AGENTS,
      required: true,
      initialValues: ["claude", "opencode"],
    });
    if (p.isCancel(agents)) return cancel();

    // ---- Step 3: AI 填特异? ----
    const useAI = await p.confirm({
      message: "用 AI 填项目特异(codebase-guide + verify 检查项)?",
      initialValue: true,
    });
    if (p.isCancel(useAI)) return cancel();

    let llmKey = null, baseUrl = null, model = null;
    if (useAI) {
      // 优先读已有 env,有则默认用
      const hasEnvProvider = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.HARNESS_LLM_BASE_URL;
      if (hasEnvProvider) {
        p.log.step("检测到已配置 LLM 环境变量(ANTHROPIC_API_KEY / OPENAI_API_KEY / HARNESS_LLM_BASE_URL),将复用。");
      } else {
        const provider = await p.select({
          message: "LLM provider",
          options: [
            { value: "compat", label: "OpenAI 兼容(智谱 GLM / DeepSeek 等)", hint: "需 base URL + model + key" },
            { value: "anthropic", label: "Anthropic", hint: "需 API key" },
            { value: "openai", label: "OpenAI", hint: "需 API key" },
          ],
        });
        if (p.isCancel(provider)) return cancel();

        if (provider === "compat") {
          baseUrl = await p.text({ message: "Base URL", placeholder: "https://open.bigmodel.cn/api/paas/v4/chat/completions", validate: (v) => v ? undefined : "必填" });
          if (p.isCancel(baseUrl)) return cancel();
          model = await p.text({ message: "模型名", placeholder: "glm-5.2", validate: (v) => v ? undefined : "必填" });
          if (p.isCancel(model)) return cancel();
        }
        const key = await p.password({ message: "API key", mask: "*" });
        if (p.isCancel(key)) return cancel();
        llmKey = key;
        // 写入 env 供 fill 子模块读(resolveProvider 读 env)
        if (baseUrl) { process.env.HARNESS_LLM_BASE_URL = baseUrl; process.env.HARNESS_LLM_MODEL = model; }
        if (llmKey) { process.env.HARNESS_LLM_API_KEY = baseUrl ? llmKey : llmKey; if (!baseUrl && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = llmKey; }
      }
    }

    // ---- Step 4: 预览 ----
    p.note(
      `项目: ${projectRoot}\nLevel: ${level}\nAgent: ${agents.join(", ")}\nAI 填特异: ${useAI ? (baseUrl ? `${model} (${baseUrl})` : "已配 env") : "否(静态基线)"}`,
      "生成预览",
    );
    const proceed = await p.confirm({ message: "确认生成?", initialValue: true });
    if (p.isCancel(proceed)) return cancel();

    // ---- Step 5: 生成 + 自检 ----
    const s = p.spinner();
    s.start("生成中…");
    try {
      const result = await generate({
        projectRoot,
        level,
        agents,
        useAI,
        llmKey,
        onProgress: (stage, detail) => {
          if (stage.endsWith(":done")) {
            const d = typeof detail === "object" ? JSON.stringify(detail) : detail;
            s.message(`${stage}: ${d}`);
          }
        },
      });
      s.stop("生成完成");

      p.note(
        `识别: ${result.profile.primary} / ${result.profile.runtime} / ${result.profile.moduleSystem}\n` +
          `写入文件: ${result.written.length}\n` +
          `自检: ${result.validation.ok ? "PASS ✓" : "FAIL ✗"} (pass=${result.validation.checks.pass} fail=${result.validation.checks.fail})` +
          (result.validation.checks.missing.length ? `\n缺失:\n  - ${result.validation.checks.missing.join("\n  - ")}` : ""),
        result.validation.ok ? "✓ 成功" : "✗ 自检未过",
      );

      // 起步指引
      const startAgent = agents.includes("claude") ? "claude" : "opencode";
      p.note(
        `1. 在项目里启动 agent:\n   cd ${projectRoot}\n   ${startAgent}\n\n2. 跑第一个任务:\n   /harness-propose <任务名> [需求描述]\n\n3. 接力: /harness-apply <任务名> → /harness-archive <任务名>\n\n查看地图: AGENTS.md / GUIDE.md\n质量门禁: bash .harness/scripts/verify.sh\n完整性: bash .harness/scripts/check-harness.sh`,
        "下一步(在 agent 里)",
      );

      p.outro(result.validation.ok ? "完成 ✓" : "完成(自检未过,见上)");
      process.exit(result.validation.ok ? 0 : 1);
    } catch (e) {
      s.stop("生成失败");
      p.cancel("生成失败: " + e.message);
      console.error(e.stack);
      process.exit(2);
    }
  } catch (e) {
    if (e && e.name === "AbortPromptError") return cancel();
    p.cancel("出错: " + e.message);
    process.exit(2);
  }
}

function cancel() {
  p.cancel("已取消");
  process.exit(0);
}

main();
