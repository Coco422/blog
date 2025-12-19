# Blog Image Manager

博客图片管理工具 - 用于备份和迁移博客图片的 Python CLI 工具

## 功能特性

- ✅ **下载操作**：将远程图片下载到本地备份
  - 全量模式：下载所有远程图片
  - 部分模式：排除指定域名的图片
- ✅ **上传操作**：将本地图片上传到 PicGo 图床
  - 增量上传：只上传本地路径的图片
  - 智能缓存：避免重复上传
- ✅ **状态查看**：查看当前图片分布情况
- ✅ **按文章分类**：图片按文章名称组织目录
- ✅ **备份机制**：原始文件不变，修改后的文件保存到指定目录
- ✅ **Dry-run 模式**：预览操作而不实际执行

## 安装依赖

```bash
cd /Users/ray/Documents/blog
pip3 install -r requirements.txt
```

## 使用方法

### 1. 查看当前状态

查看博客中的图片分布情况：

```bash
python3 scripts/blog_image_manager.py status --show-hosts --show-local --show-cache
```

输出示例：
```
============================================================
Blog Image Manager - Status Report
============================================================
Date: 2025-12-19 17:56:03

Total markdown files: 46
Total images: 72

Image Hosts:
  imgbed.anluoying.com: 52 images
  imgbed.szmckj.cn: 16 images
  raypicbed.oss-cn-shenzhen.aliyuncs.com: 3 images

Local images: 1

Cache Statistics:
  Total cached uploads: 0
  Cache file size: 0.00 B
============================================================
```

### 2. 下载操作

#### 全量下载（下载所有远程图片）

```bash
python3 scripts/blog_image_manager.py download \
    --mode full \
    --backup-dir ~/blog-backups/$(date +%Y-%m-%d)
```

#### 部分下载（排除指定图床）

只下载非 imgbed.anluoying.com 的图片：

```bash
python3 scripts/blog_image_manager.py download \
    --mode partial \
    --exclude-domains imgbed.anluoying.com \
    --backup-dir ~/blog-backups/partial
```

排除多个域名：

```bash
python3 scripts/blog_image_manager.py download \
    --mode partial \
    --exclude-domains imgbed.anluoying.com imgbed.szmckj.cn \
    --backup-dir ~/blog-backups/partial
```

#### Dry-run 模式（预览）

先预览要下载的图片，不实际下载：

```bash
python3 scripts/blog_image_manager.py download \
    --mode full \
    --backup-dir ~/test \
    --dry-run
```

### 3. 上传操作

#### 上传本地图片到 PicGo

**重要**：上传操作需要指定 `--source-dir` 参数，指向包含 markdown 文件和 images 目录的源目录。

确保 PicGo 服务正在运行（默认端口 36677），然后执行：

```bash
python3 scripts/blog_image_manager.py upload \
    --source-dir ./migra \
    --backup-dir ~/blog-backups/uploaded
```

如果不需要备份 markdown 文件，可以省略 `--backup-dir`：

```bash
python3 scripts/blog_image_manager.py upload \
    --source-dir ./migra
```

#### 跳过缓存重新上传

```bash
python3 scripts/blog_image_manager.py upload \
    --source-dir ./migra \
    --skip-cache \
    --backup-dir ~/blog-backups/uploaded
```

#### Dry-run 模式（预览）

```bash
python3 scripts/blog_image_manager.py upload \
    --source-dir ./migra \
    --dry-run
```

## 目录结构

### 下载后的目录结构

下载操作会在 `--backup-dir` 指定的目录中创建以下结构：

```
~/blog-backups/2025-12-19/           # 备份目录
├── Win-杂记C盘满了.md               # 更新后的 markdown 文件
├── VScode-ssh-server-离线下载.md
├── lambda-引发的编程语言陈年知识回顾.md
└── images/                          # 下载的图片目录
    ├── Win-杂记C盘满了/             # 按文章名称分类
    │   ├── image1.png
    │   └── image2.png
    ├── VScode-ssh-server-离线下载/
    │   └── ...
    └── lambda-引发的编程语言陈年知识回顾/
        └── ...
```

**注意**：
- Markdown 文件和 images 目录在同一个备份目录中
- Markdown 中的图片路径为相对路径：`images/文章名/图片.png`
- 原始的 `content/posts/` 目录保持不变

### 上传后的目录结构

上传操作会在 `--backup-dir` 指定的目录中创建更新后的 markdown 文件：

```
~/blog-backups/uploaded/             # 上传后的备份目录
├── Win-杂记C盘满了.md               # 图片链接已更新为远程 URL
├── VScode-ssh-server-离线下载.md
└── lambda-引发的编程语言陈年知识回顾.md
```

### 缓存文件

```
/Users/ray/Documents/blog/
└── .image_cache.json                # 上传缓存（自动生成）
```

## 工作流程示例

### 场景 1：完整备份所有图片

```bash
# 1. 查看当前状态
python3 scripts/blog_image_manager.py status --show-hosts

# 2. 全量下载所有图片
python3 scripts/blog_image_manager.py download \
    --mode full \
    --backup-dir ~/blog-backups/full-backup-$(date +%Y-%m-%d)

# 3. 查看下载结果
ls -lh images/
```

### 场景 2：增量迁移图床（完整流程）

假设你想把 imgbed.szmckj.cn 和 raypicbed.oss-cn-shenzhen.aliyuncs.com 的图片迁移到主图床 imgbed.anluoying.com：

```bash
# 1. 下载需要迁移的图片（排除已经在主图床的）
python3 scripts/blog_image_manager.py download \
    --mode partial \
    --exclude-domains imgbed.anluoying.com \
    --backup-dir ./migra

# 此时 migra 目录结构：
# migra/
# ├── Win-杂记C盘满了.md
# ├── VScode-ssh-server-离线下载.md
# └── images/
#     ├── Win-杂记C盘满了/
#     └── VScode-ssh-server-离线下载/

# 2. 启动 PicGo 服务（确保配置了主图床）

# 3. 上传本地图片到主图床
python3 scripts/blog_image_manager.py upload \
    --source-dir ./migra \
    --backup-dir ./migra-uploaded

# 此时 migra-uploaded 目录包含更新后的 markdown 文件
# 图片链接已替换为主图床 URL

# 4. 检查上传结果
python3 scripts/blog_image_manager.py status --show-cache

# 5. 将更新后的文件复制回原始目录（可选）
cp migra-uploaded/*.md content/posts/

# 6. 清理临时文件
rm -rf migra migra-uploaded
```

**迁移流程说明**：
1. **下载阶段**：从非主图床下载图片到 `migra` 目录，生成包含本地路径的 markdown
2. **上传阶段**：从 `migra` 目录读取 markdown 和图片，上传到主图床，生成包含远程 URL 的 markdown
3. **应用阶段**：将 `migra-uploaded` 中的 markdown 文件复制回 `content/posts/` 完成迁移

### 场景 3：本地图片上传

如果你已经有包含本地图片的目录，想上传到图床：

```bash
# 假设你的目录结构如下：
# my-posts/
# ├── article1.md          # 包含相对路径：images/article1/pic.png
# ├── article2.md
# └── images/
#     ├── article1/
#     └── article2/

# 1. 上传到 PicGo
python3 scripts/blog_image_manager.py upload \
    --source-dir ./my-posts \
    --backup-dir ~/blog-backups/upload-$(date +%Y-%m-%d)

# 2. 使用备份目录中的 markdown 文件（已更新为远程 URL）
```

## 命令参数说明

### download 命令

| 参数 | 必需 | 说明 |
|------|------|------|
| `--mode` | ✅ | 下载模式：`full`（全量）或 `partial`（部分） |
| `--exclude-domains` | ❌ | 在 partial 模式下排除的域名列表 |
| `--backup-dir` | ✅ | 备份 markdown 文件的目录 |
| `--dry-run` | ❌ | 预览模式，不实际下载 |
| `--threads` | ❌ | 下载线程数（默认：5） |

### upload 命令

| 参数 | 必需 | 说明 |
|------|------|------|
| `--source-dir` | ✅ | 源目录，包含要上传的 markdown 文件和 images 目录 |
| `--picgo-url` | ❌ | PicGo 服务器 URL（默认：http://127.0.0.1:36677/upload） |
| `--backup-dir` | ❌ | 备份 markdown 文件的目录（可选，用于保存更新后的文件） |
| `--dry-run` | ❌ | 预览模式，不实际上传 |
| `--skip-cache` | ❌ | 跳过缓存，重新上传所有图片 |

### status 命令

| 参数 | 必需 | 说明 |
|------|------|------|
| `--show-hosts` | ❌ | 显示图床分布 |
| `--show-local` | ❌ | 显示本地图片数量 |
| `--show-cache` | ❌ | 显示缓存统计 |

## 注意事项

1. **原始文件安全**：所有操作都不会修改原始 markdown 文件，修改后的文件保存在 `--backup-dir` 指定的目录
2. **PicGo 配置**：上传操作需要 PicGo 服务正在运行，确保配置正确
3. **缓存机制**：上传操作会缓存已上传的图片（基于文件哈希），避免重复上传
4. **相对路径**：下载操作生成的相对路径格式为 `images/{article-name}/{filename}`（相对于 backup-dir）
5. **网络超时**：下载操作默认超时 30 秒，失败会自动重试 3 次
6. **文件名处理**：文件名中的空格会被替换为连字符（`-`），保持 URL 兼容性
7. **上传源目录**：上传操作必须指定 `--source-dir`，指向包含 markdown 和 images 的目录

## 故障排查

### 问题：PicGo 服务连接失败

```
ERROR - PicGo server not accessible
```

**解决方案**：
1. 确保 PicGo 正在运行
2. 检查 PicGo 设置中的服务器端口（默认 36677）
3. 使用 `--picgo-url` 参数指定正确的 URL

### 问题：下载失败

```
WARNING - Attempt 1 failed for https://...
```

**解决方案**：
1. 检查网络连接
2. 确认图片 URL 是否有效
3. 查看失败报告中的详细错误信息

### 问题：本地图片找不到

```
WARNING - Local image not found: /path/to/image.png
```

**解决方案**：
1. 检查 markdown 中的图片路径是否正确
2. 确认图片文件确实存在
3. 使用绝对路径或正确的相对路径

## 高级用法

### 自定义配置

编辑 `scripts/config.py` 修改默认配置：

```python
class Config:
    DOWNLOAD_TIMEOUT = 30      # 下载超时时间（秒）
    MAX_RETRIES = 3            # 最大重试次数
    UPLOAD_TIMEOUT = 60        # 上传超时时间（秒）
    # ...
```

### 完整的图床迁移脚本

使用 shell 脚本自动化图床迁移流程：

```bash
#!/bin/bash
# migrate-image-host.sh - 图床迁移脚本

DATE=$(date +%Y-%m-%d)
TEMP_DIR=./temp-migration-$DATE
BACKUP_DIR=~/blog-backups/migration-$DATE

echo "开始图床迁移流程..."

# 1. 下载非主图床的图片
echo "步骤 1/4: 下载图片..."
python3 scripts/blog_image_manager.py download \
    --mode partial \
    --exclude-domains imgbed.anluoying.com \
    --backup-dir $TEMP_DIR

if [ $? -ne 0 ]; then
    echo "下载失败，退出"
    exit 1
fi

# 2. 检查 PicGo 服务
echo "步骤 2/4: 检查 PicGo 服务..."
curl -s http://127.0.0.1:36677 > /dev/null
if [ $? -ne 0 ]; then
    echo "PicGo 服务未运行，请启动 PicGo"
    exit 1
fi

# 3. 上传到主图床
echo "步骤 3/4: 上传到主图床..."
python3 scripts/blog_image_manager.py upload \
    --source-dir $TEMP_DIR \
    --backup-dir $BACKUP_DIR

if [ $? -ne 0 ]; then
    echo "上传失败，退出"
    exit 1
fi

# 4. 可选：复制更新后的文件到原始目录
echo "步骤 4/4: 更新原始文件..."
read -p "是否将更新后的文件复制到 content/posts/? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp $BACKUP_DIR/*.md content/posts/
    echo "文件已更新"
fi

# 清理临时文件
echo "清理临时文件..."
rm -rf $TEMP_DIR

echo "迁移完成！备份位置: $BACKUP_DIR"
```

使用方法：
```bash
chmod +x migrate-image-host.sh
./migrate-image-host.sh
```

## 技术架构

- **markdown_processor.py**：Markdown 解析和 URL 替换
- **image_downloader.py**：图片下载逻辑（支持重试、进度条）
- **image_uploader.py**：PicGo API 集成和上传逻辑
- **cache_manager.py**：基于 SHA256 的缓存系统
- **config.py**：配置管理
- **utils.py**：工具函数

## 许可证

MIT License

## 作者

Ray - 2025
