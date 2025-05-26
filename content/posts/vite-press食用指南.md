---
title: vite-press 食用指南
description: 十分钟构建超美观文档
date: 2025-04-10T14:43:10+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - github
  - docs
categories:
  - ""
---
> 前几天给同事分享文档的时候一直在用 语雀啥的。突然想到，如果要维护一个像 vue 或者vite 那一类的文档给用户看该怎么快速搭建的。理应有前辈完成这种工作。让 grok 搜了一下。顺便解惑原来对于 wiki doc 等的认识，有兴趣的小伙伴们自己搜搜，我这里就不贴 grok 的长篇大论了

总之找到了 vite press。确实是曾经认识过它（好像是在鱼皮那里）

那么这篇博客就记录一下搭建过程（跟官方文档一致）[Getting Started \| VitePress](https://vitepress.dev/guide/getting-started)

首先准备 node 环境。因为最近在开发 mcp 应用。所以心血来潮用了 bun

```
bun add -D vitepress

bun vitepress init
```

随后会有一次互动式的初始化

```
┌  Welcome to VitePress!
│
◇  Where should VitePress initialize the config?
│  ./docs
│
◇  Where should VitePress look for your markdown files?
│  ./docs
│
◇  Site title:
│  My Awesome Project
│
◇  Site description:
│  A VitePress Site
│
◇  Theme:
│  Default Theme
│
◇  Use TypeScript for config and theme files?
│  Yes
│
◇  Add VitePress npm scripts to package.json?
│  Yes
│
◇  Add a prefix for VitePress npm scripts?
│  Yes
│
◇  Prefix for VitePress npm scripts:
│  docs
│
└  Done! Now run pnpm run docs:dev and start writing.
```

这里对于初始化的目录结构会对后面有一定的影响。由于我是使用的`./`作为默认目录，也可以在已有的项目中构建 docs 目录跟项目结合在一起

接下来就可以

```
bun run docs:dev
```

随后在页面中打开就能看到美丽的文档界面了，怪像一回事儿的，以下截图我已经略微修改过了，跟着官方文档改 index.md 文件就能看到对首页的改动了。

![67f76b00d7589](https://imgbed.anluoying.com/2025/05/9dd7f3f1024cd6778d2b0af73ea59e48.png)

## 部署 github pages

要给大家访问，且是静态页面，那就当然嫖一嫖这些服务啦，这次就用 github 的 pages。公司的 gitlab 也部署了，vitepress 文档里都有教程
[Deploy Your VitePress Site \| VitePress](https://vitepress.dev/guide/deploy)

只需要准备`deploy.yml` 放入 `.github/workflows`

由于我本身这个仓库存放的就是这个项目。且初始化的时候使用的不是./docs 而是 ./

所以配置文件有一点不同的位置在于这里 upload artifact 的 path 是我 vite config 里的位置

```
- name: Upload artifact 
	uses: actions/upload-pages-artifact@v3 
	with: 
		path: /dist
```

vite config.mts
```
outDir: './dist',

base: '/ray-doc/'
```

base 最早是使用`/` 但是当我部署后出现了各种资源 404 的情况，发现要改成和仓库名相同才能访问。

github 的仓库中要设置 pages，这里我跟踪 build from main 分支的 root 路径 根据需求调整

![67f76cebbf55e](https://imgbed.anluoying.com/2025/05/78aea1ecb7e9528312657e2567432df8.png)

随后推送之后就能等待流程完成。最后访问给到的地址就能看到页面咯
[Ray-Doc](https://coco422.github.io/ray-doc/)