---
title: claude code配置
description:
date: 2025-08-24T01:51:47+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: false
draft: false
tags:
categories:
  - ""
  - 琐碎快记
---
windows使用cluade code

安装node，百度安装nvm。选择一个LTS的 node版本使用

之后

`npm install -g @anthropic-ai/claude-code`
`npm install -g @musistudio/claude-code-router`

ccr的 git地址[GitHub - musistudio/claude-code-router: Use Claude Code as the foundation for coding infrastructure, allowing you to decide how to interact with the model while enjoying updates from Anthropic.](https://github.com/musistudio/claude-code-router)


安装后启动 ccr ui
![69af067f-1610-4311-b4f6-1b07b0dc5d5b.png](https://imgbed.anluoying.com/2025/08/39cc32a0655c35b9cedbbfc2e3f64fcd.png)

按照教程配置自己的模型供应商

![455ce2cc-b732-45bc-8151-765d27099bea.png](https://imgbed.anluoying.com/2025/08/2b70b63ea9f1fa84f3b7b6a6a8af8c45.png)

`ccr code`替代claude code 启动 就能成功使用自己要用的模型了