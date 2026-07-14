---
name: code-review
description: 代码审查 SOP。CR 角色按六维度审查 Dev 产出，与 TE 分离（不让同一 Agent 又写又审）。
---

# code-review — 代码审查 SOP

> CR 与 TE 分离：写代码的人不能自己判合格，判合格的人不能自己改代码。
> 交叉互审形成反馈回路：CR REJECT → Dev 修 → CR 复审。

## 触发条件
- Dev 完成、developer hook verdict=PASS 后，PM 拉起 code-reviewer。

## 步骤（按六维度逐项审查）

1. **建立基线**：读 design.md + requirements.md，明确"应该实现成什么样"。

2. **实现对照 design**：每个任务点是否按 design 实现？有无偏离？

3. **规范符合**（对照 code-standards.mdc / verify.sh A 类）：
   - ES Module / asyncHandler / timestamps / 路由有 Controller / 单文件 ≤300 行 / 无 console.log / 无硬编码端口

4. **工程一致性**（对照 verify.sh C 类）：
   - 路由进 app.js / Screen 进 index.js / Model export default / API Slice injectEndpoints / errorMiddleware 注册 / 前端无直接 fetch

5. **安全**：认证路由引入 protect、无硬编码密钥、输入校验、SQL/注入。

6. **可维护性 + 范围合规**：命名/抽象/重复代码；是否超 proposal/design 范围（小题大做检查）。

7. **填问题清单**：
   ```
   | # | 维度 | 严重度(FAIL/WARN) | 文件:行 | 问题 | 建议归属(Dev/TE/上游) |
   ```

8. **下结论**：
   - 无 FAIL 级问题 → `## 结论 PASS`。
   - 有 FAIL 级 → `## 结论 REJECT` + 主要问题 + 归属路由。

## REJECT 归属路由
- 实现缺陷/规范违反/工程不一致 → 打回 **Dev**。
- 测试缺失/测试与实现不符 → 打回 **TE**（或 Dev 补测试）。
- 实现暴露需求层矛盾 → 升级 **人**（改 proposal 重跑 propose）。

## 禁止
- NEVER 替 Dev 大段重写代码（极小修复可改并标注，否则 REJECT 让 Dev 改）。
- NEVER 放过可疑代码（不确定标 WARN，让 TE/PM 复核）。
- NEVER 与 Dev 是同一 Agent。

## 输出
`deliverables/<task>/code-review.md`，末尾 `## 结论 PASS/REJECT`。
