---
title: 清华源之外，试试教育网联合镜像站：MirrorZ 实测
description: 接着清华镜像站的话题，实测教育网联合镜像站的自动跳转、Python 依赖下载和离线安装，附可复制命令，说明统一入口能省什么事、有哪些使用边界。
date: 2026-09-18T16:19:19+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-09-18T18:42:38+08:00
showLastMod: true
tags:
  - MirrorZ
  - Python
  - pip
  - 开源镜像站
categories:
  - 杂技浅尝
---

之前发过一篇[《当 GitHub 和清华镜像同时告急：程序员的免费午餐，还能吃多久？》](https://mp.weixin.qq.com/s/v1y7rI33pAqe61oyjt8SEQ)的公众号，聊到了镜像站的容量，也提到装机脚本应该留有换源的余地。这次接着刷到一个更好的选择。

聚合入口：[教育网联合镜像站](https://mirrors.cernet.edu.cn/)。

它基于开源项目 MirrorZ，把多所高校已有的镜像资源接到一个入口上。配置这个地址后，由它根据网络位置和站点状态选择镜像，文件仍然从对应高校源下载。

![教育网联合镜像站首页，展示下载、列表、站点和帮助入口](https://imgbed.anluoying.com/2026/09/83ccecb4b90c1353102ebdb960951872.png)

直接看怎么用。

## 先试试看请求去了哪所学校

测试时间是 2026 年 9 月 18 日，环境为 macOS 26.6.2、Apple Silicon、Python 3.13.14、pip 26.1。结果来自这台机器当时的网络出口。

先看一下 `requests` 包索引的响应头：

```bash
curl --noproxy '*' -sSI \
  https://mirrors.cernet.edu.cn/pypi/web/simple/requests/
```

返回的关键部分是：

```http
HTTP/2 302
location: https://mirrors.sustech.edu.cn/pypi/web/simple/requests/
```

这次选中了南方科技大学。`302` 的意思就是让客户端继续访问 `Location` 里的地址。这里的 `--noproxy '*'` 用于让 curl 忽略显式代理设置；没有加 `-L`，所以它停在第一跳，方便看清调度结果。

同一轮还请求了 Ubuntu 24.04 的仓库元数据：

| 请求内容                       | 本次选中的站点 | 结果                        |
| -------------------------- | ------- | ------------------------- |
| PyPI 的 `requests` 索引及依赖下载  | 南方科技大学  | 下载成功                      |
| Ubuntu 的 `noble/InRelease` | 中山大学    | 跟随跳转后返回 200，取得 255,850 字节 |

Ubuntu 这里只验证了元数据下载，没有在 Mac 上执行系统换源或 `apt update`。你在其他网络、其他时间访问，也可能被分到不同站点。

## 用 pip 真正下载一组依赖

微信的文章提到过准备离线开发依赖，这次就拿一个小包试试。下面的命令把 `requests` 和它需要的依赖下载到当前目录下的 `packages`，不修改默认源：

```bash
python3 -m pip --isolated download \
  --no-cache-dir --only-binary=:all: \
  -i https://mirrors.cernet.edu.cn/pypi/web/simple \
  requests==2.32.5 -d ./packages
```

`--isolated` 忽略 pip 的环境变量和用户配置，`--no-cache-dir` 避开本地缓存，`--only-binary=:all:` 只下载 wheel 包。版本固定为 `2.32.5`，方便复现这次操作。

实际下载了五个包：

```text
requests 2.32.5
charset-normalizer 3.5.1
idna 3.20
urllib3 2.8.0
certifi 2026.7.22
```

终端最后返回：

```text
Successfully downloaded requests charset_normalizer idna urllib3 certifi
```

下载后又把五个文件的 SHA-256 与 PyPI 官方对应版本的记录逐个核对，全部一致。

接着创建一个临时虚拟环境，只从这份目录安装。下面是 macOS / Linux 的操作方式：

```bash
python3 -m venv .venv-mirrorz
.venv-mirrorz/bin/python -m pip --isolated install \
  --no-index --find-links=./packages requests==2.32.5
.venv-mirrorz/bin/python -c 'import requests; print(requests.__version__)'
```

安装成功，最后输出 `2.32.5`。

能用哈。

## 其他软件去帮助页选

不用自己猜每个仓库的路径。打开 [MirrorZ Help](https://help.mirrors.cernet.edu.cn/)，搜索对应软件，在“选择镜像”里选 CERNET 联合镜像入口，就能查看配置方法。

![MirrorZ Help 首页，左侧可搜索软件，右侧列出 Ubuntu、Debian 和 PyPI 等热门文档](https://imgbed.anluoying.com/2026/09/352e2859700f38cd8b9374c595a14237.png)

[PyPI 页面](https://help.mirrors.cernet.edu.cn/pypi/)也给出了临时安装的用法，关键是地址里的 `/pypi/web/simple` 要保留完整。

![PyPI 帮助页选择 CERNET 联合镜像，展示 pip 临时使用与默认源配置命令](https://imgbed.anluoying.com/2026/09/1d7668e28817a2d4fe8f06a7c32d5fd5.png)

系统软件源还要看版本和架构。例如 [Ubuntu 帮助](https://help.mirrors.cernet.edu.cn/ubuntu/)区分了传统 `sources.list` 和新版 `ubuntu.sources`，ARM 设备则需要看 `ubuntu-ports`。照着自己机器的情况选，比复制一大段通用换源脚本省心。

![Ubuntu 帮助页选择 24.04 LTS，展示 DEB822 格式的 ubuntu.sources 配置，并保留官方安全更新源](https://imgbed.anluoying.com/2026/09/baa61784bc73f87126c3d71031028aa0.png)

如果只是找安装镜像或软件包，站点的“下载”“列表”入口也能直接用，不必先改系统配置。

## 背景和使用边界，简单交代一下

按[中科大镜像站的发布公告](https://servers.ustclug.org/2026/08/mirrorz/)，项目由清华大学开源软件镜像站在 2020 年发起，CERNET 网络中心提供计算、域名和网络资源支持，2026 年 8 月 22 日举行正式发布仪式。各成员站点继续提供实际内容。

这轮验证了跳转、下载和安装，没有做多网络测速，也没有测试故障切换。一次成功不能说明它在所有地方都最快；普通 302 跳转也不能保证下载到一半断线后自动接着传。

它对日常使用最直接的好处，就是**少记几个地址，少手动挑几次站点**。先用临时参数试一下，适合自己的网络和项目，再考虑长期配置。
