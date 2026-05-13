---
title: 简易运维指北
description: 不配叫指南的运维备忘录——Docker、网络、进程三个方向的常用命令
date: 2026-05-13T23:00:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-13T23:00:00+08:00
showLastMod: true
tags:
  - Docker
  - 运维
  - Linux
  - 网络
  - top
  - htop
  - lsof
  - rustnet
categories:
  - 杂技浅尝
---

为什么不叫指南，因为不配。这篇文章就记几个我自己运维的时候老是去搜的命令，写下来方便以后翻。三个方向：Docker、网络、进程。

> 不会讲 Docker 基础用法，也不讲怎么装。假设你跟我一样，知道 docker 是啥，但具体运维的时候老忘命令。

---

## Docker

### 这玩意占了多少资源？

服务器上跑了十几个容器，有时候磁盘或者内存告警了，第一反应就是"到底谁在吃资源"。

**磁盘占用**：

```bash
# 所有容器的磁盘占用，大的排前面
docker system df -v
```

这个命令会显示镜像、容器、build cache 各占了多少空间。`-v` 是 verbose，会逐个列出每个镜像/容器的大小。

如果发现某个镜像版本占了巨大空间，`docker image prune` 可以清理悬空镜像（就是那种 `<none>:<none>` 的）。加上 `-a` 会清掉所有没被容器引用的镜像，慎用。

```bash
# 只清悬空镜像
docker image prune

# 清所有没在用的镜像（慎）
docker image prune -a

# 全家桶：清容器、网络、镜像、build cache
docker system prune -a
```

**内存和 CPU 实时占用**：

```bash
docker stats
```

实时刷新的，类似 top。按 CPU 或内存排序，一眼就能看出谁是大户。`Ctrl+C` 退出。

如果只想看某个容器：

```bash
docker stats <container_name_or_id>
```

> 说实话 `docker stats` 的输出格式不太好用，信息太多了。我一般就盯着 CPU% 和 MEM USAGE 两列看。

### 这个容器到底怎么起来的？

这是运维中最常遇到的灵魂拷问。服务器上跑着一个容器，你知道它存在，但不知道它是 `docker run` 起来的还是 `docker compose` 起来的，如果是 compose，compose 文件在哪？

先看容器的启动命令：

```bash
docker inspect <container_name_or_id>
```

这玩意输出一大坨 JSON，但有几个关键字段：

```bash
# 看启动命令（Cmd 字段）
docker inspect --format='{{.Config.Cmd}}' <container>

# 看环境变量
docker inspect --format='{{.Config.Env}}' <container>

# 看挂载
docker inspect --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' <container>

# 看端口映射
docker inspect --format='{{json .HostConfig.PortBindings}}' <container>
```

判断是不是 compose 起来的：

```bash
# 看容器的 label，compose 起来的会有 com.docker.compose 相关标签
docker inspect --format='{{json .Config.Labels}}' <container> | python3 -m json.tool
```

如果看到类似这样的标签：

```json
{
    "com.docker.compose.project": "myapp",
    "com.docker.compose.project.working_dir": "/opt/myapp",
    "com.docker.compose.service": "web"
}
```

那 `Working Dir` 就是 compose 文件所在目录。`com.docker.compose.project.working_dir` 直接告诉你 compose 文件在哪。挂载的数据卷目录大概率也在那附近。

如果啥 label 都没有，那就是 `docker run` 起来的。这时候只能靠 `docker inspect` 的 Mounts 字段找挂载点了。

> 实际运维中，我更推荐的做法是：所有服务都用 compose，compose 文件统一放在 `/opt/<service_name>/` 下面。这样接手别人的服务时不用猜。

一个快速恢复 run 命令的技巧：

```bash
# 把容器当前的配置还原成 docker run 命令
docker run --name <container> <image>
# 配合 inspect 的输出手动拼，或者用这个工具：
# https://github.com/Red5d/docker-autocompose
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/red5d/docker-autocompose <container_name>
```

这个 `docker-autocompose` 工具能直接把运行中的容器转成 docker-compose.yml，接手别人的服务的时候特别好用。

---

## 网络

### 端口到底被谁占了？

"端口已被占用"——程序员最常遇到的报错之一。排查这个问题，不同发行版用的命令还不太一样。

**通用方案（推荐）：lsof**

```bash
# 查看某个端口被谁占了
sudo lsof -i :8080

# 查看某个端口的 TCP 连接
sudo lsof -i tcp:8080

# 查看某个进程打开了哪些端口
sudo lsof -i -p <pid>

# 查看某个用户的所有网络连接
sudo lsof -i -u <username>
```

lsof 的输出信息很全：进程名、PID、用户、文件描述符、协议、本地地址、远程地址、连接状态。

```bash
# 常用组合：看 80 端口的 ESTABLISHED 连接
sudo lsof -i :80 -s tcp:ESTABLISHED

# 只看 LISTEN 状态（谁在监听这个端口）
sudo lsof -i :3306 -s tcp:LISTEN
```

**Ubuntu / Debian 原生方案**：

```bash
# ss 替代了旧的 netstat，更快
ss -tlnp    # t=TCP, l=LISTEN, n=数字显示端口, p=显示进程

# 看所有 TCP 连接
ss -tnp

# 看某个端口
ss -tlnp 'sport = :8080'

# 如果你习惯了 netstat（需要安装 net-tools）
sudo apt install net-tools
netstat -tlnp
```

**CentOS / RHEL 原生方案**：

```bash
# ss 同样可用（CentOS 7+ 默认有）
ss -tlnp

# netstat 也行
netstat -tlnp

# CentOS 的 firewall 查看开放端口
sudo firewall-cmd --list-ports
```

> 现在大多数发行版都自带 `ss` 了，它比 `netstat` 快很多，因为直接读 netlink socket。能用 `ss` 就用 `ss`。

### rustnet：Rust 写的终端网络监控神器

之前搜到一个叫 [rustnet](https://github.com/domcyrus/rustnet) 的工具，Rust 写的，功能出乎意料地全。跟 `ss` 和 `lsof` 不同，它是**实时**显示的 TUI 界面，能看到每个进程的网络连接、带宽消耗、协议识别，还带深度包检测 (DPI)。

**安装**：

```bash
# macOS / Linux
brew tap domcyrus/rustnet
brew install rustnet

# Ubuntu 25.10+
sudo add-apt-repository ppa:domcyrus/rustnet
sudo apt update && sudo apt install rustnet

# Fedora 42+
sudo dnf copr enable domcyrus/rustnet
sudo dnf install rustnet

# Arch Linux
sudo pacman -S rustnet

# 通用（需要 Rust 环境）
cargo install rustnet-monitor
```

**基本使用**：

```bash
# 需要 root 权限（抓包需要）
sudo rustnet

# 指定网卡
sudo rustnet -i eth0

# 看 localhost 连接
sudo rustnet --show-localhost

# 关闭 DNS 反解（更快）
sudo rustnet --no-resolve-dns
```

不想每次都 sudo？给它加个 capability：

```bash
sudo setcap 'cap_net_raw,cap_bpf,cap_perfmon+eip' $(which rustnet)
rustnet
```

**最实用的几个功能**：

1. **看谁在吃带宽**：进入界面后按 `s` 切换排序列，切到 "Down/Up ↓" 就是按带宽排序
2. **按进程看连接**：按 `a` 开启进程分组，每个进程下面展开它所有的连接
3. **过滤特定端口/进程**：按 `/` 进入过滤模式

```bash
# 过滤示例
/port:443           # 只看 443 端口
/process:nginx      # 只看 nginx 进程
/state:established  # 只看已建立的连接
/sni:github.com     # 只看 SNI 是 github.com 的（HTTPS 连接）
/dport:443 sni:api  # 组合过滤：目标端口 443 且 SNI 包含 api
```

4. **查看连接详情**：选中一条连接按 `Enter`，能看到协议、加密套件、GeoIP 等信息
5. **保留已关闭的连接**：按 `t` 可以让已关闭的连接不消失，方便事后排查

> 这个工具的过滤语法很像 vim 的搜索，支持正则：`/(?i)pattern/`。用起来很顺。

**键盘速查**：

| 按键 | 作用 |
|------|------|
| `j/k` 或方向键 | 上下移动 |
| `Enter` | 查看连接详情 |
| `/` | 进入过滤模式 |
| `Esc` | 返回/清除过滤 |
| `s` / `S` | 切换排序列 / 切换排序方向 |
| `a` | 开启/关闭进程分组 |
| `t` | 显示/隐藏已关闭连接 |
| `i` | 切换网卡统计视图 |
| `c` | 复制远程地址 |
| `q` | 退出 |

### 关于抓包

tcpdump 和 Wireshark 的水太深了，这里不展开。就记几个最常用的：

```bash
# 抓 eth0 上 80 端口的包
sudo tcpdump -i eth0 port 80

# 抓某个 host 的包
sudo tcpdump -i eth0 host 192.168.1.100

# 抓 TCP SYN 包（看谁在连你）
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# 保存到文件，用 Wireshark 打开
sudo tcpdump -i eth0 -w capture.pcap port 443

# 读 pcap 文件
tcpdump -r capture.pcap
```

> rustnet 也能导出 pcap：`rustnet --pcap-export`，而且导出的 pcap 里还带进程信息（PID 和进程名），这个在 Wireshark 里是看不到的。有需要可以配合它自带的 `pcap_enrich.py` 脚本做分析。

---

## 进程排查

服务器 CPU 飙了或者内存不够了，第一件事就是看哪个进程在作妖。

### top

`top` 是最基础的，所有 Linux 系统都有。

```bash
top
```

进来之后看到的几个关键列：

- **%CPU** — CPU 占用百分比
- **%MEM** — 内存占用百分比
- **RES** — 实际物理内存占用（常驻内存）
- **COMMAND** — 进程名

常用快捷键：

| 按键 | 作用 |
|------|------|
| `P` | 按 CPU 排序（大写） |
| `M` | 按内存排序（大写） |
| `k` | 杀进程（会让你输 PID） |
| `1` | 显示每个 CPU 核心的占用 |
| `c` | 显示完整命令行 |
| `H` | 显示线程 |
| `f` | 选择显示哪些列 |
| `q` | 退出 |

> 有个容易踩的坑：top 默认是"按启动以来的平均 CPU 占用"排序的。如果你要看当前谁在吃 CPU，按一下 `P`（大写）确认是按 CPU 降序排列。有些系统默认就是，有些不是。

```bash
# 只看某个用户进程
top -u mysql

# 只看某个 PID
top -p 12345

# 批处理模式，输出到文件（配合脚本用）
top -b -n 1 > top_output.txt
```

### htop

`htop` 是 `top` 的加强版，界面好看很多，操作也更方便。大多数发行版需要单独安装：

```bash
# Ubuntu / Debian
sudo apt install htop

# CentOS / RHEL
sudo dnf install htop

# Arch
sudo pacman -S htop
```

用法：

```bash
htop
```

比起 top 的优势：

1. **鼠标可点** — 可以直接点列头排序，点进程选中
2. **树状视图** — 按 `t` 显示进程树，看父子关系一目了然
3. **搜索** — 按 `F3` 或 `/` 搜索进程名
4. **过滤** — 按 `F4` 只显示匹配的进程
5. **选中多个进程批量操作** — 按空格选中多个，然后 `F9` 批量杀

常用快捷键：

| 按键 | 作用 |
|------|------|
| `F1` | 帮助 |
| `F2` | 设置（自定义显示列、颜色方案等） |
| `F3` / `F4` | 搜索 / 过滤 |
| `F5` | 树状视图 |
| `F6` | 选择排序列 |
| `F9` | 发信号（杀进程用 SIGTERM/SIGKILL） |
| `F10` | 退出 |
| `t` | 树状视图开关 |
| `H` | 显示/隐藏线程 |
| `u` | 按用户过滤 |
| `Space` | 标记进程（可多选） |

顶部的彩色条含义：

- **绿色** = 用户态进程占用
- **红色** = 内核态占用
- **蓝色** = 低优先级（nice 值）
- **橙色** = IRQ 时间
- **灰色** = IO 等待

> 我个人更喜欢 htop，主要是树状视图和搜索功能太实用了。top 的好处是"到哪台机器都有"，应急的时候不用装东西。两个都得会。

### 一些组合用法

排查问题的时候，一般不会只用一个命令，而是组合着来：

```bash
# 1. 先看整体负载
uptime
# 输出：14:23:01 up 45 days, 3:12, 2 users, load average: 5.20, 3.15, 2.80
# load average 三个数字分别是 1分钟、5分钟、15分钟的平均负载

# 2. 找到吃 CPU 的进程
top -bn1 | head -20

# 3. 看这个进程的详细信息
ls -l /proc/<pid>/exe       # 进程对应的可执行文件
cat /proc/<pid>/cmdline     # 完整的启动命令
ls -l /proc/<pid>/fd        # 进程打开了哪些文件描述符

# 4. 看这个进程的网络连接
sudo lsof -i -p <pid>
# 或者
ss -tnp | grep <pid>
```

---

这三个方向基本覆盖了我日常运维 80% 的场景。剩下 20% 比如日志排查、磁盘 IO、内核参数调优，以后踩到了再补。

> 这篇跟刚刚写的"斜杠命令大全"一样，会慢慢补充更新。
