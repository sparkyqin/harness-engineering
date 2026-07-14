# Dev Recipes — 开发场景配方

> Dev/TE 必读。"如何加 X"的标准操作，避免临场发挥。

## 加一条后端 API

```
1. models/<Name>.js        → 定义 Schema（timestamps），export default
2. controllers/<name>Ctrl.js → 业务逻辑，asyncHandler 包裹
3. routes/<name>Routes.js    → router.get/post，引入 protect（如需认证）
4. server.js / app.js        → app.use('/api/<name>', <name>Routes)   ← C1 注册进入口
5. seeder/                   → 若需种子，更新 data:import（B2）
6. 跑 npm test + verify.sh
```

## 加一个前端 Screen

```
1. screens/<Name>Screen.jsx  → 页面组件
2. features/<name>/<name>ApiSlice.js → injectEndpoints 定义 endpoint  ← C4
3. index.js                  → 注册路由/导航                            ← C2
4. store.js                  → 若有新中间件，注册                        ← C5
5. 跑 build-stamp.sh + verify.sh B1
```

## 加一个 Mongoose Model

```
1. models/<Name>.js
2. export default mongoose.model('Name', schema)
3. Schema 配 timestamps: true                                      ← A3
4. seeder 同步更新（Schema 与种子数据一致）                          ← B2
```

## 改 Schema（数据迁移，refactor 档）

```
1. propose 前：bash .harness/scripts/baseline.sh snapshot <task>   ← 建基线
2. SA 写 impact-analysis.md（影响面 + 回滚策略）
3. Dev 改 schema → npm run data:import 重建种子                      ← 不跳步
4. apply 后：bash .harness/scripts/baseline.sh compare <task>        ← 只看新增 FAIL
```

## 跑 B 类 E2E（TE）

```
1. bash .harness/scripts/ensure-playwright.sh                       ← 确认浏览器就位
2. 从 requirements.md 的 S-xxx 逐条生成 Playwright 用例（正向+异常）
3. npm run test:e2e
4. python .harness/scripts/check-e2e-evidence.py <task>             ← 证据闭环校验
5. 填 test-report.md 矩阵 + B类↔Scenario 映射
```

## 验证闭环（apply 收尾）

```
1. npm test                              ← D 类单元
2. bash .harness/scripts/verify.sh       ← A/B/C 类静态+门槛+一致性
3. bash .harness/scripts/baseline.sh compare <task>  ← refactor 档
4. bash .harness/scripts/check-harness.sh ← Harness 完整性
```

## 常见坑

- **跳过预构建/迁移**：改 schema/模板后没跑 data:import/build，直接跑测试 → 报错根源被掩盖。配方里每步都标注了"不跳步"。
- **路由没注册进入口**：C1 FAIL。新建路由文件后务必 app.use。
- **前端直接 fetch**：C6 WARN。所有请求走 RTK Query。
