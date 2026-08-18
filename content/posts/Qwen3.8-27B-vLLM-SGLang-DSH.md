---
title: "Qwen3.8-27B 本地部署实测：vLLM、SGLang、单卡 Q4 与 DSH"
description: "在四张 RTX 3090 上部署 Qwen3.8-27B BF16，比较 vLLM 与 SGLang 的长上下文、Prefix Cache 和多模态表现，再测试单卡 Q4、WorkBuddy 与 DeepSeek Harness。"
date: 2026-08-18T02:15:52+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-18T11:40:58+08:00
showLastMod: true
tags:
  - Qwen3.8-27B
  - vLLM
  - SGLang
  - DeepSeek Harness
  - RTX 3090
  - GGUF
categories:
  - 杂技浅尝
---

![Qwen3.8-27B 本地部署实测题图](https://imgbed.szmckj.cn/uploads/2026/08/18/6a8342a5567ff.png)

Qwen3.8-27B 这个尺寸我等了挺久：27B 稠密模型还保留了足够的能力，量化后又能塞进单张 24GB 显卡，正好落在本地 Agent 比较实用的一档。

这次我在 `4×RTX 3090 24GB` 上部署了原始 BF16 权重，对比 vLLM 和 SGLang，又用单卡跑了一遍 Q4 GGUF。接口跑通后，还把同一个模型接进 WorkBuddy 和 DeepSeek Harness（DSH），测试看图、工具调用和真实文件任务。

先放结论：

- 四卡 BF16 最终继续使用 vLLM。当前环境里，它的长上下文、Prefix Cache 和热请求 TTFT 更适合 Agent 负载。
- SGLang 的 Decode 略快，但在这组没有可用 P2P 的 3090 上需要把多模态特征传输切到 CPU，热请求也没有形成迁移优势。
- 单卡 Q4 在 32K 上下文下能跑到约 `39～40 tok/s`，但这个 GGUF 没有视觉 projector，而且我没有做量化质量评测。
- WorkBuddy 和 DSH 都跑通了多模态与工具闭环；到了真实发票任务，两边依然需要人盯着，不能把“工具能调起来”当成“任务可以无人值守”。

本文不是从下载权重开始的手把手教程，主要记录参数、性能数据，以及混合线性注意力模型在缓存和 Agent 场景里容易踩的坑。

## 先理解 Qwen3.8 的混合注意力

Qwen3.8-27B 延续 Qwen3.5 的架构。官方模型卡给出的 64 层布局是：每三层 Gated DeltaNet（GDN）线性注意力之后插入一层全注意力，总计 48 层线性注意力和 16 层全注意力；原生上下文长度为 262,144 Token，可通过 YaRN 扩展到 1M。

全注意力层每生成一个 Token，都要读取随历史增长的 KV Cache；线性注意力则把历史压进固定大小的循环状态。按这套模型 4 个 KV 头、`head_dim=256` 和 BF16 粗算，如果 64 层全部使用全注意力，KV Cache 的线性增长部分约为 `256KiB/token`；现在只有 16 层全注意力，约为 `64KiB/token`，另加固定大小的线性注意力状态。

这不是说上下文增长“没有成本”，而是增长斜率降到了纯全注意力模型的约四分之一。落到这台四卡 3090 上，131K 上下文仍能放下，并且保留了一定并发空间。

之所以还保留四分之一全注意力，是因为固定大小状态的容量有限。混合结构在长上下文效率和精确回忆能力之间做了折中。

### Prefix Cache 为什么变复杂了

![全注意力 KV Cache 与线性注意力循环状态的区别](https://imgbed.szmckj.cn/uploads/2026/08/18/6a8349827f24c.png)

第一个变量来自对话模板。Qwen3.8 官方提供 `preserve_thinking` 控制历史 reasoning 是否保留；如果客户端或模板没有把上一轮 reasoning 带进下一轮 Prompt，两轮原始 Token 流就会从这里分叉，分叉后的部分无法命中 Prefix Cache。这是命中率问题，不应该造成回答错误。

第二个变量是快照粒度。线性注意力状态会原地更新，不能像普通 KV 块那样随便回退。vLLM 的 `align` 模式只在对齐边界保存可恢复状态；在我的 vLLM 0.27.1 环境里，每个边界是 784 Token。命中位置差一个 Token，也只能退到更早的快照，短前缀甚至可能零命中。

![vLLM align 模式以 784 Token 为边界恢复 Prefix Cache](https://imgbed.szmckj.cn/uploads/2026/08/18/6a83498c083cc.png)

第三个变量是 MTP 投机解码。草稿 Token 被拒绝时，普通 KV Cache 可以删除多出来的块；线性注意力状态却已经被更新，不能直接把那几个 Token “吐出来”。快照恢复、前缀缓存恢复和投机回滚叠在一起，如果状态路径没有完全对齐，就可能从性能问题升级为正确性问题。

![混合线性注意力模型中 MTP 投机解码的状态回滚问题](https://imgbed.szmckj.cn/uploads/2026/08/18/6a83498e3aebc.png)

SGLang 为混合模型设计了 `MambaRadixCache`，把循环状态快照挂到 Radix 树节点，并为投机解码的草稿 Token 分配独立状态槽。vLLM 则提供 `none/align/all` 三种 Mamba Cache 模式；我这轮使用的是仍标为实验性的 `align`，没有开启 MTP。

## 四卡 RTX 3090 部署 BF16

测试服务器共有 8 张 RTX 3090 24GB，其中 GPU 0～3 已经在跑其他服务。Qwen 使用 GPU 4/5/6/7，Tensor Parallel 设为 4。

Qwen3.8-27B 的 BF16 权重约 52GiB。最终环境使用 vLLM 0.27.1，服务上下文先设为 131,072。

### vLLM 启动参数

```bash
docker run -d \
  --name vllm-qwen38-27b \
  --restart unless-stopped \
  --gpus '"device=4,5,6,7"' \
  --network host \
  --ipc=host \
  --shm-size=32g \
  -v /path/to/models:/models:ro \
  vllm/vllm-openai:latest \
  --model /models/Qwen/Qwen3.8-27B \
  --served-model-name qwen3.8-27b \
  --port 8360 \
  --tensor-parallel-size 4 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.92 \
  --enable-prefix-caching \
  --reasoning-parser qwen3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_xml
```

```text
API Base: http://<SERVER_IP>:8360/v1
Model: qwen3.8-27b
```

四张卡各占约 22,406MiB。启动日志显示每卡有 5.88GiB KV Cache，四卡总 GPU KV Cache 容量为 369,864 Token；按单请求 131,072 Token 计算，理论最大并发约为 2.82。RTX 3090 没有这套服务可用的 FP8 加速能力，所以 KV Cache 保持 `auto`，实际为 BF16。

冷启动用了 8～9 分钟，其中 `torch.compile` 占了 154 秒。容器进程出现不代表接口已经可用，恢复服务时至少要等 `/v1/models` 或一次真实 Chat Completions 请求成功。

### Prefill、Decode 与四路并发

| 并发 | 请求数 | 平均 TTFT | 单路 Decode | 聚合输出吞吐 | 总耗时 |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 个依次执行 | 0.831 秒 | 44.2～44.7 tok/s | 41.42 tok/s | 24.72 秒 |
| 4 | 4 个同时执行 | 2.688 秒 | 平均 30.42 tok/s | 121.58 tok/s | 16.85 秒 |

四路并发后，每个请求单独看会变慢，但服务器总输出从约 41 tok/s 提升到 121.58 tok/s。这不是极限压测，只能代表当前环境下 1～4 路 Agent 请求的数量级。

长上下文测试使用合成填充文本，在末尾放一个唯一标记，要求模型只返回标记：

| Prompt Token | TTFT | 总耗时 | 结果 |
| ---: | ---: | ---: | --- |
| 7,994 | 11.795 秒 | 11.921 秒 | 标记正确 |
| 31,994 | 44.973 秒 | 45.028 秒 | 标记正确 |
| 119,978 | 180.473 秒 | 191.340 秒 | 标记正确 |

131K 配置确实能接收接近 120K 的输入并找回末尾信息，不只是把启动参数写大。但这个测试只证明容量和简单检索，不等于模型能高质量理解 120K 代码。冷 Prompt 到这个长度要等约三分钟，真实 Agent 体验仍然高度依赖共享前缀能否复用。

原生 262K 可以继续上调 `--max-model-len`，代价是单请求占用更多缓存、可并发数下降；扩展到 1M 则要按官方说明配置 YaRN，不能只改一个长度数字。

### Prefix Cache 已命中，客户端 usage 却看不到

最开始我把同一个 Prompt 连发三次，OpenAI usage 里的 `prompt_tokens_details` 一直为空。回头看启动日志才发现，Prefix Caching 默认没有开启。

加上 `--enable-prefix-caching` 后，日志出现：

```text
Mamba cache mode is set to 'align' for Qwen3_5ForConditionalGeneration
```

随后把同一个 1,626 Token Prompt 连发三次，`/metrics` 累计查询 4,878 Token、命中 3,136 Token。第二、三次各复用 1,568 Token，正好是两个 784 Token 对齐块，剩余 58 Token 重算；累计命中率为 64.3%。

客户端响应里的 `cached_tokens` 仍为空，但这不代表缓存没有工作。至少在 vLLM 0.27.1 这套环境里，要通过 `/metrics` 或 Prometheus 观察引擎命中，不能只看 OpenAI usage。

### Qwen3.8 的 thinking 怎么关闭

本轮最可靠的方式仍然是把参数交给 Chat Template：

```json
{
  "chat_template_kwargs": {
    "enable_thinking": false
  }
}
```

使用 OpenAI Python SDK 时，可以放进 `extra_body`：

```python
response = client.chat.completions.create(
    model="qwen3.8-27b",
    messages=[{"role": "user", "content": "计算 23×19，只给答案"}],
    extra_body={
        "chat_template_kwargs": {
            "enable_thinking": False
        }
    },
)
```

vLLM 0.27.1 也会把 `reasoning_effort: "none"` 映射为 `enable_thinking=false`。我的短测结果如下：

| 请求方式 | 耗时 | Completion Token | reasoning |
| --- | ---: | ---: | --- |
| `reasoning_effort=low` | 1.945 秒 | 75 | 有 |
| `chat_template_kwargs.enable_thinking=false` | 0.377 秒 | 4 | 无 |
| 顶层 `enable_thinking=false` | 2.391 秒 | 97 | 有，字段被忽略 |
| `reasoning_effort=none` | 0.462 秒 | 4 | 无 |

Prompt 里加 `/no_think` 也没有生效。当前服务接受 `none/low/medium/xhigh`，不接受常见的 `high`；这组取值是 vLLM 0.27.1 与当前 Qwen 模板的组合表现，接其他版本前最好重新查一次。

### Tool Call、图片和视频

vLLM 使用 `qwen3_xml` Tool Parser；后面的 SGLang 使用 `qwen3_coder`，两边的参数不能直接互换。

图片 URL、Base64 图片和短视频 URL 都通过了：

| 输入 | Prompt Token | Completion Token | 耗时 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 官方数学题图片 URL | 300 | 857 | 20.802 秒 | 正确选出 `1+√2` |
| Base64 图片 | 263 | 10 | 约 0.8 秒 | 答案正确 |
| 官方短视频 URL | 11,126 | 16 | 29.549 秒 | 正确识别 20 个瓷罐 |

这些结果只能说明当前接口链路的图片和短视频输入可用，不能扩写成“全模态都支持”。本轮没有测试长视频与媒体高并发，音频输入也不支持。之前用 Qwen3.6 处理视频时，我还遇到过 [AV1 解码与视频采样问题]({{< relref "posts/vLLM + Qwen3.6 视频推理踩坑记录.md" >}})，输入视频的编码链路同样需要单独检查。

JSON Schema 约束输出和 OpenAI Responses API 也能使用。vLLM 的 Anthropic `/v1/messages` 普通消息与工具调用可以跑通，但 Anthropic 原生的 `thinking: {type: "disabled"}` 关不掉 Qwen thinking，仍然要传 Qwen 的 Chat Template 参数。

## SGLang 对比：先绕过 3090 的 P2P 问题

SGLang 使用同样四张 RTX 3090、TP=4 和 131,072 上下文。第一次启动直接死在 P2P 错误：

```text
CUDA error: peer access is not supported between these two devices
```

关闭 NCCL P2P、自定义 AllReduce、调整 Mamba SSM dtype 和 GPU 映射都没有解决。完整 traceback 最终落到 `cuda_ipc_transport_utils.py`：服务在 GPU 上创建多模态 CUDA IPC 特征池，但这组 3090 没有可用 P2P。

最终绕过去的是：

```text
--mm-feature-transport=cpu
```

服务启动后，日志显示 `max_running_requests=40`、`max_total_num_tokens=268202`，上下文为 131,072；Tool Parser 使用 `qwen3_coder`，完整工具续轮也通过。

同口径对比如下：

| 引擎 | 1,747 Token 冷 TTFT | 热 TTFT | 512 Token Decode | 约 32K 冷 TTFT |
| --- | ---: | ---: | ---: | ---: |
| vLLM 0.27.1 | 3.12 秒 | 0.35 秒 | 42.9 tok/s | 44.97 秒 |
| SGLang 测试镜像 | 2.76 秒 | 1.63 秒 | 44.3～44.4 tok/s | 48.30 秒 |

短而全新的冷 Prompt，SGLang 快 0.36 秒，Decode 也略快；长 Prompt 冷 Prefill 则是 vLLM 更快。热请求差距最大：SGLang 日志确认缓存了 1,728/1,747 Token，但端到端 TTFT 仍为 1.63 秒，vLLM 是 0.35 秒。

这套 Agent 负载里，系统 Prompt、工具定义和重复历史占了很大一部分。综合热请求、长 Prefill 和现有运维成本，我没有迁移到 SGLang。这个选择只针对当前四卡环境，不代表 SGLang 在新卡或更高并发场景里一定更慢。

## 单张 RTX 3090 跑 Q4 GGUF

GGUF 使用 Unsloth 的 `Qwen3.8-27B-UD-Q4_K_XL.gguf`。单卡服务配置为 32K 上下文、全层 GPU Offload 和 Flash Attention，模型在 10.25 秒内加载完成。

| 项目 | 结果 |
| --- | ---: |
| `llama-bench` Prompt Processing，512 Token | 1326.42 tok/s |
| `llama-bench` Token Generation，128 Token | 40.27 tok/s |
| 真实接口 TTFT，884 Token Prompt | 1.900 秒 |
| 真实接口流式 Decode，512 Token | 39.17 tok/s |
| 30,024 Token 大海捞针 | 27.10 秒，标记正确 |
| GPU 显存峰值 | 19,616MiB |

17.9GB 的 Q4 能在单张 RTX 3090 上跑通 32K，还剩约 5GB 显存。thinking 分离、两种关闭方式和工具结果续轮也都通过。

但这份 GGUF 没有视觉 projector，只能当纯文本模型用。前面 vLLM 的图片、视频结论不能顺手算到 GGUF 上；我也没有做标准化量化质量评测，速度可用不等于回答质量与 BF16 完全一致。

## 接入 WorkBuddy 和 DeepSeek Harness

接口跑通只是第一层。我更关心把它接进真实 Agent Harness 之后，模型能不能看图、调用工具、操作文件，以及知不知道什么时候该停。两个 Harness 都先请求同一个 OpenAI 兼容网关，再由网关转发到本地 Qwen；下面的地址和密钥全部使用占位符。

### WorkBuddy 的 reasoning_effort 兼容问题

测试使用 WorkBuddy 5.3.13。一开始开启 `supportsReasoning` 后，WorkBuddy 自动发送 `reasoning_effort=high`；而当前 vLLM 服务只接受 `none/low/medium/xhigh`，上游因此返回 400。

调整配置并重启客户端后，普通聊天、图片输入、Bash 工具调用和工具结果续轮都能完成。这里也说明了一个常见问题：模型、推理框架和 Harness 都声称支持 reasoning，不代表枚举值一定兼容。

### DSH 配置

DeepSeek Harness 使用官方 `@deepseek-ai/dsh` 0.1.0-rc.6。我单独建立了隔离的 `DSH_HOME`，避免影响日常环境：

```yaml
agent-default-model:
  provider: qwen-local
  model: qwen3.8-27b
  reasoningEffort: low

llm-pi-ai:
  providers:
    qwen-local:
      api: openai-completions
      baseURL: https://<NEW_API_BASE>/v1
      apiKeyEnv: NEW_API_KEY
      defaultInput: [text, image]
      compat:
        thinkingFormat: openai
        supportsReasoningEffort: true
      reasoning: low
      models:
        - id: qwen3.8-27b
          contextWindow: 131072
          maxTokens: 32768
          reasoningEfforts:
            off: none
            low: low
            medium: medium
            xhigh: xhigh
```

普通文本、`off` 关闭 thinking、`low` 分离 reasoning、Bash 工具调用和工具续轮都正常。DSH 的 `read_image` 也会把图片作为原生 Image Block 交给 Qwen，不是先偷偷换成外部 OCR 文本。

![DeepSeek Harness 调用 read_image 读取四张测试发票图片](https://imgbed.szmckj.cn/uploads/2026/08/18/6a8346da3c25b.png)

如果不熟悉 Harness 里的 Tool Call 和工具结果续轮，可以先看[模型到底是怎么调用工具的]({{< relref "posts/模型到底是怎么调用工具的.md" >}})。

## 用真实发票任务检查 Agent 闭环

测试材料来自一个 12306 发票压缩包，另加两张真实电子发票截图。ZIP 同时包含 OFD 和 PDF，但它们是同一张铁路电子客票的两种格式。任务要求 Agent 自己完成：

1. 解压并识别 OFD、PDF、PNG。
2. 判断 OFD 与 PDF 是否重复，按发票号码去重。
3. 把唯一发票整理成带公式、筛选和正确数据类型的 Excel。
4. 生成审计记录，同时隐藏完整身份证、手机号、卡号和长票号。

### WorkBuddy：识别准确，交付阶段卡在子 Agent

PDF 的字体编码导致 pypdf 无法抽取文本，WorkBuddy 没有卡死，而是解包 OFD，从附件的 XBRL XML 读取发票字段。它还把 PDF 内嵌 XML 与 OFD 附件做了字节级比对：两份都是 4,183 bytes，SHA-256 一致，从而确认它们是同一张票。

最终三张唯一发票都识别出来，三组不含税金额、税额和 254.10 元价税合计也正确。

拖慢任务的是文件交付阶段。主 Agent 已经整理好数据，却又调用内置 `sheet-agent` 制作 Excel。日志显示子 Agent 使用的仍是 `qwen3.8-27b`，但从全新上下文开始，重新读取表格 API 参考、检查尚不存在的文件，迟迟没有创建工作簿，最后需要人工介入收束。

全新上下文带来的 Prefill 很可能是耗时因素之一，但不是唯一能从这次测试证明的原因；子 Agent 的任务拆分、工具文档读取和停止条件同样会影响交付。

![WorkBuddy 完成发票去重并生成带公式的 Excel](https://imgbed.szmckj.cn/uploads/2026/08/18/6a83489a18db0.png)

### DSH：过度分析可以靠约束缓解，但识别错误还在

同一批材料交给 DSH 后，它先创建 Python 环境、解压 ZIP、解析 OFD，再并行调用 `read_image` 读取两张原图。这一段正常。

随后它开始反复怀疑 20 位发票号码：裁图、放大 3 倍和 6 倍，再安装 NumPy 做暗色行列扫描、ASCII 字符画、逐字形分割、孔洞计数和阈值调整。到第 25 步，它还在研究“数字 0 的闭环为什么漏了”。

我在 14 分 57 秒时终止了第一次任务：共 37 次工具调用，没有生成 Excel，也没有生成审计文件。

恢复测试沿用同一工作区，但开启全新 DSH 会话，并明确限制：禁止裁图、OCR、像素分析和子 Agent；每张原图只允许查看一次；不确定就标注；三轮工具内优先生成文件。

第二次用了 6 个步骤、8 次工具调用，在 9 分 55 秒后完成交付。文件结构和金额看起来不错：三张唯一发票、日期、税率、三组金额、254.10 元总计、`SUM` 公式、文本票号、冻结窗格和筛选都正确。

但独立核对后仍有至少三处实体字段错误：一张 PNG 的发票号码严重误读，另一张 PNG 的销售方名称误读，第一张 PNG 的开票人姓名也错了。

这轮更像是在测整个 Agent 系统，而不是只测 Qwen 的“智商”。同一个模型换 Harness、工具说明、任务约束和子 Agent 策略，结果差异很大。对发票这类高准确性文件任务，最终产物仍然必须做独立校验。

## 最终怎么选

从 Qwen3.5-27B 开始，这个尺寸就是我本地模型测试的常驻基座。之前的 [Qwen3.5-35B-A3B 部署记录]({{< relref "posts/Qwen3.5-35B-A3B浅尝.md" >}}) 更偏向吞吐；这次换成 27B Dense，关注点明显转向长上下文、缓存和 Agent 完整闭环。

当前这套环境，我会这样使用：

- **四卡 BF16 继续留在 vLLM**：热请求、长上下文、多模态和 Prefix Cache 的综合表现最符合现有 Agent 负载。
- **SGLang 保留为备选**：它已经证明能在这组 3090 上稳定启动，Decode 略快；换到互联更好的新卡或更高并发，再重新比较才公平。
- **单卡 Q4 用于纯文本轻负载**：约 39～40 tok/s，适合个人和临时 Agent，但要接受没有视觉 projector、量化质量尚未评测的边界。
- **Harness 必须看任务闭环**：聊天、看图和单次 Tool Call 通过，只能证明接口兼容。真实文件任务还要检查停止条件、子 Agent 上下文、工具开销和最终产物准确性。

27B 这个“能力不至于太差、量化后又能塞进单卡”的尺寸，依然是本地 Agent 很舒服的一档。后面更值得继续测的，不只是换模型，而是把 Prefix Cache 扩展到 CPU 或 SSD 的分层缓存，以及在不牺牲正确性的前提下重新尝试 MTP。

## 参考资料

- [Qwen3.8-27B 官方 Hugging Face 模型页](https://huggingface.co/Qwen/Qwen3.8-27B)
- [Qwen3.8-27B ModelScope 模型页](https://www.modelscope.cn/models/Qwen/Qwen3.8-27B)
- [vLLM 官方 Qwen3.8-27B Recipe](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)
- [Unsloth Qwen3.8-27B GGUF](https://huggingface.co/unsloth/Qwen3.8-27B-GGUF)
- [vLLM Qwen3 reasoning parser 源码](https://github.com/vllm-project/vllm/blob/main/vllm/parser/qwen3.py)
- [vLLM Qwen3 XML Tool Parser 源码](https://github.com/vllm-project/vllm/blob/main/vllm/tool_parsers/qwen3_engine_tool_parser.py)
- [vllm#40696：混合模型块对齐导致短前缀零命中](https://github.com/vllm-project/vllm/issues/40696)
- [vllm#47194：Prefix Cache 与 MTP3 组合问题](https://github.com/vllm-project/vllm/issues/47194)
- [SkyRL#1981：Qwen3.6-27B MTP 与 Prefix Cache 正确性问题](https://github.com/NovaSky-AI/SkyRL/issues/1981)
- [Hybrid Models Meet SGLang · PyTorch 官方博客](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention/)
- [SGLang 官方 Qwen3.8-27B Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)
- [llama.cpp Server 文档](https://github.com/ggml-org/llama.cpp/tree/master/tools/server)
- [llama.cpp CUDA 构建文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)
- [llama.cpp Qwen3.5 架构实现](https://github.com/ggml-org/llama.cpp/blob/master/src/models/qwen35.cpp)
- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
