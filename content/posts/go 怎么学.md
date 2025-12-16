---
title: go 怎么学
description:
date: 2025-12-16T11:32:37+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2025-12-16T11:40:29+08:00
showLastMod: true
tags:
categories:
---
>[!NOTE]
>突发奇想，想做一个镜像站，不想用 Java，觉得 go 可以试试，问问 gpt 速学 go可不可能。让他给我安排 28 天的计划如下。后续开启 go-learn 进行学习


# 🗓 Go 学习每日任务清单（28 天 × 每天 2 小时）

---

## **阶段 1：Go 基础与并发模型（Day 1–7）**

### 🧠 目标：掌握 Go 核心语法 + 并发思想

|天数|主题|任务与练习|
|---|---|---|
|**Day 1**|Go 环境与项目结构|- 安装 Go- 运行 `go mod init demo`- 了解 `go run`, `go build`, `go fmt`, `go test`- 写出第一个 “Hello, Go!”|
|**Day 2**|基础语法与函数|- 学习变量声明、常量、函数、多返回值、error- 练习：写一个简单计算器函数- 理解 `defer`、`panic`、`recover`|
|**Day 3**|Struct 与方法|- 定义一个 `User` 结构体并实现 `Hello()` 方法- 使用指针接收者 vs 值接收者- 熟悉 JSON 序列化 (`encoding/json`)|
|**Day 4**|Slice / Map / Range / 指针|- 练习创建与遍历 Slice 与 Map- 理解 `make` 与 `new`- 写一个词频统计器（word counter）|
|**Day 5**|并发基础：goroutine + channel|- 启动多个 goroutine 打印任务编号- 使用 channel 汇总结果- 写一个并发 worker pool|
|**Day 6**|同步机制：sync + context|- 使用 `sync.WaitGroup` 控制 goroutine 结束- 写一个带超时的 context 任务- 理解 `select` 与 channel 超时|
|**Day 7**|小项目复盘：并发爬虫|- 实现：并发请求一组 URL，输出状态码与耗时- 使用 goroutine + WaitGroup + channel 汇总结果|

---

## **阶段 2：Web 服务与数据库实战（Day 8–14）**

### 🧠 目标：掌握 Gin + GORM + JWT + Viper 的使用

|天数|主题|任务与练习|
|---|---|---|
|**Day 8**|Gin 入门|- 安装 Gin- 编写基础路由 `/ping`, `/hello/:name`- 使用 `POST` 接收 JSON|
|**Day 9**|中间件与统一响应|- 编写 Logging Middleware- 返回标准格式：`{"code":0,"msg":"ok","data":{}}`- 全局异常恢复|
|**Day 10**|GORM ORM 基础|- 初始化数据库连接（SQLite 或 PostgreSQL）- 定义 `User` 模型并自动建表- 实现基础 CRUD|
|**Day 11**|配置管理：Viper|- 使用 `viper` 读取 `.env` / `config.yaml`- 设置多环境配置（dev/prod）|
|**Day 12**|用户注册 + 登录 + JWT|- 安装 `github.com/golang-jwt/jwt/v5`- 编写 `/register` `/login`- JWT 中间件鉴权|
|**Day 13**|日志系统|- 使用 `zap` 替换 `fmt.Println`- 日志包含 traceID / request path- 按天滚动日志文件|
|**Day 14**|阶段项目复盘|项目：`UserService`- 注册 / 登录 / 获取用户信息- 使用 Gin + GORM + JWT + Zap 组合完成 Demo|

---

## **阶段 3：多租户架构与上下文传递（Day 15–21）**

### 🧠 目标：理解租户隔离 + 实现租户中间件

|天数|主题|任务与练习|
|---|---|---|
|**Day 15**|多租户概念与三种模型|- 理解 DB 级 / Schema 级 / Row 级（tenant_id）隔离差异- 选择你项目的隔离策略（建议 Row 级）|
|**Day 16**|模型扩展 tenant_id|- 修改所有表结构添加 `tenant_id` 字段- 写 GORM hook：自动注入 tenant_id|
|**Day 17**|请求上下文传递|- Middleware 读取 Header 中的 `X-Tenant-ID`- 注入到 `context.Context` 并传入 GORM|
|**Day 18**|多数据源支持|- 设计 map[string]*gorm.DB 缓存连接池- 允许按租户动态切换数据源|
|**Day 19**|路由分组与租户验证|- 添加租户中间件：验证租户合法性- 限制跨租户访问|
|**Day 20**|RBAC 权限控制|- 表设计：tenant, user, role, user_role- 定义角色枚举（ADMIN / USER）- 编写权限检查中间件|
|**Day 21**|阶段项目复盘|项目：`TenantHub`- 多租户用户系统- Header 传递租户- 每租户独立用户空间|

---

## **阶段 4：工程化、测试与部署（Day 22–28）**

### 🧠 目标：形成可部署的生产级项目骨架

|天数|主题|任务与练习|
|---|---|---|
|**Day 22**|项目结构重构|- 使用 Clean Architecture- 拆分目录：`cmd/`, `internal/`, `pkg/`- 抽象 service/dao/controller|
|**Day 23**|单元测试与 Mock|- 使用 `testing` + `testify/assert`- 对 service 层编写测试- 模拟数据库操作|
|**Day 24**|CLI 工具开发|- 创建 `cmd/migrate/main.go`- 支持命令：`create-tenant`, `migrate`|
|**Day 25**|Docker 化部署|- 编写多阶段 `Dockerfile`- 使用 `docker-compose` 启动 Postgres + API 服务|
|**Day 26**|性能与并发优化|- 使用 `go test -bench .` 做基准测试- 优化 goroutine 复用、连接池大小|
|**Day 27**|CI/CD 与版本管理|- 用 `Makefile` 或 GitHub Actions 构建发布包- 输出二进制 `./bin/mthub`|
|**Day 28**|项目总结与发布|- 写 README- 总结架构与经验- 打包上传到私有镜像仓库（可选）|

---

## 🧱 最终成果（Day 28 完成后）

你将拥有：

```
multi-tenant-hub/
├── cmd/
│   └── server/main.go          # 主入口
├── internal/
│   ├── config/
│   ├── controller/
│   ├── service/
│   ├── dao/
│   ├── middleware/
│   └── model/
├── pkg/
│   ├── jwt/
│   ├── tenant/
│   └── logger/
├── configs/
│   └── config.yaml
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

---

## ⚙️ 推荐工具与命令

- **热重载**：`air`
    
- **代码格式化**：`go fmt ./...`
    
- **依赖管理**：`go mod tidy`
    
- **编译优化**：`go build -ldflags "-s -w"`
    
- **测试命令**：`go test ./... -v`
    
