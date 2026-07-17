# dev-recipes.md — 开发场景配方

> **填充者:平台 fill 阶段(AI 读项目后填)或人手动填。**
> Dev/TE 必读。"如何加 X"的标准操作,避免临场发挥。每步标注对应的 verify.sh 检查项。

## 加一条后端 API
```
1. <models/定义 Schema>
2. <controllers/业务逻辑>
3. <routes/路由>
4. <入口注册 app.use>   ← 对应 verify.sh C 类:路由注册进入口
5. <seeder 同步>(如需)
6. 跑测试 + verify.sh
```

## 加一个前端页面/Screen
```
1. <screens/页面组件>
2. <API 层定义 endpoint>   ← 对应 verify.sh C 类
3. <路由/导航注册>          ← 对应 verify.sh C 类
4. <store 注册中间件>(如有)
5. 跑构建 + verify.sh
```

## 加一个数据模型
```
1. <models/定义>
2. <导出约定>   ← 对应 verify.sh A 类
3. <Schema 约定(timetamps 等)>   ← 对应 verify.sh A 类
4. <seeder 同步>
```

## 改数据模型(refactor 档)
```
1. propose 前: bash .harness/scripts/baseline.sh snapshot <task>   ← 建基线
2. SA 写 impact-analysis.md
3. Dev 改 schema → 跑迁移/重建   ← 不跳步
4. apply 后: bash .harness/scripts/baseline.sh compare <task>   ← 只看新增 FAIL
```

## 验证闭环(apply 收尾)
```
1. 跑测试
2. bash .harness/scripts/verify.sh       ← A/B/C 类
3. bash .harness/scripts/baseline.sh compare <task>   ← refactor 档
4. bash .harness/scripts/check-harness.sh ← Harness 完整性
```

## 常见坑(本项目特异)
<!-- 本项目踩过的、容易错的点 -->
