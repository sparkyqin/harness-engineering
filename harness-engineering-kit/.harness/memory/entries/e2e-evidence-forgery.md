# E2E"伪造验证"：声称 PASS 但没真跑

## 类型
pitfall

## 问题场景
TE（或 Dev 自测）嘴上说"接口通过、页面能用"，实际没跑关键命令，只贴一段旧日志或截一小块成功输出，
把"看起来像"当成"真的验证过"。

## 根因
信任 Agent 的话而非程序验证。Agent 可以骗你，但脚本的退出码不会。

## 解决方案
- tester hook（after_subagent）程序自跑 E2E + verify + baseline，结果注入 followup_message。
- `check-e2e-evidence.py` 校验：声称 PASS 须有 Playwright 报告/命令输出；矩阵 B 类失败数与结论一致；
  FAIL 须有复现步骤 + 期望 vs 实际 + 归属判定（实现级/需求级）。
- 铁律：判合格的人不能自己改代码，也不能改测试降标（CR 与 TE 分离）。

## 关联
- 关联 spec: 无（横切关注点）
- 关联脚本: `check-e2e-evidence.py`、`ensure-playwright.sh`
- 关联角色: `test-engineer`（最易踩）、`code-reviewer`

## 来源
- 任务: user-phone（B 类首次 FAIL 后重试闭环）
- 日期: 2026-07-13
