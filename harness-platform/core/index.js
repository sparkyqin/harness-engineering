// core/index.js — 平台生成编排入口
//
// 把 detect → scaffold → fill → carriers → validate 串成一条流水线。
// GUI(M1)和未来 CLI 都调这个;core 与 UI 解耦。
//
// 生成流水线(对应 PLAN.md §3):
//   detect  → project-profile.json        (静态探测,确定)
//   scaffold→ 拷 templates/harness-core    (静态骨架,确定)
//   fill    → AI 填项目特异(可选)         (codebase-guide/verify 检查项/dev-recipes)
//   carriers→ 生成 .claude / .opencode     (按选定 agent + Level)
//   validate→ 跑 check-harness.sh 自检
//
// 当前 M0:仅编排骨架与类型定义,各模块实现随 Level 推进填充。

import { detect } from "./detect/index.js";
import { scaffold } from "./scaffold/index.js";
import { fill } from "./fill/index.js";
import { generateCarriers } from "./carriers/index.js";
import { validate } from "./validate/index.js";

/**
 * @typedef {Object} GenerateOptions
 * @property {string} projectRoot          目标项目根目录(绝对路径)
 * @property {"L1"|"L2"|"L3"|"L4"} level   生成到哪个 Level
 * @property {string[]} agents             目标 agent:["claude","opencode"] 子集
 * @property {boolean} useAI               是否用 AI 填项目特异
 * @property {string} [llmKey]             LLM API key(useAI=true 时必填)
 * @property {(stage:string, detail:unknown)=>void} [onProgress] 进度回调(GUI 用)
 */

/**
 * 生成 harness 套件到 projectRoot。
 * @param {GenerateOptions} opts
 * @returns {Promise<{profile:object, written:string[], validation:object}>}
 */
export async function generate(opts) {
  const { onProgress } = opts;
  const step = (stage, detail) => onProgress?.(stage, detail);

  // 1. 探测项目(静态,确定)
  step("detect", { projectRoot: opts.projectRoot });
  const profile = await detect(opts.projectRoot);
  step("detect:done", profile);

  // 2. 拷静态骨架
  step("scaffold", { level: opts.level });
  const scaffolded = await scaffold({
    projectRoot: opts.projectRoot,
    level: opts.level,
    profile,
  });
  step("scaffold:done", { files: scaffolded.length });

  // 3. AI 填项目特异(可选;mock=true 用合成数据走管线,无需 key)
  let filled = [];
  if (opts.useAI) {
    step("fill", { useAI: true, mock: !!opts.mock });
    const fillResult = await fill({
      projectRoot: opts.projectRoot,
      profile,
      llmKey: opts.llmKey,
      onProgress: (s, d) => step("fill:" + s, d),
      mock: opts.mock,
    });
    filled = fillResult.written;
    step("fill:done", { files: filled.length, summary: fillResult.summary });
  }

  // 4. 生成双 agent 载体
  step("carriers", { agents: opts.agents });
  const carriers = await generateCarriers({
    projectRoot: opts.projectRoot,
    agents: opts.agents,
    level: opts.level,
    profile,
  });
  step("carriers:done", { files: carriers.length });

  // 5. 自检
  step("validate", {});
  const validation = await validate(opts.projectRoot);
  step("validate:done", validation);

  return {
    profile,
    written: [...scaffolded, ...filled, ...carriers],
    validation,
  };
}
