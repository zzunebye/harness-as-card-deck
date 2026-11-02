#!/bin/sh
# Re-fetch the pinned mattpocock/skills snapshot into vendor/mattpocock: LICENSE, plugin.json (version and skill list),
# and the SKILL.md of each skill plugin.json lists. misc/ and in-progress/ are not in the plugin, so they are not vendored.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/mattpocock.sha")
DEST=${1:-$ROOT/vendor/mattpocock}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/mattpocock/skills/tar.gz/$SHA" -o "$TMP/mattpocock.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/mattpocock.tgz" -C "$TMP/src" --strip-components=1
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP/src/LICENSE" "$TMP/src/.claude-plugin/plugin.json" "$DEST/"
for d in $(node -p "JSON.parse(require('fs').readFileSync('$DEST/plugin.json', 'utf8')).skills.join('\n')"); do
  mkdir -p "$DEST/$d" && cp "$TMP/src/$d/SKILL.md" "$DEST/$d/SKILL.md"
done
rm -rf "$TMP"
echo "mattpocock/skills@$SHA -> $DEST"
