---
title: hugo 的博客点击图片放大
description:
date: 2025-11-28T10:15:26+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - hugo
categories:
  - 琐碎快记
---
> 昨天抄来改改一篇很长的 cc 教程，里面有不少图片，发现我的主题似乎没法点击放大图片，于是求助 gemini3

## 实现方式

1. 用Hugo Render Hook（渲染钩子），它接管了 Markdown 中图片语法 `![Alt](src "Title")` 的渲染过程。
2. 用 fancybox 库实现图片放大之类的
## 代码

`layouts/_default/_markup/render-image.html` 修改渲染逻辑

```html
{{- /* 1. 解析 Markdown 里的图片路径 */ -}}
{{- $u := urls.Parse .Destination -}}
{{- $src := $u.String -}}

{{- /* 2. 如果不是绝对路径（如 http://...），则尝试在资源中查找 */ -}}
{{- if not $u.IsAbs -}}
  {{- $path := strings.TrimPrefix "./" $u.Path }}
  
  {{- /* 3. 尝试从“页面资源”或“全局资源”中查找该图片 */ -}}
  {{- with or (.PageInner.Resources.Get $path) (resources.Get $path) -}}
    {{- /* 4. 如果找到了，获取它在网站最终生成的正确相对链接 */ -}}
    {{- $src = .RelPermalink -}}
    
    {{- /* 5. 假如原链接带参数(?size=small)或锚点(#top)，把它们拼回去 */ -}}
    {{- with $u.RawQuery -}}
      {{- $src = printf "%s?%s" $src . -}}
    {{- end -}}
    {{- with $u.Fragment -}}
      {{- $src = printf "%s#%s" $src . -}}
    {{- end -}}
  {{- end -}}
{{- end -}}

{{- /* 6. 构建 img 标签属性：合并默认属性和自动生成的属性 */ -}}
{{- $attributes := merge .Attributes (dict "alt" .Text "src" $src "title" (.Title | transform.HTMLEscape) "loading" "lazy") -}}

<div class="post-img-view">
    <!-- 
       href: 指向图片大图的链接（Fancybox 需要知道点开后显示什么）
       data-fancybox="gallery": 告诉 Fancybox JS 插件，这个链接要用灯箱打开，而不是跳转页面 
    -->
    <a data-fancybox="gallery" href="{{ $src }}">
        <img
        {{- range $k, $v := $attributes -}}
            {{- if $v -}}
            {{- printf " %s=%q" $k $v | safeHTMLAttr -}}
            {{- end -}}
        {{- end -}}>
    </a>
</div>

```

`layouts/partials/extend_head.html` 引入 fancybox 资源
```html
{{- if or .Site.Params.fancybox (not (isset .Site.Params "fancybox")) }}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css"/>
<script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js"></script>
<script>
  // 等待 DOM 加载完成
  document.addEventListener("DOMContentLoaded", function() {
      Fancybox.bind('[data-fancybox="gallery"]', {
        // Your custom options
      });
  });
</script>
{{- end }}

```