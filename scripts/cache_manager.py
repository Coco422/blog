import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime


class CacheManager:
    """Manage upload cache to prevent duplicate uploads"""

    def __init__(self, cache_file: Path):
        self.cache_file = cache_file
        self.cache = self._load_cache()
        self.logger = logging.getLogger(__name__)

    def _load_cache(self) -> Dict:
        """Load cache from JSON file"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                self.logger.warning(f"Failed to load cache: {e}")
                return {"version": "1.0", "entries": {}}
        return {"version": "1.0", "entries": {}}

    def _save_cache(self):
        """Save cache to JSON file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Failed to save cache: {e}")

    def get(self, image_path: Path) -> Optional[str]:
        """Get cached URL for image by file hash"""
        if not image_path.exists():
            return None

        file_hash = self.get_hash(image_path)
        entry = self.cache.get("entries", {}).get(file_hash)

        if entry:
            self.logger.debug(f"Cache hit for {image_path.name}")
            return entry.get("url")

        return None

    def set(self, image_path: Path, url: str):
        """Cache uploaded image URL"""
        if not image_path.exists():
            return

        file_hash = self.get_hash(image_path)
        file_size = image_path.stat().st_size

        self.cache.setdefault("entries", {})[file_hash] = {
            "original_path": str(image_path),
            "url": url,
            "uploaded_at": datetime.now().isoformat(),
            "file_size": file_size
        }

        self._save_cache()
        self.logger.debug(f"Cached {image_path.name} -> {url}")

    def get_hash(self, image_path: Path) -> str:
        """Calculate SHA256 hash of image file"""
        sha256_hash = hashlib.sha256()

        with open(image_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)

        return sha256_hash.hexdigest()

    def clear(self):
        """Clear all cache entries"""
        self.cache = {"version": "1.0", "entries": {}}
        self._save_cache()
        self.logger.info("Cache cleared")

    def get_stats(self) -> Dict:
        """Get cache statistics"""
        entries = self.cache.get("entries", {})
        total_size = sum(entry.get("file_size", 0) for entry in entries.values())

        return {
            "total_entries": len(entries),
            "total_size": total_size,
            "cache_file": str(self.cache_file),
            "exists": self.cache_file.exists()
        }
