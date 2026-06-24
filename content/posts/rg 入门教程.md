---
title: rg 入门教程
description: 把 ripgrep / rg 的安装、基础搜索、过滤、搜不到时的排查顺序整理成一篇初学者小抄
date: 2026-06-24T15:05:58+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-06-24T15:28:24+08:00
showLastMod: true
tags:
  - rg
  - ripgrep
  - grep
  - shell
categories:
  - 他山拾影
  - 杂技浅尝
---

今天在看 codex 的 system prompt 看到对 codex 的要求是 优先用 rg，我只知道这个工具比 grep 快，似乎是个现代化的 grep，那得学，我是现代人。

> 参考了几篇文章：Levon 的 [文本搜索神器rg的使用教程](https://www.liuvv.com/p/868944ef.html)、Autumn Skerritt 的 [Ripgrep cheatsheet](https://skerritt.blog/ripgrep-cheatsheet/)、Marius Schulz 的 [Fast Searching with ripgrep](https://mariusschulz.com/blog/fast-searching-with-ripgrep)，以及官方的 [ripgrep README](https://github.com/BurntSushi/ripgrep) 和 [User Guide](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)。
>
> 这篇不是全文搬运。我只是把我最可能用到的东西重新按自己的脑回路记一遍。

## rg 是干嘛的

一句话：

`rg` 是用来在文件里搜文字的命令。

它的全名叫 `ripgrep`，但是命令名是 `rg`。

最基础的样子长这样：

```bash
rg "要搜索的内容"
```

这行命令的意思是：

在当前目录下面，递归搜索所有文件，只要某一行包含 `"要搜索的内容"`，就把那一行打印出来。

这里有几个初学者必须先钉死在脑子里的点：

- `rg` 默认就是递归搜索，不用像 `grep -R` 那样自己加 `-R`
- 不写目录时，默认搜当前目录，也就是 `./`
- 它默认会读 `.gitignore`
- 它默认不搜隐藏文件，比如 `.env`
- 它默认不搜二进制文件，比如图片、数据库文件
- 它默认把搜索内容当正则表达式，不是纯字符串

## 安装和确认

Mac 上一般就是：

```bash
brew install ripgrep
```

Ubuntu / Debian：

```bash
sudo apt-get install ripgrep
```

Windows 如果用 Scoop：

```powershell
scoop install ripgrep
```

装完之后确认一下：

```bash
rg --version
```

我这台机器现在是：

```text
ripgrep 15.1.0

features:+pcre2
simd(compile):+NEON
simd(runtime):+NEON

PCRE2 10.45 is available (JIT is available)
```

这里的 `PCRE2 is available` 先记一下就行。简单理解就是：需要更复杂的正则时，可以用 `-P` 开一个更强的正则引擎。

但初学者先别管。

先跑通再说。

## 最基础的搜索

比如我想在当前博客仓库里找 `waline`：

```bash
rg "waline"
```

如果只想搜 `content` 目录：

```bash
rg "waline" content
```

如果只想搜某个文件：

```bash
rg "waline" content/posts/hugo-配置waline.md
```

`rg` 输出一般是这种感觉：

```text
文件路径
行号:匹配到的那一行
```

如果输出太多，就先缩小目录。

不要上来就在整个硬盘搜。那是拿电饭煲煮太平洋。

## 最常用的一组

不是背文档那种背，是“下次忘了回来复制”。

| 命令 | 我自己的记法 |
|---|---|
| `rg "foo"` | 在当前目录搜 `foo` |
| `rg "foo" content` | 只搜 `content` 目录 |
| `rg -i "foo"` | 忽略大小写，`Foo`、`FOO` 都算 |
| `rg -S "foo"` | smart case，有大写就区分大小写，没大写就不区分 |
| `rg -w "foo"` | 只匹配完整单词，不把 `foobar` 算进去 |
| `rg -F "foo.*"` | 按普通字符串搜，不把 `.*` 当正则 |
| `rg -n "foo"` | 显示行号，虽然很多时候默认就有 |
| `rg -l "foo"` | 只显示包含 `foo` 的文件名 |
| `rg -c "foo"` | 统计每个文件里匹配了多少行 |
| `rg -C 2 "foo"` | 显示命中行前后各 2 行 |
| `rg -A 3 "foo"` | 显示命中行后面 3 行 |
| `rg -B 3 "foo"` | 显示命中行前面 3 行 |
| `rg --files` | 列出 `rg` 准备搜索的文件 |
| `rg --debug "foo"` | 看看为什么某些文件没被搜 |

我感觉常用到这里已经够干很多活了。

不要一开始就追求把 man page 背下来。

会被自己吓死。

## 正则和普通字符串

`rg` 默认把搜索词当正则。

所以这两个是不一样的：

```bash
rg "hello.*"
rg -F "hello.*"
```

第一个会把 `.*` 当正则，意思是 `hello` 后面跟任意内容。

第二个 `-F` 是 fixed strings，意思是我就要搜字面量 `hello.*` 这几个字符。

这个非常重要。

比如你搜这种东西：

```bash
rg "?."
```

很可能直接报正则错误，因为 `?` 在正则里不是普通问号。

这个时候别跟它硬刚，直接：

```bash
rg -F "?."
```

可以。

对初学者来说，我建议一个简单判断：

如果要搜的内容里有这些奇怪符号：

```text
. * ? + ( ) [ ] { } | ^ $
```

而你只是想搜原文，那就加 `-F`。

省心。

## 只搜某类文件

比如只搜 Markdown：

```bash
rg "draft: true" -tmd
```

或者写完整一点：

```bash
rg "draft: true" --type markdown
```

只搜 Go：

```bash
rg "func main" -tgo
```

只搜 Python：

```bash
rg "import os" -tpy
```

排除某类文件用大写 `-T`：

```bash
rg "TODO" -Tmd
```

这个意思是搜 `TODO`，但是不要 Markdown 文件。

查 `rg` 支持哪些文件类型：

```bash
rg --type-list
```

如果列表太长，可以自己搜一下：

```bash
rg --type-list | rg "markdown"
```

我这边看到 Markdown 是支持 `markdown` 和 `md` 的：

```text
markdown: *.markdown, *.md, *.mdown, *.mdwn, *.mdx, *.mkd, *.mkdn
md: *.markdown, *.md, *.mdown, *.mdwn, *.mdx, *.mkd, *.mkdn
```

所以 `-t md` 是可以用的。

## 用 glob 控制范围

有时候文件类型不够用，就用 `-g`。

只搜 `.md`：

```bash
rg "hugo" -g "*.md"
```

不搜 `.md`：

```bash
rg "hugo" -g "!*.md"
```

排除某个目录，比如不看 `public`：

```bash
rg "hugo" -g "!public/"
```

排除多个目录：

```bash
rg "hugo" -g "!public/" -g "!themes/"
```

这里有个很容易傻掉的点：

`!` 在这里表示排除。

而且建议用引号包起来：

```bash
rg "hugo" -g "!public/"
```

别让 shell 先把 `*`、`!` 之类的东西展开了。

我已经能想象未来的我在这里卡十分钟，然后怪工具不行。

## 只看文件名

`rg --files` 这个很有用。

它不是搜内容，是列出 `rg` 会搜索的文件。

```bash
rg --files
```

找所有 Markdown 文件：

```bash
rg --files -g "*.md"
```

找路径里带 `nginx` 的文件：

```bash
rg --files | rg "nginx"
```

这玩意有点像简化版 `find`。

尤其我只是想找文件名的时候，不想写很长的 `find . -name`。

可以。

## 搜不到时先别慌

这是我觉得最应该记住的一节。

`rg` 搜不到，不一定是没有。

它可能没搜。

默认情况下，`rg` 会跳过这些东西：

- `.gitignore`、`.ignore`、`.rgignore` 规则忽略的文件
- 隐藏文件和隐藏目录
- 二进制文件
- 符号链接指向的内容

所以排查顺序是这样。

先看 `rg` 到底准备搜哪些文件：

```bash
rg --files
```

如果你怀疑文件被 ignore 了：

```bash
rg --no-ignore "要搜的内容"
```

或者短一点：

```bash
rg -u "要搜的内容"
```

如果你怀疑是隐藏文件，比如 `.env`：

```bash
rg --hidden "要搜的内容"
```

或者：

```bash
rg -uu "要搜的内容"
```

如果你就是要把所有限制都掀了：

```bash
rg -uuu "要搜的内容"
```

这个要稍微小心点，因为它连二进制文件也可能搜。

有时候会输出奇怪东西。

别问我怎么知道的，理论上就很危险。

如果还不懂为什么搜不到：

```bash
rg --debug "要搜的内容"
```

`--debug` 会告诉你一些文件为什么被跳过。

这比原地怀疑人生强。

## 看上下文

只看到一行有时候不够。

比如搜 `TODO`，我想看前后几行到底在干嘛：

```bash
rg "TODO" -C 2
```

只看后面三行：

```bash
rg "TODO" -A 3
```

只看前面三行：

```bash
rg "TODO" -B 3
```

我自己的记法：

- `C` 是 context，前后都看
- `A` 是 after，后面
- `B` 是 before，前面

这三个比我想象中实用。

尤其是在不想打开编辑器的时候。

## 只看匹配的文件

有时候我不是想看匹配内容，只想知道哪些文件里有。

```bash
rg -l "TODO"
```

比如我想知道哪些文章里提到了 `Cloudflare`：

```bash
rg -l "Cloudflare" content/posts
```

如果想排序：

```bash
rg -l "Cloudflare" content/posts --sort path
```

官方和 Marius 都提醒过，`--sort path` 会让它没法并行，所以理论上会慢一点。

但是小项目里没啥感觉。

我这种博客仓库里用，完全够。

## 统计一下

每个文件里匹配了多少行：

```bash
rg -c "TODO"
```

看整体统计：

```bash
rg "TODO" --stats
```

这个适合搜之前评估一下工程量。

比如搜出来 3 个，我可以手改。

搜出来 3000 个，你也不想炸掉终端上下翻吧。

## 替换，但不是改文件

`rg` 有 `-r` / `--replace`：

```bash
rg "fast" -r "FAST"
```

但是注意：

它只改输出。

它不会真的改文件。

这个点很关键，官方文档也专门写了。不要以为跑完文件就变了。

如果真要批量替换，通常是：

```bash
rg -l "旧内容"
```

先找文件，然后再交给编辑器、脚本、`perl`、`sd`、`sed` 之类的工具处理。

这里我先不展开。

批量替换很容易把仓库炸一地，日后单独记。

## 搜压缩包和编码

这个不常用，但先留个坑。

搜压缩文件：

```bash
rg -z "关键字"
```

`-z` 可以搜一些常见压缩格式，比如 gzip、xz、zstd。

搜非 UTF-8 编码，比如 GBK：

```bash
rg -E gbk "关键字"
```

这两个属于“知道有这个东西就行”。

真遇到再看官方文档。

## 稍微复杂一点的正则

`rg` 默认用 Rust 的 regex 引擎。

它快，但是有些高级正则不支持，比如 look-around、backreference。

如果你的 `rg --version` 里有 PCRE2，就可以这样：

```bash
rg -P "foo(?=bar)"
```

`-P` 就是启用 PCRE2。

但是我建议初学者先别沉迷这个。

大部分日常搜索，用普通字符串、`-F`、`-i`、`-w`、`-g`、`-t` 已经能解决 90% 的问题。

先别把自己搞晕。

## 最后给自己贴一张小抄

```bash
# 当前目录递归搜索
rg "keyword"

# 指定目录
rg "keyword" content/posts

# 忽略大小写
rg -i "keyword"

# smart case
rg -S "keyword"

# 完整单词
rg -w "keyword"

# 普通字符串，不走正则
rg -F "hello.*"

# 只搜 Markdown
rg "keyword" -tmd

# 排除 Markdown
rg "keyword" -Tmd

# glob 过滤
rg "keyword" -g "*.md"
rg "keyword" -g "!public/"

# 只列文件名
rg -l "keyword"

# 看上下文
rg "keyword" -C 2
rg "keyword" -A 3
rg "keyword" -B 3

# 统计
rg -c "keyword"
rg "keyword" --stats

# 看 rg 会搜哪些文件
rg --files

# 查支持的文件类型
rg --type-list

# 搜不到时掀过滤规则
rg -u "keyword"
rg -uu "keyword"
rg -uuu "keyword"

# 调试为什么没搜到
rg --debug "keyword"
```

先这样吧。终端用的也不算多。

目前看来，我对 `rg` 的需求就是：快速搜代码、快速找文件、搜不到时知道怎么排查。

再高级的配置、编辑器集成、rga 搜 PDF 这些，后面真用到再写。

收工。
