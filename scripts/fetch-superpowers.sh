#!/bin/sh
# Re-fetch the pinned superpowers snapshot (obra/superpowers) into vendor/superpowers:
# each skills/<name>/SKILL.md, plus LICENSE and package.json (for the version).
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/superpowers.sha")
DEST=${1:-$ROOT/vendor/superpowers}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/obra/superpowers/tar.gz/$SHA" -o "$TMP/superpowers.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/superpowers.tgz" -C "$TMP/src" --strip-components=1
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP/src/LICENSE" "$TMP/src/package.json" "$DEST/"
for f in "$TMP"/src/skills/*/SKILL.md; do
  d=$(basename "$(dirname "$f")")
  mkdir -p "$DEST/skills/$d" && cp "$f" "$DEST/skills/$d/SKILL.md"
done
rm -rf "$TMP"
echo "obra/superpowers@$SHA -> $DEST"
