import logging
import requests
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm

from markdown_processor import MarkdownProcessor
from cache_manager import CacheManager


class ImageUploader:
    """Upload local images to PicGo server"""

    def __init__(self, config, picgo_url: str, skip_cache: bool = False):
        self.config = config
        self.picgo_url = picgo_url
        self.cache = CacheManager(config.CACHE_FILE)
        self.skip_cache = skip_cache
        self.logger = logging.getLogger(__name__)
        self.processor = MarkdownProcessor(config)

    def verify_picgo_server(self) -> bool:
        """Verify PicGo server is running"""
        try:
            # Try to connect to the server
            response = requests.get(
                self.picgo_url.replace('/upload', ''),
                timeout=5
            )
            self.logger.info("PicGo server is accessible")
            return True
        except requests.exceptions.RequestException as e:
            self.logger.error(f"PicGo server not accessible: {e}")
            self.logger.error(f"Please ensure PicGo is running at {self.picgo_url}")
            return False

    def upload_image(self, image_path: Path) -> Optional[str]:
        """Upload single image to PicGo server"""
        try:
            # Convert to absolute path
            abs_path = image_path.resolve()

            # Make upload request
            response = requests.post(
                self.picgo_url,
                json={"list": [str(abs_path)]},
                headers={"Content-Type": "application/json"},
                timeout=self.config.UPLOAD_TIMEOUT
            )

            result = response.json()

            if result.get("success") and result.get("result"):
                url = result["result"][0]
                self.logger.debug(f"Uploaded: {image_path.name} -> {url}")
                return url
            else:
                self.logger.error(f"Upload failed for {image_path.name}: {result}")
                return None

        except Exception as e:
            self.logger.error(f"Upload error for {image_path.name}: {e}")
            return None

    def is_cached(self, image_path: Path) -> Optional[str]:
        """Check if image already uploaded (cache lookup)"""
        if self.skip_cache:
            return None
        return self.cache.get(image_path)

    def upload_all_local_images(self, markdown_files: List[Path],
                                source_dir: Path,
                                backup_dir: Optional[Path] = None,
                                dry_run: bool = False) -> Dict:
        """Upload all local images from markdown files"""
        self.logger.info(f"Starting upload operation from {source_dir}")

        if not dry_run and not self.verify_picgo_server():
            return {
                'total': 0,
                'successful': 0,
                'cached': 0,
                'failed': [],
                'markdown_files': 0
            }

        # Collect all local images to upload
        images_to_upload = []
        url_mappings = {}  # md_file -> {old_url: new_url}

        for md_file in markdown_files:
            images = self.processor.extract_images(md_file)
            url_mapping = {}

            for img in images:
                # Skip remote URLs
                if img.is_remote:
                    continue

                # Only process local paths
                if not img.is_local:
                    continue

                # Resolve local path relative to source_dir
                if Path(img.url).is_absolute():
                    image_path = Path(img.url)
                else:
                    # Relative path from markdown file's directory
                    image_path = (md_file.parent / img.url).resolve()

                if not image_path.exists():
                    self.logger.warning(f"Local image not found: {image_path}")
                    continue

                images_to_upload.append({
                    'path': image_path,
                    'original_url': img.url,
                    'md_file': md_file
                })

        # Upload images
        total_images = len(images_to_upload)
        successful = 0
        cached = 0
        failed = []

        if dry_run:
            self.logger.info(f"[DRY RUN] Would upload {total_images} local images")
            for item in images_to_upload:
                cached_url = self.is_cached(item['path'])
                if cached_url:
                    self.logger.info(f"[DRY RUN] Cached: {item['path'].name} -> {cached_url}")
                else:
                    self.logger.info(f"[DRY RUN] Would upload: {item['path']}")
        else:
            with tqdm(total=total_images, desc="Uploading images", unit="img") as pbar:
                for item in images_to_upload:
                    # Check cache first
                    cached_url = self.is_cached(item['path'])
                    if cached_url:
                        self.logger.info(f"Using cached URL for {item['path'].name}")
                        new_url = cached_url
                        cached += 1
                    else:
                        # Upload to PicGo
                        new_url = self.upload_image(item['path'])
                        if new_url:
                            # Update cache
                            self.cache.set(item['path'], new_url)
                            successful += 1
                        else:
                            failed.append(str(item['path']))
                            pbar.update(1)
                            continue

                    # Build URL mapping
                    md_file = item['md_file']
                    if md_file not in url_mappings:
                        url_mappings[md_file] = {}
                    url_mappings[md_file][item['original_url']] = new_url

                    pbar.update(1)
                    pbar.set_postfix({
                        'uploaded': successful,
                        'cached': cached,
                        'failed': len(failed)
                    })

            # Update markdown files if backup_dir specified
            if backup_dir and url_mappings:
                self.logger.info("Updating markdown files...")
                for md_file, url_mapping in url_mappings.items():
                    self.processor.update_image_urls(md_file, url_mapping, backup_dir)

        return {
            'total': total_images,
            'successful': successful,
            'cached': cached,
            'failed': failed,
            'markdown_files': len(url_mappings)
        }
