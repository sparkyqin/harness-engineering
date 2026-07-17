// core/scaffold/index.js — 静态骨架拷贝(templates → 目标项目 .harness/)
//
// 通过 templates-loader 读模板(优先内联 bundle 供 exe 单文件;否则 fs 目录供开发)。
//
// Level → 拷贝组(向后兼容,高 Level 含低 Level):
//   L1  static-infra : .harness/{scripts,codebase-guide,deliverables,specs,memory} + board.md + AGENTS.md + GUIDE.md
//   L2  +carriers    : .claude/{commands,settings.json} + .opencode/{commands,opencode.json,package.json,plugins}
//                      (agent 入口随 L3 引入,因它们引用 L3 才存在的 .harness/agents 契约)
//   L3  +orchestration: .harness/{agents,workflow} + .claude/agents + .opencode/agents
//   L4  +hooks       : .harness/hooks/*.cjs
//
// 占位符替换: {{PROJECT_NAME}} / {{PROJECT_DESCRIPTION}}。
// 写 .harness/level 标记(check-harness/validate 据此分级检查)。

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { readTemplate, listTemplateDir } from "../templates-loader.js";

/**
 * @param {{projectRoot:string, level:"L1"|"L2"|"L3"|"L4", profile:object}} opts
 * @returns {Promise<string[]>} 写入的相对路径
 */
export async function scaffold({ projectRoot, level, profile }) {
  const projectName = profile.projectName || path.basename(projectRoot);
  const description = profile.description || `${profile.primary || ""} 项目(${profile.runtime || "未知运行时"})`;
  const written = [];

  // 1. static-infra(L1+,始终)
  for (const g of ["scripts", "codebase-guide", "deliverables", "specs", "memory"]) {
    copyTemplateDir(`harness-core/.harness/${g}`, path.join(projectRoot, ".harness", g), projectName, description, projectRoot, written);
  }
  copyTemplateFile("harness-core/.harness/board.md", path.join(projectRoot, ".harness", "board.md"), projectName, description, projectRoot, written);
  copyTemplateFile("harness-core/AGENTS.md", path.join(projectRoot, "AGENTS.md"), projectName, description, projectRoot, written);
  copyTemplateFile("harness-core/GUIDE.md", path.join(projectRoot, "GUIDE.md"), projectName, description, projectRoot, written);

  // 写 level 标记
  writeFileSync(path.join(projectRoot, ".harness", "level"), level + "\n");
  written.push(".harness/level");

  // 2. carriers(L2+):commands + settings/plugin,不含 agent 入口(随 L3)
  if (["L2", "L3", "L4"].includes(level)) {
    copyTemplateDir("carrier-claude/.claude/commands", path.join(projectRoot, ".claude", "commands"), projectName, description, projectRoot, written);
    copyTemplateFile("carrier-claude/.claude/settings.json", path.join(projectRoot, ".claude", "settings.json"), projectName, description, projectRoot, written);
    copyTemplateDir("carrier-opencode/.opencode/commands", path.join(projectRoot, ".opencode", "commands"), projectName, description, projectRoot, written);
    copyTemplateFile("carrier-opencode/.opencode/opencode.json", path.join(projectRoot, ".opencode", "opencode.json"), projectName, description, projectRoot, written);
    copyTemplateFile("carrier-opencode/.opencode/package.json", path.join(projectRoot, ".opencode", "package.json"), projectName, description, projectRoot, written);
    copyTemplateDir("carrier-opencode/.opencode/plugins", path.join(projectRoot, ".opencode", "plugins"), projectName, description, projectRoot, written);
  }

  // 3. orchestration(L3+):.harness/{agents,workflow} + 两套 agent 入口
  if (["L3", "L4"].includes(level)) {
    copyTemplateDir("harness-core/.harness/agents", path.join(projectRoot, ".harness", "agents"), projectName, description, projectRoot, written);
    copyTemplateDir("harness-core/.harness/workflow", path.join(projectRoot, ".harness", "workflow"), projectName, description, projectRoot, written);
    copyTemplateDir("carrier-claude/.claude/agents", path.join(projectRoot, ".claude", "agents"), projectName, description, projectRoot, written);
    copyTemplateDir("carrier-opencode/.opencode/agents", path.join(projectRoot, ".opencode", "agents"), projectName, description, projectRoot, written);
  }

  // 4. hooks(L4):.harness/hooks/*.cjs
  if (level === "L4") {
    copyTemplateDir("harness-core/.harness/hooks", path.join(projectRoot, ".harness", "hooks"), projectName, description, projectRoot, written);
  }

  return written;
}

// ---- 拷贝工具(从 templates-loader 读,写到目标项目)----
function copyTemplateDir(relDir, dst, projectName, description, projectRoot, written) {
  const files = listTemplateDir(relDir);
  for (const f of files) {
    const content = readTemplate(`${relDir}/${f}`);
    if (content == null) continue;
    const target = path.join(dst, f);
    writeFilled(target, content, projectName, description);
    written.push(path.relative(projectRoot, target).split(path.sep).join("/"));
  }
}

function copyTemplateFile(relPath, dst, projectName, description, projectRoot, written) {
  const content = readTemplate(relPath);
  if (content == null) return;
  writeFilled(dst, content, projectName, description);
  written.push(path.relative(projectRoot, dst).split(path.sep).join("/"));
}

function writeFilled(dst, content, projectName, description) {
  mkdirSync(path.dirname(dst), { recursive: true });
  const filled = content
    .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
    .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, description);
  writeFileSync(dst, filled);
}
