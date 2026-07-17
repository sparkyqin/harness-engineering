# backend-arch.md — 后端架构

> **填充者:平台 fill 阶段(AI 读项目后填)或人手动填。**
> SA/Dev/CR 必读。后端入口、路由组织、数据模型、中间件约定。

## 入口与启动
<!-- server.js/app.js 在哪,启动流程 -->

## 路由组织
<!-- routes/ 目录结构,路由如何注册进入口(这通常是 verify.sh C 类检查项的来源) -->

## 数据模型
<!-- models/ 目录,Schema 约定(如 timestamps、export default 等,这些通常是 verify.sh 检查项) -->

## 中间件
<!-- 认证、错误处理、日志等中间件,注册位置 -->

## 业务逻辑层
<!-- controllers/services 组织方式,错误处理约定(如 asyncHandler) -->

## 与 verify.sh 的对应
<!-- 本项目的后端工程一致性检查项(A/C 类)源自哪些约定,逐条对应 -->
