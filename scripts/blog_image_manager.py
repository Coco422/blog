#!/usr/bin/env python3
"""
Blog Image Manager - CLI tool for managing blog images

Usage:
    python blog_image_manager.py download --mode full --backup-dir ~/backups
    python blog_image_manager.py upload --picgo-url http://127.0.0.1:36677/upload
    python blog_image_manager.py status --show-hosts
"""

import argparse
import logging
import sys
from pathlib import Path
from datetime import datetime

from config import Config
from utils import setup_logging, format_file_size, extract_domain
from markdown_processor import MarkdownProcessor
from image_downloader import ImageDownloader
from image_uploader import ImageUploader
from cache_manager import CacheManager


def get_markdown_files(content_dir: Path) -> list:
    """Get all markdown files from content directory"""
    return list(content_dir.glob("*.md"))


def command_download(args):
    """Handle download command"""
    logger = logging.getLogger(__name__)
    config = Config()

    # Validate backup directory
    backup_dir = Path(args.backup_dir).expanduser().resolve()
    if not args.dry_run:
        backup_dir.mkdir(parents=True, exist_ok=True)

    # Get markdown files
    markdown_files = get_markdown_files(config.CONTENT_DIR)
    logger.info(f"Found {len(markdown_files)} markdown files")

    # Initialize downloader
    downloader = ImageDownloader(
        config,
        mode=args.mode,
        exclude_domains=args.exclude_domains or []
    )

    # Download images
    start_time = datetime.now()
    result = downloader.download_all_images(
        markdown_files,
        backup_dir,
        dry_run=args.dry_run
    )
    duration = datetime.now() - start_time

    # Print report
    print("\n" + "=" * 60)
    print("Blog Image Manager - Download Report")
    print("=" * 60)
    print(f"Operation: Download ({args.mode} mode)")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("Summary:")
    print(f"  Total markdown files: {len(markdown_files)}")
    print(f"  Total images found: {result['total']}")
    print(f"  Successfully downloaded: {result['successful']}")
    print(f"  Failed: {len(result['failed'])}")
    print()
    if not args.dry_run:
        print("Storage:")
        print(f"  Total size: {format_file_size(result['total_size'])}")
        if result['successful'] > 0:
            avg_size = result['total_size'] / result['successful']
            print(f"  Average size: {format_file_size(avg_size)}")
        print()
    if result['failed']:
        print("Failed Downloads:")
        for i, url in enumerate(result['failed'], 1):
            print(f"  {i}. {url}")
        print()
    if not args.dry_run:
        print(f"Backup Location: {backup_dir}")
        print()
    print(f"Duration: {duration.total_seconds():.1f}s")
    print("=" * 60)


def command_upload(args):
    """Handle upload command"""
    logger = logging.getLogger(__name__)
    config = Config()

    # Validate source directory
    source_dir = Path(args.source_dir).expanduser().resolve()
    if not source_dir.exists():
        logger.error(f"Source directory does not exist: {source_dir}")
        sys.exit(1)

    # Validate backup directory if specified
    backup_dir = None
    if args.backup_dir:
        backup_dir = Path(args.backup_dir).expanduser().resolve()
        if not args.dry_run:
            backup_dir.mkdir(parents=True, exist_ok=True)

    # Get markdown files from source directory
    markdown_files = get_markdown_files(source_dir)
    logger.info(f"Found {len(markdown_files)} markdown files in {source_dir}")

    # Initialize uploader with source directory
    uploader = ImageUploader(
        config,
        picgo_url=args.picgo_url,
        skip_cache=args.skip_cache
    )

    # Upload images
    start_time = datetime.now()
    result = uploader.upload_all_local_images(
        markdown_files,
        source_dir=source_dir,
        backup_dir=backup_dir,
        dry_run=args.dry_run
    )
    duration = datetime.now() - start_time

    # Print report
    print("\n" + "=" * 60)
    print("Blog Image Manager - Upload Report")
    print("=" * 60)
    print(f"Operation: Upload")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("Summary:")
    print(f"  Total markdown files: {len(markdown_files)}")
    print(f"  Total local images found: {result['total']}")
    print(f"  Successfully uploaded: {result['successful']}")
    print(f"  Cached (skipped): {result['cached']}")
    print(f"  Failed: {len(result['failed'])}")
    print()
    if result['failed']:
        print("Failed Uploads:")
        for i, path in enumerate(result['failed'], 1):
            print(f"  {i}. {path}")
        print()
    if backup_dir and not args.dry_run:
        print(f"Backup Location: {backup_dir}")
        print()
    print(f"Duration: {duration.total_seconds():.1f}s")
    print("=" * 60)


def command_status(args):
    """Handle status command"""
    config = Config()
    processor = MarkdownProcessor(config)

    # Get markdown files
    markdown_files = get_markdown_files(config.CONTENT_DIR)

    # Collect statistics
    host_stats = {}
    local_count = 0
    total_images = 0

    for md_file in markdown_files:
        images = processor.extract_images(md_file)
        for img in images:
            total_images += 1
            if img.is_remote:
                domain = extract_domain(img.url)
                host_stats[domain] = host_stats.get(domain, 0) + 1
            elif img.is_local:
                local_count += 1

    # Print status report
    print("\n" + "=" * 60)
    print("Blog Image Manager - Status Report")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print(f"Total markdown files: {len(markdown_files)}")
    print(f"Total images: {total_images}")
    print()

    if args.show_hosts:
        print("Image Hosts:")
        if host_stats:
            for domain, count in sorted(host_stats.items(), key=lambda x: x[1], reverse=True):
                print(f"  {domain}: {count} images")
        else:
            print("  No remote images found")
        print()

    if args.show_local:
        print(f"Local images: {local_count}")
        print()

    if args.show_cache:
        cache = CacheManager(config.CACHE_FILE)
        stats = cache.get_stats()
        print("Cache Statistics:")
        print(f"  Total cached uploads: {stats['total_entries']}")
        print(f"  Cache file size: {format_file_size(stats['total_size'])}")
        print(f"  Cache file: {stats['cache_file']}")
        print(f"  Exists: {stats['exists']}")
        print()

    print("=" * 60)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Blog Image Manager - Manage blog images with download and upload operations",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Download command
    download_parser = subparsers.add_parser('download', help='Download remote images to local')
    download_parser.add_argument(
        '--mode',
        choices=['full', 'partial'],
        required=True,
        help='Download mode: full (all images) or partial (exclude specified domains)'
    )
    download_parser.add_argument(
        '--exclude-domains',
        nargs='+',
        help='Domains to exclude in partial mode (e.g., imgbed.anluoying.com)'
    )
    download_parser.add_argument(
        '--backup-dir',
        required=True,
        help='Directory for backup markdown files'
    )
    download_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview without downloading'
    )
    download_parser.add_argument(
        '--threads',
        type=int,
        default=5,
        help='Number of download threads (default: 5)'
    )

    # Upload command
    upload_parser = subparsers.add_parser('upload', help='Upload local images to PicGo')
    upload_parser.add_argument(
        '--source-dir',
        required=True,
        help='Source directory containing markdown files and images to upload'
    )
    upload_parser.add_argument(
        '--picgo-url',
        default=Config.PICGO_DEFAULT_URL,
        help=f'PicGo server URL (default: {Config.PICGO_DEFAULT_URL})'
    )
    upload_parser.add_argument(
        '--backup-dir',
        help='Directory for backup markdown files with updated URLs (optional)'
    )
    upload_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview without uploading'
    )
    upload_parser.add_argument(
        '--skip-cache',
        action='store_true',
        help='Ignore cache and re-upload all images'
    )

    # Status command
    status_parser = subparsers.add_parser('status', help='Show current image status')
    status_parser.add_argument(
        '--show-hosts',
        action='store_true',
        help='Show image host distribution'
    )
    status_parser.add_argument(
        '--show-local',
        action='store_true',
        help='Show local image count'
    )
    status_parser.add_argument(
        '--show-cache',
        action='store_true',
        help='Show cache statistics'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(Config.LOG_LEVEL)

    # Route to command handler
    if args.command == 'download':
        command_download(args)
    elif args.command == 'upload':
        command_upload(args)
    elif args.command == 'status':
        command_status(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
