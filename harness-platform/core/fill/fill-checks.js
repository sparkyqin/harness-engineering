// core/fill/fill-checks.js — AI 产项目特异 verify 检查项
//
// 输入: { projectRoot, profile, llmKey }
// 输出: { written:string[], failed:object[], checks:object[] }
//
// 流程:
//   1. 读 profile + 抽样关键源码(入口/路由/模型,控量)
//   2. 调 LLM(chatJSON)产检查项数组,约束 schema:
//      { checks: [{id, severity, description, probes:[{type, ...}]}] }
//      probe type 仅限: entry_grep / grep_src / file_exists / package_json_field
//   3. render-check.writeChecks 渲染 + bash -n 防护,失败项降级
//
// AI 只产 probe 参数,不碰 shell —— 平台固定模板渲染,防语法错/危险命令。

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chatJSON } from "./llm.js";
import { writeChecks } from "./render-check.js";

const PROBE_DOCS = `probe type 枚举(只允许这 4 种,平台固定渲染,你不可产任意 shell):
  - entry_grep   : 在指定入口文件里找 pattern。字段: {type:"entry_grep", pattern:string, files:string[], fail_if_missing?:bool}
  - grep_src     : 在源码目录 grep pattern。字段: {type:"grep_src", pattern:string, glob?:string, min_matches?:number(默认1)}
  - file_exists  : 路径存在性。字段: {type:"file_exists", path:string}
  - package_json_field : package.json 字段校验。字段: {type:"package_json_field", field:string, equals?:string(不给则只检查存在)}`;

const EXAMPLE = `示例(MERN 项目):
{
  "checks": [
    { "id": "C1", "severity": "FAIL", "description": "路由注册进入口",
      "probes": [{"type":"entry_grep","pattern":"app.use","files":["server.js","app.js"]}] },
    { "id": "A3", "severity": "WARN", "description": "Model 包含 timestamps",
      "probes": [{"type":"grep_src","pattern":"timestamps","min_matches":1}] },
    { "id": "A1", "severity": "FAIL", "description": "声明 ES Module",
      "probes": [{"type":"package_json_field","field":"type","equals":"module"}] }
  ]
}`;

/**
 * @returns {Promise<{written:string[], failed:object[], checks:object[]}>}
 */
export async function fillChecks({ projectRoot, profile, llmKey }) {
  const samples = sampleSource(projectRoot, profile);
  const prompt = buildPrompt(profile, samples);

  const result = await chatJSON(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    { key: llmKey, temperature: 0.2, maxTokens: 12000 }
  );

  const checks = (result.checks || []).filter(isValidCheck);
  const checksDir = path.join(projectRoot, ".harness", "scripts", "checks");
  const { written, failed } = writeChecks(checksDir, checks);
  return { written, failed, checks };
}

const SYSTEM = `你是 Harness Engineering 的 verify 检查项设计师。
你的任务:分析项目,产出【项目特异】的交付前验证检查项,供 verify.sh 执行。

约束:
1. 只产结构化 JSON,不产 shell 代码。
2. probe type 只能用枚举的 4 种,不可发明新 type。
3. 检查项应针对【这个项目的真实工程约定】(如:路由如何注册、Model 如何导出、ESM 声明、特定库的使用规范),不要产与项目无关的通用项。
4. severity: FAIL=阻塞交付(硬约定,如路由没注册进入口);WARN=建议(如缺 timestamps)。
5. id 用 A1/A2...(静态规范)或 C1/C2...(工程一致性),与 verify.sh 通用基线 G1/G2 区分。
6. 每个检查项的 probes 可多个,全过才 PASS。

${PROBE_DOCS}

${EXAMPLE}

只输出 JSON 对象 {"checks": [...]},不要任何解释文本。`;

function buildPrompt(profile, samples) {
  return `# 项目 profile
${JSON.stringify(profile, null, 2)}

# 关键源码抽样(供你识别工程约定)
${samples}

# 任务
基于以上项目,产出 3-8 个项目特异检查项。聚焦:
- 框架约定的强制项(${profile.frameworks?.backend || "?"} 路由注册 / ${profile.frameworks?.orm || "?"} Model 导出等)
- 模块系统(${profile.moduleSystem})
- 测试/构建是否就绪
- 明显的工程一致性约定(从源码抽样能看出来的)

只输出 JSON。`;
}

// ---- 源码抽样(控量,避免 token 爆炸) ----
function sampleSource(projectRoot, profile) {
  const maxFiles = 8;
  const maxLines = 40;
  const candidates = [];
  // 入口文件
  for (const f of profile.entryFiles || []) candidates.push(f);
  // srcDirs 下浅层文件
  for (const d of profile.srcDirs || []) {
    const dir = path.join(projectRoot, d);
    if (!existsSync(dir)) continue;
    try {
      for (const e of readdirSync(dir).slice(0, 6)) {
        const full = path.join(dir, e);
        if (statSync(full).isFile() && /\.(js|jsx|ts|tsx|py|go)$/.test(e)) {
          candidates.push(path.relative(projectRoot, full));
        }
      }
    } catch {}
  }
  const picked = candidates.slice(0, maxFiles);
  const parts = [];
  for (const rel of picked) {
    const full = path.join(projectRoot, rel);
    if (!existsSync(full)) continue;
    try {
      const lines = readFileSync(full, "utf8").split("\n").slice(0, maxLines).join("\n");
      parts.push(`## ${rel}\n\`\`\`\n${lines}\n\`\`\``);
    } catch {}
  }
  return parts.join("\n\n") || "(无源码可抽样)";
}

// ---- schema 校验(宽松,过滤明显错误) ----
function isValidCheck(c) {
  if (!c || typeof c !== "object") return false;
  if (!c.id || !c.description) return false;
  if (!Array.isArray(c.probes) || c.probes.length === 0) return false;
  const validTypes = ["entry_grep", "grep_src", "file_exists", "package_json_field"];
  return c.probes.every((p) => p && validTypes.includes(p.type));
}
