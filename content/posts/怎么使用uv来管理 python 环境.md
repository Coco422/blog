---
title: 怎么使用uv来管理 python 环境
description: 用用 uv这个所谓的 超高速python工具链
date: 2026-01-07T22:58:50+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-01-24T02:42:50+08:00
showLastMod: true
tags:
  - linux
  - Python
categories:
  - 杂技浅尝
---
>  依稀记得大一寒假打开 小甲鱼 python教程的一周后就认识了 Anaconda 这个解放我安装python 依赖的工具，至今已经过去了六年了，conda 似乎也做了一些商业收费的举措之类的，让很多大公司用上了新的环境管理工具，由于习惯我还一直用着conda，以至于我对 python 自己的 `pyenv` 都不是很了解（Damn！！！太丢人了）
>  
>  那么这次就来用用 uv这个所谓的 超高速python工具链
>  
>  [uv](https://docs.astral.sh/uv/)

## 安装 uv

### macOS / Linux / WSL

`curl -LsSf https://astral.sh/uv/install.sh | sh`

### Windows（PowerShell）

`irm https://astral.sh/uv/install.ps1 | iex`

验证：

`uv --version`

## 常见用法

### 1. 创建项目并指定python版本

在空目录或者指定目录创建项目

```bash
# 创建新目录并初始化项目 
uv init my-app
```

或者你当前在一个空目录下：

`uv init`

**结果：**  
uv 会生成一套基础文件，例如：

```
my-app/
├── pyproject.toml         # 项目配置（依赖/元数据）
├── .python-version        # 记录 Python 版本
├── README.md
├── main.py (示例入口)

```

如果指定了应用名 `my-app`，uv 也会生成对应样板代码和README.md。

### 如果在已有的项目里面创建环境

没有 pyproject.toml 直接 `uv init .`即可

有的话就 `uv sync` 除非这个里面放的是旧的 pip体系

那么pyproject.toml 中没有依赖的管理也木有项目声明 例如

```toml
[tool.black]
line-length = 120
target-version = ['py310', 'py311', 'py312']
include = '\.pyi?$'
exclude = '''
/(
    \.git
    | \.hg
    | \.mypy_cache
    | \.tox
    | \.venv
    | venv
    | _build
    | buck-out
    | build
    | dist
    | __pycache__
)/
'''

[tool.isort]
profile = "black"
line_length = 120
skip = [".git", "__pycache__", ".env", "venv", ".venv"]

[tool.bandit]
exclude_dirs = ["tests", "test_*.py"]
skips = ["B101"]  # assert 语句在测试中是允许的
```

那么其实可以加上 项目的声明，消除警告

```
[project]
name = "daily_stock_analysis"
version = "0.1.0"
requires-python = ">=3.10,<3.13"
```

通过下面的命令迁移，只有requirements 时同理

```
uv add -r requirements.txt
```

### 2. 激活虚拟环境（可选）

```bash
source .venv/bin/activate   # macOS / Linux / WSL
```
也可以不激活
```bash
uv run python main.py
uv run uvicorn app.main:app --reload
```

### 3. 安装依赖（替代 pip install）

`uv add fastapi uvicorn`

效果：
- 修改 `pyproject.toml`
- 自动生成 / 更新 `uv.lock`
- 安装进 `.venv`

### 4. 删除依赖

```bash
uv remove fastapi
```

### 5. 同步依赖

```bash
uv sync
```

## uv 如何管理 Python 版本

### 查看可用 Python

`uv python list`

### 安装 Python

`uv python install 3.12`

### 项目绑定 Python 版本

`uv init --python 3.12`

或已有项目：

`uv python pin 3.11`

Python 会被缓存到：

`~/.cache/uv/python/`

### 如果你是 pip + venv 老项目

```bash
rm -rf venv
uv init
uv add -r requirements.txt
```
