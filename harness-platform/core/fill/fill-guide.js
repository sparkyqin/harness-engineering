// core/fill/fill-guide.js — AI 填 codebase-guide 5 份 + AGENTS.md 描述
//
// 输入: { projectRoot, profile, llmKey }
// 输出: { written:string[], guides:object }
//
// 每份 guide 独立调用 LLM(精调),按 profile 读相关源码,产结构化 markdown。
// 渲染策略:保留模板的标题骨架,把 AI 产的内容填进对应 `<!-- ... -->` 占位段下。
//   (模板每个标题下有 <!-- 填充说明 --> 注释,fill 把注释替换为 AI 产的内容)
//
// 5 份:overview / backend-arch / frontend-arch / deps / dev-recipes
// AGENTS.md 的 {{PROJECT_DESCRIPTION}} 段也由这里填(基于 overview 摘要)。

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chat } from "./llm.js";

const GUIDES = [
  { file: "overview.md", title: "项目架构总览", focus: "整体架构、技术栈、目录布局、入口、构建/测试命令", sample: "entry+pkg" },
  { file: "backend-arch.md", title: "后端架构", focus: "入口启动、路由组织、数据模型、中间件、业务逻辑层、与 verify 检查项对应", sample: "backend" },
  { file: "frontend-arch.md", title: "前端架构", focus: "入口路由、状态管理、数据获取、组件组织、与 verify 检查项对应", sample: "frontend" },
  { file: "deps.md", title: "依赖与版本锁定", focus: "运行时/开发依赖清单、版本锁定策略、已知风险依赖", sample: "pkg" },
  { file: "dev-recipes.md", title: "开发场景配方", focus: "如何加 API/页面/模型,每步标注对应 verify 检查项,常见坑", sample: "recipes" },
];

/**
 * @returns {Promise<{written:string[], guides:object}>}
 */
export async function fillGuide({ projectRoot, profile, llmKey }) {
  const guideDir = path.join(projectRoot, ".harness", "codebase-guide");
  const written = [];
  const guides = {};

  for (const g of GUIDES) {
    const tplPath = path.join(guideDir, g.file);
    if (!existsSync(tplPath)) continue;
    const template = readFileSync(tplPath, "utf8");
    const samples = sampleFor(g.sample, projectRoot, profile);

    const content = await chat(
      [
        { role: "system", content: SYSTEM(g.title, g.focus) },
        { role: "user", content: buildPrompt(profile, samples, template, g) },
      ],
      { key: llmKey, temperature: 0.3, maxTokens: 2048 }
    );

    // AI 产整份 markdown(按模板标题结构),直接写回(保留模板的标题骨架由 prompt 约束)
    const filled = content.text.trim() || template;
    writeFileSync(tplPath, filled);
    written.push(`.harness/codebase-guide/${g.file}`);
    guides[g.file] = filled.slice(0, 200);
  }

  // AGENTS.md 描述段:基于 overview 摘要
  // 模板里是两行:`> {{PROJECT_DESCRIPTION}}`(scaffold 替换为默认描述) + `> (本段由平台 fill 阶段填充...)`
  // fill 用第二行的固定说明作锚点,把这两行换成 AI 产的一句话描述
  const agentsPath = path.join(projectRoot, "AGENTS.md");
  if (existsSync(agentsPath)) {
    let agents = readFileSync(agentsPath, "utf8");
    const desc = await describeProject(profile, llmKey, guides["overview.md"] || "");
    const before = agents;
    // 匹配"上一行任意描述 + 本行固定说明注释",整段替换
    agents = agents.replace(/^> [^\n]*\n> \(本段由平台 fill[^\n]*\)/m, `> ${desc}`);
    if (agents === before) {
      // 锚点未匹配(scaffold 未写说明行):兜底替换第一个 `> {{...}}` 风格的默认描述行
      agents = agents.replace(/^> [^\n]*项目[^\n]*$/m, `> ${desc}`);
    }
    writeFileSync(agentsPath, agents);
    written.push("AGENTS.md");
  }

  return { written, guides };
}

function SYSTEM(title, focus) {
  return `你是 Harness Engineering 的 codebase-guide 作者。
任务:为项目的「${title}」文档填充真实内容,聚焦 ${focus}。

约束:
1. 直接输出完整 Markdown 文件内容(可基于给定模板的标题结构)。
2. 内容必须基于给定的项目 profile 和源码抽样,不要臆造。
3. 保留模板里的标题结构(## 级标题),把内容填进去。每段简洁(2-5 行),整体 ≤120 行。
4. 如果某段信息从抽样里看不出(如 frontend-arch 但项目无前端),写"(本项目无前端,跳过)"而非臆造。
5. 不要输出代码块包裹整个文件,直接输出 Markdown 文本。`;
}

function buildPrompt(profile, samples, template, g) {
  return `# 项目 profile
${JSON.stringify(profile, null, 2)}

# 源码抽样
${samples}

# 模板(参考其标题结构,把内容填进对应标题下)
${template}

# 任务
产出填充后的「${g.title}」完整 Markdown。聚焦:${g.focus}。
直接输出 Markdown 内容,不要前后解释。`;
}

async function describeProject(profile, llmKey, overviewText) {
  try {
    const { text } = await chat(
      [
        { role: "system", content: "用一句话描述项目(做什么+技术栈),30字内,用于 AGENTS.md。只输出描述,无引号无前缀。" },
        { role: "user", content: `profile: ${JSON.stringify(profile)}\noverview摘要: ${overviewText}` },
      ],
      { key: llmKey, temperature: 0.3, maxTokens: 100 }
    );
    return text.trim().replace(/^["'"]|["'"]$/g, "").slice(0, 100);
  } catch {
    // 降级:用 profile 拼
    const f = profile.frameworks || {};
    return `${profile.primary} 项目(${[f.backend, f.frontend, f.orm].filter(Boolean).join("/") || profile.runtime})`;
  }
}

// ---- 按 guide 类型抽源码 ----
function sampleFor(kind, root, profile) {
  const maxLines = 50;
  const read = (rel) => {
    const full = path.join(root, rel);
    if (!existsSync(full)) return null;
    try { return `## ${rel}\n\`\`\`\n${readFileSync(full,"utf8").split("\n").slice(0,maxLines).join("\n")}\n\`\`\``; }
    catch { return null; }
  };
  const parts = [];
  if (kind === "entry+pkg" || kind === "pkg" || kind === "recipes") {
    if (existsSync(path.join(root, "package.json"))) parts.push(read("package.json") || "");
    for (const f of profile.entryFiles || []) { const r = read(f); if (r) parts.push(r); }
  }
  if (kind === "backend") {
    for (const f of profile.entryFiles || []) { const r = read(f); if (r) parts.push(r); }
    // 找 routes/models/controllers
    for (const d of ["routes", "models", "controllers", "backend/routes", "backend/models"]) {
      const full = path.join(root, d);
      if (existsSync(full)) {
        try { for (const e of readdirSync(full).slice(0, 3)) { const r = read(path.join(d, e)); if (r) parts.push(r); } } catch {}
      }
    }
  }
  if (kind === "frontend") {
    for (const d of profile.srcDirs || []) {
      if (/front/i.test(d)) { const r = readShallow(root, d, maxLines); if (r) parts.push(r); }
    }
  }
  return parts.filter(Boolean).join("\n\n") || "(无相关源码可抽样)";
}

function readShallow(root, dir, maxLines) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return null;
  const parts = [];
  try {
    for (const e of readdirSync(full).slice(0, 5)) {
      const p = path.join(full, e);
      if (statSync(p).isFile() && /\.(jsx?|tsx?)$/.test(e)) {
        try { parts.push(`## ${path.relative(root,p)}\n\`\`\`\n${readFileSync(p,"utf8").split("\n").slice(0,maxLines).join("\n")}\n\`\`\``); } catch {}
      }
    }
  } catch {}
  return parts.join("\n\n") || null;
}
