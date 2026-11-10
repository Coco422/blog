#!/usr/bin/env python3
"""Notify IndexNow about deployed canonical URLs; dry-run unless --submit is set."""

import argparse
from pathlib import Path
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
HOST = "blog.anluoying.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("urls", nargs="*")
    parser.add_argument("--sitemap", type=Path, help="Read URLs from a built production sitemap")
    parser.add_argument("--submit", action="store_true", help="Verify the deployed key and notify IndexNow")
    args = parser.parse_args()

    sitemap_urls = {
        node.text for node in ET.parse(ROOT / "public/sitemap.xml").findall(f".//{SITEMAP_NS}loc")
        if node.text
    }
    urls = list(args.urls)
    if args.sitemap:
        urls.extend(node.text for node in ET.parse(args.sitemap).findall(f".//{SITEMAP_NS}loc") if node.text)
    urls = list(dict.fromkeys(urls))
    if not 1 <= len(urls) <= 10000:
        parser.error("provide 1–10000 URLs or --sitemap; build production output first")
    for url in urls:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != HOST or parsed.query or parsed.fragment or url not in sitemap_urls:
            parser.error(f"not a current canonical sitemap URL: {url}")

    key_files = [p for p in (ROOT / "static").glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}\.txt", p.name)]
    if len(key_files) != 1:
        parser.error("expected exactly one static/<IndexNow-public-key>.txt verification file")
    key_file = key_files[0]
    key = key_file.read_text(encoding="utf-8").strip()
    if key != key_file.stem:
        parser.error("verification file content must match its filename")
    if not args.submit:
        print(f"Dry run: {len(urls)} canonical URLs; no request sent. Add --submit after deployment.")
        return

    key_url = f"https://{HOST}/{key_file.name}"
    try:
        with urlopen(Request(key_url, headers={"User-Agent": "BlogIndexNow/1.0"}), timeout=30) as response:
            if response.status != 200 or response.read(256).decode("utf-8").strip() != key:
                raise SystemExit("Deployed verification file does not match; nothing submitted.")
        body = json.dumps({"host": HOST, "key": key, "keyLocation": key_url, "urlList": urls}).encode("utf-8")
        request = Request(ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "BlogIndexNow/1.0"})
        with urlopen(request, timeout=30) as response:
            status = response.status
    except HTTPError as exc:
        raise SystemExit(f"IndexNow/verification HTTP {exc.code}; no automatic retry.") from None
    except (URLError, TimeoutError) as exc:
        raise SystemExit(f"IndexNow/verification network error ({type(exc).__name__}); check status before retrying.") from None
    if status not in (200, 202):
        raise SystemExit(f"Unexpected IndexNow HTTP {status}.")
    print(f"IndexNow HTTP {status}: {len(urls)} URLs received. This does not guarantee indexing.")


if __name__ == "__main__":
    main()
