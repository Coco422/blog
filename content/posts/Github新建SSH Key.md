---
title: Github新建SSH Key
description: 一，先在本机生成 SSH key 推荐用 ed25519，短、安全、GitHub 首选。 ssh-keygen -t ed25519 -C "your_email@example.com" 一路回车即可，默认会生成在： ~/.ssh/id
date: 2026-02-02T22:20:13+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-02T22:23:10+08:00
showLastMod: true
tags:
  - github
  - ssh
categories:
  - 杂技浅尝
---
## 一，先在本机生成 SSH key  
推荐用 ed25519，短、安全、GitHub 首选。

```
ssh-keygen -t ed25519 -C "your_email@example.com"
```

一路回车即可，默认会生成在：

```
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

如果你已经有这个文件，说明之前生成过，可以直接用，不用再建。

## 二，确认 ssh-agent 正在运行并加载 key

```
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

## 三，把公钥复制出来  
复制的是 **.pub 文件内容**。

Linux / WSL：

```
cat ~/.ssh/id_ed25519.pub
```

macOS：

```
pbcopy < ~/.ssh/id_ed25519.pub
```

Windows PowerShell：

```
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

复制整行，以 `ssh-ed25519` 开头的那一串。

## 四，在 GitHub 新建 Key  
网页操作路径：

GitHub -> 右上角头像  -> Settings  -> SSH and GPG keys  -> New SSH key

### 填法建议：

Title：  
比如  
`mckj-dev-ue5`
或者  
`wsl-ubuntu`

Key type：  
`Authentication Key`

Key：  
`把刚才复制的公钥粘进去`

点 `Add SSH key`。

## 五，测试是否生效

```
ssh -T git@github.com
```

第一次会问：

```
Are you sure you want to continue connecting (yes/no)?
```

输入 yes。

如果看到类似：

```
Hi <your-username>! You've successfully authenticated
```

说明已经完全 OK。

## 六，常见踩坑快速排雷

1）clone 用的是 https  
SSH key 只对 `git@github.com:xxx/yyy.git` 生效  
可以用：

```
git remote -v
```

确认是不是 [git@github.com](mailto:git@github.com)。

2）WSL 和 Windows 是两套 key  
WSL 里生成的 key 只对 WSL 生效  
Windows 原生 git 要单独一套。

3）权限不对  
如果 ssh 报权限问题：

```
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```


GitHub 的 key 本质就是  
你本机的一把 SSH 私钥  
加到 GitHub 账户里的一把公钥。