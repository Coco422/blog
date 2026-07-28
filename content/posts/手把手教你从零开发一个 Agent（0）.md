---
title: "手把手教你从零开发一个 Agent（0）：Responses API 与多轮对话记忆"
description: "从第一次调用 Responses API 开始，拆开 SDK 与 REST 请求，理解服务端状态和完整 output Items 如何构成 Agent 的多轮对话记忆。"
date: 2026-07-28T12:54:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-07-28T13:02:51+08:00
showLastMod: true
tags:
  - agent
  - OpenAI
  - Responses API
  - JavaScript
categories:
  - 杂技浅尝
---

> 本系列应该会放 Coding Agent 的教程，以及如何开发一个 Agent，后续会往 pi-agent 的实现思路继续学习。
>
> 我会按真实开发经历梳理记录，并尽量从需求倒推实现。这样比较好理解，但弊端也很明显：我会在这个过程中踩坑，而且有些坑可能要过一阵子才意识到。再叠个甲，笔者也是小菜鸟，如有错误，欢迎指出。
>
> 我比较熟悉 Python 和 Java，原本打算用 Python 写这个教程。但是为了逼自己多学一点，最后选择了 JS/TS，也因为我现在学习的一个 Agent 项目使用的就是 JavaScript 技术栈。
>
> 本项目尽量不使用会增加理解负担的框架，比如 LangChain。先把底层过程亲手写一遍，后面再看框架替我们做了什么。

从第一次 API 调用，到让模型拥有多轮对话记忆。先把 LLM 调通，再理解上下文究竟是怎么被“记住”的。

## 首先，来个 Hello World

我们先要知道怎么调用 LLM。本文会同时提到 OpenAI 的 `/chat/completions` 和 `/responses`：前者出现得更早、兼容范围更广，也更容易理解对话补全结构；实际代码则主要使用 OpenAI JavaScript SDK 的 Responses API，同时拆开看看 SDK 最终发出的 HTTP 请求。

> OpenAI、Claude、Gemini 的接口都有自己的规范。由于 OpenAI 的先发优势，不少服务早期都会兼容 OpenAI 的接口范式。各家的参数名、结构和特性不完全一样，但大部分概念都能互相转换。因此开发 Agent 时通常会做一层抽象，用来适配不同的 provider。这也是许多框架已经替我们做好的事情，不过本文先暂时不引入。
>
> 参考文档：[Gemini API](https://ai.google.dev/api/generate-content?hl=zh-cn#example-request)、[Claude Messages API](https://platform.claude.com/docs/en/api/messages)、[OpenAI API](https://developers.openai.com/api/docs)。

### 调用官方 SDK，完成第一次请求

首先我们来看 OpenAI 官方的 API 文档中的调用例子，非常简单。

![OpenAI API 官方 JavaScript 快速开始示例](https://imgbed.anluoying.com/2026/07/9b8b272932907f6718fa97d1c90e5a3d.png)

跑一下试试

> 和官方示例不同的是，我的 JavaScript 代码里引入了 `dotenv/config`，用来自动把 `.env` 文件加载到 Node.js 运行环境。`.env` 里放 API Key，也可以配置 Base URL。

```text
OPENAI_API_KEY=sk-123
OPENAI_BASE_URL=https://你的域名/v1
```

这样配置后，就不用在 `new OpenAI()` 时重复填写这些参数，SDK 会自动从环境变量读取。

![使用 OpenAI SDK 完成首次 Responses API 调用](https://imgbed.anluoying.com/2026/07/ee4b8acc66aa51577d1cb2353fc77d36.png)

可以看到我们发起了运行后，GPT 给我们了回复，这个过程等了十几秒，这个调用链如下

```text
   代码
    |
    |
 OpenAI SDK
    |
    |
 OpenAI API
```

### 拆开 SDK，看清真正的 HTTP 请求

那么 SDK 里做了什么？我点进 `create` 方法看了一下，能看到多个函数重载，最后落到下面这段。内部实现可能会随着 SDK 版本变化，重点是它最终仍然在发送 HTTP 请求。

```javascript
create(
    body: ResponseCreateParams,
    options?: RequestOptions,
  ): APIPromise<Response> | APIPromise<Stream<ResponseStreamEvent>> {
    return (
      this._client.post('/responses', {
        body,
        ...options,
        stream: body.stream ?? false,
        __security: { bearerAuth: true },
      }) as APIPromise<Response> | APIPromise<Stream<ResponseStreamEvent>>
    )._thenUnwrap((rsp) => {
      if ('object' in rsp && rsp.object === 'response') {
        addOutputText(rsp as Response);
      }

      return rsp;
    }) as APIPromise<Response> | APIPromise<Stream<ResponseStreamEvent>>;
  }
```

`this._client.post('/responses', { ... })` 这里就是 HTTP 请求。极度简化后，大概等价于：

```javascript
fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "gpt-5.5",
    input: "Write a short bedtime story about a unicorn.",
  }),
});
```

再直接调用 REST 接口试试看是不是一样的。

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5.5",
    "input": "Write a short bedtime story about a unicorn."
  }'
```

![直接调用 Responses REST API 并查看完整响应](https://imgbed.anluoying.com/2026/07/d8c74356985770fed38a0fcf060e29f4.png)

可以看到 Response 里有密密麻麻的很多数据。真正的回复文本位于 `output` 中的 message Item 里，而 SDK 额外提供了 `response.output_text` 这个便捷字段，帮我们把文本结果取了出来。

`._thenUnwrap((rsp) => { ... })` 是 SDK 对 Promise 的封装。响应回来后，它会先检查是不是 Responses API 返回的数据，然后执行 `addOutputText(rsp)`。

所以我们才能直接读取 `response.output_text`。调用链条如下：

```text
你写:
client.responses.create()
        ↓
Responses.create()
        ↓
this._client.post("/responses")
        ↓
HTTP POST
        ↓
OpenAI API
        ↓
返回 JSON
        ↓
addOutputText()
        ↓
response.output_text
        ↓
你的 console.log()
```

### 让程序接收用户输入

那怎么做出聊天一样一来一回的效果？Hello World 的第二课一般就会教这个吧：先接收用户输入，再用它替换固定的 `input`。

> 这里包含函数调用、回调函数和 async 箭头函数。如果看不懂，辛苦你先找 AI 补一下 JavaScript 语法咯。

```javascript
// 加载 .env 文件的环境变量
import "dotenv/config";
import OpenAI from "openai";
// 获取用户输入的库
import readline from "readline";

const client = new OpenAI();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Please enter your prompt: ", async (userInput) => {
        const response = await client.responses.create({
            model: "gpt-5.5",
            input: userInput,
        });

        console.log("\nAI Response:", response.output_text);
});

```

运行一下，终端会显示 `Please enter your prompt:`。接下来输入的一行内容会作为 `userInput` 变量进入函数。

AI 完成回复后，终端会打印 `AI Response:` 以及回复内容。

![使用 readline 接收输入并完成单轮对话](https://imgbed.anluoying.com/2026/07/4020b54c0d36d1b7fc1e66732b3b14a8.png)

此时此刻，聪明如你，你一定会说，哎呀是不是加个循环就做完一个 chatbot 了。

可以，那我们继续。

## 怎么进行多轮对话？

> 如果只是简单加上循环，我们的确可以和 AI 进行一轮又一轮对话，只要不退出程序就行。但很快会发现：每次发送的 `input` 只有本轮输入，AI 怎么知道我们之前讲了什么？也就是 AI 的短期记忆从哪里来？

### Chat Completions 的“记忆”来自 messages

这里岔开回答一下。先看开篇提到的 `/chat/completions`，这是较早、也是各家兼容很广的一套接口范式。它的传入参数包含 `messages`，大概长这样：

```javascript
client.chat.completions.create({
  model: "gpt-5.5",
  messages: [
    { role:"system", content:"你是一位善解人意的助手" },
    { role:"user", content:"你好" }
  ]
})
```

聪明如你不难看出来这个消息的结构了 分别是系统提示词和用户的输入，此时发送后会收到ai 的输出，如果要进行多轮会话的话就可以往这个数组里面追加 ai 的输出和用户新的输入，看起来就长这样

```javascript
client.chat.completions.create({
  model: "gpt-5.5",
  messages: [
    { role: "system", content: "你是一位善解人意的助手" },
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好！有什么可以帮助你的吗？" },
    { role: "user", content: "我今天在跟着安落滢学习从 0 到 1 开发 Agent" }
  ]
})
```

看懂了吧，把 AI 的回答也放进 `messages`，再把用户的新问题继续追加进去。整个对话历史会一直保留下来，因此模型每次都能“看到”之前聊过什么。

模型本身其实没有“会话”这个概念，它不会替你记住上一句话。对这种手动维护 `messages` 的方式来说，每一次调用 `/chat/completions` 都是一次新的请求。

之所以 AI 能够进行连续对话，并不是模型拥有了记忆，而是因为我们每次请求时，都把之前的聊天记录重新发送给了模型。

也就是说，对于模型而言，它看到的永远都是一份完整的 `messages` 数组。

当然，这种做法也带来了一个新的问题。

聊天记录会越来越长，每一次请求都需要把历史重新发送给模型。随着 Token 数量不断增加，请求成本会越来越高，响应速度也会越来越慢，最终还会触碰模型的上下文长度限制。

### Responses 如何用 previous_response_id 串起上下文

那 Responses API 是怎么知道聊天记录的？

如果请求走 OpenAI 官方 API，而且没有关闭存储，那么服务端可以帮我们把上下文串起来。

Responses 默认会存储生成的 Response，也可以用 `store: false` 关闭。请求完成后会返回一个类似 `resp_xxxx` 的 Response ID。下一次请求带上 `previous_response_id`，服务端就能把上一轮上下文串起来，再与本轮 `input` 一起交给模型。

调用链变成了这样

```
   你的代码
      |
      |
  OpenAI API
      |
      |
 OpenAI 的服务端存储（翻出上一轮的内容）
      |
      |
     模型
```

试试看代码

```javascript
import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

const response1 = await client.responses.create({
  model: "gpt-5.5",
  input: "你好，我叫小安落滢",
  store: true,
});

console.log(response1.output_text);
console.log(response1.id);

const response2 = await client.responses.create({
  model: "gpt-5.5",
  previous_response_id: response1.id, // 把上一轮串起来
  input: "我叫什么名字？",
  store: true,
});

console.log(response2.output_text);
```

输出

```text
你好，小安落滢！很高兴认识你 😊
resp_0c65...
我不知道你的名字。你可以告诉我你叫什么，我就能这样称呼你。
```

怎么回事，怎么没生效？哈哈，还记得前面提到的 `.env` 吗？我配置了自己的代理服务地址，而这个代理服务并没有替我支持 `previous_response_id`。

不过 Responses API 并不是只能依赖服务端状态，它也支持消息数组，只是参数名从 `messages` 变成了 `input`：

```javascript
const response = await client.responses.create({
  model: "gpt-5.5",
  input: [
    { role: "system", content: "你是一位善解人意的助手" },
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好！有什么可以帮助你的吗？" },
    { role: "user", content: "我今天在跟着安落滢学习从 0 到 1 开发 Agent" }
  ]
});
```

眼熟吧，这和前面 Chat Completions 的 `messages` 几乎一样，只是换了参数名。在 Responses API 里，`input` 接受的是更通用的 Items 数组，message 只是其中一种 Item。

### 把对话历史握在自己手里

既然我的代理不支持 `previous_response_id`，那我就自己维护历史呗。改造一下 chatbot：

```javascript
import "dotenv/config";
import OpenAI from "openai";
import readline from "readline";

const client = new OpenAI();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const history = []; // 自己维护的对话历史

function chat() {
    rl.question("你: ", async (userInput) => {
        if (userInput === "exit") {
            rl.close();
            return;
        }

        history.push({ role: "user", content: userInput });

        const response = await client.responses.create({
            model: "gpt-5.5",
            input: history,
        });

        history.push(...response.output); // 注意：是整个 output
        console.log("AI:", response.output_text);

        chat();
    });
}

chat();
```

跑一下试试，这次终于有记忆了。

![自行维护历史记录实现多轮聊天记忆](https://imgbed.anluoying.com/2026/07/0f15254bc1868bdc13333a48139f95e3.png)

### 不要只保存 AI 回复的文本

这里有个非常容易踩的坑，必须展开说说：**不要只保存 AI 回复的文本。**

如果是 chat/completions，以前的我会习惯性这么存：

```javascript
history.push({
  role: "assistant",
  content: response.output_text  // ❌ 别这么干
});
```

纯聊天阶段这么干可能看不出问题，但 Responses API 返回的 `output` 是一个 Item 数组。除了文本消息，还可能有 reasoning（推理）、`function_call`（工具调用）等内容。等后面讲到 function calling，模型说“我要调一个工具”，这个动作本身就是一个 Item。如果只存文本，下一轮模型就不知道自己上一轮发起过工具调用，轻则表现奇怪，重则直接报错。

所以从一开始就养成习惯：手动维护状态时，把整个 `response.output` 铺进 `history`，而不是只拿 `response.output_text`。

好，代码跑通了。现在回过头来聊聊那个更重要的问题：为什么要用 Responses API，以及这次踩坑到底说明了什么。

## 为什么选择 Responses API 作为主接口

先说结论：各家接口的范式都不一样，但背后的“哲学”是相通的。我们要学的是这个哲学，而不是某一家具体的参数写法。

这次我的代理不支持 `previous_response_id`，导致服务端记忆失效，其实就是一次小型的“厂商差异”事故。OpenAI 有 Responses 和 Chat Completions 两套范式，Claude 是 Messages API，Gemini 是 `generateContent`。参数名、结构和特性各不相同，但拨开这些表象，底层思想是一致的：

- **模型本身无状态。** 它不会凭空记住你，每一次请求都是一次新的计算。

- **上下文需要被重新带上。** 区别只在于历史存在哪里、由谁来拼：客户端自己维护 `messages` / `input` 数组，或者服务端通过 `previous_response_id` 串起来。

- **数据结构是一组 Items。** 消息、推理、工具调用和工具结果，本质上都是这个序列里的条目。

理解了这三点，再看任何一家的文档都不会慌——不过是同一哲学的不同方言罢了。

这个思路对我们要做的 Agent 系统还有一个更实际的启发：Responses 的服务端存储设计，我们完全可以在自己的系统里实现。OpenAI 用 Response ID 串链，我们也可以在自己的 Agent 里做一个 conversation store——给每轮对话分配 ID，把历史存在自己的存储里，需要时翻出来拼好再发给上游模型。这样做的好处是：

- 数据握在自己手里，不依赖上游的存储策略，也不用担心代理不支持某个参数。

- 更换上游时，历史格式是我们自己的，不用跟着 provider 的格式迁移。

- 减轻调用方压力，调用方只需要携带会话 ID，不用每次扛着越来越长的数组。

至于各家 provider 接口不同的问题，就回到本系列开篇提到的抽象层。对上游，我们分别适配 OpenAI、Claude、Gemini；对外，暴露自己设计的统一接口。这就是 LangChain 等框架替你做的事情，只不过这个系列里我们会亲手把它写出来。写完以后，就知道框架里面到底装了什么，而不是把它当黑盒。

那为什么选择 Responses API 作为系列的“主接口”？因为它更适合 Agent 工作流：工具调用、推理过程、灵活的 Items，以及可选的服务端状态都是一等公民。后面讲 function calling、工具结果回传和多步推理，都可以顺着这条线继续往下长，不用半路迁移接口。Chat Completions 仍然值得了解——它是历史，也是很多服务兼容的通用语，但我们的车要往前开。

## 下一篇

到这里，多轮对话的记忆问题算是解决了。但前面埋下的问题还在：历史会越滚越长，Token 越烧越多，迟早撞上上下文上限。这个留到“上下文管理”再收拾。

下一篇，先让 AI 长出手来——function calling。

如果想先看整个 Agent runtime 的架构草图，也可以继续看[从 0 开发一个 agent（1）]({{< relref "posts/从 0 开发一个 agent（1）.md" >}})。

## 参考资料

- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [OpenAI Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Claude Messages API](https://platform.claude.com/docs/en/api/messages)
- [Gemini generateContent](https://ai.google.dev/api/generate-content?hl=zh-cn)
- [微信公众号发布版：手把手教你从零开发一个 Agent · 第 0 篇](https://mp.weixin.qq.com/s/EsMjXUb5cU0FYbz5GazTiw)
