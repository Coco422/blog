---
title: "给ssh登录做一个通知"
description: 有人 ssh 登录服务器时发送消息给我的钉钉
date: 2025-03-13T18:14:31+08:00
image: 
math: true
license: 
hidden: false
comments: true
draft: false
---

# 给ssh登录做一个通知

>钉钉创建一个群。然后创建一个普通机器人。
>这个思路是自己想的，随手搜了一下 真有佬做了.下面是链接
>[如何使用钉钉机器人通知接收服务器SSH登录提醒 - 阿豪运维笔记](https://www.ahaoyw.com/article/843.html)

根据佬的写法 后面再加点功能。最近忙的紧，先把这个脚本部署尝试

主要原理就是`sshrc`是SSH服务的一个特殊文件，它会在每次SSH会话建立时自动执行。
执行时获取一些信息，执行 POST 请求 到钉钉的 webhook 地址，群里的机器人就可以发消息了

注意关键词的设置

```sh
# 编辑/etc/ssh/sshrc文件，如果没有自行新建一个sshrc文件

#获取登录者的用户名

user=$USER

#获取登录IP地址

ip=${SSH_CLIENT%% *}

#获取登录的时间

time=$(date +%F%t%k:%M)

#服务器的IP地址和自定义名称

server='47.119.51.122-aliyun-lc99'

  

function DingDingalarm(){

#生成的钉钉机器人的地址。

local url="https://oapi.dingtalk.com/robot/send?access_token=f469bee0141a8edc7b465b85c6e91caf22fbcc0881c2e3c311b2bdfd4aa8abb6"

  

local UA="Mozilla/5.0(WindowsNT6.2;WOW64)AppleWebKit/535.24(KHTML,likeGecko)Chrome/19.0.1055.1Safari/535.24"

  

# 修改为markdown格式

local res=`curl -XPOST -s -L -H"Content-Type:application/json" -H"charset:utf-8" $url -d"{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"$1\",\"text\":\"$2\"}}"`

  

echo $res

}

  

# 使用Markdown格式美化通知内容

DingDingalarm "服务器登录通知" "### 🔔 服务器登录通知 🔔\n\n**时间**：<font color='#FF5722'>$time</font>\n\n**服务器**：<font color='#2196F3'>$server</font>\n\n**用户**：<font color='#4CAF50'>$user</font>\n\n**来源IP**：<font color='#9C27B0'>$ip</font>\n\n> 请注意检查此次登录是否为您的预期操作"
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
