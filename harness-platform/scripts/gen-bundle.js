// scripts/gen-bundle.js — 构建时把 templates/ 内联成 JS 模块(供 exe 单文件打包)
//
// 用法: node scripts/gen-bundle.js
// 产出: core/templates-bundle.js,导出 { files: {relPath: content}, dirs: [relPath] }
// scaffold 运行时优先用 bundle(exe 里),无 bundle 则用 fs 读 templates/(开发时)。

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES = path.join(ROOT, "templates");
const OUT = path.join(ROOT, "core", "templates-bundle.js");

const files = {};
const dirs = [];

function walk(dir, rel = "") {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const r = rel ? rel + "/" + entry : entry;
    if (statSync(full).isDirectory()) {
      dirs.push(r);
      walk(full, r);
    } else {
      files[r] = readFileSync(full, "utf8");
    }
  }
}
walk(TEMPLATES);

// 生成 JS 模块:用 JSON 序列化避免转义问题
const content = `// 自动生成,勿手改。由 scripts/gen-bundle.js 从 templates/ 内联。
// 供 exe 单文件打包用(exe 里读不到 templates/ 目录,改读此 bundle)。
export const templatesBundle = ${JSON.stringify({ files, dirs }, null, 0)};
`;

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, content);
console.log(`gen-bundle: ${Object.keys(files).length} 文件, ${dirs.length} 目录 → ${path.relative(ROOT, OUT)}`);
