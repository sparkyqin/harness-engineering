#!/usr/bin/env node
/**
 * verify-after-developer.js — Claude Code SubagentStop(developer) hook
 *
 * 触发：Developer 子代理停止后（settings.json 的 SubagentStop matcher: developer）。
 * 作用：不问 Dev，程序自跑 npm test + verify.sh，退出码无法伪造。
 *       汇总 PASS/FAIL + 原因，通过 additionalContext 注入主会话（PM）。
 *       PM 读 additionalContext → verdict=PASS 进 CR；verdict=FAIL 重拉 Dev（最多 5 轮）。
 *
 * Claude Code 协议（与 Cursor 的 after_subagent 不同）：
 *   stdin:  {"hook_event_name":"SubagentStop","agent_type":"developer", ...}
 *           （agent_type = .claude/agents/<name>.md 的 name 字段，非 agent_name）
 *   stdout: {"decision":"allow","hookSpecificOutput":{
 *             "hookEventName":"SubagentStop","additionalContext":"<verdict 文本>"}}
 *   additionalContext 会作为旁路上下文注入主会话；decision:"allow" 不阻止 subagent 停止。
 */
'use strict';
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
function run(cmd, timeout = 120000) {
  try {
    return execFileSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '') + (e.killed ? '[TIMEOUT]' : '');
  }
}
const fs = require('node:fs');

const evt = readStdin();
const resp = { decision: 'allow', hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: '' } };

// 只在 developer 停止时跑（matcher 已过滤，这里二次确认：Claude Code 用 agent_type）
if (evt.agent_type && evt.agent_type !== 'developer') {
  process.stdout.write(JSON.stringify(resp) + '\n');
  process.exit(0);
}

// 1. npm test
const testOut = run('npm test', 120000);
const passed = (testOut.match(/(\d+)\s+passing/i) || [])[1] || '0';
const failed = (testOut.match(/(\d+)\s+failing/i) || [])[1] || '0';
const testPass = Number(failed) === 0 && /passing/i.test(testOut);

// 2. verify.sh
const verifyOut = run('bash .harness/scripts/verify.sh', 120000);
const verifyPass = /结论: verify\.sh PASS/.test(verifyOut);

const verdict = testPass && verifyPass ? 'PASS' : 'FAIL';

resp.hookSpecificOutput.additionalContext =
  `[developer hook] verdict=${verdict}\n` +
  `  npm test: ${testPass ? 'PASS' : 'FAIL'} (${passed} passed, ${failed} failed)\n` +
  `  verify.sh: ${verifyPass ? 'PASS' : 'FAIL'}\n` +
  (verdict === 'FAIL'
    ? `  PM 行动：verdict=FAIL → 重拉 Developer（重试计数+1，上限 5）；不要信任 Dev 自述。\n` +
      `  摘要：${verifyOut.split('\n').filter((l) => /FAIL/.test(l)).slice(0, 5).join(' | ')}`
    : `  PM 行动：verdict=PASS → 进入 CR（code-reviewer）。`);

process.stdout.write(JSON.stringify(resp) + '\n');
process.exit(0);
