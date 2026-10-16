---
title: "nginx 入门：装完到跑起一个静态站，顺便踩了个端口坑"
description: 新机器上装 nginx、看懂 /etc/nginx 目录、配一个静态站点，以及这次遇到的 80 端口被占。
date: 2026-10-17T02:38:57+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-17T02:38:57+08:00
showLastMod: true
tags:
  - nginx
  - linux
categories:
  - 杂技浅尝
---

nginx 这东西属于"装过很多次但每次都要重新查一遍"的典型。配置项太多，日常真正用到的就那么几个，所以这次按最小可用流程记一遍。

这篇只讲最基础的：装、目录、静态站点。反代那种真正天天用的场景我放在[另一篇](/posts/nginx-反代/)里了。

## 装完先看版本

Ubuntu 下就是一句：

```bash
sudo apt install nginx
nginx -v
# nginx version: nginx/1.24.0 (Ubuntu)
```

## 结果第一次启动就失败了

装完直接 start，报错：

![nginx 启动失败：80 端口被 docker-proxy 占用](https://imgbed.anluoying.com/2026/10/3971892a9d12f5e1df088d160632edf0.png)

`Job for nginx.service failed`。这时候别急着翻配置文件，先看它到底在抱怨什么：

```bash
sudo ss -tlnp | grep :80
sudo journalctl -u nginx -n 4 --no-pager
```

`ss` 里能看到 80 端口已经被一个 `docker-proxy` 占着了，日志里对应的是 `nginx: [emerg] still could not bind()`。

这台测试机上跑着一个 docker 容器，把宿主机的 80 映射走了。nginx 抢不到，就起不来。这种失败其实挺好排查的——报错里写得很直白，只是很多人第一反应是去看 nginx.conf，看半天也看不出问题。

> [!note]
> `ss -tlnp` 拆开是 socket statistics、-t TCP、-l 只看 listen、-n 不解析服务名、-p 显示进程。想知道"这个端口是谁占的"，它是第一个该敲的命令。

## 换个端口先跑起来

既然是测试机，我懒得去动那个容器，直接把默认站点改到 8080：

![改到 8080 后 nginx 正常监听并返回 200](https://imgbed.anluoying.com/2026/10/2ee3482636384e1b38a7723ccba6914a.png)

改配置这件事的正确顺序是：**先 `nginx -t` 检查语法，再 reload，别先重启**。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` 会告诉你配置文件哪一行有问题；`reload` 是软重载，不掐断已有连接；`restart` 是真重启，会断连接。改完配置到底用哪个，看你是不是能容忍闪断。

然后 `curl -I` 看一下：

```text
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Content-Length: 615
```

看到那个默认的"Welcome to nginx!"页面就说明活了。

## /etc/nginx 里都是什么

Ubuntu 的 deb 包装完，这个目录长这样：

```text
conf.d            放零散的片段配置
fastcgi_params    PHP 那套用的参数
mime.types        扩展名到 Content-Type 的映射
nginx.conf        主配置
proxy_params      反代常用的 header 片段（下一篇会用到）
sites-available   站点配置都写在这儿
sites-enabled     只放软链接，指向 sites-available 里要生效的
snippets          可复用的配置片段
```

`sites-available` 和 `sites-enabled` 这套是 Debian/Ubuntu 的习惯，nginx 官方其实没有这个概念，是发行版自己加的惯例。主配置里靠一句 `include /etc/nginx/sites-enabled/*;` 生效。

好处很直观：想停掉一个站点，删掉 enabled 里的软链接就行，配置本身还留着，不用把文件删了又去 git 里翻。

## 配一个静态站

假设我要把 `/var/www/hello` 挂到 `hello.test` 这个域名下：

![写一个静态站点配置并用 Host 头验证](https://imgbed.anluoying.com/2026/10/e3bd12b328c343c00f54987162e083a2.png)

配置里的几个字段：

- `listen 8080` 是监听端口
- `server_name` 是域名，nginx 靠请求头里的 Host 决定用哪个 server 块
- `root` 是网站根目录
- `index` 是目录请求时默认找的文件
- `location /` 是路由匹配规则
- `try_files  / =404` 是先找文件、再找目录、都没有就 404

最后这一句值得单独说。不加它的写法是 `try_files  / /index.html` 那种，用于单页应用把所有不存在的路径都交给前端路由；纯静态站的话 `=404` 更诚实，不存在的就是不存在。

改完照例：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 验证的时候用 Host 头

本机测试没有 DNS 也没关系，`curl` 可以手动指定 Host：

```bash
curl -s -H 'Host: hello.test' http://127.0.0.1:8080/
# <h1>hello nginx</h1>
```

这行命令其实是在骗 nginx："我访问的是 hello.test"。虚拟主机就是靠这个头区分的，所以本地这么测完全等价于真域名访问。

顺便试一下不存在的路径：

```bash
curl -s -o /dev/null -w '%{http_code}' -H 'Host: nope.test' http://127.0.0.1:8080/nothing
# 404
```

## 日志在哪

```bash
sudo tail -n 3 /var/log/nginx/access.log
```

```text
127.0.0.1 - - [17/Oct/2026:02:15:37 +0800] "GET / HTTP/1.1" 200 21 "-" "curl/8.5.0"
127.0.0.1 - - [17/Oct/2026:02:15:37 +0800] "GET /nothing HTTP/1.1" 404 162 "-" "curl/8.5.0"
```

一行里依次是：客户端 IP、时间、请求行、状态码、响应大小、Referer、User-Agent。

`access.log` 记访问，`error.log` 记报错。**排查问题的时候先看 error.log**，它的信息量比 access.log 大得多，下一篇讲 502 的时候就很明显了。

## 就到这

最基础的这一套：装完看版本、起不来先看端口和日志、配置放 sites-available 再软链过去、改完 `nginx -t` 再 reload、验证用 Host 头、出问题看 error.log。

日常真正用得最多的其实是反代，那就下一篇。

参考：

- [nginx 官方新手教程](https://nginx.org/en/docs/beginners_guide.html)
- [nginx 官方文档：配置文件的度量单位与语法](https://nginx.org/en/docs/basic_configure.html)

收工。
