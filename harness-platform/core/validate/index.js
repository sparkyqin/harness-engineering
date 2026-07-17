// core/validate/index.js — 生成后自检(纯 node,不依赖 bash)
//
// 输入: projectRoot
// 输出: { ok: boolean, checks: {pass:number, fail:number, missing:string[]} }
//
// 校验生成的 .harness/ 结构完整性(与 check-harness.sh 等价的 node 实现):
//   按 Level 分级检查:角色齐不齐、契约段落全不全、scripts 在不在、
//   codebase-guide 子文档在不在、board/specs/memory 在不在、(L3+)载体、(L4+)hooks。
//
// 为什么纯 node:CLI/exe 打包后不依赖 bash(.sh 脚本留给 agent 运行时执行,
// agent 生态自带 bash prerequisite)。check-harness.sh 仍保留在套件里供 agent 用。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export async function validate(projectRoot) {
  const harness = path.join(projectRoot, ".harness");
  let pass = 0;
  const missing = [];
  const check = (p, label) => {
    if (existsSync(p)) { pass++; return true; }
    missing.push(label); return false;
  };
  const checkContent = (file, pattern, label) => {
    if (existsSync(file) && readFileSync(file, "utf8").includes(pattern)) { pass++; return true; }
    missing.push(label); return false;
  };

  // 读 Level
  let level = "L1";
  const levelFile = path.join(harness, "level");
  if (existsSync(levelFile)) {
    level = (readFileSync(levelFile, "utf8").trim().match(/^L[1-4]$/) || ["L1"])[0];
  }

  // [1] 顶层入口
  check(path.join(projectRoot, "AGENTS.md"), "AGENTS.md 入口");
  check(path.join(projectRoot, "GUIDE.md"), "GUIDE.md 工作流总览");

  // [2] scripts 硬门禁
  check(path.join(harness, "scripts/verify.sh"), "verify.sh");
  check(path.join(harness, "scripts/check-harness.sh"), "check-harness.sh");
  check(path.join(harness, "scripts/init-task.sh"), "init-task.sh");
  check(path.join(harness, "scripts/stage-doc.sh"), "stage-doc.sh");
  if (level === "L4") check(path.join(harness, "scripts/baseline.sh"), "baseline.sh");

  // [3] codebase-guide 子文档
  for (const doc of ["index", "overview", "backend-arch", "frontend-arch", "deps", "dev-recipes", "harness-roles"]) {
    check(path.join(harness, "codebase-guide", doc + ".md"), "codebase-guide/" + doc + ".md");
  }

  // [4] deliverables 模板与归档
  check(path.join(harness, "deliverables/_template"), "deliverables/_template/");
  check(path.join(harness, "deliverables/_archive"), "deliverables/_archive/");

  // [5] 看板与 specs 索引
  check(path.join(harness, "board.md"), "board.md");
  check(path.join(harness, "specs/_index.md"), "specs/_index.md");

  // [6] memory 库
  check(path.join(harness, "memory/index.md"), "memory/index.md");
  check(path.join(harness, "memory/entries"), "memory/entries/");

  // [7-10] L3+: orchestration + 载体
  if (level === "L3" || level === "L4") {
    for (const role of ["project-manager", "business-analyst", "solution-architect", "readiness-reviewer", "developer", "code-reviewer", "test-engineer"]) {
      check(path.join(harness, "agents", role + ".md"), "agent: " + role);
    }
    for (const role of ["business-analyst", "solution-architect", "readiness-reviewer", "developer", "code-reviewer", "test-engineer"]) {
      const f = path.join(harness, "agents", role + ".md");
      checkContent(f, "身份宣言", role + ": 身份宣言段");
      checkContent(f, "禁止事项", role + ": 禁止事项段");
      checkContent(f, "完成条件", role + ": 完成条件段");
    }
    check(path.join(harness, "workflow/flow-definition.md"), "flow-definition.md");
    check(path.join(harness, "workflow/transitions.json"), "transitions.json");
    check(path.join(harness, "workflow/subagent-orchestration.md"), "subagent-orchestration.md");
    // 载体至少一套
    if (existsSync(path.join(projectRoot, ".claude")) || existsSync(path.join(projectRoot, ".opencode"))) {
      pass++;
    } else {
      missing.push("载体缺失(.claude 和 .opencode 都不存在)");
    }
  }

  // [11] L4: hooks
  if (level === "L4") {
    if (existsSync(path.join(projectRoot, ".claude/settings.json"))) {
      checkContent(path.join(projectRoot, ".claude/settings.json"), "SubagentStop", "Claude settings.json: SubagentStop hook");
      check(path.join(harness, "hooks/verify-after-developer.cjs"), "hooks/verify-after-developer.cjs");
    }
    check(path.join(projectRoot, ".opencode/plugins/harness-hooks.ts"), "OpenCode plugin: harness-hooks.ts");
  }

  const fail = missing.length;
  return { ok: fail === 0, checks: { pass, fail, missing } };
}
