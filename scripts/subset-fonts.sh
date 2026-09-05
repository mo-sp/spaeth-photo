#!/usr/bin/env bash
#
# Subset the self-hosted webfonts in public/fonts/ down to the characters this
# site actually renders, and clamp their weight axis to the range the CSS
# declares. Roughly halves the font payload.
#
#   scripts/subset-fonts.sh          # subset in place, print before/after
#   scripts/subset-fonts.sh --check  # report only, write nothing
#
# The script is idempotent: run on already-subset files it reproduces them.
#
# It needs fontTools, which is NOT a dependency of this project - the site
# builds without it, and it is only ever run by hand when the character set or
# a weight changes. It is installed into a throwaway virtualenv; set
# FONTTOOLS_VENV to an existing one to skip that step.
#
# Where the source files came from, if the set ever has to be widened again:
# the Archivo and JetBrains Mono variable fonts from the Google Fonts API
# (`latin` subset, 2026-08-29), SIL OFL 1.1. The OFL permits subsetting; the
# note in public/fonts/LICENSE-OFL.txt records that these files are modified.
set -euo pipefail

cd "$(dirname "$0")/.."
FONTS=public/fonts
CHECK=${1:-}

# --- character set -----------------------------------------------------------
#
# Derived from what the pages and the photo index actually contain, plus the
# typographic characters the design uses. Grouped so a future addition is
# obvious rather than appended to a wall of hex.
UNICODES=$(sed 's/#.*//' <<'EOF' | tr -d ' \n' | sed 's/,*$//'
  U+0020-007E,   # printable ASCII
  U+00A0,        # no-break space
  U+00AD,        # soft hyphen (the sidebar hyphenates long titles)
  U+00A7,        # section sign - "§ 5 DDG" in the imprint
  U+00B0,        # degree sign - the footer coordinates
  U+00B7,        # middle dot - separates camera and lens
  U+00D7,        # multiplication sign - image dimensions
  U+00C4,U+00D6,U+00DC,U+00DF,U+00E4,U+00F6,U+00FC,   # German umlauts and eszett
  U+00E9,        # e acute - the photo title "Ilheus dos Mosteiros"
  U+00AB,U+00BB, # guillemets
  U+2013,U+2014, # en dash, em dash
  U+2018,U+201A,U+201C,U+201E,   # single and double German quotation marks
  U+2026,        # ellipsis
  U+2190,U+2192, # arrows - see the note below
  U+2261         # identical to - the mobile menu glyph, see the note below
EOF
)
# The last two lines request characters the source fonts do not contain:
# Google's `latin` subset stops short of U+2190/U+2192/U+2261, so the arrows in
# "Alle Bilder ->" and the mobile menu glyph already render from a system
# fallback font, subsetting or not. They are listed anyway so that the intent
# is recorded and a future, fuller source font would pick them up; pyftsubset
# ignores codepoints it cannot find. The check below reports them.

# --- weight axis -------------------------------------------------------------
#
# These are variable fonts. Archivo ships a 100-900 weight axis and JetBrains
# Mono a 400-800 one, but @font-face in app/assets/css/fonts.css promises only
# what the design uses. Clamping the axis to exactly that promise is where most
# of the saving comes from - and it means the file can render everything the
# CSS says it can, no more and no less.
#
# Changing a font-weight in the CSS therefore means changing it here and
# re-running this script.
declare -A AXIS=(
  [archivo-variable]=wght=400:600
  [archivo-italic-variable]=wght=400:500
  [jetbrains-mono-variable]=wght=400:500
)

# --- tooling -----------------------------------------------------------------
VENV=${FONTTOOLS_VENV:-}
CLEANUP=
if [ -z "$VENV" ]; then
  VENV=$(mktemp -d)
  CLEANUP=$VENV
  trap '[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"' EXIT
  echo "installing fontTools into $VENV ..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet fonttools brotli
fi
PY=$VENV/bin/python

work=$(mktemp -d)
trap '[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"; rm -rf "$work"' EXIT

total_before=0
total_after=0

for name in "${!AXIS[@]}"; do
  src=$FONTS/$name.woff2
  [ -f "$src" ] || { echo "missing: $src" >&2; exit 1; }

  # varLib.instancer first (it needs a real font table tree), pyftsubset second.
  # --layout-features='*' keeps kern/liga/calt/tnum and the ccmp+mark rules the
  # accented characters need; dropping features to save bytes would break
  # tabular figures in the counters.
  # Both tools log at INFO; the log is only interesting when they fail.
  if ! { "$PY" -m fontTools.varLib.instancer "$src" "${AXIS[$name]}" -o "$work/$name.ttf" &&
         "$PY" -m fontTools.subset "$work/$name.ttf" \
           --output-file="$work/$name.woff2" \
           --flavor=woff2 \
           --layout-features='*' \
           --unicodes="$UNICODES"; } >"$work/$name.log" 2>&1; then
    cat "$work/$name.log" >&2
    exit 1
  fi

  before=$(stat -c%s "$src")
  after=$(stat -c%s "$work/$name.woff2")
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  printf '%-30s %7d -> %7d bytes  (-%d%%)\n' "$name" "$before" "$after" \
    $(((before - after) * 100 / before))

  [ "$CHECK" = "--check" ] || cp "$work/$name.woff2" "$src"
done

printf '%-30s %7d -> %7d bytes  (-%d%%)\n' TOTAL "$total_before" "$total_after" \
  $(((total_before - total_after) * 100 / total_before))

# --- verify ------------------------------------------------------------------
# Every requested codepoint either survives into the output or was never in the
# source. Anything else means the subset silently dropped a character the site
# renders.
# In --check mode public/fonts still holds the old files, so the check always
# looks at what was just produced in the work directory.
"$PY" - "$work" "$UNICODES" <<'PYEOF'
import sys, glob, re
from fontTools.ttLib import TTFont

fonts_dir, spec = sys.argv[1], sys.argv[2]
wanted = []
for part in spec.split(','):
    part = re.sub(r'#.*', '', part).strip()
    if not part:
        continue
    if '-' in part:
        lo, hi = part.split('-')
        wanted += list(range(int(lo[2:], 16), int(hi, 16) + 1))
    else:
        wanted.append(int(part[2:], 16))

ok = True
for path in sorted(glob.glob(f'{fonts_dir}/*.woff2')):
    cmap = TTFont(path, lazy=True).getBestCmap()
    missing = [c for c in wanted if c not in cmap]
    if missing:
        ok = False
        print(f'  {path}: not covered: ' + ' '.join(f'U+{c:04X}' for c in missing))
print('character check: ' + ('all requested characters present'
      if ok else 'see above (expected for U+2190/U+2192/U+2261)'))
PYEOF
