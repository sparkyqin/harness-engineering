// core/carriers/customize.js — 按 profile 动态定制载体(M2:轻量定制)
//
// 输入: { projectRoot, profile }
// 输出: { written:string[] }
//
// M2 定制项(轻量,不破坏静态模板):
//   1. OpenCode opencode.json:按 profile 选默认 model(esm/node → claude;否则不变)
//   2. OpenCode opencode.json:instructions 已含 codebase-guide,无需改
//   3. (预留)M3+ 按 profile 调 agent permission(如无前端的项目的 frontend agent 禁用)
//
// 不做的事:不改角色契约(.harness/agents/,IDE 无关单一来源)、不改 verify.sh 框架。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * @returns {Promise<{written:string[]}>}
 */
export async function customizeCarriers({ projectRoot, profile }) {
  const written = [];

  // OpenCode opencode.json:注入 model(若未显式设)
  const ocPath = path.join(projectRoot, ".opencode", "opencode.json");
  if (existsSync(ocPath)) {
    try {
      const cfg = JSON.parse(readFileSync(ocPath, "utf8"));
      if (!cfg.model) {
        // 按运行时选默认模型(可被用户覆盖)
        cfg.model = pickModel(profile);
        writeFileSync(ocPath, JSON.stringify(cfg, null, 2) + "\n");
        written.push(".opencode/opencode.json");
      }
    } catch {}
  }

  return { written };
}

function pickModel(profile) {
  // 默认旗舰(检查项推导/编码需强推理);用户可在生成后改
  if (profile.runtime === "node" || profile.primary === "typescript") {
    return "anthropic/claude-opus-4-8";
  }
  return "anthropic/claude-opus-4-8";
}
