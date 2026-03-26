---
title: docker自建镜像加速
description: "!info 我实在是受不了这个网络问题，不能畅快的 pull image 就和便秘一样。 然而，大部分的曾经一配即可用的镜像源大多数不好用或者开始收费，这些就不多说了，总之就是不好用了，那么我就打算自建一个。 之前是给公司打了个"
date: 2026-03-02T11:30:42+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-03-18T14:21:45+08:00
showLastMod: true
tags:
  - docker
categories:
  - 杂技浅尝
---
> [!info] 
>  我实在是受不了这个网络问题，不能畅快的 pull image 就和便秘一样。
>  然而，大部分的曾经一配即可用的镜像源大多数不好用或者开始收费，这些就不多说了，总之就是不好用了，那么我就打算自建一个。

之前是给公司打了个 Harbor，不过Harbor 所在的环境也无法连接外网、且多管理内部镜像为主。前段时间刷到一篇文章，但是一直迟迟没有行动，直到今天连文章都找不到了，那就只能自己处理了。grok 给我搜到了官方的方案Docker Registry Pull-Through Cache，但是他一次一个容器配置一个源，我也不知道我会用到多少个，于是搜了一下果然有人做了

第一次grok 推荐的，[GitHub - rpardini/docker-registry-proxy: An HTTPS Proxy for Docker providing centralized configuration and caching of any registry (quay.io, DockerHub, registry.k8s.io, ghcr.io)](https://github.com/rpardini/docker-registry-proxy)

后续找到的：
[GitHub - dqzboy/Docker-Proxy: 🔥 🔥 🔥 自建Docker镜像加速服务，基于官方Docker Registry 一键部署Docker、K8s、Quay、Ghcr、Mcr、Nvcr等镜像加速\\管理服务。支持免服务器部署到 ClawCloud\\Render\\Koyeb](https://github.com/dqzboy/Docker-Proxy)

准备一台海外服务器、我还准备了个域名，ok 一键部署，按照脚本部署.

## 坑来了。没白写

由于我的粗心大意，作者 README 中提到的安装Hub-cm-ui 的安装过程被我误认为是全部的安装过程。

![image.png|300](https://imgbed.anluoying.com/2026/03/0845d077160812217a8c7a480577f059.png)

正当我感慨作者大大做了一个很好的集成时开开心心把这个 ui 的地址配置了域名反代并且直接加入我的 docker 配置中，pull 了一下。

失败后折腾了很久才意识到。`这是个客户端或者说是展示用的 UI` 而不是一个集成体

所以，老实部署每一个 reg 的docker 容器并且配置反代。这下成功了

官方文档
[📝 准备工作 \| Docker Proxy](https://dqzboy.github.io/docs/pages/install.html)

> [!caution] 
>  看文档 看文档 看文档，细心 细心 细心

重要的事情说三遍

![image.png|300](https://imgbed.anluoying.com/2026/03/c8519a3fdb442eba4d33d685f8b65159.png)

舒服了,全部配置完后，这里搜索想要的镜像，会生成对应的加速命令

当然，也可以直接在常用的服务器上配置一下 registry-mirrors，如图所示
修改/etc/docker/daemon.json

![image.png|300](https://imgbed.anluoying.com/2026/03/9f241c981a69f12375804ef64e7cd6fc.png)
