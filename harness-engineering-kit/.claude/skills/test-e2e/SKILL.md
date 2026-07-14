---
name: test-e2e
description: E2E 功能验收 SOP。TE 从 requirements 的 Scenario 逐条生成 Playwright 用例，真实浏览器验收。
---

# test-e2e — E2E 功能验收 SOP

> B 类测试：真实浏览器 E2E，从需求的 Scenario 逐条生成。不只跑 happy path——异常分支才是 bug 藏身处。
> 堵住"伪造验证"：嘴上说 E2E 通过没用，check-e2e-evidence.py 校验证据闭环。

## 触发条件
- TE 角色在 apply 节点 3/3，CR PASS 后。

## 步骤（逐条执行）

1. **确认 Playwright 就位**：
   ```bash
   bash .harness/scripts/ensure-playwright.sh
   ```
   缺失则自动安装 @playwright/test + chromium。

2. **从 Scenario 生成用例**：读 requirements.md，把每个 S-xxx 映射成 Playwright 用例：
   - 正向场景 S-xxx ×1（happy path）
   - 异常场景 S-xxx ×1（边界/错误）
   - 最低要求：≥ X 条（按任务定）

3. **编写 E2E**（参考 references/playwright-recipes.md）：
   ```javascript
   // e2e/<task>.spec.js
   test('S-023 换号登录保留英文', async ({ page }) => {
     // GIVEN john 切英文并登出
     // WHEN jane 登录
     // THEN Header 保持英文
   });
   ```

4. **跑 E2E**：
   ```bash
   npx playwright test e2e/<task>.spec.js
   ```

5. **证据闭环校验**：
   ```bash
   python .harness/scripts/check-e2e-evidence.py <task>
   ```
   - 校验：B类↔Scenario 映射、报告存在、PASS 有证据、FAIL 有详情+归属。

6. **填 test-report.md**：
   - 测试矩阵（A/B/C/D 四类）
   - B 类用例 ↔ Scenario 映射表
   - 失败详情（复现步骤 + 期望 vs 实际 + 归属判定）
   - 证据闭环（npm test / Playwright / verify / baseline）
   - `## 结论 PASS` 或 `## 结论 FAIL + 归属(实现级/需求级)`

## 归属判定（FAIL 时必判）
- **实现级 FAIL**（Dev 没做好）→ 打回 Dev（重试，Dev 上限 5 轮）。
- **需求级 FAIL**（需求本身矛盾/缺失）→ 升级人 → 改 proposal → 重跑 `/harness-propose`。
- 判错归属会误导 PM 回退方向，须慎重。

## 禁止
- NEVER 只测 happy path。
- NEVER 降测试标准 / 删失败用例 / 扩大 mock 范围。
- NEVER 把"看起来像"当"真的验证过"——必须跑命令贴真实输出。
- NEVER 改实现代码（TE 只下结论 + 判归属）。

## references/
- `references/playwright-recipes.md`：常用 E2E 模式（登录态、断言、换号模拟）。
