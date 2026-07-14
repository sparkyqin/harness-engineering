# Memory — 记忆库索引

> 记忆系统是四层防线之上的**动态增长层**。静态防线（Rules/Skills/Agents/Scripts）在初始化时定义，
> 而真实项目的复杂性无法在初始化时完全预见——memory 记录可复用经验，让框架自我进化。
>
> archive 阶段 PM 执行 Memory Merge：把可复用经验写入 entries/。

## entries/（可复用经验）

| 条目 | 类型 | 触发场景 |
|---|---|---|
| [login-language-switch.md](entries/login-language-switch.md) | pitfall | 换号登录语言覆盖缺陷 |
| [skip-migration-masks-error.md](entries/skip-migration-masks-error.md) | pitfall | 跳过迁移掩盖报错根源 |
| [e2e-evidence-forgery.md](entries/e2e-evidence-forgery.md) | pitfall | E2E 伪造验证 |

> 条目格式见 `templates/entry.md`。新增经验用"问题场景 + 解决方案"格式，更易被 AI 理解。

## 维护

- 每次 archive，PM 评估本次任务是否有可复用经验 → 写入 entries/。
- 定期审查（随项目演进）：删过时经验前先验证现有代码是否仍用该模式。
- 记忆与 specs/ 互补：specs 是"系统能力契约"，memory 是"踩过的坑与解法"。
