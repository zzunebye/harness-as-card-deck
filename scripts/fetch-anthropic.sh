#!/bin/sh
# Re-fetch the pinned anthropics/skills snapshot into vendor/anthropic:
# each skills/<name>/SKILL.md, plus one Apache-2.0 LICENSE.
# docx, pdf, pptx and xlsx are skipped on purpose. They are source-available under terms
# that forbid copying and derivative works, so they are not vendored, carded, or bundled.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/anthropic.sha")
DEST=${1:-$ROOT/vendor/anthropic}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/anthropics/skills/tar.gz/$SHA" -o "$TMP/skills.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/skills.tgz" -C "$TMP/src" --strip-components=1
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP/src/skills/algorithmic-art/LICENSE.txt" "$DEST/LICENSE"
for f in "$TMP"/src/skills/*/SKILL.md; do
  d=$(basename "$(dirname "$f")")
  case "$d" in docx|pdf|pptx|xlsx) continue ;; esac
  mkdir -p "$DEST/skills/$d" && cp "$f" "$DEST/skills/$d/SKILL.md"
done
rm -rf "$TMP"
echo "anthropics/skills@$SHA -> $DEST"
