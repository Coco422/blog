#!/usr/bin/env python3
"""Cache intrinsic sizes of image-bed assets without downloading full images.

Run after adding remote images, before Hugo. Requires Pillow.
"""

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

from PIL import ImageFile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "remote_images.json"


def inspect(url: str) -> tuple[str, dict[str, int] | None]:
    try:
        request = Request(url, headers={
            "Range": "bytes=0-1048575",
            "User-Agent": "BlogImageMetadata/1.0 (+https://blog.anluoying.com/)",
        })
        with urlopen(request, timeout=25) as response:
            parser = ImageFile.Parser()
            for _ in range(256):
                chunk = response.read(4096)
                if not chunk:
                    break
                parser.feed(chunk)
                if parser.image:
                    width, height = parser.image.size
                    return url, {"width": width, "height": height}
        print(f"WARN: cannot read dimensions: {url}")
    except Exception as exc:
        print(f"WARN: {type(exc).__name__}: {url}")
    return url, None


def main() -> None:
    urls = set()
    for path in (ROOT / "content").rglob("*.md"):
        urls.update(re.findall(r'https://imgbed\.anluoying\.com/[^\s)<>"\]]+', path.read_text()))
    metadata = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    missing = sorted(urls - metadata.keys())
    with ThreadPoolExecutor(max_workers=6) as pool:
        for url, dimensions in pool.map(inspect, missing):
            if dimensions:
                metadata[url] = dimensions
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(f"Image metadata: {len(urls & metadata.keys())}/{len(urls)} source URLs have dimensions.")
    if urls - metadata.keys():
        raise SystemExit(1)


if __name__ == "__main__":
    main()
