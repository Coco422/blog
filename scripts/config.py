from pathlib import Path


class Config:
    """Configuration constants for blog image manager"""

    # Paths
    BLOG_ROOT = Path("/Users/ray/Documents/blog")
    CONTENT_DIR = BLOG_ROOT / "content/posts"
    IMAGES_DIR = BLOG_ROOT / "images"
    CACHE_FILE = BLOG_ROOT / ".image_cache.json"

    # Download settings
    DOWNLOAD_TIMEOUT = 30
    MAX_RETRIES = 3
    CHUNK_SIZE = 8192
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

    # Upload settings
    PICGO_DEFAULT_URL = "http://127.0.0.1:36677/upload"
    UPLOAD_TIMEOUT = 60

    # Image patterns
    IMAGE_REGEX = r'!\[(.*?)\]\((.*?)(?:\s+=\d+x\d+)?\)'
    IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'}

    # Logging
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"
