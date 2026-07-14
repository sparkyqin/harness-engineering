# Orders Specification

## Purpose
商品下单、下单前校验与订单履约。

## Requirements

### Requirement: 下单前手机号校验
系统 SHALL 在用户下单前，校验其账户已填写有效手机号；未填写则阻断下单并提示补全。

#### Scenario: 已填手机号下单
- GIVEN 一个已填写有效手机号的登录用户，购物车有商品
- WHEN 用户提交订单
- THEN 订单创建成功

#### Scenario: 未填手机号下单被阻断
- GIVEN 一个未填写手机号的登录用户，购物车有商品
- WHEN 用户提交订单
- THEN 系统阻断下单并提示"请先填写手机号"，提供跳转到资料页的入口

### Requirement: 订单号展示
系统 SHALL 在订单创建后向用户展示可读的订单号。

#### Scenario: 订单创建后展示订单号
- GIVEN 用户刚成功创建一笔订单
- WHEN 页面渲染订单确认
- THEN 页面显示该订单的订单号
