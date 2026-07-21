#!/usr/bin/env python3
"""Audit Hugo source metadata and the generated public/ site for SEO regressions."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CONTENT = ROOT / "content" / "posts"
BASE_URL = "https://blog.anluoying.com/"
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_depth = 0
        self.title = ""
        self.metas: list[dict[str, str | None]] = []
        self.links: list[dict[str, str | None]] = []
        self.anchors: list[dict[str, str | None]] = []
        self.ids: set[str] = set()
        self.h1_count = 0
        self.images: list[dict[str, str | None]] = []
        self.json_ld: list[str] = []
        self._in_json_ld = False
        self._json_buffer: list[str] = []
        self.is_redirect = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(str(values["id"]))
        if tag == "title":
            self.title_depth += 1
        elif tag == "meta":
            self.metas.append(values)
            if (values.get("http-equiv") or "").lower() == "refresh":
                self.is_redirect = True
        elif tag == "link":
            self.links.append(values)
        elif tag == "a":
            self.anchors.append(values)
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "img":
            self.images.append(values)
        elif tag == "script" and values.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._json_buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.title_depth = max(0, self.title_depth - 1)
        elif tag == "script" and self._in_json_ld:
            self.json_ld.append("".join(self._json_buffer))
            self._in_json_ld = False

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title += data
        if self._in_json_ld:
            self._json_buffer.append(data)

    def meta(self, name: str) -> list[str]:
        return [
            str(item.get("content") or "")
            for item in self.metas
            if (item.get("name") or "").lower() == name.lower()
        ]

    def canonicals(self) -> list[str]:
        return [
            str(item.get("href") or "")
            for item in self.links
            if "canonical" in str(item.get("rel") or "").lower().split()
        ]


def front_matter(markdown: str) -> str:
    if not markdown.startswith("---\n"):
        return ""
    parts = markdown.split("---\n", 2)
    return parts[1] if len(parts) == 3 else ""


def scalar(frontmatter: str, key: str) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.*?)\s*$", frontmatter)
    if not match:
        return ""
    value = match.group(1).strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    return value.strip()


def parse_iso(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def expected_url(path: Path) -> str:
    relative = path.relative_to(PUBLIC).as_posix()
    if relative == "index.html":
        return BASE_URL
    if relative.endswith("/index.html"):
        return BASE_URL + relative[: -len("index.html")]
    return BASE_URL + relative


def same_url(left: str, right: str) -> bool:
    left_url = urlparse(left)
    right_url = urlparse(right)
    return (
        left_url.scheme == right_url.scheme
        and left_url.netloc == right_url.netloc
        and unquote(left_url.path) == unquote(right_url.path)
    )


def output_for_url(url: str) -> Path:
    parsed = urlparse(url)
    output = PUBLIC / unquote(parsed.path.lstrip("/"))
    if parsed.path.endswith("/"):
        output = output / "index.html"
    return output


def parse_html(path: Path) -> PageParser:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    return parser


def html_audit(errors: list[str], warnings: list[str]) -> tuple[int, int]:
    html_files = 0
    indexable_files = 0
    fallback_alt_count = 0
    fallback_alt_pages = 0
    for path in sorted(PUBLIC.rglob("*.html")):
        parser = parse_html(path)
        if parser.is_redirect:
            continue
        html_files += 1

        descriptions = parser.meta("description")
        robots = parser.meta("robots")
        canonicals = parser.canonicals()
        noindex = any("noindex" in value.lower() for value in robots)
        if not noindex:
            indexable_files += 1

        label = path.relative_to(ROOT).as_posix()
        title = parser.title.strip()
        if not title:
            errors.append(f"{label}: missing title")
        elif len(title) > 70:
            warnings.append(f"{label}: title is {len(title)} characters")

        if len(descriptions) != 1 or not descriptions[0].strip():
            errors.append(f"{label}: expected one non-empty meta description")
        elif not noindex and not 35 <= len(descriptions[0]) <= 180:
            errors.append(
                f"{label}: indexable description length is {len(descriptions[0])}"
            )

        if len(robots) != 1:
            errors.append(f"{label}: expected one robots meta tag, found {len(robots)}")
        if len(canonicals) != 1:
            errors.append(f"{label}: expected one canonical link, found {len(canonicals)}")

        json_alternates = [
            item
            for item in parser.links
            if "alternate" in str(item.get("rel") or "").lower().split()
            and str(item.get("type") or "").lower() == "application/json"
        ]
        if json_alternates:
            errors.append(f"{label}: exposes the search index as an alternate output")

        if not noindex and parser.h1_count != 1:
            errors.append(
                f"{label}: indexable page has {parser.h1_count} H1 elements"
            )

        empty_alts = sum(1 for image in parser.images if not (image.get("alt") or "").strip())
        if empty_alts:
            errors.append(f"{label}: {empty_alts} images have empty alt text")
        fallback_alts = sum(
            1
            for image in parser.images
            if str(image.get("alt") or "").strip().endswith(" - 配图")
        )
        if fallback_alts:
            fallback_alt_count += fallback_alts
            fallback_alt_pages += 1

        for block in parser.json_ld:
            try:
                data = json.loads(block)
            except json.JSONDecodeError as exc:
                errors.append(f"{label}: invalid JSON-LD: {exc}")
                continue
            graph = data.get("@graph", []) if isinstance(data, dict) else []
            types = {node.get("@type") for node in graph if isinstance(node, dict)}
            if "BlogPosting" in types and "/posts/" not in expected_url(path):
                errors.append(f"{label}: non-post page is marked as BlogPosting")

        if "/page/" in path.as_posix() and canonicals:
            if not same_url(canonicals[0], expected_url(path)):
                errors.append(
                    f"{label}: paginator canonical is {canonicals[0]}, expected {expected_url(path)}"
                )

    if fallback_alt_count:
        warnings.append(
            f"generated output uses {fallback_alt_count} fallback image alt texts "
            f"across {fallback_alt_pages} pages; replace them with descriptive source alt text"
        )

    return html_files, indexable_files


def sitemap_audit(errors: list[str]) -> int:
    path = PUBLIC / "sitemap.xml"
    if not path.exists():
        errors.append("public/sitemap.xml: missing")
        return 0

    root = ET.parse(path).getroot()
    entries = root.findall("s:url", SITEMAP_NS)
    now = datetime.now(timezone.utc)
    forbidden_exact = {"/posts/", "/search/", "/archives/"}
    seen_locations: set[str] = set()

    for entry in entries:
        location_node = entry.find("s:loc", SITEMAP_NS)
        if location_node is None or not location_node.text:
            errors.append("public/sitemap.xml: URL entry is missing loc")
            continue
        location = location_node.text
        if location in seen_locations:
            errors.append(f"public/sitemap.xml: duplicate URL {location}")
        seen_locations.add(location)
        parsed = urlparse(location)
        if parsed.scheme != "https" or parsed.netloc != "blog.anluoying.com":
            errors.append(f"public/sitemap.xml: unexpected host in {location}")
        if parsed.query or parsed.fragment:
            errors.append(f"public/sitemap.xml: URL contains query or fragment: {location}")
        if parsed.path.startswith("/tags/") or parsed.path in forbidden_exact:
            errors.append(f"public/sitemap.xml: noindex URL included: {location}")

        lastmod_node = entry.find("s:lastmod", SITEMAP_NS)
        if lastmod_node is not None and lastmod_node.text:
            lastmod = parse_iso(lastmod_node.text)
            if lastmod and lastmod > now:
                errors.append(f"public/sitemap.xml: future lastmod {lastmod_node.text} for {location}")

        output = output_for_url(location)
        if not output.exists() or output.suffix != ".html":
            errors.append(f"public/sitemap.xml: target is missing for {location}")
            continue
        parser = parse_html(output)
        if any("noindex" in value.lower() for value in parser.meta("robots")):
            errors.append(f"public/sitemap.xml: {location} resolves to a noindex page")
        canonicals = parser.canonicals()
        if len(canonicals) != 1 or not same_url(canonicals[0], location):
            errors.append(f"public/sitemap.xml: non-canonical URL {location}")

    return len(entries)


def discovery_audit(errors: list[str]) -> tuple[int, int]:
    feed_items = 0
    root_feed_path = PUBLIC / "index.xml"
    if not root_feed_path.exists():
        errors.append("public/index.xml: missing")
    feed_paths = sorted(PUBLIC.glob("**/index.xml"))
    for feed_path in feed_paths:
        label = feed_path.relative_to(ROOT).as_posix()
        channel = ET.parse(feed_path).getroot().find("channel")
        if channel is None:
            errors.append(f"{label}: missing RSS channel")
            continue

        description = (channel.findtext("description") or "").strip()
        if not description or description.lower().startswith("recent content"):
            errors.append(f"{label}: channel description is empty or generic")
        language = (channel.findtext("language") or "").strip().lower()
        if language != "zh-cn":
            errors.append(f"{label}: unexpected language {language!r}")

        items = channel.findall("item")
        if feed_path == root_feed_path:
            feed_items = len(items)
        seen_links: set[str] = set()
        for item in items:
            link = (item.findtext("link") or "").strip()
            if not link:
                errors.append(f"{label}: item is missing link")
                continue
            if link in seen_links:
                errors.append(f"{label}: duplicate item {link}")
            seen_links.add(link)
            parsed = urlparse(link)
            if parsed.scheme != "https" or parsed.netloc != "blog.anluoying.com":
                errors.append(f"{label}: unexpected item URL {link}")
                continue
            if feed_path == root_feed_path and not parsed.path.startswith("/posts/"):
                errors.append(f"{label}: non-post item {link}")
                continue
            output = output_for_url(link)
            if not output.exists():
                errors.append(f"{label}: item target is missing {link}")
                continue
            parser = parse_html(output)
            if any("noindex" in value.lower() for value in parser.meta("robots")):
                errors.append(f"{label}: noindex item {link}")
            canonicals = parser.canonicals()
            if len(canonicals) != 1 or not same_url(canonicals[0], link):
                errors.append(f"{label}: non-canonical item {link}")

    tag_feeds = sorted((PUBLIC / "tags").glob("**/index.xml"))
    if tag_feeds:
        errors.append(f"public/tags/: found {len(tag_feeds)} RSS feeds for noindex tag pages")

    search_path = PUBLIC / "index.json"
    search_items = 0
    if not search_path.exists():
        errors.append("public/index.json: missing")
    else:
        try:
            search_data = json.loads(search_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"public/index.json: invalid JSON: {exc}")
        else:
            if not isinstance(search_data, list):
                errors.append("public/index.json: expected a JSON array")
            else:
                search_items = len(search_data)
                seen_permalinks: set[str] = set()
                for item in search_data:
                    if not isinstance(item, dict):
                        errors.append("public/index.json: expected object entries")
                        continue
                    permalink = str(item.get("permalink") or "").strip()
                    if not permalink:
                        errors.append("public/index.json: item is missing permalink")
                        continue
                    if permalink in seen_permalinks:
                        errors.append(f"public/index.json: duplicate item {permalink}")
                    seen_permalinks.add(permalink)
                    output = output_for_url(permalink)
                    if not output.exists():
                        errors.append(f"public/index.json: item target is missing {permalink}")
                        continue
                    parser = parse_html(output)
                    if any("noindex" in value.lower() for value in parser.meta("robots")):
                        errors.append(f"public/index.json: noindex item {permalink}")
                    canonicals = parser.canonicals()
                    if len(canonicals) != 1 or not same_url(canonicals[0], permalink):
                        errors.append(f"public/index.json: non-canonical item {permalink}")

    return feed_items, search_items


def internal_link_audit(errors: list[str]) -> tuple[int, int]:
    checked = 0
    checked_fragments = 0
    parser_cache: dict[Path, PageParser] = {}

    def cached_parser(path: Path) -> PageParser:
        if path not in parser_cache:
            parser_cache[path] = parse_html(path)
        return parser_cache[path]

    for source in sorted(PUBLIC.rglob("*.html")):
        parser = cached_parser(source)
        if parser.is_redirect:
            continue
        base_url = expected_url(source)

        for anchor in parser.anchors:
            href = str(anchor.get("href") or "").strip()
            if not href or href.startswith(("mailto:", "tel:", "javascript:", "data:")):
                continue

            resolved = urlparse(urljoin(base_url, href))
            if resolved.scheme not in {"http", "https"}:
                continue
            if resolved.netloc != "blog.anluoying.com":
                continue

            target = PUBLIC / unquote(resolved.path.lstrip("/"))
            if resolved.path.endswith("/"):
                target = target / "index.html"
            elif not target.exists() and (target / "index.html").exists():
                target = target / "index.html"

            checked += 1
            if not target.exists():
                label = source.relative_to(ROOT).as_posix()
                errors.append(f"{label}: broken internal link {href}")
                continue

            fragment = unquote(resolved.fragment)
            if fragment and target.suffix == ".html":
                checked_fragments += 1
                if fragment not in cached_parser(target).ids:
                    label = source.relative_to(ROOT).as_posix()
                    errors.append(f"{label}: broken fragment {href}")

    return checked, checked_fragments


def llms_audit(errors: list[str]) -> int:
    path = PUBLIC / "llms.txt"
    if not path.exists():
        errors.append("public/llms.txt: missing")
        return 0

    text = path.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("# 安落滢 Blog\n"):
        errors.append("public/llms.txt: expected the site title as the first heading")

    links = re.findall(
        r"\[[^\]]+\]\((https://blog\.anluoying\.com/[^)\s]*)\)", text
    )
    if not links:
        errors.append("public/llms.txt: contains no internal links")
        return 0

    seen: set[str] = set()
    for link in links:
        if link in seen:
            errors.append(f"public/llms.txt: duplicate link {link}")
        seen.add(link)

        output = output_for_url(link)
        if not output.exists():
            errors.append(f"public/llms.txt: target is missing {link}")
            continue
        if output.suffix != ".html":
            continue

        parser = parse_html(output)
        if any("noindex" in value.lower() for value in parser.meta("robots")):
            errors.append(f"public/llms.txt: noindex target {link}")
        canonicals = parser.canonicals()
        if len(canonicals) != 1 or not same_url(canonicals[0], link):
            errors.append(f"public/llms.txt: non-canonical target {link}")

    return len(links)


def source_audit(errors: list[str], warnings: list[str]) -> int:
    published = 0
    now = datetime.now(timezone.utc)
    for path in sorted(CONTENT.glob("*.md")):
        if path.name == "_index.md":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        metadata = front_matter(text)
        if not metadata:
            errors.append(f"{path.relative_to(ROOT)}: missing YAML front matter")
            continue
        if scalar(metadata, "draft").lower() == "true":
            continue
        published += 1
        label = path.relative_to(ROOT).as_posix()
        if not scalar(metadata, "title"):
            errors.append(f"{label}: missing title")
        if not scalar(metadata, "description"):
            errors.append(f"{label}: published post has empty description")
        lastmod = parse_iso(scalar(metadata, "lastmod"))
        if lastmod and lastmod > now:
            errors.append(f"{label}: lastmod is in the future")
        if "chatgpt://" in text:
            errors.append(f"{label}: contains a chatgpt:// link")
        if re.search(r"(?m)^\s*-\s*([\"'])\1\s*$", metadata):
            warnings.append(f"{label}: contains an empty taxonomy value")
    return published


def main() -> int:
    if not PUBLIC.exists():
        print("public/ is missing; run Hugo before this audit", file=sys.stderr)
        return 2

    errors: list[str] = []
    warnings: list[str] = []
    published = source_audit(errors, warnings)
    html_files, indexable_files = html_audit(errors, warnings)
    sitemap_urls = sitemap_audit(errors)
    feed_items, search_items = discovery_audit(errors)
    internal_links, internal_fragments = internal_link_audit(errors)
    llms_links = llms_audit(errors)

    print(
        f"SEO audit: {published} non-draft posts, {html_files} non-redirect HTML pages, "
        f"{indexable_files} indexable HTML pages, {sitemap_urls} sitemap URLs, "
        f"{feed_items} RSS items, {search_items} search items, "
        f"{llms_links} llms.txt links, {internal_links} internal links, "
        f"{internal_fragments} internal fragments"
    )
    for warning in warnings:
        print(f"WARN: {warning}")
    for error in errors:
        print(f"ERROR: {error}")

    if errors:
        print(f"SEO audit failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    print("SEO audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
