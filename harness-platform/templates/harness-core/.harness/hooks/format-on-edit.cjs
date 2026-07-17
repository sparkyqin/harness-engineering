#!/usr/bin/env node
/**
 * format-on-edit.cjs — Claude Code PostToolUse(Write|Edit) hook
 *
 * 触发:Write/Edit 执行后。作用:对改动的 JS/TS 源码跑 prettier。
 * 非硬依赖——prettier 缺失或格式化失败均静默跳过,绝不阻塞编辑。
 *
 * Claude Code 协议:
 *   stdin:  {"hook_event_name":"PostToolUse","tool_name":"Write|Edit","tool_input":{"file_path":"..."}}
 *   stdout: {} 或不输出 = 不干预(格式化是后台动作)。
 */
'use strict';
const { execFileSync } = require('node:child_process');

function readStdin() {
  try { return JSON.parse(require('node:fs').readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const evt = readStdin();
const file = (evt.tool_input && evt.tool_input.file_path) || evt.file_path || '';

if (!file || !/\.(js|jsx|ts|tsx)$/.test(file)) {
  process.exit(0);
}

try {
  execFileSync('npx', ['prettier', '--write', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 30000,
  });
} catch {
  // prettier 未安装 / 解析失败 / 超时 —— 静默跳过
}
process.exit(0);
