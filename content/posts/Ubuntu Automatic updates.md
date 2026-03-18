---
title: Ubuntu Automatic updates
description: 本文介绍 Ubuntu 自动更新导致系统重启及驱动不兼容问题。提供两种方案：推荐保留安全更新但黑名单内核与 NVIDIA 包，或完全关闭自动更新。指导修改配置文件，避免生产服务器意外重启影响业务。
date: 2026-03-18T14:29:51+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: true
lastmod: 2026-03-18T15:28:20+08:00
showLastMod: true
tags:
  - ubuntu
categories:
  - 杂技浅尝
---
## 起因

上午醒来看到邮件里面有一封 netdata 发的警告
![image.png|300](https://imgbed.anluoying.com/2026/03/5166a6f8bddc71000885d021a616a06b.png)

netdata 我只部署了少量的服务器，本文和这次警告没有太大关系，而是让我想到了一个很苦恼的事情。

这个应该是 ubuntu 的自动更新机制、他在更新后需要进行重启操作，有一些驱动甚至会重新编译。

触发原因：Ubuntu 系统最近通过 apt 安装了一些软件包更新（最常见的是 Linux 内核 linux-image 或核心库如 libc6），这些更新需要重启系统才能完全生效。Netdata 检测到系统中存在 /run/reboot-required 这个文件（以及里面的 /run/reboot-required.pkgs 列出了具体包），就触发了这个警告。

之前有一台生产的服务器上，有用 cuda、某天 ubuntu 自动更新后、内核态和运行态版本对不齐、导致 cuda 无法使用，当时状态又不好重启、基本没什么办法，比较糟心、现在看到这个之后回想这件事情、决定搜一下文档，看看怎么关闭自动更新。

## 解决办法

### 推荐方案1（最优）：保留自动安全更新，但黑名单内核和 NVIDIA 包（不影响其他安全补丁）

这样其他软件的安全更新继续自动装，但内核和 NVIDIA 不会自动动，避免重启和 CUDA 问题。

1. 编辑配置文件：

```Bash
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades
```

2. 在文件里找到 `Unattended-Upgrade::Package-Blacklist` 部分（如果没有就自己加），添加：

```conf
Unattended-Upgrade::Package-Blacklist {
    "linux-generic";
    "linux-image-generic";
    "linux-headers-generic";
    "linux-image.*";
    "linux-headers.*";
    "nvidia-*";
    "libnvidia-*";
    "cuda*";
};
```

3. 保存后重启 unattended-upgrades 服务（或重启服务器）：
```bash
sudo systemctl restart unattended-upgrades
```
 
4. （可选）永久锁定内核版本：
```bash
sudo apt-mark hold linux-generic linux-image-generic
```

以后内核更新就只在你手动 `apt upgrade` 时才发生，你可以在维护窗口处理 NVIDIA driver 重建（`sudo ubuntu-drivers autoinstall`）并重启。
### 方案2（最彻底）：完全关闭自动更新

1. 编辑：
   ```bash
   sudo vim /etc/apt/apt.conf.d/20auto-upgrades
   ```

2. 改成：
   ```conf
   APT::Periodic::Update-Package-Lists "0";
   APT::Periodic::Unattended-Upgrade "0";
   ```

3. 或者一键：
   ```bash
   sudo dpkg-reconfigure unattended-upgrades
   ```
   选择 **no**。

以后你想更新就手动执行：
```bash
sudo apt update && sudo apt upgrade
```
（建议在维护窗口做，更新完检查 `/run/reboot-required` 再重启）

相关文档：
[Automatic updates - Ubuntu Server documentation](https://ubuntu.com/server/docs/how-to/software/automatic-updates/)

