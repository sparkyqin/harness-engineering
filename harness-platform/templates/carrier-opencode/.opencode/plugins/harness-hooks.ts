// harness-hooks.ts — Harness 第4层硬门禁(OpenCode 等价实现)
//
// 对应 Claude Code 的 .claude/settings.json 四类 hook:
//   PreToolUse(Bash)            → guard-dangerous       (tool.execute.before, 拦危险命令)
//   PostToolUse(Write|Edit)     → format-on-edit        (tool.execute.after,  格式化)
//   SubagentStop(developer)     → verify-after-developer (tool.execute.after, task 工具 + subagent_type=developer)
//   SubagentStop(test-engineer)→ tester-evidence        (tool.execute.after, task 工具 + subagent_type=test-engineer)
//   SessionStart                → echo 上下文            (session.created)
//
// 字段名已确认(查 OpenCode 源码 packages/opencode/src/tool/task.ts):
//   task 工具 args.subagent_type = 目标 agent 标识(调度键, agent.get(subagent_type) 解析)
//   tool.execute.after input = { tool, sessionID, callID, args }; output = { title, output, metadata }
//
// 关键: verify-after-developer 不问 Dev, 程序用 $ 自跑, 退出码无法伪造 —— 与 Claude hook 同构。
// 复用 .harness/hooks/*.cjs / .harness/scripts/*.sh 的逻辑, 此处只做事件桥接
// (保持 .harness/ 为 IDE 无关单一来源)。

import { appendFileSync } from "node:fs"

const LOG = ".harness/hook-events.log" // 审计日志, 对应 PM 心跳可观测性

function log(line: string) {
  try {
    appendFileSync(LOG, `[${new Date().toISOString()}] ${line}\n`)
  } catch {}
}

// 危险命令正则(对应 .harness/hooks/guard-dangerous.cjs 的拦截清单)
const DANGEROUS =
  /\b(rm\s+-rf\s+\/|:\(\)\s*\{|git\s+push.*--force|--force-with-lease|drop\s+table|>\s*\/dev\/sd[a-z]|mkfs|dd\s+if=)/i

export const HarnessHooks = async ({ $, client, directory }: any) => {
  return {
    // ── 1. guard-dangerous: bash 前拦危险命令(对应 PreToolUse matcher=Bash)──
    "tool.execute.before": async (input: any, output: any) => {
      if (input?.tool !== "bash") return
      const cmd = output?.args?.command ?? ""
      if (DANGEROUS.test(String(cmd))) {
        log(`[guard-dangerous] BLOCK 危险命令: ${cmd}`)
        // 抛错 = 阻止该工具执行(对应 Claude hook exit 2)
        throw new Error(`[guard-dangerous] 拦截危险命令, 已阻止: ${cmd}`)
      }
    },

    // ── 2 + 3. format-on-edit / verify-after-developer / tester-evidence ──
    "tool.execute.after": async (input: any, output: any) => {
      const tool = input?.tool

      // (2) 格式化: edit/write 后跑 prettier(对应 PostToolUse Write|Edit)
      if (tool === "edit" || tool === "write") {
        const file = output?.args?.path ?? output?.args?.file ?? input?.args?.path
        if (file && /\.(js|jsx|ts|tsx)$/.test(String(file))) {
          try {
            await $`npx prettier --write ${String(file)} 2>/dev/null || true`
          } catch {}
        }
        return
      }

      // (3) 子代理停止后自跑验证(对应 SubagentStop developer / test-engineer)
      //     OpenCode 子代理调用经 task 工具发起, args.subagent_type 标识目标 agent
      if (tool === "task") {
        const subagentType = String(input?.args?.subagent_type ?? "")

        // developer 停 → 自跑测试 + verify.sh, 退出码无法伪造
        if (/developer/i.test(subagentType)) {
          let result: any = { exitCode: 1 }
          try {
            result = await $`bash .harness/scripts/verify-after-developer.sh`.nothrow()
          } catch (e: any) {
            log(`[verify-after-developer] 脚本异常: ${String(e).slice(0, 200)}`)
          }
          const exit = result?.exitCode ?? 1
          const verdict = exit === 0 ? "PASS" : "FAIL"
          log(`[verify-after-developer] verdict=${verdict} exit=${exit}`)
          // 注入主会话(对应 Claude additionalContext)
          // PM 读此 verdict: PASS→进 CR; FAIL→重拉 Dev(≤5 轮)
          await client?.app?.log?.(
            `[developer hook] verdict=${verdict} (exit=${exit})\n` +
              (verdict === "FAIL"
                ? `  PM 行动: verdict=FAIL → 重拉 Developer (重试+1, 上限 5); 不要信任 Dev 自述。`
                : `  PM 行动: verdict=PASS → 进入 CR (code-reviewer)。`),
          )
        }

        // test-engineer 停 → E2E 证据闭环 + verify + baseline
        if (/test.?engineer|tester/i.test(subagentType)) {
          let result: any = { exitCode: 1 }
          try {
            result = await $`bash .harness/scripts/tester-evidence.sh`.nothrow()
          } catch {}
          const exit = result?.exitCode ?? 1
          log(`[tester-evidence] verdict=${exit === 0 ? "PASS" : "FAIL"} exit=${exit}`)
          await client?.app?.log?.(
            `[tester hook] verdict=${exit === 0 ? "PASS" : "FAIL"} (exit=${exit})`,
          )
        }
      }
    },

    // ── 4. SessionStart 等价: 会话创建时加载上下文 ──
    "session.created": async () => {
      log("[SessionStart] Harness 上下文已加载: AGENTS.md / GUIDE.md")
      await client?.app?.log?.("[SessionStart] Harness 上下文已加载: AGENTS.md / GUIDE.md")
    },
  }
}
