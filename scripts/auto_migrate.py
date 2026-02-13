#!/usr/bin/env python3
"""
一键式图片迁移脚本 - 自动化处理博客图片迁移到图床

功能：
1. 自动备份原始文件
2. 下载外部图片到本地
3. 上传所有本地图片到图床
4. 更新 Markdown 文件中的图片链接
5. 提供回滚功能

使用方法：
    python auto_migrate.py                    # 完整迁移流程
    python auto_migrate.py --dry-run          # 预览模式
    python auto_migrate.py --rollback         # 回滚到上次备份
"""

import argparse
import logging
import sys
import shutil
import random
from pathlib import Path
from datetime import datetime
from typing import Optional


def check_dependencies():
    """检查必需的依赖是否已安装"""
    missing_deps = []

    try:
        import requests
    except ImportError:
        missing_deps.append("requests")

    if missing_deps:
        print("=" * 60)
        print("❌ 缺少必需的依赖")
        print("=" * 60)
        print("以下依赖未安装:")
        for dep in missing_deps:
            print(f"  - {dep}")
        print()
        print("请运行以下命令安装依赖:")
        print(f"  pip install {' '.join(missing_deps)}")
        print()
        print("或者安装所有依赖:")
        print("  pip install -r requirements.txt")
        print("=" * 60)
        sys.exit(1)


# 检查依赖
check_dependencies()

# 依赖检查通过后再导入
import requests

# 添加脚本目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from utils import setup_logging, format_file_size
from markdown_processor import MarkdownProcessor
from image_downloader import ImageDownloader
from image_uploader import ImageUploader


class AutoMigrator:
    """自动化图片迁移管理器"""

    def __init__(self, dry_run: bool = False):
        self.config = Config()
        self.dry_run = dry_run
        self.logger = logging.getLogger(__name__)

        # 备份目录
        self.backup_root = Path.home() / ".blog_image_backups"
        self.current_backup = self.backup_root / datetime.now().strftime("%Y%m%d_%H%M%S")

    def confirm_operation(self) -> bool:
        """正式运行前的二次确认"""
        if self.dry_run:
            return True

        print("\n" + "=" * 60)
        print("⚠️  正式运行确认")
        print("=" * 60)
        print("此操作将：")
        print("  1. 备份所有 Markdown 文件")
        print("  2. 下载外部图片到本地")
        print("  3. 上传本地图片到图床")
        print("  4. 修改 Markdown 文件中的图片链接")
        print()
        print("虽然会创建备份，但仍建议先运行 --dry-run 预览")
        print("=" * 60)

        # 生成四位随机数
        verification_code = str(random.randint(1000, 9999))
        print(f"\n请输入验证码以继续: {verification_code}")

        user_input = input("验证码: ").strip()

        if user_input != verification_code:
            print("❌ 验证码错误，操作已取消")
            return False

        print("✓ 验证通过，开始执行迁移")
        return True

    def check_picgo_status(self) -> bool:
        """检查 PicGo 服务状态"""
        print("\n" + "=" * 60)
        print("⚠️  重要提醒：请确认 PicGo 配置")
        print("=" * 60)
        print("在继续之前，请确保：")
        print("1. PicGo 正在运行")
        print("2. PicGo 已配置正确的图床（imgbed.anluoying.com）")
        print("3. 图床配置已测试可用")
        print("=" * 60)

        if self.dry_run:
            print("[DRY RUN] 跳过 PicGo 状态检查")
            return True

        # 尝试连接 PicGo
        try:
            response = requests.get(
                self.config.PICGO_DEFAULT_URL.replace('/upload', ''),
                timeout=5
            )
            print("✓ PicGo 服务运行正常")

            # 询问用户确认
            confirm = input("\n是否已确认 PicGo 图床配置正确？(yes/no): ").strip().lower()
            if confirm not in ['yes', 'y']:
                print("❌ 用户取消操作")
                return False

            return True

        except requests.exceptions.RequestException as e:
            print(f"❌ 无法连接到 PicGo 服务: {e}")
            print(f"   请确保 PicGo 正在运行: {self.config.PICGO_DEFAULT_URL}")
            return False

    def create_backup(self) -> bool:
        """创建完整备份"""
        try:
            if self.dry_run:
                print(f"[DRY RUN] 将创建备份到: {self.current_backup}")
                return True

            self.logger.info(f"创建备份到: {self.current_backup}")
            self.current_backup.mkdir(parents=True, exist_ok=True)

            # 备份 content/posts 目录
            posts_backup = self.current_backup / "posts"
            shutil.copytree(self.config.CONTENT_DIR, posts_backup)

            # 备份 cache 文件
            if self.config.CACHE_FILE.exists():
                shutil.copy2(self.config.CACHE_FILE, self.current_backup / ".image_cache.json")

            # 创建备份信息文件
            info_file = self.current_backup / "backup_info.txt"
            with open(info_file, 'w', encoding='utf-8') as f:
                f.write(f"备份时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"备份目录: {self.current_backup}\n")
                f.write(f"原始目录: {self.config.CONTENT_DIR}\n")

            print(f"✓ 备份已创建: {self.current_backup}")
            return True

        except Exception as e:
            self.logger.error(f"备份失败: {e}")
            return False

    def download_external_images(self, work_dir: Path) -> dict:
        """下载外部图片到本地"""
        try:
            print("\n" + "=" * 60)
            print("📥 步骤 1/2: 下载外部图片")
            print("=" * 60)
            print("🔍 正在扫描 Markdown 文件...")

            markdown_files = list(self.config.CONTENT_DIR.glob("*.md"))
            print(f"✓ 找到 {len(markdown_files)} 个 Markdown 文件")
            self.logger.info(f"找到 {len(markdown_files)} 个 Markdown 文件")

            print("\n🔧 初始化下载器...")
            print("  - 模式: 部分下载（仅外部图片）")
            print("  - 排除域名: imgbed.anluoying.com")

            # 初始化下载器，排除已在目标图床的图片
            downloader = ImageDownloader(
                self.config,
                mode='partial',
                exclude_domains=['imgbed.anluoying.com']
            )

            # 下载图片到工作目录
            print("\n⏳ 开始下载外部图片...")
            images_dir = work_dir / "images"
            result = downloader.download_all_images(
                markdown_files,
                work_dir,
                dry_run=self.dry_run
            )

            print("\n📊 下载结果:")
            print(f"  外部图片总数: {result['total']}")
            print(f"  成功下载: {result['successful']}")
            print(f"  失败: {len(result['failed'])}")

            if result['failed']:
                print("\n  ⚠️  以下图片下载失败:")
                for url in result['failed'][:5]:  # 只显示前5个
                    print(f"    - {url}")
                if len(result['failed']) > 5:
                    print(f"    ... 还有 {len(result['failed']) - 5} 个")

            return result

        except Exception as e:
            self.logger.error(f"下载外部图片失败: {e}")
            return {'total': 0, 'successful': 0, 'failed': []}

    def upload_local_images(self, work_dir: Path) -> dict:
        """上传本地图片到图床"""
        try:
            print("\n" + "=" * 60)
            print("📤 步骤 2/2: 上传本地图片到图床")
            print("=" * 60)
            print("🔍 正在扫描本地图片...")

            markdown_files = list(self.config.CONTENT_DIR.glob("*.md"))

            print("\n🔧 初始化上传器...")
            print(f"  - PicGo 地址: {self.config.PICGO_DEFAULT_URL}")
            print("  - 缓存: 启用")

            # 初始化上传器
            uploader = ImageUploader(
                self.config,
                picgo_url=self.config.PICGO_DEFAULT_URL,
                skip_cache=False
            )

            # 上传图片并更新 MD 文件
            print("\n⏳ 开始上传本地图片...")
            result = uploader.upload_all_local_images(
                markdown_files,
                source_dir=self.config.CONTENT_DIR,
                backup_dir=None,  # 不需要额外备份，我们已经有完整备份
                dry_run=self.dry_run
            )

            print("\n📊 上传结果:")
            print(f"  本地图片总数: {result['total']}")
            print(f"  成功上传: {result['successful']}")
            print(f"  使用缓存: {result['cached']}")
            print(f"  失败: {len(result['failed'])}")

            if result['failed']:
                print("\n  ⚠️  以下图片上传失败:")
                for path in result['failed'][:5]:
                    print(f"    - {path}")
                if len(result['failed']) > 5:
                    print(f"    ... 还有 {len(result['failed']) - 5} 个")

            return result

        except Exception as e:
            self.logger.error(f"上传本地图片失败: {e}")
            return {'total': 0, 'successful': 0, 'cached': 0, 'failed': []}

    def run_migration(self) -> bool:
        """运行完整迁移流程"""
        start_time = datetime.now()

        print("\n" + "=" * 60)
        print("🚀 博客图片自动迁移工具")
        print("=" * 60)
        print(f"📁 博客目录: {self.config.BLOG_ROOT}")
        print(f"📝 文章目录: {self.config.CONTENT_DIR}")

        if self.dry_run:
            print("\n⚠️  运行模式: DRY RUN (预览模式，不会实际修改文件)")
        else:
            print("\n⚙️  运行模式: 正式模式")
        print("=" * 60)

        # 0. 正式运行前的二次确认
        if not self.confirm_operation():
            print("\n❌ 迁移已取消")
            return False

        # 1. 检查 PicGo 状态
        print("\n" + "=" * 60)
        print("🔍 步骤 0: 检查环境")
        print("=" * 60)
        if not self.check_picgo_status():
            print("\n❌ 迁移已取消")
            return False

        # 2. 创建备份
        print("\n" + "=" * 60)
        print("💾 创建备份")
        print("=" * 60)
        print("⏳ 正在备份文件...")
        if not self.create_backup():
            print("❌ 备份失败，迁移已取消")
            return False

        # 创建临时工作目录
        work_dir = self.current_backup / "work"
        if not self.dry_run:
            print("📂 创建工作目录...")
        work_dir.mkdir(parents=True, exist_ok=True)

        # 3. 下载外部图片
        download_result = self.download_external_images(work_dir)

        # 4. 上传本地图片
        upload_result = self.upload_local_images(work_dir)

        # 5. 生成报告
        duration = datetime.now() - start_time
        self.print_final_report(download_result, upload_result, duration)

        return True

    def print_final_report(self, download_result: dict, upload_result: dict, duration):
        """打印最终报告"""
        print("\n" + "=" * 60)
        print("✅ 迁移完成报告")
        print("=" * 60)
        print(f"⏱️  执行时间: {duration.total_seconds():.1f}秒")
        print(f"💾 备份位置: {self.current_backup}")
        print()
        print("📥 下载统计:")
        print(f"  外部图片总数: {download_result['total']}")
        print(f"  成功下载: {download_result['successful']}")
        print(f"  下载失败: {len(download_result['failed'])}")
        print()
        print("📤 上传统计:")
        print(f"  本地图片总数: {upload_result['total']}")
        print(f"  成功上传: {upload_result['successful']}")
        print(f"  使用缓存: {upload_result['cached']}")
        print(f"  上传失败: {len(upload_result['failed'])}")
        print()

        if self.dry_run:
            print("⚠️  这是预览模式，未实际修改文件")
            print("\n💡 提示: 确认无误后，运行以下命令执行正式迁移:")
            print(f"  python {Path(__file__).name}")
        else:
            print("🎉 迁移已完成!")
            print()
            print("💡 如果发现问题，可以使用以下命令回滚:")
            print(f"  python {Path(__file__).name} --rollback {self.current_backup.name}")
        print("=" * 60)

    def rollback(self, backup_name: Optional[str] = None) -> bool:
        """回滚到指定备份"""
        try:
            # 确定要回滚的备份
            if backup_name:
                backup_dir = self.backup_root / backup_name
            else:
                # 使用最新的备份
                backups = sorted(self.backup_root.glob("*"), reverse=True)
                if not backups:
                    print("❌ 没有找到可用的备份")
                    return False
                backup_dir = backups[0]

            if not backup_dir.exists():
                print(f"❌ 备份不存在: {backup_dir}")
                return False

            print(f"准备回滚到: {backup_dir}")

            # 确认
            if not self.dry_run:
                confirm = input("确认要回滚吗? 这将覆盖当前文件 (yes/no): ").strip().lower()
                if confirm not in ['yes', 'y']:
                    print("❌ 回滚已取消")
                    return False

            # 回滚 posts 目录
            posts_backup = backup_dir / "posts"
            if posts_backup.exists():
                if self.dry_run:
                    print(f"[DRY RUN] 将恢复: {posts_backup} -> {self.config.CONTENT_DIR}")
                else:
                    # 先删除当前目录
                    if self.config.CONTENT_DIR.exists():
                        shutil.rmtree(self.config.CONTENT_DIR)
                    shutil.copytree(posts_backup, self.config.CONTENT_DIR)
                    print(f"✓ 已恢复 posts 目录")

            # 回滚 cache 文件
            cache_backup = backup_dir / ".image_cache.json"
            if cache_backup.exists():
                if self.dry_run:
                    print(f"[DRY RUN] 将恢复: {cache_backup} -> {self.config.CACHE_FILE}")
                else:
                    shutil.copy2(cache_backup, self.config.CACHE_FILE)
                    print(f"✓ 已恢复缓存文件")

            print(f"✓ 回滚完成")
            return True

        except Exception as e:
            self.logger.error(f"回滚失败: {e}")
            return False


def main():
    """主入口"""
    parser = argparse.ArgumentParser(
        description="博客图片自动迁移工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 预览模式（推荐首次运行）
  python auto_migrate.py --dry-run

  # 正式执行迁移
  python auto_migrate.py

  # 回滚到最新备份
  python auto_migrate.py --rollback

  # 回滚到指定备份
  python auto_migrate.py --rollback 20260128_160000

  # 列出所有备份
  python auto_migrate.py --list-backups
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式，不实际修改文件'
    )

    parser.add_argument(
        '--rollback',
        nargs='?',
        const='',
        help='回滚到备份（可选指定备份名称）'
    )

    parser.add_argument(
        '--list-backups',
        action='store_true',
        help='列出所有可用的备份'
    )

    args = parser.parse_args()

    # 设置日志
    setup_logging(Config.LOG_LEVEL)

    # 初始化迁移器
    migrator = AutoMigrator(dry_run=args.dry_run)

    # 路由到不同功能
    if args.list_backups:
        list_backups(migrator.backup_root)
    elif args.rollback is not None:
        backup_name = args.rollback if args.rollback else None
        migrator.rollback(backup_name)
    else:
        migrator.run_migration()


def list_backups(backup_root: Path):
    """列出所有备份"""
    if not backup_root.exists():
        print("没有找到备份目录")
        return

    backups = sorted(backup_root.glob("*"), reverse=True)
    if not backups:
        print("没有可用的备份")
        return

    print("\n可用的备份:")
    print("=" * 60)
    for backup in backups:
        info_file = backup / "backup_info.txt"
        if info_file.exists():
            with open(info_file, 'r', encoding='utf-8') as f:
                info = f.read().strip()
            print(f"\n{backup.name}:")
            print(info)
        else:
            print(f"\n{backup.name}")
    print("=" * 60)


if __name__ == '__main__':
    main()
