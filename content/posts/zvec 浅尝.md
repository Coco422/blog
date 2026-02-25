---
title: zvec 浅尝
description: 阿里巴巴开源向量数据库 zvec 初体验
date: 2026-02-25T11:23:33+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-25T11:29:11+08:00
showLastMod: true
tags:
  - zvec
  - vector-db
  - rag
categories:
  - 杂技浅尝
---
> 阿里新开源了 zvec，开个小仓库浅浅试一下。
>
> 这篇就是折腾记录，不作为任何指南、是为了给未来如果做 LLM桌面应用时，多一个 vector DB 的选择。

[GitHub - alibaba/zvec](https://github.com/alibaba/zvec)  
[GitHub - Coco422/zvec-try](https://github.com/Coco422/zvec-try)

## 怎么测的

目标很简单：先把“建库 -> 入库 -> 向量查询 -> 命中评估”这条链路跑通。

我在 `zvec-try` 里做了这几件事：

- 用 `datasets/*.json` 配 4 组中英混合语料
- 每条 query 写 `expected_doc_ids`，按 top-k 命中做 PASS/FAIL
- embedding 走第三方 API（SiliconFlow / 阿里云/自部署）
- 每个语料单独创建一个本地 zvec collection，方便重复跑

## 配环境

我还是用 `uv`。

```bash
uv sync
cp .env.example .env
```

`.env` 里填这几个值就能跑：

```bash
AI_BASE_URL=https://api.siliconflow.cn
AI_API_KEY=sk-xxx
EMBEDDING_MODEL_NAME=Qwen/Qwen3-Embedding-0.6B
```

代码里对 endpoint 处理了一下：

- 如果你已经写到 `/v1`，会自动补成 `/v1/embeddings`
- 如果你直接写域名，也会自动拼接 embeddings 路径

## 数据格式

每个语料是一个 JSON，结构大概这样：

```json
{
  "name": "consumer_tech_cn_en",
  "docs": [
    { "id": "ctech_001", "lang": "zh", "text": "..." }
  ],
  "queries": [
    {
      "id": "ctech_q01",
      "direction": "zh->zh",
      "text": "...",
      "expected_doc_ids": ["ctech_001"],
      "topk": 3
    }
  ]
}
```

我这次放了 4 份语料：

- `consumer_tech.json`
- `health_sports.json`
- `travel_food.json`
- `work_learning.json`

## 跑起来

```bash
uv run python main.py
```

也可以指定参数：

```bash
uv run python main.py --config-dir datasets --pattern "*.json" --default-topk 3 --batch-size 32
```

脚本输出会按 query 打印：

- `PASS/FAIL`
- 期望文档 id
- 实际 topk 命中 id
- top1 文本截断内容

最后会汇总每个语料和整体命中率，后续换 embedding 模型时直接横向对比就行。

## 对 zvec 的第一印象

1. API 比较直给，`schema -> insert -> query` 路线清楚。
2. 本地落盘调试很方便，做小规模评估很顺手。
3. 对我这种“先跑通再说”的场景，门槛不高。

## 下一步准备做啥

- 原本还想测试 image 或者 audio 的，暂时不支持，那就放入遥遥无期的 TODO 中
- 加 rerank（和纯向量召回分开看）
- 记录 `recall@k`、延迟、不同 batch size 的变化
- 再补一版偏业务文本的数据，不只测短句问答

