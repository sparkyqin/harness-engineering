#!/usr/bin/env node
/**
 * verify-after-developer.cjs — Claude Code SubagentStop(developer) hook
 *
 * 触发:Developer 子代理停止后。作用:不问 Dev,程序自跑【测试 + verify.sh】,退出码无法伪造。
 *       结果通过 additionalContext 注入主会话(PM)。PM 据此:
 *         verdict=PASS → 进 CR(code-reviewer)
 *         verdict=FAIL → 重拉 Developer(≤5 轮)
 *
 * Claude Code 协议:
 *   stdin:  {"hook_event_name":"SubagentStop","agent_type":"developer", ...}
 *   stdout: {"decision":"allow","hookSpecificOutput":{
 *             "hookEventName":"SubagentStop","additionalContext":"<verdict 文本>"}}
 *
 * OpenCode 等价:plugin 的 tool.execute.after(tool=task, args.subagent_type=developer),
 *   见 .opencode/plugins/harness-hooks.ts(调 .harness/scripts/verify-after-developer.sh)。
 *
 * 测试命令探测:优先 package.json scripts.test,否则 pytest/go test;无则跳过测试维度只跑 verify。
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
  // 统一 bash -c:Windows 下 npm/verify.sh 都依赖 bash
  try {
    return execFileSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '') + (e.killed ? '[TIMEOUT]' : '');
  }
}
function detectTestCmd() {
  if (fs.existsSync(path.join(ROOT, 'package.json'))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
        return 'npm test';
      }
    } catch {}
  }
  if (fs.existsSync(path.join(ROOT, 'pytest.ini')) || fs.existsSync(path.join(ROOT, 'pyproject.toml'))) return 'pytest -q';
  if (fs.existsSync(path.join(ROOT, 'go.mod'))) return 'go test ./...';
  return '';
}

const evt = readStdin();
const resp = { decision: 'allow', hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: '' } };

// Claude Code 用 agent_type(matcher 已过滤,二次确认)
if (evt.agent_type && evt.agent_type !== 'developer') {
  process.stdout.write(JSON.stringify(resp) + '\n');
  process.exit(0);
}

// 1. 测试(兼容 vitest 的 "Tests N passed/failed" 与 mocha 的 "N passing/failing")
const testCmd = detectTestCmd();
let testPass = true, passed = '0', failed = '0';
if (testCmd) {
  const testOutRaw = run(testCmd, 120000);
  const testOut = testOutRaw.replace(/\x1b\[[0-9;]*m/g, '');
  passed = (testOut.match(/Tests\s+(\d+)\s+passed/i) || testOut.match(/(\d+)\s+passing/i) || [])[1] || '0';
  failed = (testOut.match(/Tests\s+(\d+)\s+failed/i) || testOut.match(/(\d+)\s+failing/i) || [])[1] || '0';
  testPass = Number(failed) === 0 && (/passed/i.test(testOut) || /passing/i.test(testOut));
}

// 2. verify.sh
const verifyOut = run('bash .harness/scripts/verify.sh', 120000);
const verifyPass = /结论: verify\.sh PASS/.test(verifyOut);

const verdict = testPass && verifyPass ? 'PASS' : 'FAIL';

resp.hookSpecificOutput.additionalContext =
  `[developer hook] verdict=${verdict}\n` +
  (testCmd ? `  测试: ${testPass ? 'PASS' : 'FAIL'} (${passed} passed, ${failed} failed)\n` : `  测试: 跳过(无测试命令)\n`) +
  `  verify.sh: ${verifyPass ? 'PASS' : 'FAIL'}\n` +
  (verdict === 'FAIL'
    ? `  PM 行动:verdict=FAIL → 重拉 Developer(重试计数+1,上限 5);不要信任 Dev 自述。\n` +
      `  摘要:${verifyOut.split('\n').filter((l) => /FAIL/.test(l)).slice(0, 5).join(' | ')}`
    : `  PM 行动:verdict=PASS → 进入 CR(code-reviewer)。`);

process.stdout.write(JSON.stringify(resp) + '\n');
process.exit(0);
