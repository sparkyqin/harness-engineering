#!/usr/bin/env node
/**
 * verify-after-developer.js — after_subagent(developer) hook
 *
 * 触发：Developer 子代理停止后。
 * 作用：不问 Dev，程序自跑 npm test + verify.sh，退出码无法伪造。
 *       汇总 PASS/FAIL + 原因，构造 followup_message 注入主会话（PM）。
 *       PM 读 followup → verdict=PASS 进 CR；verdict=FAIL 重拉 Dev（最多 5 轮）。
 *
 * 协议：
 *   stdin  (IDE → Hook): {"event":"after_subagent","agent_name":"developer","exit_code":0,"files_changed":[...]}
 *   stdout (Hook → IDE): {"decision":"allow","followup_message":"..."}
 */
'use strict';
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

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

const evt = readStdin();
const resp = { decision: 'allow', followup_message: '' };

// 只在 developer 停止时跑（matcher 已过滤，这里二次确认）
if (evt.agent_name && evt.agent_name !== 'developer') {
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

resp.followup_message =
  `[developer hook] verdict=${verdict}\n` +
  `  npm test: ${testPass ? 'PASS' : 'FAIL'} (${passed} passed, ${failed} failed)\n` +
  `  verify.sh: ${verifyPass ? 'PASS' : 'FAIL'}\n` +
  (verdict === 'FAIL'
    ? `  PM 行动：verdict=FAIL → 重拉 Developer（重试计数+1，上限 5）；不要信任 Dev 自述。\n` +
      `  摘要：${verifyOut.split('\n').filter((l) => /FAIL/.test(l)).slice(0, 5).join(' | ')}`
    : `  PM 行动：verdict=PASS → 进入 CR（code-reviewer）。`);

process.stdout.write(JSON.stringify(resp) + '\n');
process.exit(0);
