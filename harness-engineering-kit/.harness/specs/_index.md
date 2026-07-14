# Specs — 系统能力索引（Source of Truth）

> specs/ 是系统能力的 Source of Truth。新任务启动时 AI 读 specs/，不用从头推断系统能力。
> 每次交付归档时，PM 执行 Spec Merge：把本次变更（ADDED/MODIFIED/REMOVED）合并进对应 spec.md。

## 能力清单

| capability | 说明 | spec 路径 |
|---|---|---|
| user-auth | 认证与会话管理 | specs/user-auth/spec.md |
| products | 商品目录与详情 | specs/products/spec.md |
| orders | 下单与履约 | specs/orders/spec.md |
| i18n | 界面语言切换 | specs/i18n/spec.md |

> 注：上表为示例占位。真实能力随交付逐步建立（archive 阶段 Spec Merge）。

## Spec 格式（从 OpenSpec 继承）

```markdown
# <Capability> Specification

## Purpose
<该 spec 域的高层描述>

## Requirements

### Requirement: <名>
<系统 SHALL ...，observable 行为>

#### Scenario: <名>
- GIVEN <前置>
- WHEN <动作>
- THEN <可验证预期>
```

- 需求：`### Requirement:`，SHALL/MUST 强约束。
- 场景：`#### Scenario:`，**恰好 4 个 #**，GIVEN/WHEN/THEN。
- delta 操作：`## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements`。
- archive 时：ADDED 追加，MODIFIED 替换，REMOVED 删除。

## 与 OpenSpec 的关系

本 Harness 复用 OpenSpec 的 specs-as-source-of-truth + delta-merge 机制，
扩展了角色制衡与硬门禁（详见 `AGENTS.md`）。
