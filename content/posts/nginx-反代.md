---
title: "nginx 反向代理：proxy_pass 和那几个必须加的 header"
description: 用 nginx 把请求转给后端，讲清楚 proxy_set_header 为什么不能省，以及 upstream、WebSocket 和 502 的排查顺序。
date: 2026-10-17T02:39:45+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-17T02:39:45+08:00
showLastMod: true
tags:
  - nginx
  - 反向代理
  - linux
categories:
  - 杂技浅尝
---

反向代理大概是 nginx 最常被用到的功能：后端服务只监听 127.0.0.1 的某个端口，不直接暴露，外面统一由 nginx 接进来，再做 TLS、域名分流、限流这些事情。

概念上正代和反代的区别我之前写过一篇[什么是AI反代，和反代什么区别](/posts/什么是ai反代和反代什么区别/)，这里不重复，直接把配置记一遍。

另外早一点还写过一篇[给内部服务配 HTTPS 转发](/posts/nginx-记一次基础转发配置/)的，那份配置是真实环境里抄下来的，比这篇更贴实战，两篇对着看正好。

这篇的配置是接在[上一篇 nginx 基础](/posts/nginx-基础/)上的，端口我还在用 8080（测试机的 80 被占了），你那边正常写 80 或者 443 就行。

## 先准备一个后端

为了能看清楚 nginx 到底往后端传了什么，我起了个最小的 Python 服务，把收到的请求头全打出来：

![起一个会把请求头打出来的后端服务](https://imgbed.anluoying.com/2026/10/c41d3cc9e2249da0b63178f62fc05319.png)

后端本身没什么可看的，一行响应了事。重点是它会把每个请求的 header 打到日志里，这样"到底传没传过去"就不用靠猜。

```bash
nohup python3 -u /tmp/api.py > /tmp/api.log 2>&1 &
```

> [!note]
> 那个 `-u` 别省。Python 输出重定向到文件时默认是块缓冲，不关掉的话日志要攒够一块才写进去，看的时候会以为没输出。

现在直连 `127.0.0.1:8000` 能通，日志里记的是 `Host: 127.0.0.1:8000`，这是直连的样子，记住它，一会儿对比。

## 加上反代

![加上反代配置并验证请求头有没有透传](https://imgbed.anluoying.com/2026/10/c2641fe11d321636c3fd26cf6fc5dacd.png)

核心就一句 `proxy_pass http://127.0.0.1:8000;`，剩下的四行 `proxy_set_header` 才是真正的重点：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

再请求一次，这回走 nginx：

```bash
curl -s -H 'Host: api.test' http://127.0.0.1:8080/
```

然后看后端的日志，对比一下就明白这四行干了什么：

```text
--- GET / from 127.0.0.1
Host: 127.0.0.1:8000
User-Agent: curl/8.5.0

--- GET / from 127.0.0.1
Host: api.test
X-Real-IP: 127.0.0.1
X-Forwarded-For: 127.0.0.1
X-Forwarded-Proto: http
Connection: close
User-Agent: curl/8.5.0
```

上面那段是直连，下面是过 nginx 之后。两处区别：

一个是 `Host`，直连时是 `127.0.0.1:8000`，过 nginx 之后变回了 `api.test`，也就是**客户端原本请求的域名**。默认情况下 nginx 会自己改写 Host 头，后端就再也拿不到真实域名了。很多框架靠 Host 做多租户、生成回跳链接、判断 Cookie 域，这个头错了会出各种奇怪问题。

另一个是客户端 IP。后端进程看到的连接来自 nginx，`remote_addr` 永远是 `127.0.0.1`，真实 IP 已经丢了。这也是为什么必须用 `X-Real-IP` / `X-Forwarded-For` 把原始 IP 带过去——**后端拿到的访问者 IP 是假的，这是个很常见但很容易被忽略的事**。

至于 `X-Forwarded-For` 用的是 `$proxy_add_x_forwarded_for` 而不是 `$remote_addr`：前者会把已有的链路追加在后面（`客户端, 代理1, 代理2`），多层代理的时候才有意义。要取真实 IP 通常取第一个（最左边）那个。

`X-Forwarded-Proto` 是告诉后端"外面是 https 还是 http"。不做 TLS 的时候无所谓，做了以后后端生成链接、设置 Secure Cookie 都依赖它。

> [!note]
> Ubuntu 那个包里其实自带一个 `/etc/nginx/proxy_params`，里面就是这几个头，直接 `include proxy_params;` 就行。我这儿写全是为了看清每一行在干嘛，实际配置里 include 更省事。

## 多台后端

后端不止一个的时候用 upstream：

```nginx
upstream api_backend {
    least_conn;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003 backup;
}

location / {
    proxy_pass http://api_backend;
}
```

不写策略就是轮询，另外几个是：

- `ip_hash`：按客户端 IP 哈希，同一个 IP 固定到同一台，用来绕开"多台机器各存一份 session"的问题
- `least_conn`：优先给连接数最少的那台
- `weight=3`：加权，机器配置不一样的时候用
- `backup`：备份机，前面的全挂了才上
- `down`：手动摘掉一台机器，不停 nginx 也能下线

`proxy_pass` 后面带不带路径是有区别的，这个点很容易写错。`proxy_pass http://backend/` 会把 location 前缀那段替换掉，比如 location 是 `/api/`、proxy_pass 带斜杠，那 `/api/foo` 到后端就变成 `/foo`；不带斜杠则原样透传。规则本身其实只有一句话：**带路径就替换，不带就整个转过去**，但写的时候经常要盯着看两遍。

## WebSocket

要代理 WebSocket 得额外加两个头，只写 proxy_pass 是不行的：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600s;
}
```

`proxy_http_version 1.1` 是必须的，WebSocket 的握手要 HTTP/1.1 的 Upgrade 机制，默认用的 1.0 谈不起来。少了 `Connection: upgrade` 的典型表现是：连上就断，或者一直连不上，日志里啥也没有。

`proxy_read_timeout` 是 nginx 等后端的超时，默认 60 秒。长连接的业务（推送、长轮询）一定要调大，否则会出现"聊天室莫名其妙每 60 秒掉一次"这种情况。

## 502 的时候怎么查

最经典的 502 长这样：

![后端停掉后 nginx 返回 502，error.log 里是 connection refused](https://imgbed.anluoying.com/2026/10/1945a06c755cca2de38008820cb991bb.png)

`HTTP/1.1 502 Bad Gateway`，什么原因不告诉你，得去 `error.log` 看：

```text
connect() failed (111: Connection refused) while connecting to upstream,
client: 127.0.0.1, server: api.test, request: "HEAD / HTTP/1.1",
upstream: "http://127.0.0.1:8000/", host: "api.test"
```

这句话信息量很大，逐段读：

- `connect() failed`：连不上后端，不是后端返回错误，是根本没握上手
- `(111: Connection refused)`：111 是 connection refused，说明目标端口没人监听（进程没起来、挂了、或者崩在这之前的启动阶段）
- `upstream`：nginx 想连的地址，确认一下有没有写错端口

我这次是手动把后端 `pkill` 掉了，所以 111 很合理。常见的几种对号入座：

- **111 Connection refused**：后端没起来 / 端口写错 / 后端只监听 127.0.0.1 而你要连别的网卡
- **110 Connection timed out**：防火墙或者安全组拦了，连接超时
- **504 Gateway Timeout**（不是 502）：后端在但太慢，超过了 `proxy_read_timeout`
- **连得上但立刻断**：多半是 header 或者协议版本的问题，比如上面 WebSocket 少了 Upgrade

排查顺序就三步：先 `curl` 直连后端，确认后端活着；再看 `error.log` 里是 refused 还是 timeout；最后才是怀疑 nginx 配置。

> [!note]
> 502 里有个反直觉的点：后端自己报 500 的时候，nginx 返回的是 500，不是 502。502 只代表"nginx 没能从后端拿到一个合法响应"，所以看到 502 基本可以直接去查网络和进程，不用去看后端代码。

## 收工

反代的核心就一个 `proxy_pass`，剩下那些 `proxy_set_header` 是让后端"还能知道真相"的东西。少了不至于跑不起来，但会在日志、鉴权、跳转这些地方慢慢恶心人。

参考：

- [nginx 官方文档：ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [nginx 官方文档：ngx_http_upstream_module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)

收工。
