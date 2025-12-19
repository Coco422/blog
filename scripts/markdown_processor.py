import re
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional
from urllib.parse import urlparse


@dataclass
class ImageReference:
    """Represents an image reference in markdown"""
    alt_text: str
    url: str
    line_number: int
    full_match: str
    is_remote: bool
    is_local: bool
    size_spec: Optional[str] = None


class MarkdownProcessor:
    """Process markdown files to extract and update image references"""

    def __init__(self, config):
        self.config = config
        self.image_pattern = re.compile(r'!\[(.*?)\]\((.*?)(?:\s+(=\d+x\d+))?\)')
        self.logger = logging.getLogger(__name__)

    def extract_images(self, md_file: Path) -> List[ImageReference]:
        """Extract all image references from markdown file"""
        images = []

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            for line_num, line in enumerate(content.split('\n'), 1):
                for match in self.image_pattern.finditer(line):
                    alt_text = match.group(1)
                    url = match.group(2)
                    size_spec = match.group(3) if len(match.groups()) >= 3 else None

                    is_remote = self.is_remote_url(url)
                    is_local = self.is_local_path(url)

                    images.append(ImageReference(
                        alt_text=alt_text,
                        url=url,
                        line_number=line_num,
                        full_match=match.group(0),
                        is_remote=is_remote,
                        is_local=is_local,
                        size_spec=size_spec
                    ))

        except Exception as e:
            self.logger.error(f"Error extracting images from {md_file}: {e}")

        return images

    def update_image_urls(self, md_file: Path, url_mapping: Dict[str, str],
                         backup_dir: Path) -> bool:
        """Update image URLs in markdown file and save to backup directory"""
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Replace URLs
            modified = False
            for old_url, new_url in url_mapping.items():
                if old_url in content:
                    content = content.replace(old_url, new_url)
                    modified = True

            if modified:
                # Create backup directory structure
                backup_file = self.create_backup(md_file, backup_dir, content)
                self.logger.info(f"Updated: {md_file.name} -> {backup_file}")
                return True

            return False

        except Exception as e:
            self.logger.error(f"Error updating {md_file}: {e}")
            return False

    def create_backup(self, md_file: Path, backup_dir: Path, content: str) -> Path:
        """Create backup of markdown file with updated content"""
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_file = backup_dir / md_file.name

        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(content)

        return backup_file

    def is_remote_url(self, url: str) -> bool:
        """Check if URL is remote (http/https)"""
        return url.startswith('http://') or url.startswith('https://')

    def is_local_path(self, url: str) -> bool:
        """Check if URL is local path (relative/absolute)"""
        if self.is_remote_url(url):
            return False
        if url.startswith('data:'):
            return False
        return True
