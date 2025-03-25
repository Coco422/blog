---
title: "Hugo 配置waline"
description: 
date: 2025-03-25T13:04:24+08:00
image: 
math: 
tags: ["hugo"]
categories: ["杂技浅尝"]
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
---

惯例先放网址，我这里参考了 好多，但是终究没有能抄的作业
[hugo-theme-stack/config.yaml at master · CaiJimmy/hugo-theme-stack · GitHub](https://github.com/CaiJimmy/hugo-theme-stack/blob/master/config.yaml#L38)
 [独立部署 \| Waline](https://waline.js.org/guide/deploy/vps.html)
 [waline/assets/waline.sqlite at main · walinejs/waline · GitHub](https://github.com/walinejs/waline/blob/main/assets/waline.sqlite)
 [知乎 # 博客建站10 - 选择博客评论系统](https://zhuanlan.zhihu.com/p/17088061312)
## 系统架构
- 网站示例： [Ray Blog](https://blog.anluoying.com/)
- 服务器: Cloudflare pages + 一台 aws 白嫖的服务器独立部署 waline
- 服务器系统： [Ubuntu 24.04 LTS](https://zhida.zhihu.com/search?content_id=252439408&content_type=Article&match_order=1&q=Ubuntu+24.04+LTS&zhida_source=entity)
- 博客框架： [The world's fastest framework for building websites](https://gohugo.io/)
- 网站主题： [Stack \| Card-style Hugo theme designed for bloggers](https://stack.jimmycai.com/)

## 安装 waline

这里根据官方文档独立部署目录下的指引 以及评论区的提示，我就不走多余的路。直接拉取官方镜像
直接写 docker-compose.yml
```
services:
  waline:
    container_name: waline
    image: lizheming/waline:latest
    restart: always
    ports:
      - 8360:8360
    volumes:
      - ${PWD}/data:/app/data
    environment: 
	  TZ: 'Asia/Shanghai' 
	  SQLITE_PATH: '/app/data' 
	  JWT_TOKEN: 'Your token' 
	  SITE_NAME: 'Your site name' 
	  SITE_URL: 'https://example.com' 
	  SECURE_DOMAINS: 'example.com' 
	  AUTHOR_EMAIL: 'mail@example.com'
```
这里配置的环境变量似乎都没怎么用上。说实话我没看明白这个配置。直接运行后。在上一篇文章提到的 nginx 中进行反代。

>[!TIP]
>这里我刚开始犯个小错误，nginx 刚开始反代的 127.0.0.1 但是访问不到，因为这里容器都没有用 host网络。所以在bridge下 宿主机的 ip 需要查看一下
>在容器内执行，`ip route | grep default`
>因为我nginx 那里用的不是默认的网段。默认一般宿主机是
>执行`docker network inspect bridge | grep Gateway`可以看到
>`"Gateway": "172.17.0.1"`

所以 nginx 需要反代 172.18.0.1:8360

还有一点很重要。刚开始没注意。这里参考[多数据库服务支持 \| Waline](https://waline.js.org/guide/database.html#tidb)
使用 SQLite 时需要下载 [waline.sqlite](https://github.com/walinejs/waline/blob/main/assets/waline.sqlite) 文件至合适的位置。之后在项目中配置如下环境变量。

随后测试就能用了。其他的功能后续再研究