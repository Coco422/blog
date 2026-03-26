---
title: 浅尝AI帮我分析股票
description: "之前看到多次那种AI虚拟盘炒股大战了，今天又刷到个股市分析的项目，忍不住了，搞一个下来玩玩 以下记录折腾过程而已 GitHub - ZhuLinsen/daily\_stock\_analysis LLM驱动的 A/H股智能分"
date: 2026-01-24T02:16:23+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-01-24T10:28:22+08:00
showLastMod: true
tags:
  - llm
categories:
  - 杂技浅尝
---
> 之前看到多次那种AI虚拟盘炒股大战了，今天又刷到个股市分析的项目，忍不住了，搞一个下来玩玩
> 
> 以下记录折腾过程而已

[GitHub - ZhuLinsen/daily\_stock\_analysis: LLM驱动的 A/H股智能分析器，多数据源行情 + 实时新闻 + Gemini 决策仪表盘 + 多渠道推送，零成本，纯白嫖，定时运行](https://github.com/ZhuLinsen/daily_stock_analysis)

我就不搞actions了，反正有服务器

## 第一步先拉仓库下来

## 配环境

随后我最近在学uv，让uv接管依赖管理。直接  `uv add -r requirements.txt` 

然按照作者的环境配置指南，配上gemini的连接方式，由于没看到在哪里自定义gemini的调用方式，进代码一看，发现作者使用的是google.generativeai包，该包已被弃用，虽然还能用，但是我改成了使用 google.genai 

analyzer.py 中 _init_model 方法更新成如下

```python
    def _init_model(self) -> None:
        """
        初始化 Gemini 模型
        
        配置：
        - 使用 gemini-3-flash-preview 或 gemini-2.5-flash 模型
        - 不启用 Google Search（使用外部 Tavily/SerpAPI 搜索）
        - 支持自定义 endpoint（通过 GEMINI_API_ENDPOINT 环境变量）
        
        Note: 使用新的 google.genai 包（旧的 google.generativeai 已弃用）
        """
        try:
            from google import genai
            from google.genai import types
            
            # 从配置获取参数
            config = get_config()
            model_name = config.gemini_model
            fallback_model = config.gemini_model_fallback
            
            # 构建客户端配置
            client_kwargs = {
                'api_key': self._api_key,
            }
            
            # 配置自定义 endpoint（如果设置）
            if config.gemini_api_endpoint:
                logger.info(f"使用自定义 Gemini Endpoint: {config.gemini_api_endpoint}")
                client_kwargs['http_options'] = {
                    'baseUrl': config.gemini_api_endpoint,  # 注意：参数名是 baseUrl，不是 api_endpoint
                }
                # 如果配置了 API 版本，也添加进去
                if config.gemini_api_version:
                    client_kwargs['http_options']['apiVersion'] = config.gemini_api_version  # 注意：参数名是 apiVersion
            
            # 创建 Gemini 客户端
            self._genai_client = genai.Client(**client_kwargs)
            
            # 尝试初始化主模型
            try:
                # 新版 API 不再使用 GenerativeModel，而是直接通过 client.models.generate_content
                # 这里我们只需要记录模型名称
                self._current_model_name = model_name
                self._using_fallback = False
                self._model = self._genai_client  # 保存客户端引用
                logger.info(f"Gemini 模型初始化成功 (模型: {model_name})")
            except Exception as model_error:
                # 尝试备选模型
                logger.warning(f"主模型 {model_name} 初始化失败: {model_error}，将尝试备选模型 {fallback_model}")
                self._current_model_name = fallback_model
                self._using_fallback = True
                self._model = self._genai_client
                logger.info(f"Gemini 备选模型配置完成 (模型: {fallback_model})")
            
        except Exception as e:
            logger.error(f"Gemini 模型初始化失败: {e}")
            self._model = None
            self._genai_client = None
```

config加上

```python
    gemini_api_endpoint: Optional[str] = None  # 自定义 API Endpoint（如使用代理或第三方兼容服务）
    gemini_api_version: str = "v1beta"  # API 版本
```

环境变量配上，同时依赖 `uv add google-genai` 即可

随后去注册了 Tushare Pro、Tavily、BOCHA

还是这个 Tushare 最神奇了，第一次接触这种数据平台。

随后按照指示运行代码后，过一会就能看到报告发给了我的飞书

![image.png](https://imgbed.anluoying.com/2026/01/b48dde4a6190f1723a83ac15d94eb31b.png)

分析一下我套牢的股票，可以，比我厉害。周一开盘拿他分析一下然后操作操作[Doge]