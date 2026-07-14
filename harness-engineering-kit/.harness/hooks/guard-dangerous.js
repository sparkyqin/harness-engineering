#!/usr/bin/env node
/**
 * guard-dangerous.js — before_command hook
 *
 * 触发：命令执行前（beforeShellExecution / PreToolUse:Bash）。
 * 作用：拦截高风险命令（rm -rf /、DROP TABLE、git push --force 到 main 等）。
 *       exit code 非 0 = 操作被取消（before_* 门禁语义）。
 *
 * 协议：
 *   stdin: {"event":"before_command","command":"...","cwd":"..."}
 *   stdout: {"decision":"allow|block","followup_message":"..."}
 */
'use strict';
const fs = require('node:fs');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const evt = readStdin();
const cmd = evt.command || '';

const DANGER = [
  { re: /rm\s+-rf?\s+\/(\s|$)/, msg: 'rm -rf / 危险，已拦截' },
  { re: /DROP\s+TABLE/i, msg: 'DROP TABLE 危险，已拦截' },
  { re: /git\s+push\s+.*--force.*\s(main|master)\b/, msg: 'force push 到主分支危险，已拦截' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};/, msg: 'fork bomb 已拦截' },
];

for (const d of DANGER) {
  if (d.re.test(cmd)) {
    process.stdout.write(JSON.stringify({ decision: 'block', followup_message: `[guard] ${d.msg}` }) + '\n');
    process.exit(2); // before_*：非 0 = 阻止操作
  }
}

process.stdout.write(JSON.stringify({ decision: 'allow', followup_message: '' }) + '\n');
process.exit(0);
