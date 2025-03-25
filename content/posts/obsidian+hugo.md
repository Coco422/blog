---
title: obsidian+hugo
description: 差不多优雅的工作流程
date: 2025-03-25T16:55:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - hugo
  - obsidian
categories:
  - ""
  - 杂技浅尝
toc: true
---
## 参考

[把 Obsidian 变为 Hugo 博客的集成管理平台 \| 胡说](https://blog.zhangyingwei.com/posts/2024m1d30h10m7s52/)
参考这位佬的文章，一共三篇。主要以下几个点

## 实现

关于我的博客是使用 github 管理，但是部署是在 cloudflare 上。这里原先的流程是这样的
 1. 编辑器打开仓库
 2. （可选）git pull
 3. hugo new post/xxx.md
 4. 编辑 md，往往是我在别的编辑器（Obsidian） copy 进来的
 5. 编辑完后 git commit 然后 git push

这样的流程最大的问题出现在 写博客的位置和发布时的割裂

这也是我抓紧时间切换 md 编辑器到 Obsidian 的原因。插件万岁

使用插件有以下
1. Auto Link Title        粘贴链接自动获取标题
2. Charts                     生图
3. Dataview                 查看数据
4. Emoji Toolbar          挑选 emoji
5. Git                            进行 git 管理
6. Homepage              制作看板页
7. Image auto upload  结合 picgo 实现粘贴图片自动上传
8. QuickAdd                 制作按钮

具体参考文章开头引用的 大佬的博客
有几个坑 倒是有热心网友在评论区提到了。看一下即可。
