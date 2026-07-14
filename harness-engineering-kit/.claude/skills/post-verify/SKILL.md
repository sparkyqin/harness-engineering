---
name: post-verify
description: 事后验证 SOP。Dev/TE 在交付前跑 verify.sh + baseline compare + check-harness，形成证据闭环。
---

# post-verify — 事后验证 SOP

> 交付不靠 AI 说了什么，靠脚本检查。本 Skill 把"事后验证"固化成固定步骤。
> 价值：Agent 可以骗你（"我测试通过了"），但脚本的退出码不会。

## 触发条件
- Dev 完成实现、TE 完成测试后，PM 收尾前。
- tester hook 也会旁路复核。

## 步骤（逐条执行）

1. **verify.sh — 交付前总验证**（A/B/C 类）：
   ```bash
   bash .harness/scripts/verify.sh
   ```
   - 退出码 0 = PASS（可有 WARN）；1 = 有 FAIL（阻塞）。
   - 记录：`verify.sh: PASS (通过 X / 警告 Y / 失败 Z)`。

2. **baseline.sh compare — 基线对比**（refactor 档；standard 档跳过）：
   ```bash
   bash .harness/scripts/baseline.sh compare <task>
   ```
   - 退出码 0 = 未新增 FAIL；1 = 新增 FAIL。
   - 堵住"不是我引入的"借口。

3. **check-harness.sh — Harness 完整性**（PM 收尾时）：
   ```bash
   bash .harness/scripts/check-harness.sh
   ```
   - 校验 Agent 文件齐、契约段落全、scripts/硬门禁在。

4. **模板残留体检**（PM 收尾时）：
   ```bash
   grep -rE '<name>|<!-- TODO|<existing-name>|<brief description>' .harness/deliverables/<task>/*.md
   ```
   - 命中 = 有未替换占位符，须清理。无命中 = PASS。

5. **汇总证据**（写进 test-report.md / dev-log.md）：
   ```
   verify.sh: PASS (26/4/0)
   baseline compare: 未新增 FAIL
   check-harness: PASS
   模板残留: PASS
   ```

## 错误处理
- verify.sh FAIL → 不交付，打回 Dev 修对应 A/B/C 项。
- baseline 新增 FAIL → 不可甩锅给历史，打回 Dev。
- check-harness FAIL → PM 修 Harness 结构（3 轮修不动回滚升级）。
- `rg` 未识别 → 降级用 grep（脚本内已处理）。

## 降级策略
工具缺失（如 rg）时，脚本内置 grep 降级；功能等价，只是少了格式化。
