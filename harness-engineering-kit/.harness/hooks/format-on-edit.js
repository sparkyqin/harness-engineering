#!/usr/bin/env node
/**
 * format-on-edit.js — Claude Code PostToolUse(Write|Edit) hook
 *
 * 触发：Write/Edit 工具执行后（settings.json 的 PostToolUse matcher: Write|Edit）。
 * 作用：对改动的源码文件跑 prettier 格式化。非硬依赖——prettier 缺失或格式化失败均静默跳过，
 *       绝不阻塞编辑。
 *
 * Claude Code 协议（与 Cursor 的 after_file_edit 不同）：
 *   stdin:  {"hook_event_name":"PostToolUse","tool_name":"Write|Edit",
 *            "tool_input":{"file_path":"..."}, ...}
 *   （文件路径在 tool_input.file_path；Cursor 用 $FILE/$CLAUDE_FILE_PATH 环境变量，此 wrapper 取代之）
 *   stdout: {} 或不输出 = 不干预；格式化是后台动作，无需 decision。
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const evt = readStdin();
const file = (evt.tool_input && evt.tool_input.file_path) || '';

// 仅对 JS/TS 源码格式化（与原 .cursor/hooks.json 的 matcher 一致）
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
  // prettier 未安装 / 解析失败 / 超时 —— 静默跳过，不阻塞编辑
}
process.exit(0);
