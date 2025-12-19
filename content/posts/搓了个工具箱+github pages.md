---
title: 搓了个工具箱+github pages
description: 这篇文章记录了我最近用 Gemini 3 + Cursor 打造在线工具箱的完整过程：包括如何让前端模块化、如何让工具自动被识别、如何用 Gemini 生成漂亮 UI，以及最终用 GitHub Actions 自动构建并部署到 GitHub Pages。期间也踩了自带的 GITHUB_TOKEN 写权限问题，并分享了正确的 permissions 配置。整体流程丝滑，一杯水的功夫就搞出一个能用的工具箱。
date: 2025-11-28T18:02:01+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - CI/CD
  - github
categories:
  - 杂技浅尝
---
> gemini3 发布几天了。都说很叼，前端很叼，画页面很牛。那就帮我画个工具箱吧

## 设计

于是打开 chatgpt 和他讨论一下，主要思想就是我希望前端能够非常的模块化

写一个工具的时候，不需要关注太多和我网页的配合。按照一定的规范写完工具后放在指定位置就行了。基于 git 我就可以审核后发布，前端就可以在某个目录某个地方看到这个工具，搜到这个工具。暂时不考虑性能问题

gemini3 目前我两个用的地方，一个在 ai studio 里面直接用，另一个就是在 cursor 里面用了，姑且信一把 cursor

## 开搓

![image.png](https://imgbed.anluoying.com/2025/12/3c2f73d3a6e3d68f5fdf7c09ceeaf1c5.png)

接一杯水的功夫出来了。这个设计很符合我的概念（但是我本能的觉得性能影响很大，以后堆积越来越多的工具，一打开我的网站，啪的一下要下载好几十MB 的内容。）

编译预览一下，这期间有一点小问题，反正我也不是很懂前端，他给修好了
随后上点强度，一口气提了 9 个比较常见的网页工具，一次性完成。

![image.png](https://imgbed.anluoying.com/2025/12/17e023ef35f88a22e9121867d71e9dfe.png)

![image.png](https://imgbed.anluoying.com/2025/12/87b4b231261aa9c660f3e6e3e13f6f0d.png)

可以，很满意哦，回头做个深色浅色模式随系统切换

## 部署

那么想把它部署起来，在这整个工具箱的设计里，是存在后端的，因为对于我的需求而言 有一些工具我是希望他有历史记录的，当然量不是很大。所以一开始我是想部署在自己的 VPS 上。但是想了一圈后犯懒了（原本想基于 github 的 webhook 或者 actions build & push docker images，服务器搞个小 deploy agent 等着更新就行）有 github pages，不如直接放在 pages 里就好了

叫 g 老师给写个 actions
> 关于 actions 的文档和介绍
> [GitHub Actions 入门教程 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2019/09/getting-started-with-github-actions.html)
> [GitHub Actions 文档 - GitHub 文档](https://docs.github.com/zh/actions)

因为我的仓库内有前后端的代码。所以 `working-directory` 指定 `frontend`

```yaml
name: Build and Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install
        working-directory: ./frontend

      - name: Build
        run: npm run build
        working-directory: ./frontend

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

![image.png](https://imgbed.anluoying.com/2025/12/d5e712cdfa88d645d4cd46bdbd6022fe.png)
![image.png](https://imgbed.anluoying.com/2025/12/ae2b6bc04e502d4a9a0c070d5f86a4c0.png)
[GitHub Pages 文档 - GitHub 文档](https://docs.github.com/zh/pages)
[关于自定义域名和 GitHub 页面 - GitHub 文档](https://docs.github.com/zh/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
![image.png](https://imgbed.anluoying.com/2025/12/6919cfc80fc3a6508148a964e156f078.png)

ok 耐心等个几分钟。之后就可以愉快的访问我自己的工具箱啦

## 问题

![f8a50e07-14aa-4354-b3cd-55d25169f22f.png](https://imgbed.anluoying.com/2025/12/692a4e017db8b80516334a6f4074c95a.png)

- 从 2022 年起，GITHUB_TOKEN 的默认权限 _变成只读 (read only)_，所以默认情况下它 **没权限** 向仓库写（push commit）了 [Permissions denied to github actions bot while building documentation - General Usage - Julia Programming Language](https://discourse.julialang.org/t/permissions-denied-to-github-actions-bot-while-building-documentation/88158)

改成下面这样就行了
```
permissions:
  contents: write
  pages: write
```
