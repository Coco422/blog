import re
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple


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
        # Match the core markdown image syntax, then parse destination details separately.
        self.image_pattern = re.compile(r'!\[(.*?)\]\((.*?)\)')
        self.inline_code_pattern = re.compile(r'`[^`]*`')
        self.logger = logging.getLogger(__name__)

    def extract_images(self, md_file: Path) -> List[ImageReference]:
        """Extract all image references from markdown file"""
        images = []

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            in_fenced_code = False
            fence_marker = None

            for line_num, line in enumerate(content.split('\n'), 1):
                stripped = line.lstrip()

                # Ignore fenced code blocks (``` or ~~~).
                if stripped.startswith('```') or stripped.startswith('~~~'):
                    marker = stripped[:3]
                    if not in_fenced_code:
                        in_fenced_code = True
                        fence_marker = marker
                    elif marker == fence_marker:
                        in_fenced_code = False
                        fence_marker = None
                    continue

                if in_fenced_code:
                    continue

                # Ignore inline code examples like `![alt](url)`.
                parse_line = self.inline_code_pattern.sub('', line)

                for match in self.image_pattern.finditer(parse_line):
                    alt_text = match.group(1)
                    destination = match.group(2)
                    url, size_spec = self.parse_destination(destination)
                    if not url:
                        continue

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

    def parse_destination(self, destination: str) -> Tuple[Optional[str], Optional[str]]:
        """Parse markdown image destination into URL and optional size spec."""
        destination = destination.strip()
        if not destination:
            return None, None

        size_spec = None
        size_match = re.search(r'(?:^|\s)(=\d+x\d+)\s*$', destination)
        if size_match:
            size_spec = size_match.group(1)
            destination = destination[:size_match.start()].strip()

        # Strip optional title suffixes: "title", 'title', or (title)
        destination = re.sub(r'\s+"[^"]*"\s*$', '', destination)
        destination = re.sub(r"\s+'[^']*'\s*$", '', destination)
        destination = re.sub(r'\s+\([^)]+\)\s*$', '', destination)

        if destination.startswith('<') and '>' in destination:
            destination = destination[1:destination.find('>')].strip()

        if not destination:
            return None, size_spec

        url = destination.split()[0]
        return url, size_spec

    def update_image_urls(self, md_file: Path, url_mapping: Dict[str, str],
                         backup_dir: Optional[Path] = None, in_place: bool = False) -> bool:
        """Update image URLs in markdown file

        Args:
            md_file: Source markdown file
            url_mapping: Dictionary mapping old URLs to new URLs
            backup_dir: Directory to save updated file (if not in_place)
            in_place: If True, update the original file directly
        """
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
                if in_place:
                    # Update original file directly
                    with open(md_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    self.logger.info(f"Updated in place: {md_file.name}")
                elif backup_dir:
                    # Save to backup directory
                    backup_file = self.create_backup(md_file, backup_dir, content)
                    self.logger.info(f"Updated: {md_file.name} -> {backup_file}")
                else:
                    self.logger.warning(f"No output specified for {md_file.name}")
                    return False
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
