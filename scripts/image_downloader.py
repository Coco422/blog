import time
import logging
import hashlib
import requests
from pathlib import Path
from typing import List, Dict, Set, Optional
from tqdm import tqdm

from utils import get_article_slug, extract_domain, format_file_size, url_encode_path
from markdown_processor import MarkdownProcessor


class ImageDownloader:
    """Download images from remote URLs"""

    def __init__(self, config, mode='full', exclude_domains=None):
        self.config = config
        self.mode = mode
        self.exclude_domains = set(exclude_domains or [])
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': config.USER_AGENT})
        self.logger = logging.getLogger(__name__)
        self.processor = MarkdownProcessor(config)

    def should_download(self, url: str) -> bool:
        """Determine if image should be downloaded based on mode"""
        if not url.startswith('http'):
            return False

        if self.mode == 'full':
            return True

        if self.mode == 'partial':
            domain = extract_domain(url)
            return domain not in self.exclude_domains

        return False

    def download_image(self, url: str, dest_path: Path) -> bool:
        """Download single image with retry logic"""
        for attempt in range(self.config.MAX_RETRIES):
            try:
                response = self.session.get(
                    url,
                    timeout=self.config.DOWNLOAD_TIMEOUT,
                    stream=True
                )
                response.raise_for_status()

                # Download with progress
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                with open(dest_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=self.config.CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)

                self.logger.debug(f"Downloaded: {url} -> {dest_path}")
                return True

            except requests.exceptions.RequestException as e:
                self.logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < self.config.MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    self.logger.error(f"Failed to download {url} after {self.config.MAX_RETRIES} attempts")
                    return False

        return False

    def get_article_name(self, md_file: Path) -> str:
        """Extract clean article name from markdown filename"""
        return get_article_slug(md_file)

    def handle_duplicate(self, dest_path: Path, url: str) -> Path:
        """Handle duplicate filenames with hash-based naming"""
        if not dest_path.exists():
            return dest_path

        # Generate hash from URL to create unique filename
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        stem = dest_path.stem
        suffix = dest_path.suffix

        return dest_path.parent / f"{stem}_{url_hash}{suffix}"

    def download_all_images(self, markdown_files: List[Path], backup_dir: Path,
                           dry_run: bool = False) -> Dict:
        """Download all images from markdown files"""
        self.logger.info(f"Starting download in {self.mode} mode")
        if self.exclude_domains:
            self.logger.info(f"Excluding domains: {', '.join(self.exclude_domains)}")

        # Collect all images to download
        images_to_download = []
        url_mappings = {}  # md_file -> {old_url: new_url}

        # Create images directory in backup_dir instead of blog root
        images_base_dir = backup_dir / 'images'

        for md_file in markdown_files:
            images = self.processor.extract_images(md_file)
            article_name = self.get_article_name(md_file)
            article_dir = images_base_dir / article_name

            url_mapping = {}

            for img in images:
                if not self.should_download(img.url):
                    continue

                # Determine filename from URL
                filename = Path(img.url).name
                if not filename or '?' in filename:
                    # Extract extension from URL or default to .png
                    ext = '.png'
                    for e in self.config.IMAGE_EXTENSIONS:
                        if e in img.url.lower():
                            ext = e
                            break
                    filename = f"image_{hashlib.md5(img.url.encode()).hexdigest()[:8]}{ext}"

                dest_path = article_dir / filename
                dest_path = self.handle_duplicate(dest_path, img.url)

                # Calculate relative path from markdown file to image (in same backup_dir)
                relative_path = Path('images') / article_name / dest_path.name

                images_to_download.append({
                    'url': img.url,
                    'dest_path': dest_path,
                    'md_file': md_file
                })

                # Use forward slashes for cross-platform compatibility
                url_mapping[img.url] = str(relative_path).replace('\\', '/')

            if url_mapping:
                url_mappings[md_file] = url_mapping

        # Download images
        total_images = len(images_to_download)
        successful = 0
        failed = []
        total_size = 0

        if dry_run:
            self.logger.info(f"[DRY RUN] Would download {total_images} images")
            for item in images_to_download:
                self.logger.info(f"[DRY RUN] {item['url']} -> {item['dest_path']}")
        else:
            with tqdm(total=total_images, desc="Downloading images", unit="img") as pbar:
                for item in images_to_download:
                    if self.download_image(item['url'], item['dest_path']):
                        successful += 1
                        if item['dest_path'].exists():
                            total_size += item['dest_path'].stat().st_size
                    else:
                        failed.append(item['url'])

                    pbar.update(1)
                    pbar.set_postfix({'success': successful, 'failed': len(failed)})

            # Update markdown files
            if url_mappings:
                self.logger.info("Updating markdown files...")
                for md_file, url_mapping in url_mappings.items():
                    self.processor.update_image_urls(md_file, url_mapping, backup_dir)

        return {
            'total': total_images,
            'successful': successful,
            'failed': failed,
            'total_size': total_size,
            'markdown_files': len(url_mappings)
        }
