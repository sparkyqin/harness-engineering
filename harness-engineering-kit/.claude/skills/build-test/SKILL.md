---
name: build-test
description: 构建与测试验证 SOP。Dev 完成代码修改后、TE 跑工程验证时触发。固定步骤，不再临场发挥。
---

# build-test — 构建与测试验证 SOP

> Rule 说"每次修改后必须做构建验证"；本 Skill 说具体怎么做。
> Rule 定义 What，Skill 定义 How。步骤写到 Agent 能"无脑执行"的程度。

## 触发条件
- Developer 完成代码修改后（developer hook 也会旁路复核）。
- Test Engineer 跑 D 类工程验证时。

## 步骤（Agent 逐条执行，不可跳步）

1. **预构建/迁移不跳步**：若改了 schema/模板/生成代码 → 先跑对应迁移/生成：
   ```bash
   npm run data:import   # 改 schema 时
   ```
2. **全量单元测试**：
   ```bash
   npm test
   ```
   记录 `N passed`。
3. **后台启动 server 冒烟**：
   ```bash
   node server.js &  # 或 npm run server
   SERVER_PID=$!
   sleep 2
   curl -s http://localhost:${PORT:-5000}/api/health
   kill $SERVER_PID
   ```
   期望：health 返回 200/OK。`BACKEND_START=PASS`。
4. **前端构建（戳记优化）**：
   ```bash
   bash .harness/scripts/build-stamp.sh
   ```
   期望：命中戳记跳过重建，或重建成功。
5. **汇总 PASS/FAIL 表格**（写进 dev-log.md / test-report.md）：
   ```
   | 步骤 | 结果 |
   |---|---|
   | 预构建/迁移 | PASS/跳过 |
   | npm test | PASS (N) |
   | 后端冒烟 | PASS |
   | 前端构建 | PASS(命中)/PASS(重建) |
   ```

## 错误处理
- 预构建失败 → 停，报 PM（不要直接跑测试，报错根源会被掩盖）。
- 后端冒烟起不来 → 检查端口占用：`lsof -i :5000` 或换 PORT；不是测试问题。
- 前端构建失败 → 不要降标，报 PM 让 Dev 修。

## scripts/ 引用
- `scripts/run-tests.sh`：封装 npm test + 解析通过数。
- `scripts/check-build.sh`：封装 build-stamp 调用。
