---
title: PG connect 字符串错误
description:
date: 2025-08-04T11:44:00+08:00
lastmod: 2025-12-10T00:26:34+08:00
showLastmod: true
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - postgres
categories:
  - 杂技浅尝
---
[PostgreSQL: Documentation: 17: 32.1. Database Connection Control Functions](https://www.postgresql.org/docs/current/libpq-connect.html)

使用 pg mcp 连接数据库时遇到的问题

>贴出的命令中密码改了


```bash
(MCBot_py311) yangr@172-16-99-32-Dev:/data/yangr/gitRepos/LG_rag_hw$ npx -y @modelcontextprotocol/server-postgres "postgresql://lmi:abc#123@172.16.99.32:5432/lmi"
node:internal/url:818
      href = bindingUrl.parse(input, base, true);
                        ^

TypeError: Invalid URL
    at new URL (node:internal/url:818:25)
    at file:///home/yangr/.npm/_npx/cd1ce99963b5e8b1/node_modules/@modelcontextprotocol/server-postgres/dist/index.js:21:25
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:547:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5) {
  code: 'ERR_INVALID_URL',
  input: 'postgresql://lmi:abc#123@172.16.99.32:5432/lmi'
}

Node.js v22.12.0
```

问了 G 老师，遇到 TypeError: Invalid URL 错误，通常是因为你的连接 URI 中包含了 **未经转义** 的 “#” 字符——这在 URL 语法中会被误解析为**fragment 分隔符**，导致 Node.js 的 URL 构造器无效  。

---
 ## **✅ 解决方案：将“#”字符替换为** 
 
 **%23**

 **（百分号转义）**

参照 Postgres 官方文档，URI 中的特殊字符必须使用 **percent‑encoding** 转义  ：

|**原符号**|**转义后**|**说明**|
|---|---|---|
|#|%23|片段起始符|
|@|%40|用户/密码分隔符|
|:|%3A|host 与 port 分隔符|
|/|%2F|分隔数据库名|
|?|%3F|查询参数分隔符|

例如，如果密码是 pass@word:123，则应写成 pass%40word%3A123。

可以在 Node.js 或 bash 中使用如下代码快速生成 percent‑encoding 版本：

```bash
> encodeURIComponent('abc#12345')
" abc%12345 "
```

## 使用环境变量或者还有一些配置文件的方法可以避免这个问题