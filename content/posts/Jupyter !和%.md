---
title: jupyter !和%
description: 
date: 2025-08-19T11:49:44+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - Jupyter
categories:
  - ""
  - 琐碎快记
---

学习别人给到的 Jupyter 代码时，其中有安装依赖的代码 使用
```Jupyter
!pip install numpy
```
这里我看到 vscode 插件提示我
![image.png](https://imgbed.anluoying.com/2025/08/f7c91c81c5093e0171ad3a8cf3e8c15f.png)
但是据我测试，%pip 和 !pip 都是能正常执行的，我不是很明白 py note所以搜索了一下，盲猜和 python 环境是有关的

相关链接
> [Medium,Installing Python Packages in Jupyter Notebooks](https://medium.com/%40aroffe9/installing-python-packages-in-jupyter-notebooks-ca7dc7dd7535)
> [Trouble with pip installation - JupyterLab / extensions - Jupyter Community Forum](https://discourse.jupyter.org/t/trouble-with-pip-installation/28560)
> [Installing Python Packages from a Jupyter Notebook \| Pythonic Perambulations](https://jakevdp.github.io/blog/2017/12/05/installing-python-packages-from-jupyter)

## 结论

**!pip install**
**：调用外部 Shell**
在 Jupyter 中以 ! 开头的命令会被当作 **Shell 命令** 执行，比如直接调用系统或虚拟环境中的 pip：
```
!pip install numpy
```
- 它在新的子进程中执行，依赖于系统的 PATH 环境变量，可能会使用错误的 Python 解释器或 pip。
    
- 如果你的 Jupyter kernel 使用的是一个虚拟环境或不同的 Python 环境，!pip 可能安装在与当前 kernel 不一致的地方，导致导入失败或找不到已安装的包。
    
**%pip install**
 **：Jupyter/IPython 的 Magic 命令**
以 % 开头的是 IPython 的 **Magic 命令**，比如 %pip 是专门为 Jupyter 环境设计的魔法命令：
```
%pip install numpy
```
- 它明确针对当前 Notebook 所使用的 Python kernel 环境运行，确保包安装在正确的环境中。
    
- Jupyter 社区更推荐使用 %pip，它在 2019 年引入，目的是避免 !pip 带来的环境不一致和安装失败问题。

|**执行方式**|**执行环境**|**风险与优点**|**推荐用途**|
|---|---|---|---|
|!pip install|Shell 环境（系统环境）|易导致包安装在与 kernel 不一致的环境|一般不推荐，除非特殊用途|
|%pip install|当前 Notebook kernel|安装精准、环境一致，可靠性高|推荐在 Jupyter 中使用|
