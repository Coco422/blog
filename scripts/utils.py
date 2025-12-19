import re
import logging
from pathlib import Path
from urllib.parse import urlparse, quote
from typing import Optional


def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename and replace spaces"""
    # Replace spaces with hyphens for better URL compatibility
    sanitized = filename.replace(' ', '-')
    # Remove other invalid characters (but keep Unicode characters like Chinese)
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, '_', sanitized)
    sanitized = sanitized.strip('. -_')
    return sanitized if sanitized else 'unnamed'


def get_article_slug(md_file: Path) -> str:
    """Extract article slug from markdown filename"""
    stem = md_file.stem
    slug = sanitize_filename(stem)
    return slug


def format_file_size(size_bytes: int) -> str:
    """Format bytes to human-readable size"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def setup_logging(level: str = "INFO"):
    """Configure logging"""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def validate_url(url: str) -> bool:
    """Validate URL format"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except Exception:
        return ""


def url_encode_path(path: str) -> str:
    """URL encode path for use in markdown links"""
    # Split path into parts
    parts = Path(path).parts
    # Encode each part separately (preserving /)
    encoded_parts = [quote(part, safe='') for part in parts]
    # Join back with /
    return '/'.join(encoded_parts)
