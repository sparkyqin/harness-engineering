# board.md — Harness 任务看板（状态机真实来源）

> PM 推进流程时，每完成一个阶段就更新本表对应行的"阶段/状态"列。
> 列：ID | 任务名 | 阶段 | 状态码 | profile | 结论/备注
>
> 状态码：PENDING / IN_PROGRESS / AWAITING_ARCHIVE / DONE
> 阶段（propose）：提案 / 需求分析 / 影响面分析 / 方案设计 / 就绪评审 / 待审批1
> 阶段（apply）：开发实现 / 代码审查 / 测试验证 / 待审批2
> 阶段（archive）：归档中 / 交付完成

| ID | 任务名 | 阶段 | 状态码 | profile | 结论/备注 |
|---|---|---|---|---|---|
| 049 | recent-browse-product-load-fail | 交付完成 | DONE | quick | 已归档至 _archive/2026-07-10-recent-browse-product-load-fail |
| 050 | user-switch-stale-ui | 交付完成 | AWAITING_ARCHIVE | standard | 含一次 TE FAIL(实现级) 回退 Dev 后重试闭环，待人工审批2 |

<!--
示例行（仅作格式参考，init-task.sh 会追加真实行）：
| 019 | user-phone | 交付完成 | AWAITING_ARCHIVE | refactor | 含一次 TE FAIL 回退后重试闭环 |
| 019 | user-phone | 开发实现 | IN_PROGRESS | refactor | propose 全链路 PASS，待人工审批1 -->
