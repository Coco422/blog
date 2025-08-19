---
title: SLM-1-数据准备
description: 从零训练一个小语言模型
date: 2025-08-19T11:14:18+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - llm
categories:
  - ""
  - 杂技浅尝
showLastmod: true
---
## 流程

1. **数据导入** - 使用 TinyStories 数据集
2. **数据分词** - 使用 tiktoken 进行 GPT-2 风格的分词
3. **批次创建** - 为训练创建输入-输出批次
4. **模型架构** - 实现了完整的 GPT 架构，包括：
    - `LayerNorm`
    - `CausalSelfAttention`
    - `MLP`
    - `Block`
    - `GPT` 主模型类
5. **损失函数** - `estimate_loss()` 函数
6. **训练配置** - 学习率、批次大小等超参数设置
7. **优化器和调度器** - AdamW 优化器配合学习率调度
8. **训练循环** - 完整的训练过程
9. **可视化** - 损失函数曲线绘制
10. **推理测试** - 模型生成文本的示例

## 数据导入

用的数据集是 tinystory [roneneldan/TinyStories · Datasets at Hugging Face](https://huggingface.co/datasets/roneneldan/TinyStories) 
这是由 gpt 生成的

首先安装依赖后加载数据

依赖
```requirements.txt
datasets
tiktoken
```


![image.png](https://imgbed.anluoying.com/2025/08/5306bca1bbbb57b7bddc976f1357cf10.png)

这里我直接拿到的是 txt 文件。如果网络方便的话可以直接
```python
from datasets import load_dataset
# 导入数据，这里记得科学上网，否则无法在hf上下载数据集
ds = load_dataset("roneneldan/TinyStories")
```

所以我这边根据 C 老师的指导加载本地数据 以及 验证数据加载效果。代码如下

```python
from datasets import Dataset, DatasetDict

# 导入本地数据集
def load_local_dataset():
    train_data = []
    val_data = []
    
    # 读取训练数据
    with open('/data/yangr/yyai-slm/datasets/TinyStories-train.txt', 'r', encoding='utf-8') as f:
        train_content = f.read()
        # 按空行分割故事
        stories = train_content.strip().split('\n\n')
        train_data = [{'text': story.strip()} for story in stories if story.strip()]
    
    # 读取验证数据
    with open('/data/yangr/yyai-slm/datasets/TinyStories-valid.txt', 'r', encoding='utf-8') as f:
        val_content = f.read()
        # 按空行分割故事
        stories = val_content.strip().split('\n\n')
        val_data = [{'text': story.strip()} for story in stories if story.strip()]
    
    # 创建数据集
    train_dataset = Dataset.from_list(train_data)
    val_dataset = Dataset.from_list(val_data)
    
    return DatasetDict({
        'train': train_dataset,
        'validation': val_dataset
    })

ds = load_local_dataset()

# 查看数据集的键（分割）
print("数据集分割:", list(ds.keys()))
print()

# 查看训练集和验证集的大小
print(f"训练集大小: {len(ds['train'])}")
print(f"验证集大小: {len(ds['validation'])}")
print()

# 查看数据集的特征（列）
print("数据集特征:", ds['train'].features)
print()

# 查看前几个样本
print("训练集前3个样本:")
for i in range(min(3, len(ds['train']))):
    print(f"样本 {i+1}:")
    print(ds['train'][i]['text'][:200] + "..." if len(ds['train'][i]['text']) > 200 else ds['train'][i]['text'])
    print("-" * 50)

print("\n验证集前2个样本:")
for i in range(min(2, len(ds['validation']))):
    print(f"样本 {i+1}:")
    print(ds['validation'][i]['text'][:200] + "..." if len(ds['validation'][i]['text']) > 200 else ds['validation'][i]['text'])
    print("-" * 50)
```

## 对数据集进行分词

(1) 将数据集分词为 tokenIDs。
(2) 创建名为 "train.bin" 和 "validation.bin" 的文件，用于存储整个数据集的 tokenIDs。
(3) 我们确保 tokenIDs 存储在磁盘上，而不是内存中，以实现高效的计算。

```python
!pip install tiktoken
import tiktoken
import os
import numpy as np
from tqdm.auto import tqdm

enc = tiktoken.get_encoding("gpt2")

def process(example):
    ids = enc.encode_ordinary(example['text']) # encode_ordinary 会忽略所有特殊令牌
    out = {'ids': ids, 'len': len(ids)}
    return out

if not os.path.exists("train.bin"):
    tokenized = ds.map(
        process,
        remove_columns=['text'],
        desc="tokenizing the splits",
        num_proc=8,
        )
    # 将每个数据集中的所有 id 连接成一个大型文件，供训练使用
    for split, dset in tokenized.items():
        arr_len = np.sum(dset['len'], dtype=np.uint64)
        filename = f'{split}.bin'
        dtype = np.uint16 # (可以这样做，因为 enc.max_token_value == 50256 小于 2**16)
        arr = np.memmap(filename, dtype=dtype, mode='w+', shape=(arr_len,))
        total_batches = 1024

        idx = 0
        for batch_idx in tqdm(range(total_batches), desc=f'writing {filename}'):
            # 将样本批量组合以加快写入速度
            batch = dset.shard(num_shards=total_batches, index=batch_idx, contiguous=True).with_format('numpy')
            arr_batch = np.concatenate(batch['ids'])
            # 写入内存映射文件（mmap）
            arr[idx : idx + len(arr_batch)] = arr_batch
            idx += len(arr_batch)
        arr.flush()
```

## 批次创建-为数据集创建输入-输出批次

从整段 token 流（`*.bin`）里**随机抽取** `batch_size` 个长度为 `block_size` 的连续片段作为输入 `x`，并把它们**右移一位**得到标签 `y`，用于**下一个 token 的预测**（next-token prediction）。

```python
def get_batch(split):
    # 我们每个批次都重新创建 np.memmap，以避免内存泄漏
    if split == 'train':
        data = np.memmap('train.bin', dtype=np.uint16, mode='r')
    else:
        data = np.memmap('validation.bin', dtype=np.uint16, mode='r')
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([torch.from_numpy((data[i:i+block_size]).astype(np.int64)) for i in ix])
    y = torch.stack([torch.from_numpy((data[i+1:i+1+block_size]).astype(np.int64)) for i in ix])
    if device_type == 'cuda':
        # 固定数组 x 和 y，使我们能够将它们异步地移动到 GPU（non_blocking=True）
        x, y = x.pin_memory().to(device, non_blocking=True), y.pin_memory().to(device, non_blocking=True)
    else:
        x, y = x.to(device), y.to(device)
    return x, y
```

