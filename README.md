# Harness Engineering

> Agent = Model + Harness。模型决定上限，Harness 决定底线。

本仓归档了学完《AI 时代研发效能提升落地实战》后整理的三件产物：

| 目录 / 文件 | 说明 |
|---|---|
| [`harness-engineering-kit/`](./harness-engineering-kit) | 还原自课程案例的完整工程化落地框架：四层防线 + 七角色接力 + 硬门禁脚本，把"是否完成"从 Agent 的主观汇报变成可检查的客观成果。详见其 [README](./harness-engineering-kit/README.md)。 |
| [`harness-learning-notes.md`](./harness-learning-notes.md) | 完整学习笔记：从 prompt 七层架构、上下文工程、记忆管理，到 Rules/Skills/Agents/Scripts 四层防线、子代理编排、Harness 失败模式与落地框架。 |
| [`images/`](./images) | 课程幻灯片渲染图（PDF 逐页导出），与笔记中的页码引用一一对应。 |

## 三者的关系

- **笔记** 是知识梳理的主线，按课程页码推进；
- **图片** 是笔记引用的幻灯片原图，便于对照；
- **Kit** 是笔记中"Harness 落地实践案例"的工程化成品，可直接 `git clone` 后跑起来。

## 快速上手 Kit

```bash
cd harness-engineering-kit
bash .harness/scripts/codebase-guide-init.sh   # 初始化知识地图（首次）
bash .harness/scripts/check-harness.sh          # 校验 Harness 完整性
bash .harness/scripts/init-task.sh my-feature standard   # 开新任务
```

工作流三步：`/harness-propose` → `/harness-apply` → `/harness-archive`，详见 [`harness-engineering-kit/GUIDE.md`](./harness-engineering-kit/GUIDE.md)。

## 来源

课程：《AI 时代研发效能提升落地实战》
