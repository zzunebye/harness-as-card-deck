#!/bin/sh
# Re-fetch the pinned gstack snapshot (garrytan/gstack) into vendor/gstack:
# each top-level skill's SKILL.md, plus LICENSE and VERSION.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/gstack.sha")
DEST=${1:-$ROOT/vendor/gstack}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/garrytan/gstack/tar.gz/$SHA" -o "$TMP/gstack.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/gstack.tgz" -C "$TMP/src" --strip-components=1
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP/src/LICENSE" "$TMP/src/VERSION" "$DEST/"
for f in "$TMP"/src/*/SKILL.md; do
  d=$(basename "$(dirname "$f")")
  mkdir -p "$DEST/$d" && cp "$f" "$DEST/$d/SKILL.md"
done
rm -rf "$TMP"
echo "garrytan/gstack@$SHA -> $DEST"
