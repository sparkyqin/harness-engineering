#!/usr/bin/env node
/**
 * guard-dangerous.js — Claude Code PreToolUse:Bash hook
 *
 * 触发：Bash 工具执行前（settings.json 的 PreToolUse matcher: Bash）。
 * 作用：拦截高风险命令（rm -rf /、DROP TABLE、git push --force 到 main 等）。
 *
 * Claude Code 协议（与 Cursor 的 before_command 不同）：
 *   stdin:  {"hook_event_name":"PreToolUse","tool_name":"Bash",
 *            "tool_input":{"command":"..."}, ...}
 *   stdout: {"hookSpecificOutput":{"hookEventName":"PreToolUse",
 *            "permissionDecision":"allow|deny","permissionDecisionReason":"..."}}
 *   permissionDecision="deny" = 操作被取消；exit 2 亦可阻断。
 */
'use strict';
const fs = require('node:fs');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const evt = readStdin();
// Claude Code 把命令放在 tool_input.command；兼容 Cursor 的顶层 command 字段。
const cmd = (evt.tool_input && evt.tool_input.command) || evt.command || '';

const DANGER = [
  { re: /rm\s+-rf?\s+\/(\s|$)/, msg: 'rm -rf / 危险，已拦截' },
  { re: /DROP\s+TABLE/i, msg: 'DROP TABLE 危险，已拦截' },
  { re: /git\s+push\s+.*--force.*\s(main|master)\b/, msg: 'force push 到主分支危险，已拦截' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};/, msg: 'fork bomb 已拦截' },
];

for (const d of DANGER) {
  if (d.re.test(cmd)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[guard] ${d.msg}`,
      },
    }) + '\n');
    process.exit(0); // JSON deny 已表达阻断；exit 0 避免被当错误吞掉
  }
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'allow',
    permissionDecisionReason: '',
  },
}) + '\n');
process.exit(0);
