#!/usr/bin/env node
/**
 * tester-evidence.cjs — Claude Code SubagentStop(test-engineer) hook
 *
 * 触发:TE 子代理停止后。作用:跑测试 + verify.sh + baseline compare(证据闭环),
 *       结果注入主会话。PM 据此判定:
 *         全 PASS → PM 收尾(check-harness + 模板体检 + board AWAITING_ARCHIVE)
 *         FAIL(实现级) → 打回 Dev
 *         FAIL(需求级) → 升级人 → 改 proposal → 重跑 propose
 *
 * 通用版:不依赖项目特异的 check-e2e-evidence.py(kit 有,此处用测试+verify+baseline 通用闭环)。
 *
 * Claude Code 协议:
 *   stdin:  {"hook_event_name":"SubagentStop","agent_type":"test-engineer", ...}
 *   stdout: {"decision":"allow","hookSpecificOutput":{
 *             "hookEventName":"SubagentStop","additionalContext":"<证据闭环文本>"}}
 */
'use strict';
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../..');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
function run(cmd, timeout = 180000) {
  try {
    return execFileSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '') + (e.killed ? '[TIMEOUT]' : '');
  }
}
function taskFromBoard() {
  // 从 board.md 找最近的 IN_PROGRESS(测试验证) 行作当前 task
  try {
    const board = fs.readFileSync(path.join(ROOT, '.harness/board.md'), 'utf8');
    const m = board.match(/\|\s*\d+\s*\|\s*([a-z0-9-]+)\s*\|\s*测试验证\s*\|\s*IN_PROGRESS/i);
    return m ? m[1] : '';
  } catch { return ''; }
}
function detectTestCmd() {
  if (fs.existsSync(path.join(ROOT, 'package.json'))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') return 'npm test';
    } catch {}
  }
  if (fs.existsSync(path.join(ROOT, 'pytest.ini')) || fs.existsSync(path.join(ROOT, 'pyproject.toml'))) return 'pytest -q';
  if (fs.existsSync(path.join(ROOT, 'go.mod'))) return 'go test ./...';
  return '';
}

const evt = readStdin();
const resp = { decision: 'allow', hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: '' } };

if (evt.agent_type && evt.agent_type !== 'test-engineer') {
  process.stdout.write(JSON.stringify(resp) + '\n');
  process.exit(0);
}

const task = evt.task || taskFromBoard();
const testCmd = detectTestCmd();

// 1. 测试
let testPass = true, passed = '0', failed = '0';
if (testCmd) {
  const out = run(testCmd, 120000).replace(/\x1b\[[0-9;]*m/g, '');
  passed = (out.match(/Tests\s+(\d+)\s+passed/i) || out.match(/(\d+)\s+passing/i) || [])[1] || '0';
  failed = (out.match(/Tests\s+(\d+)\s+failed/i) || out.match(/(\d+)\s+failing/i) || [])[1] || '0';
  testPass = Number(failed) === 0 && (/passed/i.test(out) || /passing/i.test(out));
}

// 2. verify.sh
const verifyOut = run('bash .harness/scripts/verify.sh', 120000);
const verifyPass = /结论: verify\.sh PASS/.test(verifyOut);

// 3. baseline compare(refactor 档或有基线时)
let baseline = '跳过(无 task 或无基线)';
if (task && fs.existsSync(path.join(ROOT, '.harness/baseline', task + '.json'))) {
  const blOut = run(`bash .harness/scripts/baseline.sh compare ${task}`, 60000);
  baseline = /结论: baseline compare PASS/.test(blOut) ? 'PASS' : 'FAIL';
}

const verdict = testPass && verifyPass && baseline !== 'FAIL' ? 'PASS' : 'FAIL';

resp.hookSpecificOutput.additionalContext =
  `[tester hook] verdict=${verdict}\n` +
  (testCmd ? `  测试: ${testPass ? 'PASS' : 'FAIL'} (${passed} passed, ${failed} failed)\n` : `  测试: 跳过(无测试命令)\n`) +
  `  verify.sh: ${verifyPass ? 'PASS' : 'FAIL'}\n` +
  `  baseline: ${baseline}\n` +
  (verdict === 'FAIL'
    ? `  PM 行动:verdict=FAIL → 判归属:测试/verify FAIL(实现级)→ 打回 Dev;需求矛盾(需求级)→ 升级人改 proposal 重跑 propose。`
    : `  PM 行动:verdict=PASS → 收尾(check-harness + 模板体检 + board AWAITING_ARCHIVE)。`);

process.stdout.write(JSON.stringify(resp) + '\n');
process.exit(0);
