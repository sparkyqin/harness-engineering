// core/templates-loader.js — 模板读取抽象(优先内联 bundle,否则 fs 目录)
//
// exe 打包后读不到 templates/ 目录,改读构建时内联的 templates-bundle.js。
// 开发时(非 exe)用 fs 读 templates/。本 loader 统一这两种来源。

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.resolve(__dirname, "..", "templates");

// 尝试加载 bundle(exe 里有,开发时可能没有)
let bundle = null;
try {
  const mod = await import("./templates-bundle.js");
  bundle = mod.templatesBundle;
} catch {
  bundle = null;
}

/**
 * 读模板文件内容。
 * @param {string} relPath  相对 templates/ 的路径,如 "harness-core/AGENTS.md"
 * @returns {string|null}
 */
export function readTemplate(relPath) {
  // 优先 bundle
  if (bundle && bundle.files[relPath] != null) return bundle.files[relPath];
  // fallback fs
  const full = path.join(TEMPLATES, relPath);
  if (existsSync(full)) return readFileSync(full, "utf8");
  return null;
}

/**
 * 列出某模板目录下的所有文件(递归),返回相对该目录的路径数组。
 * @param {string} relDir  相对 templates/ 的目录,如 "harness-core/.harness/agents"
 * @returns {string[]}     相对 relDir 的文件路径,如 ["project-manager.md", ...]
 */
export function listTemplateDir(relDir) {
  const prefix = relDir ? relDir + "/" : "";
  if (bundle) {
    // 从 bundle.files 的 key 前缀推导
    return Object.keys(bundle.files)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }
  // fallback fs 递归
  const full = path.join(TEMPLATES, relDir);
  const out = [];
  if (!existsSync(full)) return out;
  function walk(d, r) {
    for (const e of readdirSync(d)) {
      const f = path.join(d, e);
      const rr = r ? r + "/" + e : e;
      if (statSync(f).isDirectory()) walk(f, rr);
      else out.push(rr);
    }
  }
  walk(full, "");
  return out;
}

export function hasBundle() {
  return bundle !== null;
}
