from __future__ import annotations

import os
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
REPO_NAME = os.getenv("GITHUB_REPOSITORY", "/" + ROOT.name).split("/")[-1]
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "javascript", "data"}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key in {"href", "src"} and value:
                self.references.append(value.strip())


def resolve_reference(source: Path, raw: str) -> Path | None:
    if not raw or raw.startswith("#") or raw.startswith("//"):
        return None

    parsed = urlparse(raw)
    if parsed.scheme.lower() in SKIP_SCHEMES or parsed.netloc:
        return None

    path = unquote(parsed.path)
    if not path:
        return None

    project_prefix = f"/{REPO_NAME}/"
    if path.startswith(project_prefix):
        candidate = ROOT / path[len(project_prefix):]
    elif path.startswith("/"):
        candidate = ROOT / path.lstrip("/")
    else:
        candidate = source.parent / path

    return candidate.resolve()


def main() -> int:
    html_files = sorted(ROOT.rglob("*.html"))
    if not html_files:
        print("ERROR: no HTML files found")
        return 1

    errors: list[str] = []
    for html_file in html_files:
        parser = ReferenceParser()
        try:
            parser.feed(html_file.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{html_file.relative_to(ROOT)}: cannot parse: {exc}")
            continue

        for raw in parser.references:
            target = resolve_reference(html_file, raw)
            if target is None:
                continue
            if ROOT not in target.parents and target != ROOT:
                errors.append(f"{html_file.relative_to(ROOT)}: path escapes repo: {raw}")
                continue
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                errors.append(f"{html_file.relative_to(ROOT)}: missing local reference: {raw}")

    if errors:
        print("Static-site validation failed:")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Static-site validation passed for {len(html_files)} HTML file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
