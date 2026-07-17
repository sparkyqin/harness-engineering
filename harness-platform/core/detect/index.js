// core/detect/index.js — 项目探测(静态,确定,无模型依赖)
//
// 输入: projectRoot(绝对路径)
// 输出: project-profile.json
//   {
//     languages:[], primary, runtime, pkgManager,
//     frameworks: {backend, frontend, orm, test},
//     entryFiles:[], srcDirs:[],
//     testFramework, testCmd, buildCmd,
//     isMonorepo, esm, moduleSystem
//   }
//
// 手段: 读 package.json/pyproject.toml/go.mod 依赖指纹;探测入口文件存在性;
//       读 test/build script。纯脚本逻辑,确定性,是 AI 填特异的事实输入。
//
// 无任何清单文件时,退化为最小 profile(语言按文件扩展名统计),不报错——
// detect 是 scaffold 的事实输入,不是门禁。

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * @param {string} projectRoot
 * @returns {Promise<object>} project-profile
 */
export async function detect(projectRoot) {
  const profile = {
    projectRoot,
    languages: [],
    primary: "unknown",
    runtime: "unknown",
    pkgManager: "unknown",
    frameworks: { backend: null, frontend: null, orm: null, test: null },
    entryFiles: [],
    srcDirs: [],
    testFramework: null,
    testCmd: null,
    buildCmd: null,
    isMonorepo: false,
    esm: false,
    moduleSystem: "unknown",
  };

  // Node 项目
  const pkgPath = path.join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    detectNode(profile, projectRoot, pkgPath);
  }

  // Python 项目
  const pyPath =
    existsSync(path.join(projectRoot, "pyproject.toml")) ||
    existsSync(path.join(projectRoot, "requirements.txt"));
  if (pyPath) {
    detectPython(profile, projectRoot);
  }

  // Go 项目
  if (existsSync(path.join(projectRoot, "go.mod"))) {
    detectGo(profile, projectRoot);
  }

  // 兜底:无清单文件 → 按扩展名统计语言
  if (profile.primary === "unknown") {
    detectByExtensions(profile, projectRoot);
  }

  // 通用:探测源码目录与入口
  detectLayout(profile, projectRoot);

  return profile;
}

// ---- Node ----
function detectNode(profile, root, pkgPath) {
  profile.runtime = "node";
  profile.primary = "javascript";
  profile.languages = ["javascript"];
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return;
  }
  profile.esm = pkg.type === "module";
  profile.moduleSystem = pkg.type === "module" ? "esm" : "cjs";

  // 包管理器(按锁文件)
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) profile.pkgManager = "pnpm";
  else if (existsSync(path.join(root, "yarn.lock"))) profile.pkgManager = "yarn";
  else if (existsSync(path.join(root, "bun.lockb")) || existsSync(path.join(root, "bun.lock"))) profile.pkgManager = "bun";
  else profile.pkgManager = "npm";

  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // 框架指纹
  if (allDeps["express"]) profile.frameworks.backend = "express";
  else if (allDeps["fastify"]) profile.frameworks.backend = "fastify";
  else if (allDeps["koa"]) profile.frameworks.backend = "koa";
  else if (allDeps["next"]) { profile.frameworks.backend = "next"; profile.frameworks.frontend = "next"; }
  else if (allDeps["@nestjs/core"]) profile.frameworks.backend = "nest";

  if (allDeps["react"]) profile.frameworks.frontend = "react";
  else if (allDeps["vue"]) profile.frameworks.frontend = "vue";
  else if (allDeps["svelte"]) profile.frameworks.frontend = "svelte";

  if (allDeps["mongoose"]) profile.frameworks.orm = "mongoose";
  else if (allDeps["prisma"]) profile.frameworks.orm = "prisma";
  else if (allDeps["sequelize"]) profile.frameworks.orm = "sequelize";
  else if (allDeps["@prisma/client"]) profile.frameworks.orm = "prisma";

  // 测试框架
  if (allDeps["jest"]) profile.testFramework = "jest";
  else if (allDeps["vitest"]) profile.testFramework = "vitest";
  else if (allDeps["mocha"]) profile.testFramework = "mocha";
  else if (allDeps["playwright"]) profile.testFramework = "playwright";
  profile.frameworks.test = profile.testFramework;

  // scripts
  const scripts = pkg.scripts || {};
  const pm = profile.pkgManager;
  if (scripts.test) profile.testCmd = `${pm} test`;
  if (scripts.build) profile.buildCmd = `${pm} run build`;

  // monorepo 粗判(workspaces 字段)
  if (pkg.workspaces) profile.isMonorepo = true;

  // 语言补 ts
  if (allDeps["typescript"] || existsSync(path.join(root, "tsconfig.json"))) {
    profile.languages = ["typescript", "javascript"];
  }
}

// ---- Python ----
function detectPython(profile, root) {
  profile.runtime = "python";
  profile.primary = "python";
  profile.languages = ["python"];
  profile.pkgManager = existsSync(path.join(root, "uv.lock")) ? "uv"
    : existsSync(path.join(root, "poetry.lock")) ? "poetry"
    : existsSync(path.join(root, "Pipfile")) ? "pipenv"
    : "pip";
  // 框架指纹(读 requirements/pyproject 文本)
  const tryRead = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
  const txt = tryRead(path.join(root, "pyproject.toml")) + "\n" + tryRead(path.join(root, "requirements.txt"));
  if (/django/i.test(txt)) profile.frameworks.backend = "django";
  else if (/fastapi/i.test(txt)) profile.frameworks.backend = "fastapi";
  else if (/flask/i.test(txt)) profile.frameworks.backend = "flask";
  if (/pytest/i.test(txt)) { profile.testFramework = "pytest"; profile.testCmd = "pytest -q"; }
}

// ---- Go ----
function detectGo(profile, root) {
  profile.runtime = "go";
  profile.primary = "go";
  profile.languages = ["go"];
  profile.pkgManager = "go";
  const txt = readFileSync(path.join(root, "go.mod"), "utf8");
  if (/gin-gonic\/gin/.test(txt)) profile.frameworks.backend = "gin";
  else if (/echo\/v4/.test(txt)) profile.frameworks.backend = "echo";
  else if (/fiber/.test(txt)) profile.frameworks.backend = "fiber";
  profile.testFramework = "go-test";
  profile.testCmd = "go test ./...";
  profile.buildCmd = "go build ./...";
}

// ---- 兜底:按扩展名统计 ----
function detectByExtensions(profile, root) {
  const counts = {};
  try {
    walk(root, 0, (f) => {
      const ext = path.extname(f).slice(1);
      if (!ext) return;
      counts[ext] = (counts[ext] || 0) + 1;
    });
  } catch {}
  const langMap = { js: "javascript", jsx: "javascript", cjs: "javascript", mjs: "javascript", ts: "typescript", tsx: "typescript", py: "python", go: "go", rs: "rust", java: "java" };
  const langs = {};
  for (const [ext, n] of Object.entries(counts)) {
    const lang = langMap[ext];
    if (lang) langs[lang] = (langs[lang] || 0) + n;
  }
  const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    profile.languages = sorted.map((s) => s[0]);
    profile.primary = sorted[0][0];
    profile.runtime = profile.primary === "python" ? "python" : profile.primary === "go" ? "go" : "unknown";
  }
}

// ---- 通用布局探测:源码目录 + 入口文件 ----
function detectLayout(profile, root) {
  // 源码目录(复用 kit verify.sh 的探测思路,按存在性)
  const candidateDirs = ["src", "backend", "frontend/src", "frontend", "server", "lib", "app", "api"];
  profile.srcDirs = candidateDirs.filter((d) => {
    const p = path.join(root, d);
    return existsSync(p) && statSync(p).isDirectory();
  });

  // 入口文件(按常见路径存在性)
  const candidateEntries = [
    "server.js", "app.js", "index.js", "src/index.js", "src/server.js", "src/app.js",
    "backend/server.js", "backend/app.js", "main.py", "app/main.py", "main.go", "cmd/main.go",
  ];
  profile.entryFiles = candidateEntries.filter((f) => existsSync(path.join(root, f)));
}

// 简单递归遍历(限深 3,跳过常见非源目录)
function walk(dir, depth, fn) {
  if (depth > 3) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === "node_modules" || e === ".git" || e === "dist" || e === "build" || e === ".next" || e === "target") continue;
    const full = path.join(dir, e);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, depth + 1, fn);
    else fn(full);
  }
}
