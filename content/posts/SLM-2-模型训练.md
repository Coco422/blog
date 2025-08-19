---
title: SLM-2-模型训练
description: 
date: 2025-08-19T12:35:53+08:00
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
# 接上篇，定义 SLM 的模型架构

代码如下

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from dataclasses import dataclass
import numpy as np
from tqdm.auto import tqdm
from contextlib import nullcontext
import os


class LayerNorm(nn.Module):
	"""
	- 与 `nn.LayerNorm(ndim, elementwise_affine=bias)` 等价，手搓是为了**可控是否带 bias**。
	- 作用：把最后一维做标准化，稳定训练。
	- 形状不变：`(B, T, C) → (B, T, C)`。
	"""
    def __init__(self, ndim, bias):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(ndim))
        self.bias = nn.Parameter(torch.zeros(ndim)) if bias else None
    def forward(self, x):
        return F.layer_norm(x, self.weight.shape, self.weight, self.bias, 1e-5)

class CausalSelfAttention(nn.Module):
"""
自回归注意力
"""
    def __init__(self, config):
        super().__init__()
        assert config.n_embd % config.n_head == 0
        self.c_attn = nn.Linear(config.n_embd, 3 * config.n_embd, bias=config.bias) # 生成 Q,K,V
        self.c_proj = nn.Linear(config.n_embd, config.n_embd, bias=config.bias) # 多头拼回后做投影
         # 注意力/残差丢弃
        self.attn_dropout = nn.Dropout(config.dropout)
        self.resid_dropout = nn.Dropout(config.dropout)
        self.n_head = config.n_head
        self.n_embd = config.n_embd
        self.flash = hasattr(F, 'scaled_dot_product_attention')
        if not self.flash:
            self.register_buffer("bias", torch.tril(torch.ones(config.block_size, config.block_size))
                                       .view(1, 1, config.block_size, config.block_size))

    def forward(self, x):
        B, T, C = x.size()
        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
        k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)

        if self.flash:
            y = F.scaled_dot_product_attention(q, k, v, attn_mask=None, dropout_p=self.attn_dropout.p if self.training else 0.0, is_causal=True)
        else:
            att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))
            att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))
            att = F.softmax(att, dim=-1)
            att = self.attn_dropout(att)
            y = att @ v

        y = y.transpose(1, 2).contiguous().view(B, T, C)
        y = self.resid_dropout(self.c_proj(y))
        return y

class MLP(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_fc = nn.Linear(config.n_embd, 4 * config.n_embd, bias=config.bias)
        self.gelu = nn.GELU()
        self.c_proj = nn.Linear(4 * config.n_embd, config.n_embd, bias=config.bias)
        self.dropout = nn.Dropout(config.dropout)
    def forward(self, x):
        return self.dropout(self.c_proj(self.gelu(self.c_fc(x))))

class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln1 = LayerNorm(config.n_embd, config.bias)
        self.attn = CausalSelfAttention(config)
        self.ln2 = LayerNorm(config.n_embd, config.bias)
        self.mlp = MLP(config)
    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x

@dataclass
class GPTConfig:
    block_size: int
    vocab_size: int
    n_layer: int
    n_head: int
    n_embd: int
    dropout: float = 0.0
    bias: bool = True

class GPT(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.transformer = nn.ModuleDict(dict(
            wte=nn.Embedding(config.vocab_size, config.n_embd),
            wpe=nn.Embedding(config.block_size, config.n_embd),
            drop=nn.Dropout(config.dropout),
            h=nn.ModuleList([Block(config) for _ in range(config.n_layer)]),
            ln_f=LayerNorm(config.n_embd, config.bias),
        ))
        self.lm_head = nn.Linear(config.n_embd, config.vocab_size, bias=False)
        self.transformer.wte.weight = self.lm_head.weight  # weight tying

        self.apply(self._init_weights)
        for pn, p in self.named_parameters():
            if pn.endswith('c_proj.weight'):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * config.n_layer))

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        device = idx.device
        b, t = idx.size()
        assert t <= self.config.block_size
        pos = torch.arange(0, t, dtype=torch.long, device=device)

        tok_emb = self.transformer.wte(idx)
        pos_emb = self.transformer.wpe(pos)
        x = self.transformer.drop(tok_emb + pos_emb)
        for block in self.transformer.h:
            x = block(x)
        x = self.transformer.ln_f(x)

        if targets is not None:
            logits = self.lm_head(x)
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-1)
            return logits, loss
        else:
            logits = self.lm_head(x[:, [-1], :])
            return logits, None

    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):
        """
        Generate tokens given a conditioning sequence.
        idx: Tensor of shape (B, T)
        """
        for _ in range(max_new_tokens):
            idx_cond = idx if idx.size(1) <= self.config.block_size else idx[:, -self.config.block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')
            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx

config = GPTConfig(
    vocab_size=50257,     # 使用分词器的词汇表大小
    block_size=128,       # 或你训练时使用的任何上下文大小
    n_layer=6,
    n_head=6,
    n_embd=384,
    dropout=0.1,
    bias=True
)

model = GPT(config)
```

## CausalSelfAttention（自回归注意力）

```python
assert n_embd % n_head == 0 self.c_attn = nn.Linear(C, 3C)      # 生成 Q,K,V 
self.c_proj = nn.Linear(C, C)       # 多头拼回后做投影 
self.attn_dropout / resid_dropout   # 注意力/残差丢弃 
self.flash = hasattr(F, 'scaled_dot_product_attention') if not flash:     self.register_buffer("bias", tril(ones(T,T)).view(1,1,T,T))
```

- 将输入 `x` 线性变换得到 **q/k/v**，每个 shape `(B, T, C)`，再 reshape 成 `(B, n_head, T, head_dim)`。
- **Flash/SDPA 路径**：PyTorch 内置 `scaled_dot_product_attention`，设 `is_causal=True` 自动做下三角 mask，快而省显存。
- **回退路径**：手动算 `att = q @ k^T / sqrt(d)`，再用注册的下三角 `bias` 做 mask：
    - `bias` 维度 `(1,1,T,T)`，只保留 `i≥j` 的位置，保证**只能看见过去**。
- 最后把多头输出拼回 `(B, T, C)`，投影并做残差丢弃。
**形状小抄**
- 入：`x: (B, T, C)`
- 出：`y: (B, T, C)`
**注意**
- `bias` 的 `T` 用的是 `config.block_size`。若推理时序列长度 > `block_size`，回退路径会越界；但 Flash 路径不受此限。
### 解释

#### 基础设定

1. **x: (B, T, C)**
    你有一段输入，比如一句话里的字/词。
    - **B** = batch，大概就是“同时处理多少句话”。
    - **T** = 时间步长，就是句子有多少个字/词。
    - **C** = 每个字/词的向量维度，可以理解成“每个字有多少个特征”。
2. Q/K/V（查询、键、值）
	•	把输入向量 x 分三份：
	•	Q (Query 查询)：我要看别的词。
	•	K (Key 键)：我能提供什么信息。
	•	V (Value 值)：具体信息内容。
	•	每个 shape 最开始都是 (B, T, C)。再 reshape 成 (B, n_head, T, head_dim)：就像让很多小组（head）分头看，不同小组看问题的角度不同。
3. Flash 路径 vs 回退路径
	•	Flash / SDPA 路径：PyTorch 内置的 scaled_dot_product_attention，就像显卡加速版，自动帮你算“谁可以看谁”。只要设 is_causal=True，它会自动加下三角遮罩（mask），保证当前词不能偷看未来。又快又省内存。
	•	回退路径（手工实现）：如果没有显卡加速，就自己算：
	1.	做点积：att = q @ k^T / sqrt(d) → 代表“查询词对键的相关性”。
	2.	用 bias（下三角矩阵）遮住未来：bias 形状 (1, 1, T, T)，保证第 i 个词只能看到自己和之前的词。
4. 拼回与投影
	•	各个头（小组）得到的信息会合并成 (B, T, C)。
	•	再过一层线性变换（c_proj），把信息“压缩整理”回原来的维度。
	•	最后做 dropout（随机丢弃部分连接），防止过拟合。
5. 形象比喻
	想象你在写作文，每个字要决定自己怎么写：
	•	Q = 我在想：我要参考哪些前面的字？
	•	K = 每个字举手说：我能告诉你些什么。
	•	V = 每个字手里的小抄内容。
	•	Attention = 根据 Q 和 K 的匹配程度，决定 V 的权重。
	•	Causal Mask（下三角遮罩） = 老师规定：写第 i 个字时，只能看前面写过的，不许看后面的。
	•	多头 (Multi-head) = 你同时派出好几个“审稿小人”，从不同角度帮你挑参考内容，最后合并。
6. 注意点
	•	bias 的大小是按照 最大序列长度 block_size 来建的。如果实际推理时句子更长，mask 不够用，就会报错。
	•	但用 Flash 路径就不会有这个问题，因为它是动态生成的。
#### 总结

**CausalSelfAttention 就像写作文时的小抄机制。每个字只能看前面的字，不许看未来。多个小组（头）一起决定要参考谁，最后合并结果。**

## MLP（前馈网络）

```python
self.c_fc   : Linear(C, 4C) 
self.gelu   : GELU 
self.c_proj : Linear(4C, C) 
self.dropout
```

•	它的作用是：先把每个位置的表示（维度为 C）“放大”成 4C，做非线性变换（GELU），然后再“缩回来”到 C。这就像把每个词的信息拉出来、进行深入加工，然后再压缩整合，丰富表达力。
•	这种“中间层扩大 4 倍”的设置在 GPT、BERT 里很常见，因为它能让网络学到更复杂、更细致的表达。
•	GELU 是一种激活函数，形状比起常见的 ReLU 更平滑、更“智能”。它会根据输入的正负和大小决定“保留多少信息”（通过乘以正态累计函数）。
•	FFN 是 position-wise，意味着它对每个 token（词）的位置完全独立操作，互不干扰。就好像你有一堆独立的“机械臂”，每个机械臂只负责处理一个词的信息。
•	这样做让所有 token 都能并行处理，极大提升效率，同时还能保留每个 token 的独特表示。

## Block（残差结构单元）

```python
x = x + self.attn(self.ln1(x)) 
x = x + self.mlp(self.ln2(x))
```

- **Pre‑LN** 结构（先 LN 再子层），更稳定、易收敛。
- 两次残差。

## 配置类

```python
@dataclass 
class GPTConfig:     
	block_size: int     
	vocab_size: int     
	n_layer: int     
	n_head: int     
	n_embd: int     
	dropout: float = 0.0     
	bias: bool = True
```

- 所有超参数都装这里。`block_size` 是**上下文长度**（位置嵌入表大小）。
## 训练循环

这里我改造了一下代码。加强ckpt 的保存。但是跑完一次之后，我发现似乎是我的数据处理有问题，时间有限。大概理解了一点点训练流程，估计还是要从基础开始学起。这个后面再进行了，这次训练模型只花了两个小时左右

```python
import os, math, csv, time
import torch
from torch.optim.lr_scheduler import LinearLR, SequentialLR, CosineAnnealingLR


# ====== 设备/AMP 设置 ======
device = "cuda" if torch.cuda.is_available() else "cpu"
device_type = "cuda" if device == "cuda" else "cpu"
dtype = "bfloat16" if (device == "cuda" and torch.cuda.is_bf16_supported()) else ("float16" if device == "cuda" else "float32")
ptdtype = {"float32": torch.float32, "bfloat16": torch.bfloat16, "float16": torch.float16}[dtype]
ctx = (torch.amp.autocast(device_type=device_type, dtype=ptdtype) if device != "cpu" else torch.autocast("cpu", dtype=ptdtype)) if dtype != "float32" else torch.no_grad if False else torch.enable_grad()

torch.set_float32_matmul_precision("high") if device == "cuda" else None
torch.manual_seed(42)
if device == "cuda":
    torch.cuda.manual_seed_all(42)

# ====== 工具：初始化/追加 CSV ======
def _open_metrics_csv(path):
    new_file = not os.path.exists(path)
    f = open(path, "a", newline="")
    w = csv.writer(f)
    if new_file:
        w.writerow(["step", "opt_step", "time_s", "train_loss", "val_loss", "lr"])
        f.flush(); os.fsync(f.fileno())
    return f, w

# ====== 工具：保存/加载断点 ======
def _to_bytetensor(x):
    """尽量把 x 转成 CPU 上的 uint8 ByteTensor；不行就抛异常。"""
    if isinstance(x, torch.Tensor):
        return x.detach().to('cpu').to(torch.uint8)
    try:
        import numpy as np
        if isinstance(x, np.ndarray):
            return torch.from_numpy(x.astype('uint8', copy=False))
    except Exception:
        pass
    if isinstance(x, (bytes, bytearray)):
        return torch.tensor(list(x), dtype=torch.uint8)
    if isinstance(x, (list, tuple)):
        # 可能是纯 int 列表
        try:
            return torch.tensor(x, dtype=torch.uint8)
        except Exception:
            pass
    raise TypeError(f"cannot convert type {type(x)} to ByteTensor")

def save_ckpt(path, model, optimizer, scheduler, scaler, step, opt_step, best_val_loss):
    payload = {
        "model": model.state_dict(),
        "optimizer": optimizer.state_dict(),
        "scheduler": scheduler.state_dict(),
        "scaler": (scaler.state_dict() if scaler is not None else None),
        "step": int(step),
        "opt_step": int(opt_step),
        "best_val_loss": float(best_val_loss),
        "rng": {
            "torch": _to_bytetensor(torch.get_rng_state()),
            "cuda": ( [ _to_bytetensor(s) for s in torch.cuda.get_rng_state_all() ]
                      if torch.cuda.is_available() else None ),
        }
    }
    torch.save(payload, path)

def load_ckpt(path, model, optimizer, scheduler, scaler):
    ckpt = torch.load(path, map_location='cpu')  # 先加载到 CPU 更安全
    model.load_state_dict(ckpt["model"])
    optimizer.load_state_dict(ckpt["optimizer"])
    scheduler.load_state_dict(ckpt["scheduler"])
    if scaler is not None and ckpt.get("scaler") is not None:
        scaler.load_state_dict(ckpt["scaler"])

    step = int(ckpt.get("step", 0))
    opt_step = int(ckpt.get("opt_step", step))
    best_val_loss = float(ckpt.get("best_val_loss", float("inf")))

    # —— 尝试恢复 RNG（失败就给提示并跳过）——
    try:
        tstate = ckpt.get("rng", {}).get("torch", None)
        if tstate is not None:
            torch.set_rng_state(_to_bytetensor(tstate))
    except Exception as e:
        print(f"[WARN] skip restoring torch RNG: {e}")

    try:
        cstates = ckpt.get("rng", {}).get("cuda", None)
        if (cstates is not None) and torch.cuda.is_available():
            # 允许各种形态：list[Tensor/ndarray/list...] → list[ByteTensor]
            states_bt = []
            for s in cstates:
                try:
                    states_bt.append(_to_bytetensor(s))
                except Exception:
                    pass
            # 如果数量不匹配，就尽力把第一个应用到所有可见 GPU
            if len(states_bt) == torch.cuda.device_count():
                torch.cuda.set_rng_state_all(states_bt)
            elif len(states_bt) >= 1:
                for dev in range(torch.cuda.device_count()):
                    torch.cuda.set_rng_state(states_bt[0], device=dev)
            else:
                print("[WARN] cuda RNG in ckpt is empty; skip")
    except Exception as e:
        print(f"[WARN] skip restoring cuda RNG: {e}")

    return step, opt_step, best_val_loss

# ====== 构建优化器/调度器/AMP ======
def build_optim_sched(model):
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, betas=betas, weight_decay=weight_decay, eps=eps)

    # 以“优化步”为时间单位设置 scheduler，比用微步更合理
    total_updates = math.ceil(max_iters / gradient_accumulation_steps)
    warmup_updates = max(1, math.ceil(warmup_iters / gradient_accumulation_steps))
    decay_updates = max(1, total_updates - warmup_updates)

    scheduler_warmup = LinearLR(optimizer, start_factor=1e-8, total_iters=warmup_updates)
    scheduler_decay  = CosineAnnealingLR(optimizer, T_max=decay_updates, eta_min=min_lr)
    scheduler = SequentialLR(optimizer, [scheduler_warmup, scheduler_decay], milestones=[warmup_updates])

    scaler = torch.cuda.amp.GradScaler(enabled=(dtype == "float16"))
    return optimizer, scheduler, scaler, total_updates, warmup_updates

# ====== 主训练 ======
def train(model):
    model = model.to(device)

    optimizer, scheduler, scaler, total_updates, warmup_updates = build_optim_sched(model)

    # 断点恢复（可多次中断/继续）
    start_step = -1
    opt_step = 0
    best_val_loss = float("inf")
    if resume_if_possible and os.path.exists(last_ckpt_path):
        start_step, opt_step, best_val_loss = load_ckpt(last_ckpt_path, model, optimizer, scheduler, scaler)
        print(f"[RESUME] from {last_ckpt_path}: step={start_step}, opt_step={opt_step}, best_val={best_val_loss:.6f}, lr={optimizer.param_groups[0]['lr']:.6f}")

    metrics_f, metrics_w = _open_metrics_csv(metrics_csv_path)
    t0 = time.time()

    try:
        for step in range(start_step + 1, max_iters):
            # === 取数据（建议你的 get_batch 已经把张量送到 device）===
            X, y = get_batch("train")

            # === 前向/反向（累积梯度）===
            with ctx:
                logits, loss = model(X, y)
                loss = loss / gradient_accumulation_steps
            scaler.scale(loss).backward()

            # === 到了累积边界：做一次优化步 & scheduler ===
            boundary = ((step + 1) % gradient_accumulation_steps == 0) or (step + 1 == max_iters)
            if boundary:
                if scaler.is_enabled():
                    scaler.unscale_(optimizer)  # 先反缩放，再裁剪
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.5)

                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)

                scheduler.step()  # 只在真正 optimizer.step() 后走一步
                opt_step += 1

            # === 周期性评估/记录/保存最优 ===
            if (step % eval_every == 0) and (step != start_step + 1):  # 避免刚恢复的一次立刻评估（可按需调整）
                losses = estimate_loss(model)
                lr = optimizer.param_groups[0]["lr"]
                print(f"[step {step} | opt {opt_step}] train {losses['train']:.4f}  val {losses['val']:.4f}  lr {lr:.6f}")

                # 写 CSV（训练/验证损失 + lr）
                metrics_w.writerow([step, opt_step, round(time.time() - t0, 2),
                                    float(losses["train"]), float(losses["val"]), float(lr)])
                metrics_f.flush(); os.fsync(metrics_f.fileno())

                # 保存 best
                if losses["val"] < best_val_loss:
                    best_val_loss = losses["val"]
                    torch.save(model.state_dict(), best_model_params_path)

            # === 可选：定期保存完整断点（例如每 2000 微步）===
            if step % 2000 == 0 and step != start_step + 1:
                save_ckpt(last_ckpt_path, model, optimizer, scheduler, scaler, step, opt_step, best_val_loss)

        # 训练正常结束再保存一次断点
        save_ckpt(last_ckpt_path, model, optimizer, scheduler, scaler, step, opt_step, best_val_loss)
        print("Training finished.")

    except KeyboardInterrupt:
        print("\n[Interrupt] Saving last checkpoint...")
        save_ckpt(last_ckpt_path, model, optimizer, scheduler, scaler, step, opt_step, best_val_loss)
        print(f"Saved to {last_ckpt_path}. You can resume later.")

    finally:
        metrics_f.close()

```

每个 Transformer block 是这样走的：
	1.	输入先过 LayerNorm
	2.	接着进到 自注意力层 → 输出 + 残差连接
	3.	再过一次 LayerNorm
	4.	进入 前馈 MLP（C → 4C → GELU → C） → 输出 + 残差连接
	5.	最终输出传给下一层

## 推理

绘图
```python
import matplotlib.pyplot as plt
train_loss_list_converted = [i.cpu().detach() for i in train_loss_list]
validation_loss_list_converted = [i.cpu().detach() for i in validation_loss_list]


plt.plot(train_loss_list_converted, 'g', label='train_loss')
plt.plot(validation_loss_list_converted, 'r', label='validation_loss')
plt.xlabel("Steps - Every 100 epochs")
plt.ylabel("Loss")
plt.legend()
plt.show()
```

```python
#加载模型
model = GPT(config)  # 使用相同的配置重新创建模型
device =  "cuda" if torch.cuda.is_available() else "cpu"
best_model_params_path = "best_model_params.pt"
model.load_state_dict(torch.load(best_model_params_path, map_location=torch.device(device))) # 加载最优模型状态

sentence = "Once upon a time there was a pumpkin."
context = (torch.tensor(enc.encode_ordinary(sentence)).unsqueeze(dim = 0))
y = model.generate(context, 200)
print(enc.decode(y.squeeze().tolist()))

sentence = "A little girl went to the woods"
context = (torch.tensor(enc.encode_ordinary(sentence)).unsqueeze(dim = 0))
y = model.generate(context, 200)
print(enc.decode(y.squeeze().tolist()))
```
