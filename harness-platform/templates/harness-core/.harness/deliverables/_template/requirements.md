# Requirements — {{TASK_NAME}}

> BA 产出。SHALL 强约束 + GIVEN/WHEN/THEN 场景。R-xxx/S-xxx 编号贯穿全链路。

## 结论 PASS

## 需求项

### Requirement: <R-001 一句话>
系统 SHALL <行为>。

#### Scenario: <S-001 happy path>
- GIVEN <前置>
- WHEN <动作>
- THEN <预期>

#### Scenario: <S-002 异常:空值/异常输入>
- GIVEN <异常前置>
- WHEN <动作>
- THEN <异常预期>

## delta 标记(与现有 specs 的关系)
- ADDED / MODIFIED / REMOVED:<说明>

## 需求切片自检
- [ ] 每个 Scenario 独立可验证(无"先…再…"顺序耦合)
- [ ] 每条 SHALL 无"并且"(否则拆成两条)
- [ ] 异常/边界独立成 Requirement
- [ ] 编号 R-xxx / S-xxx 贯穿
