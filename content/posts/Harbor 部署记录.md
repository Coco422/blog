---
title: Harbor 部署记录
description: 部署 Harbor 管理镜像
date: 2025-05-12T15:42:36+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - 服务器
  - docker
  - harbor
categories:
  - ""
  - 杂技浅尝
---
![image.png](https://imgbed.anluoying.com/2025/05/0baf05570b0301265a092637e6003fba.png)

直接一幅图说明白 Harbor 干嘛用的

### 下载安装

确保服务器有 docker 和 docker compose
两个链接分别是 官方 docs 和 github Release 页面。我下载 offline 版本的。会带上镜像

[Harbor docs \| Harbor Installation and Configuration](https://goharbor.io/docs/2.13.0/install-config/)
[Release v2.12.3 · goharbor/harbor · GitHub](https://github.com/goharbor/harbor/releases/tag/v2.12.3)

英语水平有限，装的我头昏脑胀，整体还是简单的

### 配置

`tar -xzvf 安装包.tgz`

![image.png](https://imgbed.anluoying.com/2025/05/f6846010e8d77b567239ba5cfce6b0d4.png)

解压后目录结构如上。 其中 docker-compose.yml，common目录。是脚本后续生成的，nginx 目录是我创建的。大概就是这样

复制 `harbor.yml.tmpl` -> `harbor.yml`

主要配置点就在于
- hostname
- http->port
- https
- external_url
如下图所示
![image.png](https://imgbed.anluoying.com/2025/05/f81666a57445eee3bac786b28eef8164.png)

因为我是需要另外一台服务器的 nginx 做反代，但是刚开始部署我想简单测试一下（就是这个不灵清的想法折腾我一个多小时）

我以为 hostname 在配置了external_url 后会失效。于是还是内网地址 172.16.100.1
然后用 openssl 自签名了证书。然后配了 external_url
接着在我的客户端电脑上 配置了/etc/hosts
`172.16.100.1 hub.test.cn`

结果就是能访问，但是到下一步。我清掉本地配置。去配置公网服务器的时候

死活打不通，要么就是页面能到，要么就是 无法登录。自己琢磨半天越想越绕，（这里真的基础功力不够深厚，来个老法师估计十分钟搞完了）

最后参考了别人的文章
[在 HTTPS 的反向代理 Nginx 后运行 HTTP Harbor \| 星辰狂澜's Blog](https://blog.starudream.cn/2022/05/18/harbor-behind-nginx-reverse-proxy/)
[私有镜像仓库 Harbor 安装和使用 - 冯威的博客](https://www.fwhyy.com/2024/01/private-image-warehouse-harbor-installation-and-use/)

结论配置就是这样
![image.png](https://imgbed.anluoying.com/2025/05/8b5267a083529e19111087f839551846.png)

另外反代 nginx 的配置如下

```nginx
server {  
    server_name  hub.test.cn;  
    client_max_body_size 2000M;  
    gzip  on;  
  
   location / {  
      proxy_pass http://172.16.100.1:7880;  
      proxy_set_header Upgrade $http_upgrade;  
      proxy_set_header Connection "upgrate";  
  
  
      proxy_set_header X-Real-IP $remote_addr;  
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
      proxy_set_header referer $http_referer;  
      proxy_set_header X-Forwarded-Proto $scheme;  
   }  
     
     location /v2/ {  
      proxy_pass http://172.16.100.1:7880/v2/;  
      proxy_set_header Upgrade $http_upgrade;  
      proxy_set_header Connection "upgrate";  
  
      proxy_set_header X-Real-IP $remote_addr;  
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
      proxy_set_header referer $http_referer;  
      proxy_set_header X-Forwarded-Proto $scheme;  
   }  
     
     location /service/ {  
      proxy_pass http://172.16.100.1:7880/service/;  
      proxy_set_header Upgrade $http_upgrade;  
      proxy_set_header Connection "upgrate";  
          
      proxy_set_header X-Real-IP $remote_addr;  
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
      proxy_set_header referer $http_referer;  
      proxy_set_header X-Forwarded-Proto $scheme;  
   }  
  
  
   error_page   500 502 503 504  /50x.html;  
    location = /50x.html {  
        root   /usr/share/nginx/html;  
    }  
}
```

这样终于能走通了

## docker login

另外两个点记录一下，有关docker login

这里是问的 chatgpt。我是 mac 系统，存储少得可怜。所以我用的是 Colima+docker
配置 docker 的方式不太一样

这里没有当时的截图了，总之就是 docker login 172.16.99.32:7880 失败
然后配置如下即可

#### **第一步：关闭当前的 Colima 实例**

```
colima stop
```

---
#### 第二步：编辑 Colima 的配置文件（添加insecure-registries）
  
运行以下命令编辑配置：

```
colima start --edit
```

此命令会打开一个编辑器（通常是 vim），在其中添加或修改以下配置：

```
# 示例配置
docker:
  insecureRegistries:
    - 172.16.100.1:7880
```

> ⚠️ 注意缩进必须是空格，不要使用 tab。
#### **第四步：验证配置是否生效**


你可以运行以下命令确认 registry 已被识别为不安全仓库：

```
docker info | grep -A 5 "Insecure Registries"
```

应该能看到你配置的 IP 和端口，比如：

```
 Insecure Registries:
  172.16.100.1:7880
  127.0.0.0/8
```

走域名，外网的时候，要注意external_url 的配置。如果你的访问带端口，那这里的配置也要带端口。我是没有配置的，所以这里正常写就通了

最后测试一下 新建一个项目 test1

![image.png](https://imgbed.anluoying.com/2025/05/18ada143d1f0cd75ff97330b10c487a1.png)

`docker login hub.test.cn`

输入用户名密码，成功可以看到如下

![image.png](https://imgbed.anluoying.com/2025/05/d42186966e829012ca1dbb6b34656c0d.png)

tag 我的本地nginx 镜像试试

`docker tag nginx:latest hub.test.cn/test1/nginx:latest`

然后

`docker push hub.test.cn/test1/nginx:latest`

![image.png](https://imgbed.anluoying.com/2025/05/c7f424b9ebe14582f85b51a4a0b6a0e5.png)

ok 完成。后续就可以使用它来管理用户 分发镜像，配置 webhook 实现 CI/CD等
