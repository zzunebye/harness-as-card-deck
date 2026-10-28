#!/bin/sh
# Re-fetch the pinned pstack snapshot (cursor/plugins, pstack/ subdir) into vendor/pstack:
# skills, agents, LICENSE, and plugin.json only.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SHA=$(cat "$ROOT/vendor/pstack.sha")
DEST=${1:-$ROOT/vendor/pstack}
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/cursor/plugins/tar.gz/$SHA" -o "$TMP/plugins.tgz"
mkdir -p "$TMP/src" && tar -xzf "$TMP/plugins.tgz" -C "$TMP/src" --strip-components=1
P="$TMP/src/pstack"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -R "$P/skills" "$P/agents" "$P/LICENSE" "$DEST/"
cp "$P/.cursor-plugin/plugin.json" "$DEST/plugin.json"
find "$DEST/skills" -type f ! -name 'SKILL.md' ! -path '*/playbooks/*' -delete
find "$DEST/skills" -type d -empty -delete
rm -rf "$TMP"
echo "cursor/plugins@$SHA pstack/ -> $DEST"
