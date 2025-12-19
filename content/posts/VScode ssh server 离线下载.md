---
title: VScode ssh server 离线下载
description: 微软大战代码的 SSH 工具挺好用，一直用它连接远程服务器进行开发，控制文件或者直接 terminal 运行命令都很方便。但是当remote server 网络不好以及系统太老就歇菜了，那么如果下载 server 很久都没解决，我觉得应该可以离线下载并上传这个 server
date: 2025-12-19T15:05:25+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2025-12-19T17:14:56+08:00
showLastMod: true
tags:
  - linux
  - 服务器
  - 教程
categories:
  - 杂技浅尝
---
> [!NOTE]
> 微软大战代码的 SSH 工具挺好用，一直用它连接远程服务器进行开发，控制文件或者直接 terminal 运行命令都很方便。
> 但是当remote server 网络不好以及系统太老就歇菜了，那么如果下载 server 很久都没解决，我觉得应该可以离线下载并上传这个 server 

![image.png](https://imgbed.anluoying.com/2025/12/59349a63a7621b6d2852624a70cd2882.png)

主要参考文章 [知乎](https://zhuanlan.zhihu.com/p/294933020)

## 前言

要用 remote ssh in vscode，首先使用 vscode 的这一端，比如你的 windows or mac 就需要有 ssh client。25 年了，一般都会自带，如果这个都不知道，应该不会搜到我这篇文章。

## 其次

安装 remote-ssh 插件，我这里由于现在在用 cursor 就直接用 cursor 做例子截图
### 方法 1：直接在 vscode 中的 sidebar 中 Extentions 下载

![](https://imgbed.anluoying.com/2025/12/c1e081d18e05c05a0151a25f1f26b30a.png)
我这里是已经下载的样子
### 方法2：从网页下载离线插件包

[vscode market](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
![image.png](https://imgbed.anluoying.com/2025/12/006023527faeb72bcc39e70effbd2145.png)
![image.png](https://imgbed.anluoying.com/2025/12/88c80c81dec9c13c7107a4e7cafa7efb.png)
vscode 应该有 UI 可以点到，但是我这里就用命令行表达一下意思。install from VSIX 然后选择刚刚下载的插件包就可以了

## 重点，在远程服务器安装vscode server

在装完插件之后 重启 vscode 就可以看到界面有变化
![image.png](https://imgbed.anluoying.com/2025/12/3add89a447079052bd28262956067b8c.png)
如果顺利的话 新建连接，连接上去后会自动下载 vscode-ssh-server。

```
安装完成后，个人用户目录HOME下会出现一个.vscode-server文件夹，里面有三个目录bin、extensions、data。

bin目录下面存放的是VS Code Server程序，extensions目录下是VS Code Server端安装的插件，data目录下是用户数据。
**那么在服务器上离线安装VS Code Server，只需要在个人用户目录$HOME下新建.vscode-server文件夹，在其中建立bin目录，放置“对应版本”的VS Code Server程序。**
```

这里由于知乎的文章是 21 年的，所以有一些变动了，我截图看一下，这是 25 年 8 月 7 日安装的，有些许不一样。但是套路一样
![image.png](https://imgbed.anluoying.com/2025/12/0d3983266e08fc23fbcf97cc89ec7ecf.png)

我刚刚遇到问题的服务器由于是 cursor，他换了个名字，汤药不变
![image.png](https://imgbed.anluoying.com/2025/12/7726aae9a790ea9d38a6c5bc2143a39e.png)
![image.png](https://imgbed.anluoying.com/2025/12/09434a074bb3cb5de10b2846e9e4ecff.png)

可以看到 CommitID 和服务端的 ID 一致


vscode-server 的下载链接

```
https://update.code.visualstudio.com/commit:${commit_id}/server-linux-x64/stable（注意把:${commit_id}替换成对应的Commit ID）
```

这个我试了一下 应该还可以但是不知道什么时候会换。所以友友们可以在需要的时候搜一下或者最好的方法是从网络 OK 的服务器上下载后挪移

另外由于我用的 cursor 我就再次 google 了一下他的 download 地址
`https://cursor.blob.core.windows.net/remote-releases/${CURSOR_VERSION}-${CURSOR_COMMIT}/vscode-reh-${REMOTE_OS}-${REMOTE_ARCH}.tar.gz`

>[!TIP]
>注意系统和架构

另外贴上一个脚本 to upload the Cursor server to offline Linux servers

```
#!/bin/bash

# =========================================================
# Cursor Remote Server Update Script
# Used to download Cursor server files locally and then upload them to a remote Linux server
# =========================================================

# ==================== Local Configuration ====================
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
LOCAL_DOWNLOAD_DIR="$SCRIPT_DIR/cursor_downloads" # Local download directory

# Remote server configuration
REMOTE_PORT=22 # SSH port
REMOTE_USER="root" # Remote username
REMOTE_HOST="mycloud.com" # Remote host

# ==================== Target Architecture Configuration ====================
# Local architecture - determines which version you want to download locally
# Possible values: "x64" or "arm64"
# - x64: For Intel-based Macs
# - arm64: For Apple Silicon (M1/M2/M3) based Macs
LOCAL_ARCH="arm64"

# Remote architecture - determines which version you want to use on the remote server
# Possible values: "x64" or "arm64"
# - x64: For Intel/AMD servers (most common)
# - arm64: For ARM-based servers (e.g., AWS Graviton)
REMOTE_ARCH="x64"

# Remote operating system - usually Linux
# Possible values: "linux"
# Note: Cursor server currently mainly supports Linux
REMOTE_OS="linux"

# ==================== Script Functions ====================

# Output colored messages
print_message() {
    local color=$1
    local message=$2

    case $color in
        "green") echo -e "\033[0;32m$message\033[0m" ;;
        "red") echo -e "\033[0;31m$message\033[0m" ;;
        "yellow") echo -e "\033[0;33m$message\033[0m" ;;
        "blue") echo -e "\033[0;34m$message\033[0m" ;;
        *) echo "$message" ;;
    esac
}

# Check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message "red" "Error: Command '$1' not found, please install it first."
        exit 1
    fi
}

# Get Cursor version information
get_cursor_version() {
    if ! command -v cursor &> /dev/null; then
        print_message "red" "Error: 'cursor' command not found. Please ensure Cursor is installed."
        exit 1
    fi

    print_message "blue" "Fetching Cursor version information..."

    # Run cursor --version and capture the output
    local version_info=$(cursor --version)

    # Use regex to extract version, commit hash, and architecture
    CURSOR_VERSION=$(echo "$version_info" | sed -n '1p')
    CURSOR_COMMIT=$(echo "$version_info" | sed -n '2p')
    CURSOR_ARCH=$(echo "$version_info" | sed -n '3p')

    print_message "green" "Retrieved Cursor information:"
    print_message "green" "  Version: $CURSOR_VERSION"
    print_message "green" "  Commit: $CURSOR_COMMIT"
    print_message "green" "  Architecture: $CURSOR_ARCH"
}

# Download Cursor server
download_cursor_server() {
    print_message "blue" "Preparing to download Cursor server..."

    # Create download directory
    mkdir -p "$LOCAL_DOWNLOAD_DIR"

    # Build download URL
    DOWNLOAD_URL="https://cursor.blob.core.windows.net/remote-releases/${CURSOR_VERSION}-${CURSOR_COMMIT}/vscode-reh-${REMOTE_OS}-${REMOTE_ARCH}.tar.gz"

    # Set download filename
    DOWNLOAD_FILENAME="cursor-server-${CURSOR_VERSION}-${CURSOR_COMMIT}-${REMOTE_OS}-${REMOTE_ARCH}.tar.gz"
    DOWNLOAD_PATH="$LOCAL_DOWNLOAD_DIR/$DOWNLOAD_FILENAME"

    print_message "yellow" "Download URL: $DOWNLOAD_URL"
    print_message "yellow" "Downloading to: $DOWNLOAD_PATH"

    # Download the file
    if curl -L "$DOWNLOAD_URL" -o "$DOWNLOAD_PATH"; then
        print_message "green" "Cursor server downloaded successfully!"
    else
        print_message "red" "Download failed!"
        exit 1
    fi
}

# Upload and deploy Cursor server to remote host
deploy_to_remote() {
    print_message "blue" "Preparing to upload to remote server..."

    # Build SSH command prefix
    SSH_CMD="ssh -p $REMOTE_PORT ${REMOTE_USER}@${REMOTE_HOST}"
    SCP_CMD="scp -P $REMOTE_PORT"

    # Ensure remote directory exists
    print_message "yellow" "Creating remote directory structure..."
    $SSH_CMD "mkdir -p ~/.cursor-server/cli/servers/Stable-${CURSOR_COMMIT}/server/"

    # Upload the file
    print_message "yellow" "Uploading server files to remote host..."
    $SCP_CMD "$DOWNLOAD_PATH" "${REMOTE_USER}@${REMOTE_HOST}:~/.cursor-server/cursor-server.tar.gz"

    if [ $? -ne 0 ]; then
        print_message "red" "Upload failed!"
        exit 1
    fi

    # Extract the file
    print_message "yellow" "Extracting files on remote host..."
    $SSH_CMD "tar -xzf ~/.cursor-server/cursor-server.tar.gz -C ~/.cursor-server/cli/servers/Stable-${CURSOR_COMMIT}/server/ --strip-components=1"

    if [ $? -ne 0 ]; then
        print_message "red" "Extraction failed!"
        exit 1
    fi

    # Clean up temporary files
    print_message "yellow" "Cleaning up remote temporary files..."
    $SSH_CMD "rm ~/.cursor-server/cursor-server.tar.gz"

    print_message "green" "Deployment complete! Server files have been successfully installed on the remote host."
    print_message "green" "Remote server path: ~/.cursor-server/cli/servers/Stable-${CURSOR_COMMIT}/server/"
}

# ==================== Main Program ====================

# Check necessary commands
check_command "curl"
check_command "ssh"
check_command "scp"

# Get Cursor version information
get_cursor_version

# Download Cursor server
download_cursor_server

# Confirm upload
print_message "blue" "Preparing to upload to remote server ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}"
print_message "yellow" "Continue? [y/N]: "
read -r confirmation

if [[ $confirmation =~ ^[Yy]$ ]]; then
    deploy_to_remote
else
    print_message "yellow" "Upload canceled. Files have been downloaded locally: $DOWNLOAD_PATH"
fi

print_message "green" "Script execution complete!"
```

参考文章：[How to download cursor remote-ssh server manually？ - #6 by shiw-yang - How To - Cursor - Community Forum](https://forum.cursor.com/t/how-to-download-cursor-remote-ssh-server-manually/30455/6)