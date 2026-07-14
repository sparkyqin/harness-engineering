#!/usr/bin/env node
/**
 * tester-evidence.js — after_subagent(test-engineer) hook
 *
 * 触发：TE 子代理停止后。
 * 作用：跑测试证据闭环（check-e2e-evidence + verify + baseline compare），
 *       把结果注入 followup_message。PM 据此判定：
 *         全 PASS → PM 收尾（check-harness + 模板体检 + board AWAITING_ARCHIVE）
 *         FAIL(实现级) → 打回 Dev
 *         FAIL(需求级) → 升级人 → 改 proposal → 重跑 propose
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
    return execFileSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '') + (e.killed ? '[TIMEOUT]' : '');
  }
}
function taskFromBoard() {
  // 从 board.md 找最近的 IN_PROGRESS(测试验证) 行作为当前 task（简化）
  try {
    const board = fs.readFileSync(path.join(ROOT, '.harness/board.md'), 'utf8');
    const m = board.match(/\|\s*\d+\s*\|\s*([a-z0-9-]+)\s*\|\s*测试验证\s*\|\s*IN_PROGRESS/i);
    return m ? m[1] : '';
  } catch { return ''; }
}

const evt = readStdin();
const resp = { decision: 'allow', followup_message: '' };
if (evt.agent_name && evt.agent_name !== 'test-engineer') {
  process.stdout.write(JSON.stringify(resp) + '\n');
  process.exit(0);
}

const task = evt.task || taskFromBoard();

// 1. E2E 证据闭环
let e2e = '跳过（无 task）';
if (task) {
  const out = run(`python .harness/scripts/check-e2e-evidence.py ${task}`, 60000);
  e2e = /PASS/.test(out) ? 'PASS' : 'FAIL';
}

// 2. verify
const verifyOut = run('bash .harness/scripts/verify.sh', 120000);
const verifyPass = /结论: verify\.sh PASS/.test(verifyOut);

// 3. baseline compare（refactor 档；standard 跳过）
let baseline = '跳过（standard 档）';
if (task) {
  const out = run(`bash .harness/scripts/baseline.sh compare ${task}`, 120000);
  if (/未新增 FAIL|PASS/.test(out)) baseline = 'PASS';
  else if (/无基线/.test(out)) baseline = '跳过（无基线）';
  else baseline = 'FAIL';
}

resp.followup_message =
  `[tester hook] 证据闭环\n` +
  `  E2E 证据: ${e2e}\n` +
  `  verify.sh: ${verifyPass ? 'PASS' : 'FAIL'}\n` +
  `  baseline compare: ${baseline}\n` +
  `  task: ${task || '(未识别)'}\n` +
  `  PM 行动：读 test-report.md 的 ## 结论 与归属判定 → ` +
  (e2e === 'PASS' && verifyPass && baseline !== 'FAIL'
    ? '全 PASS → PM 收尾（check-harness + 模板体检 + board AWAITING_ARCHIVE）'
    : '有 FAIL → 按归属(实现级→Dev / 需求级→升级人)处理');

process.stdout.write(JSON.stringify(resp) + '\n');
process.exit(0);
