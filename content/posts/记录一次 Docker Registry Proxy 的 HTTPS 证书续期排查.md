---
title: 记录一次 Docker Registry Proxy 的 HTTPS 证书续期排查
description: 本文记录自建 Docker Registry Proxy 证书过期的排查过程。针对未开放 80/443 端口的环境，采用 acme.sh 结合 Cloudflare DNS Challenge 申请泛域名证书，并配置自动续期与容器重启脚本，提供非标准端口下的完整更新方案。
date: 2026-06-02T17:17:18+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-06-02T19:12:50+08:00
showLastMod: true
tags:
  - network
  - nginx
  - DNS
  - certifile
categories:
  - 杂技浅尝
---

## 背景

我有一套自建的 Docker Registry Proxy 服务 可看这篇博客[docker自建镜像加速 \| 安落滢 Blog - 技术分享与生活记录](https://blog.anluoying.com/posts/docker%E8%87%AA%E5%BB%BA%E9%95%9C%E5%83%8F%E5%8A%A0%E9%80%9F/)，用来代理 Docker Hub、GHCR、Quay、GCR、K8S、MCR、NVCR 等镜像源。

服务整体跑在 Debian 服务器上，Nginx 运行在 Docker 容器中，由于没有 80、443 端口。对外统一暴露 `5050` 端口。

假设我的域名是 666.xyz ，访问方式大概是：

```text
https://hubcmd.666.xyz:5050/
https://ghcr.666.xyz:5050/
https://quay.666.xyz:5050/
https://gcr.666.xyz:5050/
https://k8s.666.xyz:5050/
https://mcr.666.xyz:5050/
https://elastic.666.xyz:5050/
https://nvcr.666.xyz:5050/
```

这些域名都在 Cloudflare 做 DNS 解析，并且关闭了小黄云代理，直接解析到服务器公网 IP。

这次问题的起因，是我在服务器通过mirror拉取镜像时遇到报错，报错如下。

```
ERROR: failed to solve: python:3.12-slim: failed to resolve source metadata for docker.io/library/python:3.12-slim: failed to do request: Head "https://hub.666.xyz:5050/v2/library/python/manifests/3.12-slim?ns=docker.io": tls: failed to verify certificate: x509: certificate has expired or is not yet valid: current time 2026-06-02T16:35:32+08:00 is after 2026-05-31T06:13:08Z
```

好家伙，证书过期，这是第一次纯手工部署的项目证书过期，之前偷懒都是用的宝塔、1panel 这些平台托管，想起来了 certbot 什么的可以用，但我还没试过，刚好试试。

开始排查。

## 一开始看到的证书状态

服务器上的证书文件在：

```bash
~/registry-proxy/nginx/ssl/
```

里面有两个文件：

```bash
666.xyz.pem
666.xyz.key
```

查看证书内容后发现，这是一张 Let's Encrypt 签发的证书，应该是之前用宝塔申请的，覆盖域名：

```text
666.xyz
*.666.xyz
```

这是一张泛域名证书，它可以覆盖 `hubcmd.666.xyz`、`ghcr.666.xyz`、`quay.666.xyz` 这类一级子域名。

但证书有效期是：

```text
notBefore=Mar  2 06:13:09 2026 GMT
notAfter=May 31 06:13:08 2026 GMT
```

当前时间已经是 2026 年 6 月 2 日，所以证书确实过期了。

可以用下面命令确认：

```bash
openssl x509 -in 666.xyz.pem -noout -dates
```

我这里没看，因为这个服务器只有这一个服务。懒得看了。
## 项目结构和 Nginx 部署方式

先看 Docker 容器：

```bash
docker ps
```

关键容器是：

```text
registry-nginx
```

对应镜像：

```text
nginx:1.27-alpine
```

Docker Compose 里 Nginx 的配置如下：

```yaml
nginx:
  container_name: registry-nginx
  image: nginx:1.27-alpine
  restart: always
  ports:
    - "5050:5050"
  volumes:
    - ./nginx/conf.d:/etc/nginx/conf.d
    - ./nginx/ssl:/etc/nginx/ssl
    - ./nginx/logs:/var/log/nginx
  networks:
    - registry-net
```

这里有两个关键点：

第一，Nginx 是跑在 Docker 容器里的。

第二，宿主机的证书目录：

```bash
~/registry-proxy/nginx/ssl
```

会被挂载到容器内的：

```bash
/etc/nginx/ssl
```

所以只要更新宿主机目录里的证书文件，然后重启或 reload Nginx 容器，容器就会使用新证书。

## Certbot 发现用不了

一开始想到安装 Certbot，然后通过 HTTP 验证申请证书。

但这台服务器并没有开放标准的 `80` 和 `443` 端口。

验证如下：

```bash
curl -I http://hubcmd.666.xyz
```

结果：

```text
curl: (7) Failed to connect to hub.666.xyz port 80
```

而访问带端口的地址：

```bash
curl -I http://hubcmd.666.xyz:5050
```

返回：

```text
HTTP/1.1 400 Bad Request
Server: nginx/1.27.5
```

这是因为 5050 端口上跑的是 HTTPS 服务，普通 HTTP 请求打过去会被 Nginx 拒绝。

当前 Nginx 配置里也是：

```nginx
server {
    listen 5050 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/666.xyz.pem;
    ssl_certificate_key /etc/nginx/ssl/666.xyz.key;
}
```

由于没有 `80` 和 `443` 端口，HTTP-01 验证并不适合这个场景。

## 选择 DNS Challenge

这个场景最终选择了 DNS Challenge。

原因是：

```text
没有 80 端口
没有 443 端口
所有服务都通过 5050 访问
域名 DNS 托管在 Cloudflare
需要申请泛域名证书
```

DNS Challenge 不依赖服务器开放任何 Web 端口，只需要通过 Cloudflare API 自动添加 `_acme-challenge` TXT 记录即可。

最终链路是：

```text
Let's Encrypt
    ↓
acme.sh
    ↓
Cloudflare DNS API
    ↓
DNS Challenge 验证
    ↓
生成泛域名证书
    ↓
安装到 nginx/ssl 目录
    ↓
重启 registry-nginx
```

## 安装 acme.sh

安装 acme.sh：

```bash
curl https://get.acme.sh | sh
source ~/.bashrc
```

检查版本：

```bash
acme.sh --version
```

## Cloudflare API Token

在 Cloudflare 后台创建 API Token。

权限只需要给目标 Zone 的 DNS 编辑权限。

权限配置大概是：

```text
Zone
  DNS
    Edit
```

Zone Resources 选择：

```text
Include
  Specific zone
    666.xyz
```

创建完成后，在服务器上配置环境变量：

```bash
export CF_Token="你的 Cloudflare API Token"
```

可以写入 `~/.bashrc`：

```bash
echo 'export CF_Token="你的 Cloudflare API Token"' >> ~/.bashrc
source ~/.bashrc
```

我这里直接把这个域名下的 DNS$Zone 权限都给他放开了，然后只允许改 IP 调用请求。

![image.png|300](https://imgbed.anluoying.com/2026/06/a9c7f90fa4785ef4c9c3bf44ccda6c23.png)

## acme.sh 默认 CA 的坑

第一次执行申请命令时，遇到了一个小坑。

执行：

```bash
acme.sh --issue \
  --dns dns_cf \
  -d 666.xyz \
  -d '*.666.xyz'
```

输出：

```text
Using CA: https://acme.zerossl.com/v2/DV90
No EAB credentials found for ZeroSSL
Please update your account with an email address first.
acme.sh --register-account -m my@example.com
```

原因是新版本 acme.sh 默认 CA 可能是 ZeroSSL，而 ZeroSSL 需要先注册账户邮箱。

我原来的证书就是 Let's Encrypt 签发的，所以这里直接切回 Let's Encrypt：

```bash
acme.sh --set-default-ca --server letsencrypt
```

然后重新申请：

```bash
acme.sh --issue \
  --dns dns_cf \
  -d 666.xyz \
  -d '*.666.xyz'
```

这次成功签发。

成功输出：

```text
Your cert is in: /home/yangr/.acme.sh/666.xyz_ecc/666.xyz.cer
Your cert key is in: /home/yangr/.acme.sh/666.xyz_ecc/666.xyz.key
The intermediate CA cert is in: /home/yangr/.acme.sh/666.xyz_ecc/ca.cer
And the full-chain cert is in: /home/yangr/.acme.sh/666.xyz_ecc/fullchain.cer
ARI suggestedWindow: 2026-07-31T10:51:25Z to 2026-08-02T06:02:15Z
Next renewal time picked from ARI window: 2026-07-31T17:03:09Z
```

![image.png|300](https://imgbed.anluoying.com/2026/06/91f737f26e6b30600b2113a32b1c3f1e.png)


这里生成的是 ECC 证书，所以目录名是：

```bash
/home/yangr/.acme.sh/666.xyz_ecc/
```

后续安装证书时需要带上 `--ecc` 参数。

## 安装证书到 Nginx 目录

先备份旧证书：

```bash
cd ~/registry-proxy/nginx/ssl

mv 666.xyz.pem 666.xyz.pem.bak
mv 666.xyz.key 666.xyz.key.bak
```

然后把 acme.sh 生成的证书安装到原来的 Nginx 证书路径：

```bash
acme.sh --install-cert \
  -d 666.xyz \
  --ecc \
  --key-file       ~/registry-proxy/nginx/ssl/666.xyz.key \
  --fullchain-file ~/registry-proxy/nginx/ssl/666.xyz.pem \
  --reloadcmd "docker restart registry-nginx"
```

这一步做了三件事：

```text
把私钥安装到 ~/registry-proxy/nginx/ssl/666.xyz.key
把完整证书链安装到 ~/registry-proxy/nginx/ssl/666.xyz.pem
续期后自动执行 docker restart registry-nginx
```

注意这里安装的是 `fullchain`，因为 Nginx 对外服务时需要提供完整证书链。

## 检查 Nginx 证书引用

检查 Nginx 配置：

```bash
grep ssl_certificate -R ~/registry-proxy/nginx/conf.d
```

输出：

```text
/home/yangr/registry-proxy/nginx/conf.d/registry.conf:    ssl_certificate     /etc/nginx/ssl/666.xyz.pem;
/home/yangr/registry-proxy/nginx/conf.d/registry.conf:    ssl_certificate_key /etc/nginx/ssl/666.xyz.key;
```

这说明容器内 Nginx 读取的是：

```bash
/etc/nginx/ssl/666.xyz.pem
/etc/nginx/ssl/666.xyz.key
```

对应宿主机路径正好是：

```bash
~/registry-proxy/nginx/ssl/666.xyz.pem
~/registry-proxy/nginx/ssl/666.xyz.key
```

配置是匹配的。

## 检查新证书有效期

查看本地证书：

```bash
openssl x509 \
  -in ~/registry-proxy/nginx/ssl/666.xyz.pem \
  -noout \
  -dates
```

输出：

```text
notBefore=Jun  2 08:07:21 2026 GMT
notAfter=Aug 31 08:07:20 2026 GMT
```

这说明宿主机上的证书已经更新成功。

![image.png|300](https://imgbed.anluoying.com/2026/06/aefb8fee9d7acebcf7e1c5d937f718d2.png)

再检查线上服务实际返回的证书：

```bash
openssl s_client \
  -connect hubcmd.666.xyz:5050 \
  -servername hubcmd.666.xyz \
  </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

输出：

```text
notBefore=Jun  2 08:07:21 2026 GMT
notAfter=Aug 31 08:07:20 2026 GMT
issuer=C = US, O = Let's Encrypt, CN = YE2
subject=CN = 666.xyz
```

这说明浏览器访问的 `hubcmd.666.xyz:5050` 已经拿到了新证书。

其中：

```text
subject=CN = 666.xyz
```

不代表 `hubcmd.666.xyz` 不被覆盖。

因为现代浏览器主要看 SAN，也就是证书里的 Subject Alternative Name。当前证书是：

```text
666.xyz
*.666.xyz
```

所以 `hubcmd.666.xyz` 是可以匹配的。

## 自动续期检查

acme.sh 安装后会自动写入 crontab。

查看：

```bash
crontab -l
```

输出：

```text
57 7 * * * "/home/yangr/.acme.sh"/acme.sh --cron --home "/home/yangr/.acme.sh" > /dev/null
```

这表示每天会执行一次 acme.sh 的自动续期检查。

真正的续期时间由 acme.sh 和 CA 共同决定。这次签发时输出了：

```text
ARI suggestedWindow: 2026-07-31T10:51:25Z to 2026-08-02T06:02:15Z
Next renewal time picked from ARI window: 2026-07-31T17:03:09Z
```

也就是说，下次续期会在建议窗口内自动进行。

由于前面 `--install-cert` 时已经配置了：

```bash
--reloadcmd "docker restart registry-nginx"
```

所以后续续期成功后会自动覆盖 Nginx 使用的证书，并重启 `registry-nginx` 容器。

## Nginx 配置摘要

当前 Nginx 的核心配置如下：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream dockerhub_backend {
    server dockerhub:5000;
}
upstream ghcr_backend {
    server ghcr:5000;
}
upstream gcr_backend {
    server gcr:5000;
}
upstream k8s_backend {
    server k8s:5000;
}
upstream quay_backend {
    server quay:5000;
}
upstream mcr_backend {
    server mcr:5000;
}
upstream elastic_backend {
    server elastic:5000;
}
upstream nvcr_backend {
    server nvcr:5000;
}
upstream registry_ui {
    server registry-ui:8080;
}
upstream hubcmd_ui {
    server hubcmd-ui:3000;
}

map $host $backend {
    hub.666.xyz        dockerhub_backend;
    ghcr.666.xyz       ghcr_backend;
    gcr.666.xyz        gcr_backend;
    k8s.666.xyz        k8s_backend;
    quay.666.xyz       quay_backend;
    mcr.666.xyz        mcr_backend;
    elastic.666.xyz    elastic_backend;
    nvcr.666.xyz       nvcr_backend;

    drpui.666.xyz      registry_ui;
    hubcmd.666.xyz     hubcmd_ui;

    default               dockerhub_backend;
}

server {
    listen 5050 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/666.xyz.pem;
    ssl_certificate_key /etc/nginx/ssl/666.xyz.key;

    client_max_body_size 0;
    proxy_read_timeout   900;
    proxy_connect_timeout 60;

    location / {
        proxy_pass http://$backend;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Docker-Distribution-Api-Version registry/2.0;

        proxy_http_version 1.1;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Upgrade $http_upgrade;

        chunked_transfer_encoding on;
    }
}
```

这个配置的核心逻辑是：

```text
所有域名都访问 5050
Nginx 根据 Host 头判断后端 upstream
所有域名共用一张 *.666.xyz 泛域名证书
```

## 最后的浏览器 Not Secure 问题

证书更新后，浏览器里仍然出现了 `Not Secure` 提示。

![image.png|300|300](https://imgbed.anluoying.com/2026/06/2ed1dd7b997b22c1944f58e8f607ed87.png)
但点开详情后可以看到：

```text
Certificate is valid
```

证书查看器里也显示：

```text
Issued By: Let's Encrypt
Validity Period:
Issued On: Tuesday, June 2, 2026
Expires On: Monday, August 31, 2026
```

并且命令行验证线上证书也是新的：

```bash
openssl s_client \
  -connect hubcmd.666.xyz:5050 \
  -servername hubcmd.666.xyz \
  </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

所以这时问题已经不在证书签发和 Nginx 配置上。

如果无痕模式和换浏览器都正常，说明更像是当前浏览器的站点状态缓存、HSTS 状态、旧安全状态、扩展影响或本地缓存导致。

可以尝试的方向包括：

```text
清理站点数据
清理 DNS 缓存
清理浏览器 SSL 状态
删除该域名的 HSTS 记录
停用相关浏览器扩展
换浏览器配置目录验证
```

但从服务端角度看，证书链路已经跑通了，所以我懒得搞了。
最终回到我拉 Docker 镜像的服务器，成功拉取镜像。

## 最终结果

这次最终完成了几件事：

```text
确认原证书已经过期
确认 Nginx 运行在 Docker 容器内
确认服务只开放 5050 端口
放弃 HTTP-01 验证
改用 Cloudflare DNS Challenge
使用 acme.sh 申请 Let's Encrypt 泛域名证书
把新证书安装回原 Nginx 证书路径
配置续期后自动重启 registry-nginx
确认线上服务已经返回新证书
确认 crontab 自动续期任务存在
```

最终证书链路如下：

```text
Cloudflare DNS
    ↓
acme.sh DNS Challenge
    ↓
Let's Encrypt 泛域名证书
    ↓
~/registry-proxy/nginx/ssl/666.xyz.pem
~/registry-proxy/nginx/ssl/666.xyz.key
    ↓
Docker volume
    ↓
/etc/nginx/ssl/666.xyz.pem
/etc/nginx/ssl/666.xyz.key
    ↓
registry-nginx
    ↓
https://*.666.xyz:5050
```

## 可复用命令汇总

切换默认 CA 到 Let's Encrypt：

```bash
acme.sh --set-default-ca --server letsencrypt
```

申请泛域名证书：

```bash
acme.sh --issue \
  --dns dns_cf \
  -d 666.xyz \
  -d '*.666.xyz'
```

安装证书到 Nginx 使用目录：

```bash
acme.sh --install-cert \
  -d 666.xyz \
  --ecc \
  --key-file       ~/registry-proxy/nginx/ssl/666.xyz.key \
  --fullchain-file ~/registry-proxy/nginx/ssl/666.xyz.pem \
  --reloadcmd "docker restart registry-nginx"
```

检查本地证书有效期：

```bash
openssl x509 \
  -in ~/registry-proxy/nginx/ssl/666.xyz.pem \
  -noout \
  -dates
```

检查线上服务实际返回证书：

```bash
openssl s_client \
  -connect hubcmd.666.xyz:5050 \
  -servername hubcmd.666.xyz \
  </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

检查 Nginx 证书配置：

```bash
grep ssl_certificate -R ~/registry-proxy/nginx/conf.d
```

检查 acme.sh 自动续期任务：

```bash
crontab -l
```

手动重启 Nginx 容器：

```bash
docker restart registry-nginx
```