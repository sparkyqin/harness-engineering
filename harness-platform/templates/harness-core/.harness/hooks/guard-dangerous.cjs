#!/usr/bin/env node
/**
 * guard-dangerous.cjs — Claude Code PreToolUse(Bash) hook / OpenCode tool.execute.before(bash)
 *
 * 触发:Bash 工具执行前。作用:拦截高风险命令(rm -rf /、DROP TABLE、force push 主分支、fork bomb)。
 *
 * Claude Code 协议:
 *   stdin:  {"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"..."}}
 *   stdout: {"hookSpecificOutput":{"hookEventName":"PreToolUse",
 *            "permissionDecision":"allow|deny","permissionDecisionReason":"..."}}
 *   deny = 操作取消;exit 2 亦可阻断。
 *
 * OpenCode 等价:plugin 的 tool.execute.before 抛 Error 阻止(见 .opencode/plugins/harness-hooks.ts)。
 */
'use strict';
const fs = require('node:fs');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const evt = readStdin();
// Claude Code: tool_input.command;兼容顶层 command
const cmd = (evt.tool_input && evt.tool_input.command) || evt.command || '';

const DANGER = [
  { re: /rm\s+-rf?\s+\/(\s|$)/, msg: 'rm -rf / 危险,已拦截' },
  { re: /DROP\s+TABLE/i, msg: 'DROP TABLE 危险,已拦截' },
  { re: /git\s+push\s+.*--force.*\s(main|master)\b/, msg: 'force push 到主分支危险,已拦截' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};/, msg: 'fork bomb 已拦截' },
  { re: /mkfs(\.|\s)/, msg: 'mkfs 危险,已拦截' },
  { re: />\s*\/dev\/sd[a-z]/, msg: '直写磁盘设备危险,已拦截' },
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
    process.exit(0);
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
