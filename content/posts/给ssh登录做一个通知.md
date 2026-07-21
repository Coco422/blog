---
title: "给ssh登录做一个通知"
description: "通过 /etc/ssh/sshrc 与钉钉机器人实现服务器 SSH 登录通知，记录 Dash 兼容、重复触发、锁文件去重和定时清理方案。"
date: 2025-03-13T18:14:31+08:00
tags: ["linux","ssh"]
categories: ["杂技浅尝"]
hidden: false
comments: true
draft: false
---

>钉钉创建一个群。然后创建一个普通机器人。
>这个思路是自己想的，随手搜了一下 真有佬做了.下面是链接
>[如何使用钉钉机器人通知接收服务器SSH登录提醒 - 阿豪运维笔记](https://www.ahaoyw.com/article/843.html)

根据佬的写法 后面再加点功能。最近忙的紧，先把这个脚本部署尝试

主要原理就是`sshrc`是SSH服务的一个特殊文件，它会在每次SSH会话建立时自动执行。
执行时获取一些信息，执行 POST 请求 到钉钉的 webhook 地址，群里的机器人就可以发消息了

注意关键词的设置

```sh
# 编辑/etc/ssh/sshrc文件 最后更新时间 2025-03-17 11:09:34

# 设置日志文件
LOG_FILE="/tmp/ssh_notification_debug.log"

# 记录详细日志的函数
log_debug() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [PID:$$] [SSH_TTY:$SSH_TTY] [PPID:$PPID] $1" >> "$LOG_FILE"
}

# 记录脚本启动
log_debug "脚本开始执行 ===================="
log_debug "SSH_CLIENT: $SSH_CLIENT"

# 获取登录者的用户名
user=$USER
# 获取登录IP地址
ip=${SSH_CLIENT%% *}

# 创建基于用户、IP和当前小时的锁文件名
# 这样同一IP同一用户每小时只会通知一次
current_hour=$(date +%Y%m%d%H)
LOCK_FILE="/tmp/ssh_notify_${user}_${ip}_${current_hour}"
GLOBAL_LOCK="/tmp/ssh_notification.lock"

log_debug "检查锁文件: $LOCK_FILE"

# 简化的锁定机制，兼容dash shell
if [ -f "$LOCK_FILE" ]; then
    log_debug "本小时已经为用户${user}从IP${ip}发送过通知"
    echo "Welcome back. The administrator has already been notified of your login this hour."
    exit 0
fi

# 创建锁定文件
touch "$LOCK_FILE"
log_debug "已创建锁文件: $LOCK_FILE"

# 获取登录的时间
time=$(date +%F%t%k:%M)
# 服务器的IP地址和自定义名称
server='204-ray-server-in-mckj'

# 修改函数声明语法，使其兼容Dash
DingDingalarm() {
    log_debug "开始发送钉钉通知"
    local url="https://oapi.dingtalk.com/robot/send?access_token=钉钉token"
    local UA="Mozilla/5.0(WindowsNT6.2;WOW64)AppleWebKit/535.24(KHTML,likeGecko)Chrome/19.0.1055.1Safari/535.24"
    local res
    res=$(curl -XPOST -s -L -H"Content-Type:application/json" -H"charset:utf-8" "$url" -d "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"$1\",\"text\":\"$2\"}}")
    if [ $? -eq 0 ]; then
        log_debug "钉钉通知发送成功: $res"
        echo "钉钉通知已发送，结果：$res"
        echo "Notification sent to admin."
    else
        log_debug "钉钉通知发送失败: $res"
        echo "钉钉通知发送失败，错误信息：$res"
    fi
}

# 使用Markdown格式美化通知内容
message="### 🔔 服务器登录通知 🔔\n\n**时间**：<font color='#FF5722'>$time</font>\n\n**服务器**：<font color='#2196F3'>$server</font>\n\n**用户**：<font color='#4CAF50'>$user</font>\n\n**来源IP**：<font color='#9C27B0'>$ip</font>\n\n**会话信息**：TTY=$SSH_TTY, PID=$$, PPID=$PPID\n\n> Please make sure to check if this login is expected."
DingDingalarm "服务器登录通知" "$message"

# 打印日志，通知管理员并告知操作将被记录
echo "The administrator has been notified. All actions will be logged."
log_debug "通知完成，脚本结束 ===================="

# 要定期清理锁文件，请使用以下命令设置cron作业（在root权限下执行一次）：
# echo "5 * * * * root find /tmp -name 'ssh_notify_*' -type f -mmin +60 -delete" > /etc/cron.d/clean_ssh_locks
```

### 小插曲

直接 cp 到 sshrc 中时报错

`/etc/ssh/sshrc: 11: Syntax error: "(" unexpected`

这个错误是因为在某些系统的默认shell（如Dash）中，函数声明的语法与Bash不同。在Dash中，函数声明不支持function functionname()的语法，而应该使用functionname()的形式。
去掉 function 即可


## 更新

实际使用时，会发送三次消息给钉钉，看了一下代码应该不会执行三次，而是 sshrc 被执行了三次。

加了日志和具体调用消息，在钉钉里收到三条信息如下

```
会话信息：TTY=/dev/pts/0, PID=3230809, PPID=3230808
会话信息：TTY=, PID=3230824, PPID=3230823
会话信息：TTY=, PID=3230869, PPID=3230868
```

**claude提示**
> 在SSH连接过程中，有三个不同的会话或进程被创建，每个都执行了sshrc脚本。这是SSH连接的典型行为。当建立SSH连接时，通常会有多个相关进程:
> 主SSH会话进程（带有TTY）

可能的X11转发会话
可能的端口转发会话
可能的SFTP子会话

claude 建议使用锁文件来实现,然后写 crontab 定时清除锁文件。就可以控制时间段内登录了。
