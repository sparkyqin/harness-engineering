# 跳过数据迁移/预构建掩盖报错根源

## 类型
pitfall

## 问题场景
改了 Mongoose Schema / 模板 / 生成代码后，没跑 `data:import` / build / codegen，
直接 `npm test` → 测试报错，但报错指向"找不到字段"之类症状，Agent 围着 Controller 改补丁，
真正根因在 schema 没迁移。每轮"修复"引入新问题，Token 越烧越多。

## 根因
Agent（Dev）跳步：改了 schema/模板后未执行对应的迁移/生成/构建步骤，报错根源被掩盖，
后续排查方向完全偏离（围着症状打补丁）。

## 解决方案
- `dev-recipes.md` 每个配方都标注"不跳步"：改 schema → 先 data:import → 再测试。
- refactor 档 propose 前必跑 `baseline.sh snapshot`，apply 后 `compare` 只看新增 FAIL。
- developer hook（after_subagent）自跑 npm test + verify.sh，退出码无法伪造。
- 轮次封顶（Dev 5 轮）：围着症状死磕超限即升级，不无限重试。

## 关联
- 关联 spec: 无（横切关注点）
- 关联脚本: `baseline.sh`、`verify.sh`
- 关联角色: `developer`（最易踩）、`project-manager`（轮次封顶拦截）

## 来源
- 任务: 多任务共性经验
- 日期: 2026-07-13
