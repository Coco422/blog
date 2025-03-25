---
title: "Nginx 记一次基础转发配置"
description: 
date: 2025-03-24T18:10:53+08:00
image: 
math: 
license: 
hidden: false
comments: true
draft: false
toc: true
---


```
server {
    listen 1043 ssl default_server;
    server_name 172.16.99.32;

    ssl_certificate /etc/nginx/ssl/1043/server.crt;
    ssl_certificate_key /etc/nginx/ssl/1043/server.key;

    access_log /var/log/nginx/1043_access.log;
    error_log /var/log/nginx/1043_error.log warn;

    location / {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
        add_header Access-Control-Allow-Credentials true;
        
        proxy_pass http://X.X.X.X:1030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 处理 OPTIONS 预检请求
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

这个 nginx 配置做了什么事情

---

```
server {
```

• 定义一个 server 块，表示一个独立的虚拟主机配置。

---

```
	listen 1043 ssl default_server;
```

• 监听 1043 端口，并启用 SSL（即 HTTPS）。

• ssl 关键字表示该服务器使用 TLS/SSL 加密。

• 添加 default_server，确保该 server 块是 1043 端口的默认处理服务器。

---

• 指定该服务器的 server_name（主机名）。

• **注意**：server_name 不能包含端口号，应该改成（这里原来带了端口号）：

```
server_name 172.16.99.32;
```

---

```
    ssl_certificate /etc/nginx/ssl/1043/server.crt;
    ssl_certificate_key /etc/nginx/ssl/1043/server.key;
```

• 指定 SSL 证书和私钥的路径，使 Nginx 能够加密 HTTPS 连接。

---

```
    access_log /var/log/nginx/1043_access.log;
```

• 记录访问日志，存放在 /var/log/nginx/1043_access.log 文件中。

---

```
    error_log /var/log/nginx/1043_error.log warn;
```

• 记录错误日志，存放在 /var/log/nginx/1043_error.log，日志级别为 warn（警告）。

---

```
    location / {
```

• 定义 URL 访问 /（根路径）时的处理方式。

---

```
        add_header Access-Control-Allow-Origin "*";
```

• 允许跨域请求（CORS），* 代表任何来源都可以访问。

---

```
        add_header Access-Control-Allow-Methods GET, POST, OPTIONS;
```

• 允许的 HTTP 请求方法：GET、POST 和 OPTIONS。

---

```
        add_header Access-Control-Allow-Headers Authorization, Content-Type;
```

• 允许客户端请求时使用 Authorization 和 Content-Type 头部。

---

```
        proxy_pass http://X.X.X.X:1030;
```

• 将请求**反向代理**到 `http://X.X.X.X:1030`，即所有请求都会被转发到该服务器。

---

```
        proxy_set_header Host $host;
```

• 将原始请求的 Host 头部信息传递给后端服务器。

---

```
        proxy_set_header X-Real-IP $remote_addr;
```

• 将客户端的真实 IP 地址传递给后端服务器（默认情况下，后端服务器只会看到代理服务器的 IP）。

---

```
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

• 传递 X-Forwarded-For 头部，包含客户端的真实 IP 地址和所有经过的代理服务器地址。

---

```
        proxy_set_header X-Forwarded-Proto $scheme;
```

• 传递 X-Forwarded-Proto 头部，告诉后端服务器当前请求使用的是 http 还是 https。

---
最后
结束花括号

## 这里最后主要是证书问题

以后再研究了，还是太菜