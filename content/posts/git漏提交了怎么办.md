---
title: git漏提交了怎么办
description:
date: 2025-05-09T16:45:37+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - github
  - git
categories:
  - 杂技浅尝
lastmod: 2025-12-10T00:25:50+08:00
---
使用 Git 的 **amend** 功能，将未保存的文件修改后“补充”到你刚刚的那次提交中，而不会增加新的提交记录。

### **✅ 1. 保存你漏掉的那个文件**

  

先确保你已经保存了那个文件的最新修改。

---

### **✅ 2. 添加这个文件到暂存区**

```
git add path/to/your/file
```

---

### **✅ 3. 使用** 

### **--amend**

###  **修改上一次提交**

```
git commit --amend --no-edit
```

- --no-edit 表示不更改上一次的提交说明。
    
- 如果你想修改提交说明，可以去掉 --no-edit，然后在打开的编辑器里改。
    

---

### **✅ 4. 如果已经推送到远程仓库（GitHub 等）**

  

如果你 **已经推送过** 这次提交，需要强推（⚠️ 要小心）：

```
git push --force
```

---