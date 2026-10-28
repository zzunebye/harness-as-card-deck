#!/bin/sh
# Re-fetch the pinned compound-engineering snapshot (EveryInc/compound-engineering-plugin) into vendor/compound:
# each skills/<name>/SKILL.md, plus LICENSE and plugin.json (for the version).
# Per-skill agent files under references/agents are not vendored. Their names repeat with different bodies per skill.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/compound.sha")
DEST=${1:-$ROOT/vendor/compound}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/EveryInc/compound-engineering-plugin/tar.gz/$SHA" -o "$TMP/compound.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/compound.tgz" -C "$TMP/src" --strip-components=1
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP/src/LICENSE" "$TMP/src/plugin.json" "$DEST/"
for f in "$TMP"/src/skills/*/SKILL.md; do
  d=$(basename "$(dirname "$f")")
  mkdir -p "$DEST/skills/$d" && cp "$f" "$DEST/skills/$d/SKILL.md"
done
rm -rf "$TMP"
echo "EveryInc/compound-engineering-plugin@$SHA -> $DEST"
