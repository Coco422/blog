---
title: 用 OBS + MediaMTX 搭一个本地视频流给视觉程序用
description: 把视频文件伪装成实时摄像头输入，OBS推流到MediaMTX，下游用RTSP读取，开发目标检测再也不用对着摄像头比划了
date: 2026-05-19T10:08:19+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-19T10:16:49+08:00
showLastMod: true
tags:
  - MediaMTX
  - OBS
  - RTSP
  - 视频流
  - 目标检测
  - OpenCV
categories:
  - 杂技浅尝
---

开发目标检测、姿态识别这类视觉程序的时候，有个很烦的问题：你需要一个可控的、可重复的视频输入源。

对着真实的摄像头调试？光线一会变一个样，人走来走去的，画面完全不可控。用视频文件做输入吧，有些程序又只认摄像头设备或者RTSP地址，不认本地文件路径。

所以我需要一个东西，既能把视频文件"伪装"成一个实时的视频流，让下游程序当摄像头一样去读。又能快速接入各种我想要做出的画面或者 usb 摄像头来测试视频效果。

> 当然如果有更好的方案欢迎大家留言（鬼知道有没有人看得到我的文章）

> 其实 OBS 自带的 Virtual Camera 也能解决一部分问题，但我没怎么用过。

这次搭的链路长这样：

```text
视频文件 → OBS 推流 → MediaMTX → RTSP → ffplay / OpenCV / 目标检测程序
```

## MediaMTX 是什么

之前没见过 MediaMTX，一开始还以为是某种虚拟摄像头设备。不是。

MediaMTX 是一个本地流媒体中转服务器，用 Go 写的，一个二进制文件就能跑。它能把推过来的流转成 RTSP、RTMP、HLS、WebRTC、SRT 等各种协议的输出。也就是说你往里面塞一路流，下游不管你用什么协议来读，它都能接。

GitHub 地址：[bluenviron/mediamtx](https://github.com/bluenviron/mediamtx)，macOS arm64 直接下载解压就能用。

## 启动 MediaMTX

```bash
cd /Volumes/extStorage/rayEx/Downloads/mediamtx_v1.18.2_darwin_arm64
./mediamtx
```

gemini 最早叫我下载完之后直接刷机打开，启动的时候会报一条 warning：是因为双击启动的目录对不上，他找不到 yml，进入路径执行就没问题了

```text
WAR configuration file not found (looked in .../rtsp-simple-server.yml, .../mediamtx.yml), using an empty configuration
```

默认配置已经把常用端口都打开了：

```text
RTSP   :8554
RTMP   :1935
HLS    :8888
WebRTC :8889
SRT    :8890
```

本地调试足够用了，不用改 yml。后面需要鉴权、固定路径、改端口的时候再配。

![image.png|300](https://imgbed.anluoying.com/2026/05/019dd7eef6469436e434d6404c33659b.png)

## OBS 推流

OBS 里面设置推流地址：

```text
Settings → Stream
Service: Custom...
Server: rtmp://localhost/mystream
Stream key: 留空
```

然后点 `Start Streaming`。

切回 MediaMTX 的终端，如果看到类似这样的日志：

```text
is publishing to path 'mystream'
```

就说明 OBS 的流已经成功推到 MediaMTX 了。中间经历了 RTMP 这一跳。

## ffplay 读 RTSP

验证链路通不通，最简单的方式就是 ffplay：

```bash
ffplay rtsp://127.0.0.1:8554/mystream
```

跑起来的话，整个链路就通了：OBS → RTMP → MediaMTX → RTSP → ffplay。

![image.png|300](https://imgbed.anluoying.com/2026/05/b4b6a269d94419b9e2ad148765d7d0d7.png)


后续目标检测程序也可以读同一个地址 `rtsp://127.0.0.1:8554/mystream`，跟 ffplay 互不影响。

## WebRTC 那边翻车了

顺手试了一下浏览器预览：

```text
http://localhost:8889/mystream
```

MediaMTX 报了：

```text
WebRTC doesn't support H264 streams with B-frames
WAR [WebRTC] skipping track 2 (MPEG-4 Audio)
```

OBS 的流已经推到了 MediaMTX，这个没问题。但浏览器的 WebRTC 不支持带 B-frames 的 H264，音频编码也不对路。

这个只影响 WebRTC 浏览器预览，RTSP 链路完全正常。所以暂时不纠结这个问题了，反正 ffplay 能看就行。

> 后面真要用 WebRTC 页面看的话，可以在 OBS 编码设置里关掉 B-frames、音频改成 Opus，或者干脆用 WHIP 推流。

## 延迟问题

第一次跑通的时候延迟不小。这条链路里可能产生延迟的地方有四段：

```text
OBS 编码队列 → RTMP 推流 → MediaMTX 转发 → RTSP 客户端缓冲
```

不过 MediaMTX 本身更像是一个协议转发中枢，不太会主动开大缓存。延迟主要还是 OBS 编码器和播放器默认缓冲的锅。

### OBS 端优化

OBS 编码器为了画质会引入缓冲，低延迟方向：

- B-frames 设为 `0`
- 如果用 x264 编码器，设置 `tune=zerolatency`
- 关键帧间隔短一点，`1s` 或 `2s`
- 关掉 Look-ahead
- 分辨率和帧率别太高，720p / 25fps 做调试够用了

### ffplay 端优化

ffplay 默认也会做探测和缓冲。低延迟播放命令：

```bash
ffplay \
  -fflags nobuffer \
  -flags low_delay \
  -framedrop \
  -rtsp_transport udp \
  rtsp://127.0.0.1:8554/mystream
```

UDP 不稳定就换 TCP：

```bash
ffplay \
  -fflags nobuffer \
  -flags low_delay \
  -framedrop \
  -rtsp_transport tcp \
  rtsp://127.0.0.1:8554/mystream
```

更激进的版本，把探测尺寸和分析时长都压到最小：

```bash
ffplay \
  -fflags nobuffer \
  -flags low_delay \
  -probesize 32 \
  -analyzeduration 0 \
  -max_delay 0 \
  -framedrop \
  -sync ext \
  -rtsp_transport udp \
  rtsp://127.0.0.1:8554/mystream
```

这些参数会让起播变快、延迟变低，但也更容易花屏卡顿。调试用用就行，正式程序得自己权衡。

### 还有一种更短的链路

OBS 先 RTMP 再转 RTSP，中间多了一跳。如果要进一步降延迟，可以让 OBS 通过 FFmpeg Output 直接推 RTSP：

```text
Settings → Output → Recording
Type: Custom Output (FFmpeg)
FFmpeg output type: Output to URL
File path or URL: rtsp://127.0.0.1:8554/mystream
Container format: rtsp
Video encoder: libx264
Video encoder settings: bf=0
```

注意这种方式点的是 `Start Recording`，不是 `Start Streaming`。

### 目标检测程序的读取方式

这个其实是个很容易被忽略的坑。目标检测程序如果按队列逐帧处理，推理速度跟不上帧率的话，会越读越落后，延迟越来越大。

推荐的做法是单独一个线程持续读取，只保留最新一帧，推理线程永远拿最新帧处理，丢掉积压的旧帧：

```python
latest_frame = None

# reader thread
while True:
    ok, frame = cap.read()
    if ok:
        latest_frame = frame

# detector loop
while True:
    frame = latest_frame
    if frame is None:
        continue
    result = detector(frame)
```

## 常用地址备忘

```text
RTMP 推流入口:   rtmp://localhost/mystream
RTSP 读取地址:   rtsp://127.0.0.1:8554/mystream
WebRTC 预览地址:  http://localhost:8889/mystream
WHIP 推流地址:   http://localhost:8889/mystream/whip
```

## 调试顺序

1. 启动 MediaMTX
2. OBS 推流到 `rtmp://localhost/mystream`
3. ffplay 读 RTSP 验证链路通
4. 加低延迟参数观察延迟差异
5. 程序读 RTSP，先只显示画面不跑模型
6. 加入目标检测，改成"只处理最新帧"模式
7. 根据瓶颈再调 OBS 编码参数、RTSP transport、分辨率和检测频率

这套方案跑通之后，开发视觉程序既可以快速用上外接的 usb 摄像头或者来自其他地方的视频流。又或者最重要的视频文件当摄像头用，调试效率高很多。
