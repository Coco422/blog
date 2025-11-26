---
title: Harbor push unauthorized
description: 自建 harbor 配置域名之后非公司局域网无法完全正常使用
date: '2025-10-29T15:41:55.000Z'
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - nginx
  - Harbor
  - Linux
categories:
  - ''
---
# Harbor push unauthorized

我真的快没招了，这个东西折磨了我很久了 具体是什么情况
如下

```
docker push hub.szmckj.cn/hotpotcat/perm-check:zz
The push refers to repository [hub.szmckj.cn/hotpotcat/perm-check]                                         
17eec7bbc9d7: Unavailable
error from registry: unauthorized to access repository: hotpotcat/perm-check, action: push: unauthorized to access repository: hotpotcat/perm-check, action: push
```

如这里所见。我在公司的服务器上装了 VMware [Harbor](https://goharbor.io/) 来多地同步docker镜像，同时存一些基本镜像避免网络问题。

但是无论我在哪里都愉快使用的时候，在家里的Windows遇到了这个 无法push的问题

## 首先在Harbor的配置处

我检查了项目名称，全小写，一个字母没错，我检查了登录的用户。是我在UI登录的账号密码。我logout再login 也依旧报错。我检查了 项目的策略。这是一个干净的仓库，创建人是我，并且我上午在公司的mac 和 ubuntu服务器成功推送过。

甚至他是个公开仓库啊

![image.png](https://imgbed.anluoying.com/2025/10/5af07164d59ff3259f7829789c032d1b.png)

## 怀疑系统，用wsl试试

![image.png](https://imgbed.anluoying.com/2025/10/1a5ea19c863328e12f952c762aba60b6.png)

还是这样

## 怀疑代理问题

关了clash，切换了旁路由，还是这样子

## gpt叫我搞个机器人账号试试

![image.png](https://imgbed.anluoying.com/2025/10/f4e6bbc436ada3c238d93648c026b597.png)

我都拉满权限了还是这样

## 看后台日志

到这一步我其实严重怀疑是网络问题。但是我没证据所以还是先看后台日志，好在看了

```
registry           | ::1 - - [29/Oct/2025:15:38:14 +0000] "GET / HTTP/1.1" 200 0 "" "curl/8.12.0"
nginx              | 127.0.0.1 - "GET / HTTP/1.1" 200 785 "-" "curl/8.12.0" 0.001 0.001 .
harbor-portal      | 172.31.0.9 - - [29/Oct/2025:15:38:17 +0000] "GET / HTTP/1.1" 200 785 "-" "curl/8.12.0"
registry           | 172.31.0.4 - - [29/Oct/2025:15:38:19 +0000] "GET / HTTP/1.1" 200 0 "" "Go-http-client/1.1"
harbor-portal      | 172.31.0.4 - - [29/Oct/2025:15:38:19 +0000] "GET / HTTP/1.1" 200 785 "-" "Go-http-client/1.1"
registryctl        | 172.31.0.4 - - [29/Oct/2025:15:38:19 +0000] "GET /api/health HTTP/1.1" 200 9
nginx              | 172.16.99.6 - "HEAD /v2/hotpotcat/perm-check/blobs/sha256:17eec7bbc9d79fa397ac95c7283ecd04d1fe6978516932a3db110c6206430809 HTTP/1.1" 401 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.003 0.003 .
nginx              | 172.16.99.6 - "HEAD /v2/hotpotcat/perm-check/blobs/sha256:1b44b5a3e06a9aae883e7bf25e45c100be0bb81a0e01b32de604f3ac44711634 HTTP/1.1" 401 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.005 0.005 .
nginx              | 172.16.99.6 - "POST /service/token HTTP/1.1" 405 19 "-" "containerd/2.1.4+unknown" 0.002 0.001 .
harbor-core        | 2025-10-29T15:38:26Z [INFO] [/server/middleware/security/robot.go:71][requestID="55026fa7-8ad3-4fac-a387-d3db6484ac5c" traceID="aa950751535cc6b087bf5ec533951b10"]: a robot security context generated for request GET /service/token
nginx              | 172.16.99.6 - "GET /service/token?scope=repository%3Ahotpotcat%2Fperm-check%3Apull&scope=repository%3Ahotpotcat%2Fperm-check%3Apull%2Cpush&service=harbor-registry HTTP/1.1" 200 1010 "-" "containerd/2.1.4+unknown" 0.025 0.025 .
nginx              | 172.16.99.6 - "HEAD /v2/hotpotcat/perm-check/blobs/sha256:1b44b5a3e06a9aae883e7bf25e45c100be0bb81a0e01b32de604f3ac44711634 HTTP/1.1" 404 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.005 0.005 .
nginx              | 172.16.99.6 - "HEAD /v2/hotpotcat/perm-check/blobs/sha256:17eec7bbc9d79fa397ac95c7283ecd04d1fe6978516932a3db110c6206430809 HTTP/1.1" 404 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.022 0.023 .
registry           | time="2025-10-29T15:38:26.164978329Z" level=info msg="authorized request" go.version=go1.23.8 http.request.host="hub.szmckj.cn:443" http.request.id=e560674b-c756-457d-8294-cbc6e4d85504 http.request.method=POST http.request.remoteaddr=116.30.100.87 http.request.uri="/v2/hotpotcat/perm-check/blobs/uploads/" http.request.useragent="docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \(windows\))" vars.name="hotpotcat/perm-check" 
registry           | time="2025-10-29T15:38:26.168010906Z" level=info msg="response completed" go.version=go1.23.8 http.request.host="hub.szmckj.cn:443" http.request.id=e560674b-c756-457d-8294-cbc6e4d85504 http.request.method=POST http.request.remoteaddr=116.30.100.87 http.request.uri="/v2/hotpotcat/perm-check/blobs/uploads/" http.request.useragent="docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \(windows\))" http.response.duration=11.300209ms http.response.status=202 http.response.written=0 
registry           | 172.31.0.4 - - [29/Oct/2025:15:38:26 +0000] "POST /v2/hotpotcat/perm-check/blobs/uploads/ HTTP/1.1" 202 0 "" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \\(windows\\))"
nginx              | 172.16.99.6 - "POST /v2/hotpotcat/perm-check/blobs/uploads/ HTTP/1.1" 202 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.022 0.021 .
nginx              | 172.16.99.6 - "PUT /v2/hotpotcat/perm-check/blobs/uploads/9d9e11fd-abe0-456e-9b9c-d5da9a020239?_state=MvL4ZmK09_2yH7zJzwMYeiWVk_vgc4FBa4AHfNLaNs97Ik5hbWUiOiJob3Rwb3RjYXQvcGVybS1jaGVjayIsIlVVSUQiOiI5ZDllMTFmZC1hYmUwLTQ1NmUtOWI5Yy1kNWRhOWEwMjAyMzkiLCJPZmZzZXQiOjAsIlN0YXJ0ZWRBdCI6IjIwMjUtMTAtMjlUMTU6Mzg6MjYuMTY1MTIxNTg2WiJ9&digest=sha256%3A1b44b5a3e06a9aae883e7bf25e45c100be0bb81a0e01b32de604f3ac44711634 HTTP/1.1" 401 190 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.003 0.003 .
registry           | time="2025-10-29T15:38:26.184206457Z" level=info msg="authorized request" go.version=go1.23.8 http.request.host="hub.szmckj.cn:443" http.request.id=487e9723-c8f5-4646-af27-b301329de187 http.request.method=POST http.request.remoteaddr=116.30.100.87 http.request.uri="/v2/hotpotcat/perm-check/blobs/uploads/" http.request.useragent="docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \(windows\))" vars.name="hotpotcat/perm-check" 
registry           | 172.31.0.4 - - [29/Oct/2025:15:38:26 +0000] "POST /v2/hotpotcat/perm-check/blobs/uploads/ HTTP/1.1" 202 0 "" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \\(windows\\))"
registry           | time="2025-10-29T15:38:26.186531266Z" level=info msg="response completed" go.version=go1.23.8 http.request.host="hub.szmckj.cn:443" http.request.id=487e9723-c8f5-4646-af27-b301329de187 http.request.method=POST http.request.remoteaddr=116.30.100.87 http.request.uri="/v2/hotpotcat/perm-check/blobs/uploads/" http.request.useragent="docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \(windows\))" http.response.duration=10.154146ms http.response.status=202 http.response.written=0 
nginx              | 172.16.99.6 - "POST /v2/hotpotcat/perm-check/blobs/uploads/ HTTP/1.1" 202 0 "-" "docker/28.4.0 go/go1.24.7 git-commit/249d679 kernel/6.6.87.2-microsoft-standard-WSL2 os/linux arch/amd64 containerd-client/2.1.4+unknown storage-driver/overlayfs UpstreamClient(Docker-Client/28.4.0 \x5C(windows\x5C))" 0.022 0.022 .
registry           | 172.31.0.4 - - [29/Oct/2025:15:38:29 +0000] "GET / HTTP/1.1" 200 0 "" "Go-http-client/1.1"
registryctl        | 172.31.0.4 - - [29/Oct/2025:15:38:29 +0000] "GET /api/health HTTP/1.1" 200 9
harbor-portal      | 172.31.0.4 - - [29/Oct/2025:15:38:29 +0000] "GET / HTTP/1.1" 200 785 "-" "Go-http-client/1.1"
harbor-portal      | 127.0.0.1 - - [29/Oct/2025:15:38:33 +0000] "GET / HTTP/1.1" 200 785 "-" "curl/8.12.0"
registryctl        | ::1 - - [29/Oct/2025:15:38:33 +0000] "GET /api/health HTTP/1.1" 200 9
registry           | 172.31.0.4 - - [29/Oct/2025:15:38:39 +0000] "GET / HTTP/1.1" 200 0 "" "Go-http-client/1.1"
harbor-portal      | 172.31.0.4 - - [29/Oct/2025:15:38:39 +0000] "GET / HTTP/1.1" 200 785 "-" "Go-http-clien
```

这是进行push时看到的日志。太长啦。感谢G老师再次拯救我
G老师分析如下

```
日志解读（按时间顺序）

客户端探测 blob 是否存在 → 被 401 挑战

HEAD /v2/hotpotcat/perm-check/blobs/...  401


客户端去拿 Bearer Token（scope 里明确包含 pull,push）→ 200

GET /service/token?... scope=repository:hotpotcat/perm-check:pull  & scope=...:pull,push  200


开始上传（创建上传会话）→ 202 ✅

POST /v2/hotpotcat/perm-check/blobs/uploads/  202


在“完成上传（PUT 带 digest）”这一步被 401 拦截 ❌

PUT /v2/hotpotcat/perm-check/blobs/uploads/<UUID>?_state=...&digest=sha256:...  401


这说明：鉴权没问题（能拿到 push token，并且能启动上传会话），但在“最终提交”这一步 Authorization 失效/丢失，或者 _state（Harbor/registry 的上传状态令牌）验证失败，于是被 401。
```

## nginx 问题

后台日志拉出来一读，果然，前面正常，中间一步鉴权失败。那肯定是中间的网关把我的认证给搞丢了。最后更新 nginx 配置，让他把 header 都传过来就正常了

## 结论

nginx 配置我就不贴了。具体原因在内网没遇到过是哪怕内网用域名 解析的逻辑和在外网不一样。少经过一层 nginx。AI 造福人类，多读日志头脑清晰，这是个小问题。
