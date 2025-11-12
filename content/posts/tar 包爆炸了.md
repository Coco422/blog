---
title: tar 包爆炸了
description:
date: 2025-11-12T10:51:54+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - linux
categories:
  - 琐碎快记
---
很狼狈的一件事情，到手一个 tar 压缩包之后。直接运行 `tar -xvf 罪魁祸首.tar` 结果就像一个在我混乱的卧室里 爆开一包薯片一样，撒的到处都是，一点点捡可能还捡不干净，有一些文件的修改日期十分远古，看不出来是否来自压缩包内

首先，快捷查看包内容可以使用
`tar -tf myfile.tgz` 或者 `-tzf` 
- -t（或 --list）表示列出内容。 
- -z 表示使用 gzip 解压（因为 .tgz 通常是 .tar + gzip 压缩）
- -f 指定档案文件。 
如果想看得更 “详细”（包括权限、时间戳、大小等），可以加 -v：

```
(base) yangr@172-16-99-32-Dev:/data/yangr$ tar -tf meetingasr.tgz 
meetingasr/
meetingasr/app/
```

这样可以看到包里的顶层是一个文件夹，而不是那一堆薯片碎，现在直接解压会在当前目录解压到这个名字的文件夹内

但是，如果某一天忘记看一眼里面的结构，我之前会使用 `-C` 参数 `change to directory` 

`tar -xzf archive.tgz -C /path/to/targetdir` 

但是这个参数需要先有指定的目录才能执行，这很麻烦


所以还有一个方案就是使用 `--one-top-level` 
`tar -xzf myfile.tgz --one-top-level=newdir`

这样无论包里是什么结构，都会把内容解压到 newdir/ 目录内。

那如果我已经是上面例子 有一个文件夹，那岂不是会变成 newdir/meetingasr/ 了

所以还能用 `tar -xzf myfile.tgz --strip-components=1`
剥掉包里路径的第一级目录
