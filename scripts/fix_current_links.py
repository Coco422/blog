#!/usr/bin/env python3
"""
修复当前已上传但链接未更新的 Markdown 文件

这个脚本会：
1. 读取 .image_cache.json 中的上传记录
2. 根据原始路径找到对应的 Markdown 文件
3. 更新 Markdown 文件中的图片链接
"""

import json
import sys
from pathlib import Path
from typing import Dict

# 添加脚本目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from markdown_processor import MarkdownProcessor
from utils import setup_logging


def extract_md_filename_from_path(original_path: str) -> str:
    """从原始路径提取 Markdown 文件名

    例如: /Users/ray/blog-backups/partial/images/地图定位怎么实现/image_27c20508.png
    提取出: 地图定位怎么实现.md
    """
    path = Path(original_path)
    # 获取倒数第二个路径部分（文章名称目录）
    if len(path.parts) >= 2:
        article_dir = path.parts[-2]
        # 移除末尾的目录名后缀，添加 .md
        return f"{article_dir}.md"
    return None


def build_url_mappings(cache_file: Path, content_dir: Path) -> Dict[Path, Dict[str, str]]:
    """从缓存文件构建 URL 映射

    返回: {md_file_path: {old_url: new_url}}
    """
    if not cache_file.exists():
        print(f"❌ 缓存文件不存在: {cache_file}")
        return {}

    with open(cache_file, 'r', encoding='utf-8') as f:
        cache_data = json.load(f)

    mappings = {}

    for hash_key, entry in cache_data.get('entries', {}).items():
        original_path = entry['original_path']
        new_url = entry['url']

        # 提取 Markdown 文件名
        md_filename = extract_md_filename_from_path(original_path)
        if not md_filename:
            continue

        md_file = content_dir / md_filename
        if not md_file.exists():
            print(f"⚠️  Markdown 文件不存在: {md_file}")
            continue

        # 构建旧的相对路径
        # 从原始路径中提取图片文件名
        image_filename = Path(original_path).name
        # 假设原始 MD 中使用的是相对路径格式
        article_name = md_filename.replace('.md', '')
        old_url = f"images/{article_name}/{image_filename}"

        if md_file not in mappings:
            mappings[md_file] = {}

        mappings[md_file][old_url] = new_url
        print(f"✓ 发现映射: {md_filename}")
        print(f"  {old_url} -> {new_url}")

    return mappings


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="修复已上传图片的 Markdown 链接")
    parser.add_argument('--yes', '-y', action='store_true', help='自动确认，不询问')
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("修复已上传图片的 Markdown 链接")
    print("=" * 60)

    # 初始化配置
    setup_logging(Config.LOG_LEVEL)
    config = Config()
    processor = MarkdownProcessor(config)

    # 读取缓存并构建映射
    print("\n1. 读取缓存文件...")
    mappings = build_url_mappings(config.CACHE_FILE, config.CONTENT_DIR)

    if not mappings:
        print("\n❌ 没有找到需要更新的映射")
        return

    print(f"\n找到 {len(mappings)} 个文件需要更新")

    # 询问确认
    print("\n⚠️  即将更新以下文件:")
    for md_file in mappings.keys():
        print(f"  - {md_file.name} ({len(mappings[md_file])} 个图片链接)")

    if not args.yes:
        confirm = input("\n确认要更新这些文件吗? (yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            print("❌ 操作已取消")
            return
    else:
        print("\n[自动确认模式]")

    # 更新文件
    print("\n2. 更新 Markdown 文件...")
    updated_count = 0

    for md_file, url_mapping in mappings.items():
        success = processor.update_image_urls(md_file, url_mapping, in_place=True)
        if success:
            updated_count += 1
            print(f"  ✓ 已更新: {md_file.name}")
        else:
            print(f"  ✗ 更新失败: {md_file.name}")

    # 打印总结
    print("\n" + "=" * 60)
    print("更新完成")
    print("=" * 60)
    print(f"成功更新: {updated_count}/{len(mappings)} 个文件")
    print("=" * 60)


if __name__ == '__main__':
    main()
