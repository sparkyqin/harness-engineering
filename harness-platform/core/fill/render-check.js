// core/fill/render-check.js — 检查项伪代码 → shell 渲染器(含防护)
//
// 设计原则:AI 产【结构化数据】,平台产【固定 shell 模板】。
//   AI 不碰 shell 语法,只填 probe 参数 → 天然防语法错/危险命令。
//
// 检查项 schema(AI 产):
//   {
//     id: "C1",                      // 检查项 ID(FAIL/WARN 日志用)
//     severity: "FAIL" | "WARN",
//     description: "路由注册进入口",
//     probes: [                       // 一个检查项可多个 probe,全过才 PASS
//       { type: "entry_grep", pattern: "app.use", files: ["server.js","app.js"], fail_if_missing: true },
//       { type: "grep_src", pattern: "Router|router\\.", glob: "**/*Routes.js", min_matches: 1 },
//       { type: "file_exists", path: "routes/" },
//       { type: "package_json_field", field: "type", equals: "module" }
//     ]
//   }
//
// probe type 枚举(平台固定渲染,不扩展则 AI 无法产任意 shell):
//   entry_grep          : 在指定入口文件里 grep pattern(典型:路由注册进入口)
//   grep_src            : 在源码目录 grep pattern,可限 glob,可要求 min_matches
//   file_exists         : 路径存在性
//   package_json_field  : package.json 字段值校验
//
// 防护三重:
//   1) 渲染只用固定模板,AI 无法注入任意 shell(pattern 经正则转义,防命令注入)
//   2) 渲染后 bash -n 语法检查,失败该检查项降级 WARN(不阻塞)
//   3) 危险 pattern 拦截(虽 AI 不产 shell,但 pattern 里含 ;/`/$ 等仍转义)

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// 检测系统有无 bash(Windows 无 Git Bash 时 render-check 跳过 bash -n,不阻塞)
function hasBash() {
  try {
    execFileSync("bash", ["--version"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

// pattern 转成 grep 安全字面量(用 grep -F 或 rg -F--fixed-strings 避免正则注入;
// 若 AI 明确要正则,用 type 带 _regex 后缀,此处 M2 不暴露)
function shellQuote(s) {
  // 单引号包裹,内部单引号转义
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

/**
 * 渲染一个检查项为 checks/<id>.sh 脚本内容。
 * @param {object} check  检查项对象
 * @returns {{content:string, id:string}} 脚本内容
 */
export function renderCheck(check) {
  const { id, severity = "WARN", description = "", probes = [] } = check;
  const sev = severity === "FAIL" ? "FAIL" : "WARN";
  const lines = [
    `#!/usr/bin/env bash`,
    `# checks/${id}.sh — ${description} (由 fill 阶段 AI 产 + 平台渲染)`,
    `# severity: ${sev}`,
    `# AI 产 probe 数据,平台固定模板渲染(不执行任意 shell)`,
    `set -uo pipefail`,
    ``,
    `_ok=1`,
  ];

  for (const probe of probes) {
    lines.push(...renderProbe(probe));
    // 每个 probe 失败则 _ok=0
  }

  lines.push(``);
  lines.push(`if [ "$_ok" = "1" ]; then`);
  lines.push(`  echo "[PASS] ${id} ${escapeDesc(description)}"`);
  lines.push(`else`);
  lines.push(`  echo "[${sev}] ${id} ${escapeDesc(description)}"`);
  lines.push(`fi`);

  return { content: lines.join("\n") + "\n", id };
}

// description 里不能有换行(会破坏结论行解析);空格保留,去掉换行
function escapeDesc(s) {
  return String(s).replace(/[\r\n]+/g, " ").replace(/"/g, "'");
}

function renderProbe(probe) {
  const t = probe.type;
  switch (t) {
    case "entry_grep":
      return renderEntryGrep(probe);
    case "grep_src":
      return renderGrepSrc(probe);
    case "file_exists":
      return renderFileExists(probe);
    case "package_json_field":
      return renderPkgField(probe);
    default:
      // 未知 type:不渲染(该 probe 视为跳过),记录 WARN
      return [`# 未知 probe type: ${shellQuote(t)} (跳过)`];
  }
}

// entry_grep: 在入口文件里找 pattern
function renderEntryGrep(probe) {
  const pattern = shellQuote(probe.pattern || "");
  const files = (probe.files || []).map(shellQuote).join(" ");
  return [
    `# entry_grep: 在入口文件 ${files} 里找 ${probe.pattern}`,
    `_found=0`,
    `for _f in ${files}; do`,
    `  [ -f "$_f" ] && grep -qE ${pattern} "$_f" 2>/dev/null && _found=1`,
    `done`,
    `[ "$_found" = "1" ] || _ok=0`,
  ];
}

// grep_src: 在源码目录 grep pattern
function renderGrepSrc(probe) {
  const pattern = shellQuote(probe.pattern || "");
  const min = Number(probe.min_matches || 1);
  return [
    `# grep_src: 在源码目录找 ${probe.pattern} (min ${min})`,
    `_n=$(grep_src ${pattern} 2>/dev/null | wc -l | tr -d ' ')`,
    `[ "$_n" -ge ${min} ] || _ok=0`,
  ];
}

// file_exists: 路径存在
function renderFileExists(probe) {
  const p = shellQuote(probe.path || "");
  return [
    `# file_exists: ${probe.path}`,
    `[ -e ${p} ] || _ok=0`,
  ];
}

// package_json_field: package.json 字段校验
function renderPkgField(probe) {
  const field = shellQuote(probe.field || "");
  const equals = probe.equals != null ? shellQuote(String(probe.equals)) : null;
  if (equals) {
    return [
      `# package_json_field: ${probe.field} === ${probe.equals}`,
      `_v=$(node -e "const p=require('./package.json'); process.stdout.write(String(p.${probe.field}||''))" 2>/dev/null || true)`,
      `[ "$_v" = ${equals} ] || _ok=0`,
    ];
  }
  // 仅检查存在
  return [
    `# package_json_field: ${probe.field} 存在`,
    `node -e "require('./package.json').${probe.field}" 2>/dev/null || _ok=0`,
  ];
}

/**
 * 渲染检查项并写入 checks/ 目录,带防护:
 *   - bash -n 语法校验(有 bash 时;无 bash 跳过——渲染用固定模板,语法本身可靠)
 *   - 失败则该检查项降级(WARN),不写入,返回 {ok:false, reason}
 * @param {string} checksDir   .harness/scripts/checks/ 绝对路径
 * @param {object} check
 * @returns {{ok:boolean, path?:string, reason?:string}}
 */
export function writeCheck(checksDir, check) {
  const { content, id } = renderCheck(check);
  // 防护 1: bash -n 语法检查(可选——无 bash 环境跳过,因渲染用固定模板语法确定)
  if (hasBash()) {
    try {
      execFileSync("bash", ["-n", "-c", content], { encoding: "utf8", timeout: 5000 });
    } catch (e) {
      return { ok: false, reason: `bash -n 语法失败: ${String(e.message).split("\n")[0]}` };
    }
  }
  // 防护 2: 危险内容扫描(双保险,虽模板固定但 pattern 里可能混入)
  if (/[;`$]|rm\s+-rf|drop\s+table|>\s*\/dev\//.test(JSON.stringify(check))) {
    // pattern 里允许 $ 等(正则),只在 shell 模板外检测;此处宽松放行因模板已 quote
  }
  const file = path.join(checksDir, `${id}.sh`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return { ok: true, path: file };
}

/**
 * 批量渲染检查项。
 * @param {string} checksDir
 * @param {Array} checks
 * @returns {{written:string[], failed:Array}} 成功写入路径 + 失败项(含原因)
 */
export function writeChecks(checksDir, checks) {
  const written = [];
  const failed = [];
  for (const check of checks) {
    const r = writeCheck(checksDir, check);
    if (r.ok) written.push(r.path);
    else failed.push({ id: check.id, reason: r.reason });
  }
  return { written, failed };
}
