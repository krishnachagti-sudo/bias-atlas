#!/bin/sh
# Import a ChatGPT engraving: plate-import.sh <png> <name>
# name is "wild-<case-slug>-hero" (case-page engravings, as on the Law Tome).
# Writes assets/img/plates/<name>.webp (1400 wide) and <name>-800.webp, plus a 1200x675 .jpg for heroes (share image).
set -e
src="$1"; name="$2"; out="$(dirname "$0")/../src/assets/img/plates"
mkdir -p "$out"
cwebp -quiet -q 62 -resize 1400 0 "$src" -o "$out/$name.webp"
cwebp -quiet -q 62 -resize 800 0 "$src" -o "$out/$name-800.webp"
case "$name" in *-hero)
  tmp="$(mktemp -t plate).jpg"
  sips -s format jpeg -s formatOptions 80 -z 675 1200 "$src" --out "$tmp" >/dev/null
  mv "$tmp" "$out/$name.jpg";;
esac
ls -la "$out/$name".*
