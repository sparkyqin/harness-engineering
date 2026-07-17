// core/carriers/index.js — 双 agent 载体生成
//
// 输入: { projectRoot, agents:["claude","opencode"], level, profile }
// 输出: 写入文件路径数组
//
// 职责边界(与 scaffold 分工):
//   - scaffold 已按 Level 拷贝载体静态文件(commands/settings/plugin/agent 入口)。
//   - carriers 模块负责【按 profile 动态定制】载体内容——
//     例:把 detect 到的框架/测试命令写进 AGENTS.md、给 OpenCode agent 注入 model。
//   - M1 阶段:载体纯静态,scaffold 已覆盖 → carriers 为 no-op(返回空)。
//   - M2+:动态定制(AI 填特异后,把项目信息回写载体)。
//
// 载体差异(见 PLAN.md §0.2):
//   - Claude Code hooks 走 settings.json(SubagentStop/PostToolUse/PreToolUse/SessionStart)
//   - OpenCode hooks 走 plugin(tool.execute.before/after + session.created),
//     task 工具用 args.subagent_type 标识子代理(2026-07-17 源码确认)

export async function generateCarriers({ projectRoot, agents, level, profile }) {
  // M1:静态载体已由 scaffold 拷贝,此处无动态定制 → no-op。
  // M2+ 在此追加:按 profile 定制 model 字段、注入框架信息等。
  void projectRoot; void agents; void level; void profile;
  return [];
}

