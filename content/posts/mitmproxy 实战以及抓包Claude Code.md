---
title: mitmproxy 实战以及抓包Claude Code
description: 记录在 macOS 上安装配置 mitmproxy、处理 quarantine 和证书信任，并通过 upstream 链接 clash，只让 Claude Code 走代理，在 mitmweb 中抓取和分析请求。
date: 2026-05-30T21:12:03+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-30T23:09:44+08:00
showLastMod: true
tags:
  - network
categories:
  - 杂技浅尝
---
> 这个工具是 boss 推荐的，尽管他想到的使用场景是大炮打蚊子（指 在 windows wsl 安装 mitmproxy 来抓宿主机 web 页面的 restful 接口，而实际 console 的 network 足矣）但是也不去纠正了，我来试试这个工具的真实能力。

![image.png|300](https://imgbed.anluoying.com/2026/05/d79b074ccbc5b14ff4fe946d2b962d9e.png)

[GitHub - mitmproxy/mitmproxy: An interactive TLS-capable intercepting HTTP proxy for penetration testers and software developers. · GitHub](https://github.com/mitmproxy/mitmproxy)

看到这个的时候心中暗喜，我以为开箱即用，配个证书就行。

```
brew install mitmproxy
```

我刚开始以为他只有 cli 工具，没想到还有 web，那真的很方便了。

结果装完就遇到 `Apple could not verify mitmproxy is free of malware that may harm your Mac or compromise your privacy.` 啊？第一次在 homebrew 装完的东西碰到这个问题。我一时怀疑装错了。

问了下 G 老师，说 app 身上还带着 quarantine 标记，首次运行的时候拦我一下
`xattr -dr com.apple.quarantine /opt/homebrew/Caskroom/mitmproxy/*/mitmproxy.app` 

清理掉就可以了，确认一下版本。

```
mitmproxy --version
mitmweb --version
mitmdump --version
```

那么其次，对于抓 HTTPS 是需要安装他的证书的。用过 wireshark 或者用过类似软件的应该都知道。

![ig_013c5d073324cc21016a1af85ac9748197ad5a914131130681.png](https://imgbed.anluoying.com/2026/05/c586aeb8c0f84c50589e63ef894629fb.png)


第一次启动之后，它会在你的 home 目录里生成一套文件。

里面有一个 `~/.mitmproxy/mitmproxy-ca-cert.pem`

把它导入当前用户的 login.keychain-db，不去碰系统级 keychain。原因很简单，够用。

```
security add-trusted-cert -d -r trustRoot \
  -k ~/Library/Keychains/login.keychain-db \
  ~/.mitmproxy/mitmproxy-ca-cert.pem
```

这一步做完之后，本机走 mitmproxy 的 HTTPS 才算通。

## 实战

我这次不打算全量代理 Wi-Fi 或者有线流量，而是只让目标 app 走 `mitmproxy`。这样风险最小，也不会把本机网络环境搅乱。

另外我本地已经有 clash 负责代理出口流量，所以更合理的链路应该是：

`Claude Code -> mitmproxy -> clash -> Internet`

### 1. 先把链路摆正

如果 clash 暴露的是 HTTP 代理端口，比如常见的 `127.0.0.1:7897`，那么可以直接让 `mitmproxy` 用 upstream mode 挂到 clash 前面。

```bash
mitmweb \
  --mode upstream:http://127.0.0.1:7897 \
  --listen-host 127.0.0.1 \
  --listen-port 8080 \
  --web-host 127.0.0.1 \
  --web-port 8082
```

这样分工就很清楚了，`mitmproxy` 负责看包，clash 继续负责出站。启动后会自动打开 web 页面。

![image.png|300](https://imgbed.anluoying.com/2026/05/d7f7f1c0e713118a434f3b8ad1edd1dc.png)
![image.png|300](https://imgbed.anluoying.com/2026/05/0807b5a051e1586f3408ea1994b957b1.png)

### 2. 只让 Claude Code 走 mitmproxy

 `claude` 可执行文件里本身就能看到 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NODE_EXTRA_CA_CERTS` 这些变量。

```bash
HTTP_PROXY=http://127.0.0.1:8080 \
HTTPS_PROXY=http://127.0.0.1:8080 \
NODE_EXTRA_CA_CERTS=$HOME/.mitmproxy/mitmproxy-ca-cert.pem \
claude
```

这里 `NODE_EXTRA_CA_CERTS` 是 G 老师让我加的，我保持怀疑。他的解释是：即使系统已经信任过证书，Node 系工具也不一定会老老实实吃这套 CA。

![image.png|300](https://imgbed.anluoying.com/2026/05/5547338eaf4b1ef01b7c886838b82d78.png)

### 3. 在 mitmweb 里看请求

接下来就是打开 `http://127.0.0.1:8082/`，看流量有没有进来。

- 有没有新请求持续出现，确认 `Claude Code` 真的走到了 `mitmproxy`
- 域名、路径、方法是什么
- 请求头里有没有值得观察的字段
- 返回状态码和耗时是不是正常

![image.png|300](https://imgbed.anluoying.com/2026/05/00b0d2a2e900ff7f77f874c0c89de305.png)


![image.png|300](https://imgbed.anluoying.com/2026/05/c507b0dc28e38746840a23d710816424.png)


可以看到抓到的包里面，我原先 claude code 内部配置的 走向 cc-switch 的配置生效，他请求的是 127.0.0.1:15721 的地址，HTTPS_PROXY 也生效了，所以我们的 mitmproxy 抓到了包，这一句 hello 的请求体和 response 就看的一清二楚了

同样在 mitmproxy 的 flows 里面 看到了很多条请求，都可以逐步分析 claude code 在干什么。