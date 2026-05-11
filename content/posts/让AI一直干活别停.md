---
title: 让AI一直干活别停
description: 转载Datawhale的vibe coding教程，关于让Claude Code长时间持续工作不偷懒的几种方法
date: 2026-05-11T17:56:27+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-11T17:57:29+08:00
showLastMod: true
tags:
  - llm
  - claude-code
  - vibe-coding
  - agent
categories:
  - 他山拾影
---

> 原文来自 Datawhale 的 Easy-Vibe 教程：[如何让 Claude Code 长长时间工作](https://datawhalechina.github.io/easy-vibe/zh-cn/stage-3/core-skills/long-running-tasks/)

之前一直在用 Claude Code 写代码，但有一个很烦的问题——它干着干着就停了。你让它重构一个模块，它改了两个文件就跟你说"搞定了"，其实还有一堆没改。或者你让它跑测试，跑到一半报错了，它就卡在那里不动了，也不说重试一下。

总之，最近看到了 Datawhale 的 vibe coding 教程里有一节专门讲这个，讲得挺系统的，我这里也记录一下大概，顺便加点自己的理解。

## 核心问题：AI 不知道自己没干完

这个其实是所有 AI 编程工具的通病。人判断"干完了没"靠的是客观标准——测试跑通了没、功能能用不、代码质量行不行。但 AI 靠的是"感觉"——它觉得自己输出的差不多了，就停下来了。

所以解决方案的核心思路就是：**别让 AI 自己判断什么时候停，让外部系统来检查。**

具体来说就是三个问题：
1. 真的完成了吗？
2. 满足客观验收标准吗？
3. 有没有漏掉什么？

如果答案都是"没有"，就把任务重新丢给它，继续干。

## 方法一：While True 循环（最朴素）

五行代码搞定：

```bash
#!/bin/bash
while true; do
    cat PROMPT.md | claude
done
```

逻辑很简单——从 PROMPT.md 读任务，丢给 Claude，Claude 干完了退出，循环又把它拉起来继续干。Ctrl+C 手动停。

可以，简单粗暴。但问题也很明显——它不知道啥时候该停，你忘了关它就一直循环，API 账单蹭蹭涨。

加个安全版本的话，限制最大迭代次数就行：

```bash
#!/bin/bash
MAX_ITERATIONS=50
iteration=0

while true; do
    iteration=$((iteration + 1))
    echo "=== 迭代 $iteration/$MAX_ITERATIONS ==="
    cat PROMPT.md | claude
    if [ $iteration -ge $MAX_ITERATIONS ]; then
        echo "达到最大迭代次数，停止"
        break
    fi
    sleep 5
done
```

## 方法二：Ralph Wiggum 插件（推荐）

这个是正经方案。Ralph Wiggum 是 Anthropic 官方的插件，核心机制叫 **Stop Hook**——Claude 想退出的时候，Hook 会拦截，检查输出里有没有你设定的完成标记。没有就重新注入任务让它继续干，有了才放它走。

安装：

```bash
# 在 Claude Code 里
/plugin marketplace add anthropics/claude-code
/plugin install ralph-wiggum@claude-code-plugins
```

用法：

```bash
/ralph-wiggum:ralph-loop "构建一个待办事项 API，包含 CRUD 操作、输入验证、测试。
全部完成后输出 <promise>COMPLETE</promise>" \
  --max-iterations 50 \
  --completion-promise "COMPLETE"
```

两个关键参数：
- `--max-iterations`：安全阀，建议 20-100，到了就强制停
- `--completion-promise`：完成标记，Claude 输出里出现这个字符串就算完成

> 原文里有个很有意思的例子——Ralph 的命名来源是《辛普森一家》里的 Ralph Wiggum，一个傻乎乎的小孩角色。澳大利亚开发者 Geoffrey Huntley 2025 年夏天写的这个脚本，两周就拿了 7000+ 的 star。有人用它一晚上跑了 6 个完整项目，有人花了 297 美刀的 API 费用就干完了价值 5 万美金的合同活。

### Prompt 怎么写

这个挺关键的。Prompt 写得烂，Ralph 循环再多次也没用。

坏的 prompt：`"写一个 todo API"`——啥验收标准都没有，AI 自己都判断不了完没完。

好的 prompt 要包含：
1. **分阶段的明确要求**：第一阶段做 CRUD，第二阶段加验证，第三阶段写测试
2. **客观验收标准**：所有测试通过、linter 没报错、README 有 API 文档
3. **完成标记**：`<promise>TODO_API_COMPLETE</promise>`

原文给了好几个模板，挑几个我觉得实用的：

**测试迁移（Jest → Vitest）：**
```bash
/ralph-wiggum:ralph-loop "
将项目中所有测试从 Jest 迁移到 Vitest：
- 保持所有测试逻辑不变
- 更新配置文件
- 替换 Jest 特有 API（jest.mock → vi.mock）
- 确保所有测试通过
- 移除 Jest 相关依赖

验收标准：npm test 全部通过，package.json 中无 jest 依赖，项目能正常构建

完成后输出：<promise>VITEST_MIGRATION_COMPLETE</promise>
" --max-iterations 40 --completion-promise "VITEST_MIGRATION_COMPLETE"
```

**批量加 TypeScript 类型注解：**
```bash
/ralph-wiggum:ralph-loop "
给项目中所有函数添加 TypeScript 类型注解：
- 优先处理 src/ 目录
- 为函数参数和返回值添加类型
- 避免使用 any，用具体类型或 unknown

验收标准：npm run typecheck 通过，无 @ts-ignore，代码能正常运行

完成后输出：<promise>TYPES_ADDED</promise>
" --max-iterations 30 --completion-promise "TYPES_ADDED"
```

### 实战案例

原文里有几个案例挺震撼的：

**Y Combinator 黑客松**：一个团队晚上 11 点把 6 个产品的 MVP spec 丢给 Ralph，设了 200 次迭代上限，然后去睡觉了。第二天早上起来——6 个可以 demo 的项目，API 费用 297 美刀。

**Boris Cherny（Claude Code 负责人）**：用 Ralph + Opus 4.5 干了 30 天，259 个 PR，497 次 commit，加了 4 万行代码，删了 3.8 万行。100% 由 Claude Code 写的。

**CURSED 编程语言**：Geoffrey Huntley 用 Ralph Loop 花了 3 个月，从零构建了一个完整的编程语言，关键字是 Z 世代的网络用语（`slay`、`sus`、`based`），包含完整的 LLVM 编译器和标准库。

**遗留项目重构**：有人周末把一个烂摊子项目丢给 Ralph，周一来——47 次 commit，干净的代码结构，75% 测试覆盖率，完整的 API 文档。费用大约 12 美刀。

## 方法三：增强版 Ralph

社区有人做了个增强版：[frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)

多了几个东西：
- **双重退出条件**：不仅要有完成标记，还要有显式的 EXIT_SIGNAL
- **限速**：默认每小时 100 次，防止 API 账单爆炸
- **智能断路器**：连续 5 次输出完成标记但没有实质变化，强制退出
- **实时仪表盘**：CLI 显示迭代次数、进度、预估费用

适合生产环境用，基础版 Ralph 够用的话没必要上这个。

## 方法四：Ctrl+B 后台任务

这个其实不算"让 AI 一直干活"的方案，但也很实用。Claude Code 里按 `Ctrl+B` 可以把当前任务推到后台，然后你继续干别的。用 `/tasks` 看后台任务列表。

适合跑测试、build 这种你不想等的长时间操作。

## 什么时候该用，什么时候不该用

原文给了一个很实用的判断标准，问自己三个问题：

1. **能定义明确的完成标准吗？**（能 → 适合）
2. **有客观的验证方法吗？**（测试、build、typecheck → 适合）
3. **这个任务需要我持续介入吗？**（不需要 → 适合）

三个都是"不需要/有"，就放心交给 Ralph。

适合的场景：测试迁移、大规模重构、框架迁移、批量加类型、提升测试覆盖率、文档生成、UI 统一。

不适合的场景：架构决策、安全关键代码、需求模糊、探索性工作、创意设计。

## 安全机制

不管用哪种方法，一定要加安全阀：

- **迭代上限**：`--max-iterations` 必须设
- **API 预算预警**：设个 10/50/100 美刀的阈值
- **检查实质性变更**：如果最近 5 次 commit 没有实质变化，可能在空转

```bash
if [ $(git diff HEAD~5 | wc -l) -eq 0 ]; then
    echo "最近 5 次提交没有实质变化，可能陷入循环"
    exit 1
fi
```

---

这篇教程挺全的，从最朴素的 while true 循环到 Ralph 插件到增强版都讲了，还有个完整的 BBS 论坛系统的实战案例。

晚上丢给它跑，第二天来收货的感觉肯定很好。
