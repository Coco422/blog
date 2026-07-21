---
title: vLLM + Qwen3.6 视频推理踩坑记录
description: 记录使用 vLLM 0.19.1 部署 Qwen3.6-27B 做视频理解时遇到的 AV1 解码、OpenCV 读帧、timestamps 报错与 file:// 路径问题，并整理转码和分段采样建议。
date: 2026-07-16T17:47:03+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-07-16T18:34:16+08:00
showLastMod: true
tags:
  - AI
  - vLLM
  - Qwen3p6
  - OpenCV
categories:
  - 杂技浅尝
---
## **vLLM + Qwen3.6 视频推理踩坑记录：AV1、OpenCV 与视频采样问题**

> [!info] 
>  之前 qwen3.6-27b 模型发布后没多久我就部署他 并且测试过视频能力，一直是公司内部署的主力离线大模型。
>  
所以我认为一直可用，但是今天同事提了个新的需求，要从视频中找出属于广告部分的内容裁剪掉。我首先给出的方案是 用 Qwen3-ASR+Qwen3-ForcedAligner 模型来获取 文本内容以及时间轴，再用 LLM 来判断哪些文本属于广告内容，随后根据文本所对应的时间轴裁剪视频，先这样子给同事搭建了环境让他去跑几个试试，同时我来试试直接让 qwen3.6 读视频是否可行。结果一来就给我个报错

## **环境**

```
Model:
Qwen3.6-27B
BF16

vLLM:
0.19.1

Transformers:
5.6.0

Python:
3.12

4*RTX 3090 24GB
```

```
启动参数：

vllm serve /data/huggingface_model/Qwen/Qwen3.6-27B \
  --served-model-name qwen3.6-27b \
  --port 13539 \
  --tensor-parallel-size 4 \
  --max-model-len 65536 \
  --reasoning-parser qwen3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --gpu-memory-utilization 0.90 \
  --max-num-seqs 4 \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --disable-custom-all-reduce \
  --allowed-local-media-path /<指定目录> \
  --media-io-kwargs '{"video":{"num_frames":64}}' \
  --mm-processor-kwargs '{"fps":1,"do_sample_frames":false}'
```

这里的 `--media-io-kwargs` 是给 vLLM 多模态视频读取器传额外参数的。`video.num_frames=64` 表示整段视频送进模型前目标采样 64 帧，不是每秒采样 64 帧。比如一个 10 秒、25 FPS 的视频，原本大约有 250 帧，最后会在整段视频的时间范围内均匀取 64 帧，平均下来大约相当于 6.4 FPS。

如果想表达“每秒采样多少帧”，应该设置 `fps`。vLLM 0.19.1 里同时设置 `num_frames` 和 `fps` 时，会取两者限制下更小的采样数量。当前命令只设置了 `num_frames`，所以它主要影响输入的视频帧数量和视觉 Token 数量；它不是修改视频 FPS 的参数，也不能解决视频编码本身无法解码的问题。

另外，这里还加了一个 `--mm-processor-kwargs`：

```bash
--mm-processor-kwargs \
'{
  "fps": 1,
  "do_sample_frames": false
}'
```

这个参数是传给 Qwen3VL/Hugging Face video processor 的。前面的 `--media-io-kwargs` 已经在 vLLM 的视频读取阶段采样了 64 帧，所以这里用 `do_sample_frames: false` 告诉后面的 processor 不要再采样一遍，直接处理已经取出来的帧。

这里的 `fps: 1` 不会把前面采好的 64 帧变成 1 FPS；在 `do_sample_frames: false` 的组合下，实际帧数还是由 `--media-io-kwargs` 决定。如果想让 vLLM 读取阶段按每秒 1 帧采样，应该把 `fps` 放到 `--media-io-kwargs` 的 `video` 参数里。

后面排查时我把它改成了 `-1`，只是想先取消主动的帧数限制，确认问题是不是采样数量导致的。结果 `frames_indices=[]` 依然存在，说明视频根本没有成功解码，和 `num_frames` 没什么关系。

客户端使用 OpenAI SDK：

```python
client.chat.completions.create(...)
```

## **第一个问题**

最开始调用：

```python
{
    "type": "video_url",
    "video_url": {
        "url": "http://xxx/1.mp4"
    }
}
```

直接报：

```
Failed to apply Qwen3VLProcessor

videos=[
    array([], shape=(0,480,854,3))
]

frames_indices=[]
```

我以为是

- FPS 配置
- num_frames
- Processor Bug

不是很懂视频处理，于是求助 GPT，接下来是过程
接下来我把 `--media-io-kwargs` 改成了` --media-io-kwargs '{"video":{"num_frames":-1}}'`

---

## **排查过程**

首先看 metadata：

```
total_num_frames=16970
fps=25
duration=678s
```

说明：

OpenCV 能够读取视频容器中的基础信息（FPS、Frame Count、Duration）

但是：

```
frames_indices=[]
```

说明：

真正解出来的 Frame 数量是：

```
0
```

于是开始怀疑 OpenCV。

---

## **Mac 正常**

但是我随手是在自己的 Mac 上测试了一下视频的情况：

```python
cap = cv2.VideoCapture(url)

ret, frame = cap.read()
```

输出：

```
opened=True
ret=True
frame=(480,854,3)
```

说明：

同样的 Python 代码，在 macOS 上能够正常读取第一帧，因此可以基本排除代码逻辑问题。

---

## **Linux 不正常**

同样代码，在部署 vLLM 的 Linux 上：

```
opened=True
count=16970
fps=25
```

但是：

```
ret=False
```

并且输出：

```
Your platform doesn't support hardware accelerated AV1 decoding.

Failed to get pixel format.

Get current frame error.
```

这里就定位到了。

---

## **最终定位结果**

`ffprobe -hide_banner input.mp4` 执行这个命令 查看视频编码：

```
Video:
av1
```

Ubuntu 上 pip 安装的 OpenCV：

```
opencv-python
```

虽然：

```
VideoCapture
```

可以获取：

- Frame Count
- FPS
- Duration

但是：

```
cap.read()
```

一帧都读不出来。

于是：

vLLM 收到：

```
videos=[
    array([],...)
]
```

最后：

```
Qwen3VLProcessor
```

直接报错。

所以：

**不是 Qwen 的问题。**

也不是：

```
fps
num_frames
```

配置问题。

真正原因是当前 Linux 环境中的 OpenCV（以及其底层 FFmpeg/编解码依赖）无法正确解码该 AV1 视频。

> 因为 OpenCV 会自带 FFmpeg，我在这里 pip 安装的 OpenCV 估计使用的 FFmpeg 不行，有需要的应该可以自己编译，这里我就快速绕过了。

---

### **解决方案**

最简单：

直接转 H264。

```
ffmpeg \
-i input.mp4 \
-c:v libx264 \
-pix_fmt yuv420p \
-c:a copy \
output.mp4
```

之后：

Qwen 即可正常读取。

---

## **第二个问题**

解决 AV1 后。

又遇到了：

```
AssertionError:

timestamps and tokens_per_frame
must have the same length
```

这个已经不是视频编码问题。

这个 AssertionError 最终没有复现，因此没有定位到根因。我重启 vllm 之后就正常了，口头描述一下重启后的现状，运行脚本后很久 vllm 都没有响应，当时 GPU Util 基本保持在 0%，vLLM 进程仍然存活，HTTP Ping 正常，因此更像是请求卡在推理前的某个阶段，而不是服务已经崩溃。一个比较奇怪的现象是，在普通文本请求进入后，原本一直没有响应的视频请求随后开始执行，TTFT 也明显偏长。目前还没有确认这是 Scheduler、Prefix Cache，还是多模态预处理导致的问题。

![image.png|300](https://imgbed.anluoying.com/2026/07/e8823bab2016865db0410c898cd155b3.png)

结果基本准确，因为广告是渐进式出现的，严格来讲在05:30 秒左右就开始一部分广告内容，但是一直到37 秒才是非常明确的广告画面出现。

---
## **file:// 路径**

由于使用 http 的时候，我用的是自己的海外服务器，连通信不是很好，所以准备使用本地路径。

如果使用：

```
file://
```

一定要记住路径是：**运行 vLLM 那台机器的路径。**

应该传：

```
file:///data/video.mp4
```

并且启动 vllm 的参数中要加上：

```
--allowed-local-media-path
```

该参数必须覆盖这个目录。

---
## **最终建议**

如果最终要做视频理解的话，最好还是采样可控 多阶段进行。先粗检再细检

比如如下 Pipeline：

```
AV1 原视频
        │
        ▼
FFmpeg
切段
+
转 H264
        │
        ▼
每段约2分钟
        │
        ▼
Qwen
fps=1
粗定位
        │
        ▼
疑似广告片段
        │
        ▼
再次切片
        │
        ▼
Qwen
fps=4
精定位
```

一方面能够减少单次请求的视觉 Token 数量，另一方面也能降低长视频解码和采样失败带来的影响。

---

## 参考资料

- vLLM Media API
  https://docs.vllm.ai/en/stable/api/vllm/multimodal/media/

- vLLM Multimodal Inputs
  https://docs.vllm.ai/en/stable/features/multimodal_inputs/

- vLLM Video Backend
  https://docs.vllm.ai/en/stable/api/vllm/multimodal/video/

- GitHub Issue #35909
  Error when using Qwen3-VL/Qwen3.5 with video input
  https://github.com/vllm-project/vllm/issues/35909

- NVIDIA Qwen3.6 Video API
  https://docs.nvidia.com/nim/vision-language-models/1.7.0/examples/qwen3.6/api.html

- OpenCV GitHub Issues（AV1）
  https://github.com/opencv/opencv/issues?q=AV1
