---
title: Linux 存储空间爆满排查处理
description: 在Linux中创建文件或运行应用时，出现错误提示No space left on device，表明存储资源已耗尽。本文进行排查以及处理的思路
date: 2026-03-13T11:59:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-03-13T13:18:56+08:00
showLastMod: true
tags:
  - 服务器
  - docker
  - linux
categories:
  - 杂技浅尝
  - 他山拾影
---
> [!info] 
>  在Linux中创建文件或运行应用时，出现错误提示No space left on device，表明存储资源已耗尽。

参考文章
：[诊断并解决Linux实例磁盘空间满的多种场景-云服务器 ECS-阿里云](https://help.aliyun.com/zh/ecs/user-guide/resolve-the-issue-of-insufficient-disk-space-on-a-linux-instance)
GPT5.4 指导

## 排查过程

由于该服务器是公司的主开发、测试服务器，使用人数较多经常会出现这个问题，这次统一整理一下操作过程，记录学习

### 检查分区情况

首先使用 `df -h` 查看 哪个分区满了
 `df` : `disk free`
 `-h`: `human-readable`，不加该参数默认会以“字节”（Bytes）为单位显示，加上后系统会自动以 **G** (GB)、**M** (MB)、**K** (KB) 等单位显示

 ```bash
 (base) yangr@172-16-99-32-Dev:/data/huggingface_model$ df -h
Filesystem                         Size  Used Avail Use% Mounted on
tmpfs                               13G   29M   13G   1% /run
/dev/mapper/ubuntu--vg-ubuntu--lv  501G  481G     0 100% /
tmpfs                               63G  3.0M   63G   1% /dev/shm
tmpfs                              5.0M     0  5.0M   0% /run/lock
/dev/sdb1                          3.6T  2.8T  622G  82% /data
/dev/sda2                          2.0G  252M  1.6G  14% /boot
/dev/sda1                          1.1G  6.1M  1.1G   1% /boot/efi
tmpfs                               13G   12K   13G   1% /run/user/1000
tmpfs                               13G   12K   13G   1% /run/user/1002
 
 ```
我这里 / 分区已经 100% 此时大部分程序写入 日志或者 /tmp之类都会失效，严重影响服务器使用

### 找到哪个目录最大

`du` 命令，同理 disk used

```bash
sudo du -h --max-depth=1 / | sort -hr
```

我的结果如下

```bash
3.4T    /
2.8T    /data
279G    /var
251G    /home
36G     /usr
3.6G    /opt
1.4G    /snap
836M    /tmp
258M    /boot
30M     /run
21M     /root
12M     /etc
3.0M    /dev
16K     /lost+found
8.0K    /backup
4.0K    /srv
4.0K    /mnt
4.0K    /media
0       /sys
0       /proc
```

其中 /data 和 / 在不同磁盘，所以爆满的根源主要是

	•	/var 约 279G
	•	/home 约 251G


然后类似的命令检查这两个目录，

```bash
sudo du -h --max-depth=2 /var | sort -hr
sudo du -h --max-depth=1 /home | sort -hr
```

一般 var 里面是 docker 占用的比较多，运行这几个命令全盘扫速度不会很快，耐心等待一下

```bash
(base) yangr@172-16-99-32-Dev:/data/huggingface_model$ sudo du -h --max-depth=1 /home | sort -hr
251G    /home
62G     /home/liz
58G     /home/zhangwl
42G     /home/lihao
36G     /home/yangr
20G     /home/xiedx
11G     /home/lvxy
9.4G    /home/ubuntu
8.9G    /home/xiaoss
2.4G    /home/chenh
1.5G    /home/zhaoly
1.1G    /home/hupan
748M    /home/liusm
36K     /home/duanxd2
28K     /home/chenhao
24K     /home/zhouk
24K     /home/zhangn
16K     /home/pengzy
16K     /home/huangyf
(base) yangr@172-16-99-32-Dev:/data/huggingface_model$ sudo du -h --max-depth=2 /var | sort -hr
279G    /var
275G    /var/lib
274G    /var/lib/docker
4.0G    /var/log
3.3G    /var/log/journal
1.1G    /var/lib/snapd
580M    /var/log/harbor
294M    /var/lib/apt
194M    /var/lib/plocate
162M    /var/lib/texmf
152M    /var/cache
133M    /var/cache/apt
102M    /var/lib/dpkg
6.3M    /var/lib/ubuntu-advantage
5.9M    /var/backups
5.0M    /var/lib/containerd
4.4M    /var/cache/debconf
4.1M    /var/lib/aspell
4.1M    /var/cache/apparmor
4.0M    /var/cache/snapd
3.6M    /var/log/supervisor
3.5M    /var/lib/command-not-found
2.4M    /var/cache/man
2.3M    /var/cache/fontconfig
1.7M    /var/lib/nginx
1.5M    /var/log/nginx
```

可以看到 home 目录有一些同学都比较多，以及 docker 占用的比较多

先迁移一下 home 目录，然后用软链接

### 迁移home目录

以 liz 为例

迁移目录：

```bash
sudo mv /home/liz /data/home/
```

然后建立链接

```bash
sudo ln -s /data/home/liz /home/liz
```

同理挪动另外几位同学的 home 目录


### 迁移docker目录

原本准备按照一样的处理逻辑，用软链接来替代，但是这样子如果原本机器空间不足，而不是像我这样子需要切换磁盘的各位就没什么帮助了。这里就贴一些 docker 清理空间常用命令

确定Docker内部资源占用情况。

运行`sudo docker system df`命令，查看`Size`和`RECLAIMABLE`字段，确定文件占用情况


- 清除所有已停止的容器：执行`sudo docker container prune`。
- 清除所有dangling镜像（即无tag的镜像）：执行`sudo docker image prune`。
- 清除不再使用的构建缓存：执行`sudo docker builder prune`。

注意、执行这些命令前，你最好知道自己在做什么

## 总结

阿里云的文档写的不错，我就不要脸的把它摘抄到这里吧

随着Linux实例上应用服务的持续运行，日志、缓存、业务数据等文件会不断累积，逐渐耗尽磁盘可用空间。一旦空间不足，新的数据将无法写入，会直接导致服务中断或功能异常。

## **故障现象**

在Linux实例中创建文件或运行应用时，出现错误提示`No space left on device`，表明存储资源已耗尽。

## **问题诊断和解决方案**

**重要**

在操作前请[创建快照](https://help.aliyun.com/zh/ecs/user-guide/create-a-snapshot)备份数据，防止误操作导致数据丢失，影响业务运行。

### **场景一：磁盘空间耗尽**

1.  查看磁盘使用率。
    
    系统下执行`sudo df -h`，查看各挂载点的磁盘使用情况，若`Use%`为100%，则说明对应空间已满。
    
2.  清理无用的文件或目录。
    
    使用`sudo du -sh <目录名称>/*`，查看指定目录下的文件及子目录的大小。若有需要，可进入目录，逐级查看占用情况。
    
    > 例如使用`sudo du -sh /mnt/*`，查看`/mnt`目录下文件及子目录占用空间的大小。
    
3.  若清理后仍空间不足，可[扩容云盘](https://help.aliyun.com/zh/ecs/user-guide/resize-linux-cloud-disks)。
    

### **场景二：Inode资源耗尽**

每个文件都会占用一个Inode。如果磁盘上存在大量小文件，即使磁盘空间有剩余，Inode 也可能被耗尽，导致无法新建文件。

1.  查看Inode使用率。
    
    执行命令`sudo df -i`，若`IUse%`达到100%，则表示Inode资源已耗尽。
    
2.  清理无用的文件或目录。
    
    可使用`sudo du -sh --inodes <目录名称>/*`，查看指定目录下的文件及子目录占用的Inode数量。若有需要，可进入目录，利用此命令逐级查看占用情况。
    
    > 例如使用`sudo du -sh --inodes /mnt/*`查看`/mnt`目录下文件及子目录占用空间的大小。
    
3.  若清理后Inode数仍不足，可[扩容云盘](https://help.aliyun.com/zh/ecs/user-guide/resize-linux-cloud-disks)。
    

### **场景三：存在已删除未释放空间的文件**

即使一个文件被删除，只要仍有进程正在使用（即持有其文件句柄），系统就不会释放其占用的磁盘空间，直至进程终止或主动关闭文件后才会被真正回收。

1.  安装`lsof`工具。
    
    > 已删除但未释放空间的文件无法通过`df`或`du`指令查看，需要利用`lsof`工具将其列出。
    
    #### **Alibaba Cloud Linux、CentOS**
    
    ```
    sudo yum install -y lsof
    ```
    
    #### **Debian、Ubuntu**
    
    ```
    sudo apt install -y lsof
    ```
    
2.  查看已删除文件未被释放的存储空间。
    
    ```
    sudo lsof | grep delete | sort -k7 -rn | more
    ```
    
    输出第7列为文件大小（单位Byte），累加可计算未释放空间总量。![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/7585058571/p1007181.png)
    
3.  记录占用进程的名称和PID。
    
    执行`sudo lsof | grep delete`指令，通过`COMMAND`和`PID`字段获取进程名称和进程PID。
    
4.  重启或停止相关服务。
    
    执行`sudo ps -ef | grep <PID>`，进一步确认进程用途，评估影响后重启或停止相关服务。
    
    **重要**
    
    重启或停止服务可能会影响业务，请谨慎评估，选择合适时间进行操作。
    

### **场景四：挂载点被覆盖。**

非空目录被其他设备挂载后，其下数据虽会被隐藏，但已打开此目录的进程仍可写入覆盖空间。此类“隐藏”空间消耗无法通过`df`命令观测，容易造成空间意外耗尽。

1.  查看重复的目录信息。
    
    运行`sudo lsblk`，查看MOUNTPOINT，记录重复挂载目录名称。
    
    ```
    sudo lsblk
    ```
    
    ```
    NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
    vda    253:0    0   40G  0 disk 
    ├─vda1 253:1    0    2M  0 part 
    ├─vda2 253:2    0  200M  0 part /boot/efi
    └─vda3 253:3    0 39.8G  0 part /
    vdb    253:16   0   40G  0 disk 
    └─vdb1 253:17   0   40G  0 part /mnt
    vdc    253:32   0   40G  0 disk 
    └─vdc1 253:33   0   40G  0 part /mnt
    ```
    
    示例中分区`vdb1`和`vdc1`的挂载目录均为`/mnt`，存在挂载点被覆盖风险。
    
2.  卸载文件系统。
    
    **重要**
    
    卸载文件系统，可能导致依赖该路径的服务中断，请评估风险，选择合适的时间操作。
    
    `<重复挂载目录>`可通过[上一步](#4565bb9b9914x)获取。
    
    ```
    sudo umount <重复挂载目录>
    ```
    
    > 示例中`/mnt`为重复挂载目录，执行`sudo umount /mnt`，可卸载最后挂载的设备`vdc1`。
    
3.  获取被覆盖挂载点的设备名称。
    
    运行`sudo df -h`，定位被覆盖挂载点的设备名称。
    
    ```
    sudo df -h
    ```
    
    ```
    Filesystem      Size  Used Avail Use% Mounted on
    devtmpfs        3.7G     0  3.7G   0% /dev
    tmpfs           3.7G     0  3.7G   0% /dev/shm
    tmpfs           3.7G  524K  3.7G   1% /run
    tmpfs           3.7G     0  3.7G   0% /sys/fs/cgroup
    /dev/vda3        40G  4.5G   33G  12% /
    /dev/vda2       200M  5.8M  194M   3% /boot/efi
    /dev/vdb1        40G   40G     0  100% /mnt
    tmpfs           747M     0  747M   0% /run/user/0
    ```
    
    示例中当前挂载至`/mnt`的分区名称为`vdb1`，因此被覆盖挂载点的设备名称为`vdb1`。
    
4.  解决磁盘空间满问题。
    
    1.  清理被覆盖空间中无用的文件或目录。
        
        > 示例中，需要清理`vdb1`挂载的`/mnt`目录。
        
    2.  若清理后空间仍不足，可[扩容云盘](https://help.aliyun.com/zh/ecs/user-guide/resize-linux-cloud-disks)后，挂载至其他空目录下使用。
        
        > 示例中，需要扩容的目标设备名称为`vdb1`。
        

**重要**

**请勿将多个设备挂载至同一目录。**

多个设备挂载至相同目录，先挂载的设备空间会被隐藏，可能导致数据写入错误设备。请在后续使用中确保不同设备挂载至不同的空目录。

### **场景五：Docker相关文件占用空间较大。**

Docker运行过程中会产生大量中间镜像、已停止容器和构建缓存，这些对象长期积累会占用磁盘空间。

1.  查看Docker文件磁盘空间占用率。
    
    执行`sudo df -h`，`Filesystem`为`overlay`的`Use%`达到100%。
    
2.  确定Docker内部资源占用情况。
    
    运行`sudo docker system df`命令，查看`Size`和`RECLAIMABLE`字段，确定文件占用情况。
    
    ```
    sudo docker system df
    ```
    
    ```
    TYPE            TOTAL      ACTIVE     SIZE       RECLAIMABLE
    Images          21         9          13.94GB    10.66GB（76%）
    Containers      9          5          30.09MB    0B（0%）
    Local volumes   6          6          259.9MB    0B（0%）
    Build Cache     0          0          0B         0B
    ```
    
    示例中，`Docker`镜像占用13.94GB，其中10.66GB可回收，建议优先清理无用镜像。
    
3.  清理无用文件。
    
    > 若Docker文件无法清理，可尝试依照[场景一：磁盘空间耗尽](#c9cc21676ad8r)处理问题。
    
    -   清除所有已停止的容器：执行`sudo docker container prune`。
        
    -   清除所有dangling镜像（即无tag的镜像）：执行`sudo docker image prune`。
        
    -   清除不再使用的构建缓存：执行`sudo docker builder prune`。
        

### **场景六：inotify watches达到上限。**

执行类似`sudo tail -f`命令时提示`tail: cannot watch '...': No space left on device`，并非磁盘空间不足，而是用来跟踪文件和目录变化的inotify watches达到上限，需要提升。

1.  查看当前inotify watches的上限值。
    
    执行`sudo cat /proc/sys/fs/inotify/max_user_watches`命令，查看`inotify watches`当前的上限值。
    
2.  提升inotify watches的上限值。
    
    提升上限值可能导致inotify占用更多系统内存，在修改前请谨慎评估，`<新的上限值>`一般不建议超过524288。
    
    ```
    sudo sh -c "echo fs.inotify.max_user_watches=<新的上限值> >> /etc/sysctl.conf"
    ```
    
3.  加载新配置。
    
    执行`sudo sysctl --system`加载新配置并使其生效。
    
4.  验证配置结果。
    
    再次执行`sudo cat /proc/sys/fs/inotify/max_user_watches`命令，确认已更新为预期的`inotify watches`上限。
    

## **相关文档**

-   对于海量静态文件（如图片、视频、归档）的存储需求，推荐使用[对象存储OSS](https://help.aliyun.com/zh/oss/user-guide/what-is-oss)。
    
-   若需要高性能、高并发的文件共享，建议使用[文件存储NAS](https://help.aliyun.com/zh/nas/product-overview/what-is-nas)来存储文件。
    
-   针对大规模日志采集和分析的场景，可将日志存储到[日志服务SLS](https://help.aliyun.com/zh/sls/what-is-log-service)，便于查询日志的同时，减少存储空间占用。