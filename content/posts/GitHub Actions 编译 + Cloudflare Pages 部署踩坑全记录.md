---
title: GitHub Actions 编译 + Cloudflare Pages 部署踩坑全记录
description: 把一个 Vite 前端项目从本地推到 GitHub，让 GitHub Actions 自动编译，再用 Wrangler 部署到 Cloudflare Pages 的完整过程，以及中间踩的坑
date: 2026-05-22T18:34:46+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-22T18:44:54+08:00
showLastMod: true
tags:
  - GitHub Actions
  - Cloudflare Pages
  - Wrangler
  - CI/CD
  - Vite
categories:
  - 杂技浅尝
---

我的主域名空着很久了，很久以前有一个非常简易的 home page，但是有了 AI 之后看来看去，太繁杂的又不喜欢，让我自己写又嫌烦，昨天终于狠下心让 codex 开始干活，然后部署流程记录一下。

这是个 Vite + React 的静态主页，本地跑没问题，想丢到线上去。之前一直用 Cloudflare Pages 直接连 GitHub 仓库自动部署，但这次想换个方式——用 GitHub Actions 编译，然后通过 Wrangler 做 Direct Upload 部署到 Cloudflare Pages。

思路比较简单，但是觉得可以记录一下。

## 整体链路

先说清楚整个链路长什么样：

```txt
本地代码
  -> git push 到 GitHub main 分支
  -> GitHub Actions 触发 CI + Deploy workflow
  -> npm ci
  -> npm run build
  -> 生成 dist
  -> wrangler pages deploy dist
  -> 发布到 Cloudflare Pages
```

跟 Cloudflare 自动连接 GitHub 仓库那种方式不一样，这里是 GitHub Actions 主动用 Wrangler 把构建产物推上去，算是个 Direct Upload 的方案。

## 本地准备

项目就是个普通 Vite 项目，核心命令不用多说：

```bash
npm install
npm run dev
npm run build
```

`package.json` 里确保有这些 scripts 就行：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

构建完生成 `dist/` 目录，Cloudflare Pages 最终部署的就是这玩意儿。

## GitHub Actions：CI workflow

先写一个 CI workflow，保证每次 push 或者 PR 都能过类型检查和构建。

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Build
        run: npm run build
```

> 用了 `npm ci` 的话，仓库里得提交 `package-lock.json`，不然会报错。别问我怎么知道的。

## GitHub Actions：部署 workflow

`.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=r-home-frontend
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

关键就是最后那行：

```yaml
command: pages deploy dist --project-name=r-home-frontend
```

意思是用 Wrangler 把 `dist` 目录上传到 Cloudflare Pages 里的 `r-home-frontend` 项目。所以这两个东西必须对得上——`dist` 是构建输出目录，`r-home-frontend` 必须是 Cloudflare Pages 里实际存在的项目名。

## Cloudflare 侧的准备

### 创建 Pages 项目

去 Cloudflare Dashboard：

```txt
Workers & Pages -> Create application -> Pages -> Direct Upload
```

项目名填 `r-home-frontend`，跟 workflow 里的 `--project-name` 保持一致。

### 创建 API Token

这个 Token 是给 GitHub Actions 调 Cloudflare API 用的。去 Cloudflare Dashboard 右上角头像 -> 我的个人资料 -> API 令牌 -> 创建令牌。

权限选：

```txt
Account -> Cloudflare Pages -> Edit
```

资源范围选你自己的 Cloudflare 账号就行。

> 别用 Global API Key。不需要 DNS 权限，不需要 Zone 权限。这个 token 就只管 Pages 部署。

### GitHub Secrets

在 GitHub 仓库 Settings -> Secrets and variables -> Actions 里添加两个 secret：

```txt
CLOUDFLARE_API_TOKEN  = 刚才创建的 API 令牌
CLOUDFLARE_ACCOUNT_ID = Cloudflare 账号 ID
```

`CLOUDFLARE_ACCOUNT_ID` 在 Cloudflare Dashboard 右侧账号信息或者 Workers & Pages 页面都能找到。

## 推送，然后报错了

准备完毕，推代码：

```bash
git push origin main
```

去 GitHub Actions 看，CI 跑过了，Deploy workflow 开始跑了，然后……

```txt
✘ [ERROR] A request to the Cloudflare API
(/accounts/***/pages/projects/r-home-frontend) failed.

Project not found. The specified project name does not match any of your existing projects. [code: 8000007]
```

Project not found？？？

仔细看报错信息——它请求的是 `/pages/projects/r-home-frontend` 这个路径，说明 Token 本身是通的，问题是 **Cloudflare 里压根没有叫 `r-home-frontend` 的 Pages 项目**。

哦哦哦，原来是项目不存在。

### 修法

两个方案，选一个就行：

**方案 A（推荐）：去 Cloudflare 创建同名项目**

Workers & Pages -> Create application -> Pages，项目名填 `r-home-frontend`，然后回 GitHub Actions 页面 Re-run 失败的 workflow。

**方案 B：改 workflow 里的项目名**

如果 Cloudflare 里已经有 Pages 项目了，只是名字不一样，比如叫 `anluoying-home`，那就改 deploy.yml 里的：

```yaml
command: pages deploy dist --project-name=anluoying-home
```

提交推送就行。

## 还有个 warning

部署日志里还有一段：

```txt
Warning: Your working directory is a git repo and has uncommitted changes
To silence this warning, pass in --commit-dirty=true
```

这个不是部署失败的原因，纯粹是个 warning。如果看着碍眼，可以加 `--commit-dirty=true`：

```yaml
command: pages deploy dist --project-name=r-home-frontend --commit-dirty=true
```

但先别管这个，把项目名对上才是正事。

## 关于 CONFIG_ACCESS_KEY

排查过程中还看到 Worker 那边有个 `CONFIG_ACCESS_KEY`，一度以为跟部署有关。

其实没关系。`CONFIG_ACCESS_KEY` 是 Worker 自己的运行时配置，应该配在 Cloudflare Worker 的 Variables / Secrets 里。跟 GitHub Actions 部署、Cloudflare API Token、Pages 项目名都不是一个东西。

当前这个静态前端部署只需要两个东西：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。

## 最后

重新跑了一遍 workflow，CI 绿了，Deploy 也绿了。

这套链路说白了就是：GitHub 管代码，GitHub Actions 管编译，Cloudflare Pages 管部署。三件事，三个地方。最容易出错的地方就三个：API Token 权限不够、GitHub Secrets 名字填错、`--project-name` 和 Cloudflare Pages 项目名对不上。

搞定，收工。
