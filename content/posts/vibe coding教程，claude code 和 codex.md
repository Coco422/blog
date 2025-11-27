---
title: vibe coding教程，claude code 和 codex
description: vibe coding教程，claude code 和 codex,claude code是anthropic家推出的 cli agent工具，个人心中排第一的 code agent
date: 2025-11-20T14:11:53+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - 教程
categories:
---
![image.png](https://imgbed.anluoying.com/2025/11/94f41f82704abb8f3c4bc281cc97c1ee.png)

# **迄今为止最先进的代码助手**：

claude，anthropic家最强垂直领域编码模型之王，三个系列，haiku、sonnet、opus
截至写这个教程时模型全面更新到4.5版本了。

claude code是他们家推出的 cli agent工具，个人心中排第一没什么问题（贵应该是我的问题）

以下使用cc 称呼 claude code
## 其他

cli类的工具层出不穷，google的 gemini cli。google随着 gemini 3发布出了个antigravity[Google Antigravity](https://antigravity.google/)

gemini3 发布接近一周了，从网上的反响和我的使用来讲。觉得preview还是不稳定，前端确实很惊艳，这一点从 nanobanana pro上看的出来，也许谷歌找到了他们要入场的赛道。

编码 gpt-5.1 还是略胜一筹，不过大部分情况还是claude更强

国产的 kimicli之类的，国产模型想打这个赛道也会兼容 cc，但是国产模型基本是上一代国外主流模型的能力


> 插件类型的 如augment windsurf都还不错。但是结合我所拥有的资源 cursor是获得最容易且价格还能接受的

### cc支持的IDE

- Visual Studio Code（包括 Cursor 和 Windsurf 等流行分支）
- JetBrains IDEs（包括 PyCharm、WebStorm、IntelliJ 和 GoLand）

> 以下是收集的一些教程，供参考
# 一、ClaudeCode


> 操作系统: macOS 10.15+ / Ubuntu 20.04+/Debian 10+ / Windows
> 
> 硬件: 最少 4GB RAM
> 
> 软件: Node.js 18+


## 1.1、安装

安装官方 Claude Code

```Bash
npm install -g @anthropic-ai/claude-code
claude --version
```

以下是 Windows、macOS 和 Linux 系统下设置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 环境变量的详细方法：

### **Windows 系统**

#### 方法1（永久设置）：配置settings.json

创建(如果不存在)或编辑 C:\Users{用户名}.claude\settings.json，输入以下值并保存

```Bash
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "替换为您的API Key",
    "ANTHROPIC_BASE_URL": "https://code.newcli.com/claude",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
  },
  "permissions": {
    "allow": [],
    "deny": []
  }
}
```

#### 方法2：临时设置（仅当前终端有效）

- 在 **PowerShell** 或 **CMD** 中执行：
```PowerShell
    # PowerShell
    $env:ANTHROPIC_BASE_URL="https://code.newcli.com/claude"
    $env:ANTHROPIC_API_KEY="替换为您的API Key"
    
    # CMD
    set ANTHROPIC_BASE_URL=https://code.newcli.com/claude
    set ANTHROPIC_API_KEY=替换为您的API Key
```


#### 方法3：永久设置（全局生效）

1. **图形界面**：
    1. 右键「此电脑」→「属性」→「高级系统设置」→「环境变量」
    2. 在「用户变量」或「系统变量」中新建：
        - 变量名：`ANTHROPIC_BASE_URL`
        - 变量值：`https://code.newcli.com/claude`
    3. 同样方法添加 `ANTHROPIC_API_KEY`

2. **PowerShell 永久设置**：

```PowerShell
    [System.Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', 'https://code.newcli.com/claude', 'User')
    [System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', '替换为您的API Key', 'User')
```

	1. 重启终端后生效。


---

### **macOS 系统**

#### 方法1（推荐）：配置settings.json

- 创建或编辑 ~/.claude/settings.json，并填入以下内容

```Bash
    {
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "替换为您的API Key",
        "ANTHROPIC_BASE_URL": "https://code.newcli.com/claude",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
      },
      "permissions": {
        "allow": [],
        "deny": []
      }
    }
```


#### 方法2：临时设置（仅当前终端有效）

- 在 **终端** 中执行：

```Bash
	export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"
	export ANTHROPIC_API_KEY="替换为您的API Key"
```


#### 方法3：永久设置

1. 编辑 shell 配置文件（根据使用的 shell 选择）：

 ```Bash
    # 如果是 bash（默认）
    echo 'export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"' >> ~/.bash_profile
    echo 'export ANTHROPIC_API_KEY="替换为您的API Key"' >> ~/.bash_profile
    
    # 如果是 zsh
    echo 'export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"' >> ~/.zshrc
    echo 'export ANTHROPIC_API_KEY="替换为您的API Key"' >> ~/.zshrc
    ```

1. 立即生效：

```Bash
    source ~/.bash_profile  # 或 source ~/.zshrc
    ```

  

---

### **Linux 系统**

#### 方法1：临时设置（仅当前终端有效）

- 在 **终端** 中执行：
```Bash
    export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"
    export ANTHROPIC_API_KEY="替换为您的API Key"
```

#### 方法2：永久设置

1. 编辑 shell 配置文件（根据使用的 shell 选择）：
```Bash
    # 如果是 bash
    echo 'export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"' >> ~/.bashrc
    echo 'export ANTHROPIC_API_KEY="替换为您的API Key"' >> ~/.bashrc
    
    # 如果是 zsh
    echo 'export ANTHROPIC_BASE_URL="https://code.newcli.com/claude"' >> ~/.zshrc
    echo 'export ANTHROPIC_API_KEY="替换为您的API Key"' >> ~/.zshrc
```
2. 立即生效：
```Bash
    source ~/.bashrc  # 或 source ~/.zshrc
```

#### 方法3：配置settings.json

- 创建 `~/.claude/settings.json` 文件，内容如下：

```Bash
    {
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "替换为您的API Key",
        "ANTHROPIC_BASE_URL": "https://code.newcli.com/claude",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
      },
      "permissions": {
        "allow": [],
        "deny": []
      }
    }
```

既然用这个。那可以关注一下之前的博客，ccs 这个sh工具也还能用[claude code配置 \| 安落滢 Blog](https://blog.anluoying.com/posts/claude-code%E9%85%8D%E7%BD%AE/)

---

### **通用验证方法**

在所有系统中，可以通过以下命令验证是否设置成功：

```Bash
# macOS/Linux
echo $ANTHROPIC_BASE_URL
echo $ANTHROPIC_API_KEY

# Windows PowerShell
echo $env:ANTHROPIC_BASE_URL
echo $env:ANTHROPIC_API_KEY

# Windows CMD
echo %ANTHROPIC_BASE_URL%
echo %ANTHROPIC_API_KEY%
```


### 关于Windows

尽管cc已经支持 windows。但是个人认为 模型的Linux知识更加雄厚，所以推荐在WSL下使用能有更好的体验

## 第三方客户端

### 在VSCode中使用

安装官方claudecode插件

vscode中claudecode新版本插件强制登录解决方案： 新建 ~/.claude/config.json 内容： `{` `"primaryApiKey": "fox"` `}`

# 二、CodeX安装教程

### **1、安装Codex**

使用 `npm` 进行安装

```Plain
npm install -g @openai/codex
```

mac 直接使用brew进行安装。使用时登录chatgpt账号即可。当前team账号性价比很高，量大管饱，大项目debug很合适
  

# 四、ClaudeCode官方中文文档

[claude-code/quickstart](https://docs.anthropic.com/zh-CN/docs/claude-code/quickstart)

---

# 五、Claude Code功能

## 1. 直接进行交互：

- Claude Code 提供两种主要的交互方式：
    - 交互模式：运行 `claude` 启动 REPL 会话
    - 单次模式：使用 `claude -p "查询"` 进行快速命令
    - 您可以参考：
```Bash
    # 启动交互模式
    claude
    
    # 以初始查询启动
    claude "解释这个项目"
    
    # 运行单个命令并退出
    claude -p "这个函数做什么？"
    
    # 处理管道内容
    cat logs.txt | claude -p "分析这些错误"
```
- 对于 Claude Code Client的常用参数和功能，可以访问官方文档：[CLI 使用和控制 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/cli-usage#cli-%E5%91%BD%E4%BB%A4)

## 2. 支持连接到主流IDE

- 您可以直接在IDE中看到Claude Code的改动，在IDE中与其交互。
- 现在支持 VSCode 与 JetBrains
- 如果您使用Linux / MacOS，您可以直接使用该插件
    - 如果您使用VSCode，在VSCode的内置终端唤起Claude Code，插件将被**自动安装**
    - 如果您使用JetBrains，您需要通过此链接下载：[Claude Code [Beta] - IntelliJ IDEs Plugin | Marketplace](https://docs.anthropic.com/s/claude-code-jetbrains)
- 您可能需要手动指定IDE，通过在Claude Code进行以下交互选择

```Bash
> /ide
```

- 对于更多的用法，您可以参考Claude Code的官方文档：[IDE integrations - Anthropic](https://docs.anthropic.com/en/docs/claude-code/ide-integrations)

## 3. 支持连接到Cursor：

### 方法一：直接安装插件

### 方法二、基于wsl

使用本质：在cursor/vscode中本地连接Ubuntu终端使用Claude Code，可以可视化代码的操作！步骤如下：

| **序号** | **操作**                                                    | **图例**                                                                                                                                                                                                                                                                                                |
| ------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 打开cursor                                                  | ![image.png](https://imgbed.anluoying.com/2025/11/e9ab936a89fce3f4d5cdef4828f2bdba.png)<br>                                                                                                                                                                                                           |
| 2      | 点击左下角终端图标                                                 | ![image (1).png](https://imgbed.anluoying.com/2025/11/47f3b494336cfd972a32b84d2bc0064b.png)<br>                                                                                                                                                                                                       |
| 3      | 在弹出来的选项框里点击第三个；在弹出来的新选项框里点击Ubuntu选项，cursor就会自动连接Ubuntu系统。 | ![image (2).png](https://imgbed.anluoying.com/2025/11/f98a236881ad65ddaaec56cf0e20d45c.png)<br><br>![image (3).png](https://imgbed.anluoying.com/2025/11/27a59f035b3e3fdc5f0301314502a272.png)<br><br>![image (4).png](https://imgbed.anluoying.com/2025/11/30b674a5b5c0340b68a19deb7e7cb5ae.png)<br> |
|        | 连接完成后显示                                                   | ![image (5).png](https://imgbed.anluoying.com/2025/11/8baacc08503dfe4030577534def193b0.png)<br>                                                                                                                                                                                                       |

没有Connect to WSL using Distro选项

若打开只有2个选项，没有五个选项，原因是没有安装扩展，安装扩展之后重启即可。

![image (6).png](https://imgbed.anluoying.com/2025/11/6f42239b0ccbbca3206fbc3ffbf31c10.png)


按下图依次点击，进入扩展界面。

![image (7).png](https://imgbed.anluoying.com/2025/11/78f31099c28e303c9fa2be7a598d713f.png)

扩展详情页

![image (8).png](https://imgbed.anluoying.com/2025/11/522e56ea8a05ab57ebdb948cbd26e9b1.png)


在搜索框里搜索WSL，找到图示这个扩展，不要选错，点击安装。安装过程需要翻墙，不然可能会因为网络安装失败。

![image (9).png](https://imgbed.anluoying.com/2025/11/a593667bb2e398635b9caa5d599075dd.png)


![image (10).png](https://imgbed.anluoying.com/2025/11/ea1ba1ab2a7c75766ec9c9def6fbfea8.png)


此时再点击就有5个选项，选择第三个就行！

![](https://imgbed.anluoying.com/2025/11/ea1ba1ab2a7c75766ec9c9def6fbfea8.png)

## 4. 切换模型 Claude 4 Opus 与 Claude 4 Sonnet：

`/model` 命令进行模型切换

## 5. 压缩上下文以节省额度：

- Claude Code 通常会有长上下文，我们建议您使用以下斜杠命令来压缩以节省点数，较长的上下文往往需要更多点数。

```Bash
/compact [instructions] #您可以添加说明
```

使用 `/context` 查看当前上下文情况
![image.png](https://imgbed.anluoying.com/2025/11/148d79d559b16cfdb07c0d3e4a15aac1.png)

## 6. 恢复以前的对话：

- 使用以下命令可以恢复您上次的对话
```Bash
    claude --continue
    
    or
    
    claude -c
```
- 这会立即恢复您最近的对话，无需任何提示。

- 您如果需要显示时间，可以输入此命令

```Bash
    claude --resume
    
    or
    
    claude -r
```
- 这会显示一个交互式对话选择器，显示：
	- 对话开始时间
	- 初始提示或对话摘要
	- 消息数量
- 使用箭头键导航并按Enter选择对话，您可以使用这个方法选择上下文。


## 7. 处理图像信息：

- 您可以使用以下任何方法：
    - 将图像拖放到Claude Code窗口中（在MacOS上）
    - 复制图像并使用`Ctrl+v`粘贴到CLI中（在MacOS上）
    - 提供图像路径

```Bash
    > 分析这个图像：/path/to/your/image.png
```

- 您可以完全使用自然语言要求他进行工作，如：

```Bash
    > 这是错误的截图。是什么导致了它？ 
    > 这个图像显示了什么？ 
    > 描述这个截图中的UI元素 
    > 生成CSS以匹配这个设计模型 
    > 什么HTML结构可以重新创建这个组件？ 
```

## 8. 深入思考：

- 您需要通过自然语言要求其进行深入思考，或者使用tab键打开think模式
![image.png](https://imgbed.anluoying.com/2025/11/b7a599272aa31f68a26cee2dbef2f818.png)

```Bash
    > 我需要使用OAuth2为我们的API实现一个新的身份验证系统。深入思考在我们的代码库中实现这一点的最佳方法。
    > 思考这种方法中潜在的安全漏洞 
    > 更深入地思考我们应该处理的边缘情况
```
- 推荐在使用复杂问题的时候使用这一功能，这也会消耗大量的额度点数。

## 9. 通过 Claude.md 存储重要记忆：！！ 这很重要

- 可以使用以下命令设置一个CLAUDE.md文件来存储重要的项目信息、约定和常用命令。
```Bash
    > /init
```
- 包括常用命令（构建、测试、lint）以避免重复搜索
- 记录代码风格偏好和命名约定
- 添加特定于您项目的重要架构模式
- CLAUDE.md记忆可用于与团队共享的指令和您的个人偏好。
- 更多关于记忆的设置，您可以访问此官方文档了解：[Claude Code 概述 - Anthropic](https://docs.anthropic.com/zh-CN/docs/agents-and-tools/claude-code/overview#%E7%AE%A1%E7%90%86-claude-%E7%9A%84%E8%AE%B0%E5%BF%86)  
- 在官方文档中，此部分记录了记忆的常用用法：[管理Claude的内存 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/memory)    
## 10. 自动化 CI 和基础设施工作流程

- Claude Code 提供非交互模式，用于无头执行。这在非交互上下文（如脚本、管道和 Github Actions）中运行 Claude Code 时特别有用。
- 使用 `--print` (`-p`) 在非交互模式下运行 Claude，如：

 ```Bash
    claude -p "使用最新更改更新 README" --allowedTools "Bash(git diff:*)" "Bash(git log:*)" Write --disallowedTools ..
```

 ## 11. 上下文通用协议（MCP）：
 
- 模型上下文协议(MCP)是一个开放协议，使LLM能够访问外部工具和数据源。
- 这是高级功能，您可以访问此文档获取更多配置信息：[Introduction - Model Context Protocol](https://modelcontextprotocol.io/introduction)
- Claude Code不仅支持接入MCP，同样支持作为MCP服务器等各类高级功能，您可以访问此文档获得更多信息：[教程 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/tutorials#%E8%AE%BE%E7%BD%AE%E6%A8%A1%E5%9E%8B%E4%B8%8A%E4%B8%8B%E6%96%87%E5%8D%8F%E8%AE%AE-mcp)

通常可以配置 如context7，search ，或者一些数据库连接mcp来给他使用足够。过多的MCP会影响模型性能

## 12. 使用Git工作树运行并行Claude Code会话：

> 开发者熟悉git的时候再用！！！不熟的话也是个学习的好机会，可以问他怎么用git，但是不要完全信任他，注意每一条命令的原理，执行前务必检查，数据无价

- Claude Code 支持使用自然语言操作Git，如：

```Bash
> 提交我的更改
> 创建一个 pr
> 哪个提交在去年十二月添加了 markdown 测试？
> 在 main 分支上变基并解决任何合并冲突
```

- 您可以使用工作树创建隔离的编码环境。

- 如果您您需要同时处理多个任务，并在Claude Code实例之间完全隔离代码，您可以使用此功能：
    - Git工作树允许您从同一存储库中检出多个分支到单独的目录。每个工作树都有自己的工作目录，文件是隔离的，同时共享相同的Git历史。在[官方Git工作树文档](https://git-scm.com/docs/git-worktree)中了解更多。
    - 创建新工作树
```Bash
        # 创建带有新分支的工作树 
        git worktree add ../project-feature-a -b feature-a
        
        # 或使用现有分支创建工作树
        git worktree add ../project-bugfix bugfix-123
```

这会创建一个包含存储库单独工作副本的新目录

  - 在每个工作树中运行Claude Code
```Bash
	# 导航到您的工作树 
	cd ../project-feature-a
	
	# 在这个隔离环境中运行Claude Code
	claude
```

- 在另一个终端中：

```Bash
	cd ../project-bugfix
	claude
```

- 管理您的工作树

```Bash
	# 列出所有工作树
	git worktree list
	
	# 完成后移除工作树
	git worktree remove ../project-feature-a
```

- 每个工作树都有自己独立的文件状态，非常适合并行Claude Code会话
- 在一个工作树中所做的更改不会影响其他工作树，防止Claude实例相互干扰
- 所有工作树共享相同的Git历史和远程连接
- 对于长时间运行的任务，您可以让Claude在一个工作树中工作，同时您在另一个工作树中继续开发
- 使用描述性目录名称，以便轻松识别每个工作树的任务
- 记得根据项目的设置在每个新工作树中初始化开发环境。根据您的技术栈，这可能包括：
	- JavaScript项目：运行依赖安装（`npm install`、`yarn`）
	- Python项目：设置虚拟环境或使用包管理器安装
	- 其他语言：遵循项目的标准设置流程

## 13. 其他的自然语言功能：

- 识别未文档化的代码
```Bash
    > 在auth模块中查找没有适当JSDoc注释的函数
```

- 生成文档

```Bash
    > 为auth.js中未文档化的函数添加JSDoc注释
```

- 理解陌生代码

```Bash
    > 支付处理系统做什么？
    > 查找用户权限在哪里被检查
    > 解释缓存层是如何工作的
```

- 智能编辑代码

```Bash
    > 为注册表单添加输入验证
    > 重构日志记录器以使用新的 API
    > 修复工作队列中的竞态条件
```

- 测试或编辑您的代码

```Bash
> 运行 auth 模块的测试并修复失败
> 查找并修复安全漏洞
> 解释为什么这个测试失败了
```

## 14. 常见的斜杠命令：

| 命令                      | 用途                                       |
| ----------------------- | ---------------------------------------- |
| /bug                    | 报告错误（将对话发送给 Anthropic）                   |
| /clear                  | 清除对话历史                                   |
| /compact [instructions] | 压缩对话，可选择焦点说明                             |
| /config                 | 查看/修改配置                                  |
| /cost                   | 显示令牌使用统计                                 |
| /doctor                 | 检查 Claude Code 安装的健康状况                   |
| /help                   | 获取使用帮助                                   |
| /init                   | 使用 CLAUDE.md 指南初始化项目                     |
| /login                  | 切换 Anthropic 账户                          |
| /logout                 | 从 Anthropic 账户登出                         |
| /memory                 | 编辑 CLAUDE.md 记忆文件                        |
| /pr_comments            | 查看拉取请求评论                                 |
| /review                 | 请求代码审查                                   |
| /status                 | 查看账户和系统状态                                |
| /terminal-setup         | 安装 Shift+Enter 换行键绑定（仅限 iTerm2 和 VSCode） |
| /vim                    | 进入 vim 模式以切换插入和命令模式                      |


## 15. 常用的快捷键：

- 使用 `#` 快速记忆
    
    - 通过以 `#` 开始输入来即时添加记忆
        
- 始终使用描述性变量名
    
    - 系统会提示你选择要将其存储在哪个记忆文件中。
        
- 终端中的换行
    
    - 使用以下方式输入多行命令：
        
    - 快速转义：输入 `\` 后按 Enter
        
    - 键盘快捷键：Option+Enter（或配置后的 Shift+Enter）
        
        - 在终端中设置 Option+Enter：
            
            - 对于 Mac Terminal.app
                
                - 打开设置 → 配置文件 → 键盘
                    
                - 勾选”将 Option 键用作 Meta 键”
                    
            - 对于 iTerm2 和 VSCode 终端：
                
                - 打开设置 → 配置文件 → 按键
                    
                - 在常规设置下，将左/右 Option 键设置为”Esc+”
                    
            - iTerm2 和 VSCode 用户提示：在 Claude Code 中运行 `/terminal-setup` 以自动配置 Shift+Enter 作为更直观的替代方案。
                
            - 有关配置详情，请参见官方文档：[设置中的终端设置](https://docs.anthropic.com/zh-CN/docs/claude-code/settings#line-breaks)。
                
- Vim 模式
    
    - Claude Code 支持一部分 Vim 键绑定，可以通过 `/vim` 启用或通过 `/config` 配置。
        
    - 支持的功能包括：
        
        - 模式切换：`Esc`（到 NORMAL），`i`/`I`，`a`/`A`，`o`/`O`（到 INSERT）
            
        - 导航：`h`/`j`/`k`/`l`，`w`/`e`/`b`，`0`/`$`/`^`，`gg`/`G`
            
        - 编辑：`x`，`dw`/`de`/`db`/`dd`/`D`，`cw`/`ce`/`cb`/`cc`/`C`，`.`（重复）
            

 ## 16. 常见的报错：

- 400 - `invalid_request_error`：您的请求格式或内容存在问题。我们也可能对下面未列出的其他 4XX 状态码使用此错误类型。
- 401 - `authentication_error`：您的 API 密钥存在问题。
- 403 - `permission_error`：您的 API 密钥没有使用指定资源的权限。
- 404 - `not_found_error`：未找到请求的资源。
- 413 - `request_too_large`：请求超过了允许的最大字节数。 建议使用/compact命令
- 429 - `rate_limit_error`：您的账户达到了速率限制。
- 500 - `api_error`：Anthropic 系统内部发生了意外错误。
- 529 - `overloaded_error`：Anthropic 的 API 暂时过载。

- 当 Anthropic API 在所有用户中遇到高流量时，可能会出现 529 错误。在极少数情况下，如果您的组织使用量急剧增加，您可能会看到此类错误。 为避免 529 错误，请逐步增加流量并保持一致的使用模式。

当通过 SSE 接收[流式](https://docs.anthropic.com/zh-CN/api/streaming)响应时，可能在返回 200 响应后发生错误，在这种情况下错误处理不会遵循这些标准机制。

 ## 17. 其他的高级功能：


- Claude Code可以被用作Claude用作类Unix工具：[教程 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/tutorials#%E5%B0%86claude%E7%94%A8%E4%BD%9C%E7%B1%BBunix%E5%B7%A5%E5%85%B7)
- Claude Code支持自定义斜杠指令：[教程 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/tutorials#%E5%88%9B%E5%BB%BA%E8%87%AA%E5%AE%9A%E4%B9%89%E6%96%9C%E6%9D%A0%E5%91%BD%E4%BB%A4)
- Claude Code支持使用`$ARGUMENTS`添加命令参数：[教程 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/tutorials#%E4%BD%BF%E7%94%A8%24arguments%E6%B7%BB%E5%8A%A0%E5%91%BD%E4%BB%A4%E5%8F%82%E6%95%B0)
- Claude Code支持高级设置，您可以参考此文档：[Claude Code 设置 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/settings)
    - 命令行参数
    - 本地项目设置
    - 共享项目设置
    - 用户设置
- Claude Code的安全设置，请参考此官方文档：[管理权限和安全 - Anthropic](https://docs.anthropic.com/zh-CN/docs/claude-code/security)