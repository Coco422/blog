---
title: "Agent Loop 怎么写：并行工具调用、停止条件与最小执行循环"
description: "从天气助手出发，拆开 Agent 内层 Tool Loop：如何处理并行与顺序工具调用、保留完整 Responses Items、回传错误，并用轮数和预算决定何时停止。"
date: 2026-08-02T00:19:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-03T19:43:51+08:00
showLastMod: true
tags:
  - agent
  - Agent Loop
  - Responses API
  - Function Calling
  - JavaScript
  - DeepSeek
categories:
  - 杂技浅尝
---

> 从一次 Tool Call 走到真正会继续工作的 Agent Loop：模型调用工具、观察结果、继续决策，直到给出最终回答或触发停止条件。

昨天上班看日报时，很开心看到 DeepSeek-v4-flash-0731 正式发布，对它期待甚高。一直以来主力模型都是海外模型，但是频频封号、支付困难，层层难关只是为了给老外送钱，心里很不是滋味。倒不是要站位，只是被卡脖子的滋味不好受，在哪个领域都一样。

所以 GLM5.2 的进步、K3 的进步，都让我惊喜万分。无奈 GLM5.2 在涨价前我抢购了接近十次，从未成功；K3 倒是还不错，但买了个小套餐后也限购了。DeepSeek 的每一次动作都能在圈子里激起浪花，也很期待它以后的能力。看到这次更新对 Codex 环境做了优化，而且我用的服务已经能按 Responses 范式调用，接下来的 Agent 开发系列就先拿 DeepSeek 做例子吧。

> 本文代码使用我当时接入的 DeepSeek Responses 兼容服务。兼容接口不代表所有参数、状态管理和返回结构都与 OpenAI 官方完全一致，具体仍要以实际 Provider 的文档和响应为准。

前两篇我们讲了[模型的对话和多轮记忆]({{< relref "posts/手把手教你从零开发一个 Agent（0）.md" >}})，也拆开了[模型到底是怎么调用工具的]({{< relref "posts/模型到底是怎么调用工具的.md" >}})。还剩一个待完成的闭环——给工具执行套上一层循环，实现“看一眼、做一点、再看一眼”。如果只看之前的例子，你可能还无法理解这是什么意思。那我还是拿天气助手做例子。

## 工具并行调用与顺序调用

我们上期做了查询某个城市的天气，但是那个工具一次只能传入一个城市参数。假如我问：“上海和北京现在的天气怎么样？”

模型如果只调用一次就回答，显然不够。但这两个查询前后无关，模型为什么不能在一轮内就查两次呢？包能的，别太瞧不起现在的模型，我们用 API 演示一下。

![模型在同一轮返回北京和上海两个天气工具调用](https://imgbed.anluoying.com/2026/07/b428476d2bba9965822de19010028574.png)

> 这里我把模型的思考暂时关闭了。在我这次使用的接口中，配置写作 `reasoning: { effort: "none" }`。`reasoning.effort` 支持哪些值取决于具体模型和 Provider，不能看到 Responses 兼容接口就默认所有模型都支持 `none`。

可以看到，模型在同一轮返回了两个工具调用。这种彼此不依赖的查询可以一起执行，等结果都回来后再一起交给模型。

OpenAI 官方 Responses API 也允许模型在一轮里返回多个 Function Call；如果不希望出现并行调用，可以把 `parallel_tool_calls` 设为 `false`，将每轮限制为零个或一个函数调用。其他兼容 Provider 是否支持同名参数，需要单独确认。

那么，如果问题变成：“帮我查一下深圳现在的天气，如果正在下雨就查一下北京，不下雨就查一下上海。”这时必须先得到深圳的天气，才能决定第二个工具应该查谁。我们来试试效果。

![模型先调用 get_weather 查询深圳天气](https://imgbed.anluoying.com/2026/07/b6d50c704581252ac4b368fe2718f1b9.png)

诶，没问题。模型理解需要先查询深圳。我们把查询结果喂回去后，它才发起第二次工具调用。（我看最近一个月伦敦也未必比深圳忧郁 T T）

![回传深圳天气后模型发起第二次工具调用](https://imgbed.anluoying.com/2026/08/d448f1756e7984b0d5eda4b2356d24fa.png)

可以看到，模型理解了这个条件，并且发起了第二轮 Tool Call。这个过程怎么放进我们开发的 Agent 里实现呢？没错，再加上一层循环。

> 工具调用结束，并不代表这一轮任务结束。要把工具结果再次发给模型，直到模型不再请求工具。

![Agent 内层循环从模型调用工具再回传结果的流程](https://imgbed.anluoying.com/2026/07/17a97d03f7e35fda126988e1df14f1cc.png)

## 最小的 Agent Loop

还记得第二篇的代码把请求次数写死了：第一次让模型决定工具，第二次把工具结果交回去，然后结束。

但现在已经不能提前知道模型到底要调用几次，所以真正需要循环的不是某个工具函数，而是“调用模型并处理它的输出”这一整段流程。

我们继续复用上期的 `weatherTool` 和 `getWeather`。最小 Loop 可以写成这样：

```javascript
const tools = [weatherTool];

async function callFunction(name, args) {
    if (name === "get_weather") {
        return getWeather(args);
    }

    throw new Error(`未知工具：${name}`);
}

async function executeToolCalls(toolCalls) {
    return Promise.all(
        toolCalls.map(async (toolCall) => {
            try {
                const args = JSON.parse(toolCall.arguments);
                const result = await callFunction(toolCall.name, args);

                return {
                    type: "function_call_output",
                    call_id: toolCall.call_id,
                    output: JSON.stringify(result),
                };
            } catch (error) {
                return {
                    type: "function_call_output",
                    call_id: toolCall.call_id,
                    output: JSON.stringify({
                        error: error.message,
                    }),
                };
            }
        })
    );
}

async function runAgent(userInput, { maxTurns = 8 } = {}) {
    const input = [
        { role: "user", content: userInput },
    ];

    // 设置最大轮数，防止 Agent 陷入无限工具循环。
    for (let turn = 1; turn <= maxTurns; turn++) {
        const response = await client.responses.create({
            model: "deepseek-v4-flash",
            instructions: "你是天气助手，需要时可以调用天气工具。",
            tools,
            input,
        });

        // 保留这一轮的完整输出。
        input.push(...response.output);

        const toolCalls = response.output.filter(
            (item) => item.type === "function_call"
        );

        // 没有 Tool Call，说明模型已经给出了最终回答。
        if (toolCalls.length === 0) {
            return response.output_text;
        }

        const toolOutputs = await executeToolCalls(toolCalls);
        input.push(...toolOutputs);
    }

    throw new Error(`Agent 超过最大执行轮数：${maxTurns}`);
}
```

看起来只是多了一层 `for`，但从这里开始，程序已经不再预设模型下一步要做什么了。

这段代码每一轮只做几件事：

1. 带着当前 Context 调用模型；
2. 保存模型返回的完整 `response.output`；
3. 使用 `filter` 收集这一轮的所有 Tool Call；
4. 没有 Tool Call 就返回最终答案；
5. 有 Tool Call 就执行，把结果追加到 Context；
6. 带着新的 Context 进入下一轮；
7. 超过 `maxTurns` 就强制停止，防止无限调用。

> Agent Runtime 不能预先假设模型这一轮会调用几次工具。它必须观察模型每一轮的输出，再决定继续执行还是结束。

### 多个工具调用怎么处理

现在我们不能预判模型会输出几个工具调用，因此这里不能再使用第二篇里的 `find`，因为 `find` 只会拿到第一个调用。我们使用 `filter` 收集全部调用，再用 `Promise.all` 并行执行。

不过，并不是所有工具都能随便并行。天气查询是只读操作，彼此没有依赖，所以很安全。等以后加入写文件、Shell、数据库修改这些工具，就必须判断执行顺序、资源冲突和副作用，不能一股脑全部塞进 `Promise.all`。

同一轮返回的多个调用也不一定适合并发。比如两个调用都要修改同一个文件，即使模型一次性返回了它们，Runtime 仍然应该根据工具元数据选择串行执行、加锁或者直接拒绝冲突操作。

### 为什么要保存完整的 response.output

为了方便演示，前面把模型的思考部分关掉了。但如果开启推理，上下文应该怎么拼接？

这里以我当时使用的 DeepSeek API 文档为例，它的多轮上下文拼接是这样的：

![DeepSeek Responses 多轮请求中保留推理内容的上下文示例](https://imgbed.anluoying.com/2026/08/8c5383fbb1d104163f14b8ccaf78295b.png)

看代码里的 `input`，它就是当前这次 Agent 运行的活跃 Context。一开始只有用户消息，之后会不断加入：

- 模型消息；
- 推理相关内容或 Items；
- 模型请求调用的工具；
- 工具执行结果。

所以代码中要写：

```javascript
input.push(...response.output);
```

不能只保存 `response.output_text`。模型可能在 `output` 里同时返回 reasoning Item 和 `function_call`；如果中途把这些内容丢掉，下一轮就缺少了完成这次工具调用所需的上下文。

OpenAI 官方 Function Calling 文档也特别说明：对于 GPT-5、o4-mini 这类推理模型，模型随工具调用返回的 reasoning Items 也必须和工具结果一起传回去。

这次示例没有使用服务端状态，响应里的 `previous_response_id` 为 `null`，所以我们按无状态方式自己维护并回传完整 `input`。如果实际 Provider 支持并启用了 `previous_response_id` 或 Conversation，状态可以由服务端串联；但不要一边假设服务端保存了历史，一边又漏传手动维护所需的 Items。

简单来说，任务运行得越久，Context 就越长：

- Token 成本会增加；
- 模型响应会变慢；
- 旧信息可能干扰当前判断；
- 最终会碰到上下文窗口上限。

这一篇先不展开上下文压缩，只记住一件事：**Agent 开发的很大一部分工作，其实是在决定下一轮模型应该看到什么，又不应该看到什么。**

围绕模型搭起来的这一整套运行环境——怎样构建 Context、开放哪些 Tools、怎样执行工具、怎样回传结果、什么时候继续、什么时候停止、错误与权限怎么处理——合在一起，就是后面经常会提到的 **Harness**。

## Agent Loop 什么时候继续，什么时候停止

最正常的结束条件很简单：模型这一轮没有返回 `function_call`，而是给出了最终自然语言回答。

但只靠这个条件还不够，还需要几条保护线：

- 达到 `maxTurns`，防止模型无限调用；
- 用户主动取消，或者请求被 `AbortSignal` 中止；
- Token、时间或费用预算已经耗尽；
- 出现无法恢复的模型请求或协议错误。

反过来，单个工具失败不一定意味着整个 Agent 都应该停止。天气接口报错、参数不合法、文件不存在、搜索无结果，这些都可以作为结构化的 Tool Result 返回给模型。模型看到错误后，可能会修正参数、换一个工具，或者直接向用户解释发生了什么。

所以最小实现里的 `executeToolCalls` 没有直接把错误抛到最外层，而是把它变成：

```json
{
  "error": "具体的错误信息"
}
```

> 错误既可能是程序异常，也可能只是模型下一轮需要观察的一条信息。

不过生产环境不能直接把所有原始异常都塞给模型。内部路径、SQL、密钥片段或服务信息可能混在 `error.message` 里，应该先分类、脱敏，再决定哪些信息能回传。

## 我们完成的只是内层循环

到这里，我们已经拥有了一个真正会继续工作的最小 Agent Loop：

```text
模型 → 工具 → 模型 → 工具 → 最终回答
```

但它仍然只接收了一次用户输入。`runAgent` 开始工作后，用户只能等它完全结束，再发起下一次任务。

我们使用 Codex 时肯定已经习惯另一种体验：它工作到一半，我们发现方向不对，可以马上补充一句，而不需要等它完全做完。

![Codex 运行中接收用户追加指令的 Steer 效果](https://imgbed.anluoying.com/2026/07/00e73b62c2ad1452c99e2a0dda4b3bf0.png)

我把它叫做“插嘴”。Codex 官方使用的术语是 **Steer**，对应名词是 **steering**。还有两个容易混淆的词：

- **Steer**：把新消息加入当前正在运行的任务，用来纠正方向、补充信息；
- **Queue**：把消息排队，等当前任务结束后，作为下一轮处理；
- **Interrupt**：取消当前运行。

Codex App Server 使用 `turn/steer` 向正在执行的 Turn 追加输入，使用 `turn/interrupt` 请求取消。Queue 描述的是客户端把消息留到下一轮的行为，并不存在一个对应的 `turn/queue` 方法。

从结构上看，下一步需要在刚刚写完的内层 Loop 外面，再建立一层消息调度循环，同时处理队列、取消和运行中的新输入：

![外层消息循环与内层工具循环的双层结构](https://imgbed.anluoying.com/2026/08/3920c7c7f89c8a5c6cc2d4d8e1e50e2b.png)

到这里，我们终于不再是在手动拼一次工具调用，而是拥有了一个真正会继续工作的 Agent Loop。它能观察结果、继续决策、执行多个工具，也知道什么时候停下来。

效果就像这样：

![天气 Agent 连续调用工具并生成最终回答的运行结果](https://imgbed.anluoying.com/2026/08/4fb5d6ecb84bee861f898b04e85e665b.png)

现在距离一个常见的 Agent 还缺一些能力，比如读文件、执行 Bash 命令等。这就像基础的增删改查：只有一根手指头戳戳戳天气是不够的。

前面做的上下文消息列表，相当于给了它一双文字级别的眼睛；现在又给了它一根手指头，能戳一下天气预报。接下来还得给它双手双脚。假如要让它帮我写代码，就得让它读文件、写新文件、修改已有文件，以及使用最万能的 Shell。

同时，如果以后不断扩展工具，难道还要用一堆 `if` 一个个判断吗？这里怎么优化？而且现在我们也看不清它到底做了什么，交互对我们而言根本不透明。

接下来先完成几个基础工具的开发，随后再优化工具注册和交互体验吧。

## 继续阅读

- [手把手教你从零开发一个 Agent（0）：Responses API 与多轮对话记忆]({{< relref "posts/手把手教你从零开发一个 Agent（0）.md" >}})
- [模型到底是怎么调用工具的：从 Chat Template 到 Function Calling]({{< relref "posts/模型到底是怎么调用工具的.md" >}})
- [从 0 开发一个 agent（1）：Agent Runtime 的架构草图]({{< relref "posts/从 0 开发一个 agent（1）.md" >}})

## 参考资料

- [OpenAI Function Calling 指南](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI Responses API：Create a model response](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Codex：Steering and queuing](https://learn.chatgpt.com/docs/prompting#steering-and-queuing)
- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [微信公众号发布版：手把手教你从零开发一个智能体 之 循环](https://mp.weixin.qq.com/s?__biz=MzIwMjU2NDI2OA==&mid=2247484033&idx=1&sn=0e446186d0161c17f583d98d1e91a1bf&chksm=97ff9ad6f60d68f527a5a68a8ac35e635696c71b47aaef73adb4260b2b099c6204be0c76a30e#rd)
