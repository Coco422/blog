---
lastmod: 2025-12-10T00:21:12+08:00
---
```dataviewjs
 let la = ["未发布","已发布"]
 let da = []

 const draftPage = dv.pages(`"content/posts"`).filter(p => p.draft).length
 const notDraftPage = dv.pages(`"content/posts"`).filter(p => !p.draft).length

 da[0] = draftPage
 da[1] = notDraftPage

 dv.paragraph(`
 \`\`\`chart
 type: pie
 labels: ["未发布","已发布"]
 series:
     - title: none
       data: [${da}]
 width: 50%
 legendPosition: left
 labelColors: true
 \`\`\`
 `);
 ```

```button
name 🆕 新建博客
type command
action QuickAdd: 新建博客
color blue
class .self-btn
```
```button
name 🆕 提交博客
type command
action Git: Commit all changes
color green
class .self-btn
```
```button
name ⏫ 发布博客
type command
action Git: Push
color red
class .self-btn
```
```button
name 🔄 获取更新
type command
action Git: Pull
color yellow
class .self-btn
```


```
hugo server -w
```

### 草稿箱
```dataview
table title AS "标题",date AS "创建时间"
from "content/posts"
where draft=true
sort date desc
```

### 已发布
```dataview
table title AS "标题",date AS "创建时间"
from "content/posts"
where draft=false
sort date desc
```
