---
title: vllm 推理 qwen3 没有 think 标签
description: vllm 推理 qwen3 没有 think 标签以及如何开启 function call 和 reasoning_content
date: 2025-09-04T10:30:14+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - llm
categories:
  - 杂技浅尝
lastmod: 2025-12-10T00:26:42+08:00
---
## 问题

>vllm 推理 qwen3-30b-a3b-2507 遇到没有第一个`<think>`标签 这个之前 DeepSeek-R1 出来后就遇到过几次，一般改一下chat_template 可以解决。这次记一下

在进行聊天补全请求时，模型的推理内容出现在 `content` 字段中，具有以下特征：

- 缺少开始的 `<think>` 标签
- 包含结束的 `</think>` 标签
- 所有推理内容与最终回复混合在 `content` 中
- `reasoning_content` 字段为 `null`

由于最近升级了 vllm 以及推理的是 第三方 4bit 量化版，所以这些细节也记一下
## 版本

- vLLM version: 0.10.1
- Model: btbtyler09/Qwen3-30B-A3B-Thinking-2507-gptq-4bit
- Startup command:
```
python3 -m vllm.entrypoints.openai.api_server
  --model /model
  --host 0.0.0.0 --port 8000
  --api-key token-ray123
  --served-model-name mckj/Qwen3-30B-A3B-Thinking-2507
  --tensor-parallel-size 1
  --gpu-memory-utilization 0.96
  --max-model-len 6144
  --max-num-batched-tokens 8192
  --max-num-seqs 64
  --reasoning-parser qwen3
  --enable-auto-tool-choice
  --tool-call-parser hermes
```

参考此 discussion[Qwen/Qwen3-30B-A3B-Thinking-2507 · Using vllm 0.10.0, \`reasoning content\` appears in content field instead of reasoning\_content with Qwen3-30B-A3B-Thinking model](https://huggingface.co/Qwen/Qwen3-30B-A3B-Thinking-2507/discussions/2)

把他提到的 chat_template.jinja 按照他的替换。解决字段错位问题

可以看到重启之后 思考内容会解析到reasoning_content中了

```json
{
  "id": "chatcmpl-b02318c5e3c24e6eaf12918e5dc3181d",
  "object": "chat.completion",
  "created": 1757059274,
  "model": "mckj/Qwen3-30B-A3B-Thinking-2507",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "\n\nTo solve the expression **2 + 2 * 5**, we must follow the **order of operations** (PEMDAS/BODMAS), which dictates that **multiplication is performed before addition**.\n\n---\n\n### Step-by-Step Breakdown:\n\n1. **Identify the operations**:  \n   The expression contains **addition (+)** and **multiplication (*)**.\n\n2. **Apply the order of operations**:\n   - First, perform the **multiplication**:  \n     $ 2 \\times 5 = 10 $\n   - Then, perform the **addition**:  \n     $ 2 + 10 = 12 $\n\n---\n\n### Why Not $ (2 + 2) \\times 5 $?  \nIf the expression were written as $ (2 + 2) \\times 5 $, then the parentheses would change the order and the result would be $ 4 \\times 5 = 20 $. However, **there are no parentheses** in the original expression, so we do **not** add first.\n\n---\n\n### Final Answer:\n$$\n\\boxed{12}\n$$",
        "refusal": null,
        "annotations": null,
        "audio": null,
        "function_call": null,
        "tool_calls": [],
        "reasoning_content": "\nOkay, the user is asking 2+2*5. Let me think about how to approach this. First, I remember that in math, there's an order of operations, like PEMDAS. That stands for Parentheses, Exponents, Multiplication and Division, Addition and Subtraction. So multiplication comes before addition.\n\nSo the problem is 2 + 2 * 5. According to PEMDAS, I should do the multiplication first. 2 times 5 is 10. Then add the 2. So 2 + 10 equals 12. Wait, but sometimes people might forget the order and add first, which would be 4*5=20, but that's wrong because multiplication has higher precedence. Let me double-check. Yeah, multiplication before addition. So the correct answer should be 12.\n\nWait, let me make sure. Let's break it down step by step. The expression is 2 + 2 * 5. The multiplication part is 2*5, which is 10. Then add the 2 to that result: 2 + 10 = 12. Yep, that's right. I think that's the standard way to solve it. If there were parentheses, like (2+2)*5, then it would be 4*5=20, but there are no parentheses here. So the answer is 12.\n\nAnother way to think about it: in most programming languages, the order of operations is the same, so if you type 2+2*5 into a calculator or a code, it should give 12. Let me confirm with a quick calculation. 2*5 is 10, plus 2 is 12. Yep. So the user might be testing if I know the order of operations. Maybe they're a student learning basic math. I should explain the steps clearly so they understand why it's 12 and not 20. Let me make sure to mention PEMDAS or the standard order of operations to clarify the reasoning.\n"
      },
      "logprobs": null,
      "finish_reason": "stop",
      "stop_reason": null
    }
  ],
  "service_tier": null,
  "system_fingerprint": null,
  "usage": {
    "prompt_tokens": 14,
    "total_tokens": 680,
    "completion_tokens": 666,
    "prompt_tokens_details": null
  },
  "prompt_logprobs": null,
  "kv_transfer_params": null
}
```

## 小补充

vllm 开启 think 标签解析到reasoning_content中是从 DeepSeek-R1 开始的范式，一般配置
`--reasoning-parser deepseek-r1`就行
这次写配置是 gpt 帮忙写的。他说可以 `--reasoning-parser qwen3` 我没确认文档，不过生效了也就无所谓了

另外要开启 function call 就要配置如下
```
--enable-auto-tool-choice
--tool-call-parser hermes
```
hermes也是官方推荐的，建议这些参数都看一下最新文档为主

tool use 的效果如下

```bash
curl -s http://localhost:8011/v1/chat/completions \
  -H "Authorization: Bearer token-ray123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mckj/Qwen3-30B-A3B-Thinking-2507",
    "messages": [
      {"role": "user", "content": "现在洛杉矶几点？帮我换算成北京时间"}
    ],
    "tools": [{
      "type": "function",
      "function": {
        "name": "convert_time",
        "description": "Convert time between timezones",
        "parameters": {
          "type":"object",
          "properties":{
            "from_tz":{"type":"string"},
            "to_tz":{"type":"string"},
            "time_str":{"type":"string"}
          },
          "required":["from_tz","to_tz","time_str"]
        }
      }
    }],
    "tool_choice": "auto",
    "stream": false
  }'
```

响应内容

```json
{
  "id": "chatcmpl-050207e5faee4e64b0b03966baecc2c6",
  "object": "chat.completion",
  "created": 1757059508,
  "model": "mckj/Qwen3-30B-A3B-Thinking-2507",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "\n\n",
        "refusal": null,
        "annotations": null,
        "audio": null,
        "function_call": null,
        "tool_calls": [
          {
            "id": "chatcmpl-tool-19b6780b78244bdfae923e8c90156593",
            "type": "function",
            "function": {
              "name": "convert_time",
              "arguments": "{\"from_tz\": \"America/Los_Angeles\", \"to_tz\": \"Asia/Shanghai\", \"time_str\": \"now\"}"
            }
          }
        ],
        "reasoning_content": "\n一堆思考.\n"
      },
      "logprobs": null,
      "finish_reason": "tool_calls",
      "stop_reason": null
    }
  ],
  "service_tier": null,
  "system_fingerprint": null,
  "usage": {
    "prompt_tokens": 189,
    "total_tokens": 1724,
    "completion_tokens": 1535,
    "prompt_tokens_details": null
  },
  "prompt_logprobs": null,
  "kv_transfer_params": null
}

```