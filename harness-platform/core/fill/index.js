// core/fill/index.js — AI 填项目特异(编排:checks + guide + carriers 定制)
//
// 输入: { projectRoot, profile, llmKey, onProgress?, mock? }
//   mock:true → 不调 LLM,用合成数据走渲染+写入流程(供无 key 时验证管线)
// 输出: { written:string[], summary:object }
//
// 退化承诺:无 key 且非 mock → 返回空(静态基线仍可用,Level 1-2 不依赖 fill)。
// review 承诺:产出写入后,summary 打印供人确认(GUI 阶段会进 review 面板,不静默)。

import { fillChecks } from "./fill-checks.js";
import { fillGuide } from "./fill-guide.js";
import { customizeCarriers } from "../carriers/customize.js";
import { writeChecks } from "./render-check.js";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * @param {{projectRoot:string, profile:object, llmKey?:string, onProgress?:Function, mock?:boolean}} opts
 */
export async function fill({ projectRoot, profile, llmKey, onProgress, mock }) {
  const step = (s, d) => onProgress?.(s, d);
  const hasKey = !!(
    llmKey ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.HARNESS_LOCAL_LLM_URL ||
    process.env.HARNESS_LLM_BASE_URL
  );

  // 无 key 且非 mock → 退化(静态基线)
  if (!hasKey && !mock) {
    step("skip", { reason: "无 LLM key,退化为静态基线(Level 1-2 仍可用)" });
    return { written: [], summary: { skipped: true, reason: "no-llm-key" } };
  }

  const written = [];
  const summary = { checks: { written: 0, failed: 0 }, guides: 0, carriers: 0 };

  // 1. verify 检查项
  step("checks", {});
  let checksResult;
  if (mock) {
    checksResult = mockChecks(projectRoot, profile);
  } else {
    try {
      checksResult = await fillChecks({ projectRoot, profile, llmKey });
    } catch (e) {
      step("checks:error", { msg: String(e.message).slice(0, 200) });
      checksResult = { written: [], failed: [], checks: [] };
    }
  }
  written.push(...checksResult.written.map((p) => rel(p, projectRoot)));
  summary.checks.written = checksResult.written.length;
  summary.checks.failed = checksResult.failed.length;
  step("checks:done", { written: checksResult.written.length, failed: checksResult.failed.length });

  // 2. codebase-guide 5 份 + AGENTS.md 描述
  step("guide", {});
  let guideResult;
  if (mock) {
    guideResult = mockGuide(projectRoot, profile);
  } else {
    try {
      guideResult = await fillGuide({ projectRoot, profile, llmKey });
    } catch (e) {
      step("guide:error", { msg: String(e.message).slice(0, 200) });
      guideResult = { written: [], guides: {} };
    }
  }
  written.push(...guideResult.written);
  summary.guides = guideResult.written.length;
  step("guide:done", { written: guideResult.written.length });

  // 3. carriers 动态定制(按 profile 注入 model/框架信息)
  step("carriers", {});
  try {
    const carrierResult = await customizeCarriers({ projectRoot, profile });
    written.push(...carrierResult.written);
    summary.carriers = carrierResult.written.length;
  } catch (e) {
    step("carriers:error", { msg: String(e.message).slice(0, 200) });
  }
  step("carriers:done", { written: summary.carriers });

  return { written, summary };
}

function rel(abs, root) {
  return path.relative(root, abs).split(path.sep).join("/");
}

// ---- mock(无 key 验证管线用) ----
function mockChecks(projectRoot, profile) {
  const f = profile.frameworks || {};
  const checks = [];
  if (profile.moduleSystem === "esm") {
    checks.push({ id: "A1", severity: "FAIL", description: "声明 ES Module", probes: [{ type: "package_json_field", field: "type", equals: "module" }] });
  }
  if (f.backend === "express") {
    checks.push({ id: "C1", severity: "FAIL", description: "路由注册进入口(app.use)", probes: [{ type: "entry_grep", pattern: "app.use", files: profile.entryFiles?.length ? profile.entryFiles : ["server.js", "app.js"] }] });
  }
  if (f.orm === "mongoose") {
    checks.push({ id: "A3", severity: "WARN", description: "Model 包含 timestamps", probes: [{ type: "grep_src", pattern: "timestamps", min_matches: 1 }] });
  }
  const checksDir = path.join(projectRoot, ".harness", "scripts", "checks");
  return writeChecks(checksDir, checks);
}

function mockGuide(projectRoot, profile) {
  const guideDir = path.join(projectRoot, ".harness", "codebase-guide");
  const f = profile.frameworks || {};
  const written = [];
  const stub = `<!-- 由 fill(mock) 生成占位内容,真实内容需 LLM key -->\n\n**项目**: ${profile.primary} / ${profile.runtime}\n**框架**: ${[f.backend, f.frontend, f.orm].filter(Boolean).join("/") || "未识别"}\n**模块系统**: ${profile.moduleSystem}\n\n(mock 模式:此为合成占位,验证管线用。配 LLM key 后由 AI 填真实内容。)\n`;
  for (const file of ["overview.md", "backend-arch.md", "frontend-arch.md", "deps.md", "dev-recipes.md"]) {
    const p = path.join(guideDir, file);
    if (existsSync(p)) { writeFileSync(p, stub); written.push(`.harness/codebase-guide/${file}`); }
  }
  return { written, guides: {} };
}
