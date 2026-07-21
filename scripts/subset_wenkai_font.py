#!/usr/bin/env python3
"""Build an LXGW WenKai GB subset covering the blog's current text corpus."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError as exc:  # pragma: no cover - dependency guidance
    raise SystemExit(
        "Missing fontTools WOFF2 support. Run: "
        "python3 -m pip install fonttools brotli"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FONT = ROOT / "static/fonts/lxgw-wenkai-gb-standard.woff2"
OUTPUT_FONT = ROOT / "static/fonts/lxgw-wenkai-gb-site-subset.woff2"
COLORS_CSS = ROOT / "assets/css/extended/colors.css"
FONT_URL_PATTERN = re.compile(
    r"/fonts/lxgw-wenkai-gb-site-subset\.woff2(?:\?v=[0-9a-f]+)?"
)

TEXT_GLOBS = (
    "content/**/*.md",
    "layouts/**/*.html",
    "i18n/**/*.yaml",
    "assets/css/**/*.css",
    "assets/js/**/*.js",
    "themes/PaperMod/i18n/zh-cn.yaml",
)

EXTRA_TEXT_FILES = (
    "hugo.yaml",
    "archetypes/default.md",
    "README.md",
    "docs/SEO.md",
    "static/llms.txt",
)


def source_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in TEXT_GLOBS:
        files.update(path for path in ROOT.glob(pattern) if path.is_file())
    files.update(
        path for relative in EXTRA_TEXT_FILES if (path := ROOT / relative).is_file()
    )
    return sorted(files)


def corpus_characters(paths: list[Path]) -> str:
    corpus = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore") for path in paths
    )
    return "".join(sorted(set(corpus)))


def main() -> int:
    paths = source_files()
    characters = corpus_characters(paths)

    font = TTFont(SOURCE_FONT)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=characters)
    subsetter.subset(font)

    temporary = OUTPUT_FONT.with_suffix(".tmp.woff2")
    font.save(temporary)
    temporary.replace(OUTPUT_FONT)

    version = hashlib.sha256(OUTPUT_FONT.read_bytes()).hexdigest()[:12]
    css = COLORS_CSS.read_text(encoding="utf-8")
    versioned_url = f"/fonts/lxgw-wenkai-gb-site-subset.woff2?v={version}"
    updated_css, replacements = FONT_URL_PATTERN.subn(versioned_url, css)
    if replacements != 1:
        raise SystemExit(
            f"Expected one LXGW WenKai subset URL in {COLORS_CSS.relative_to(ROOT)}, "
            f"found {replacements}."
        )
    COLORS_CSS.write_text(updated_css, encoding="utf-8")

    print(
        f"Wrote {OUTPUT_FONT.relative_to(ROOT)} from {len(paths)} text files, "
        f"covering {len(characters)} unique characters "
        f"({OUTPUT_FONT.stat().st_size / 1024:.0f} KiB); "
        f"updated CSS cache key to {version}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
