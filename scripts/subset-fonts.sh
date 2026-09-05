#!/usr/bin/env bash
#
# Subset the webfonts in scripts/fonts-src/ down to the characters this site
# renders, clamp their weight axis to the range the CSS declares, and write the
# result to public/fonts/.
#
#   scripts/subset-fonts.sh          # subset, print before/after
#   scripts/subset-fonts.sh --check  # report only, write nothing
#
# Source and output are separate directories on purpose: widening the character
# set below has to be able to add glyphs back, which subsetting an already
# subset file cannot do.
#
# It needs fontTools, which is NOT a dependency of this project - the site
# builds without it, and it is only ever run by hand when the character set or
# a weight changes. It is installed into a throwaway virtualenv; set
# FONTTOOLS_VENV to an existing one to skip that step.
#
# The sources in scripts/fonts-src/ are the `latin` subset files of the Archivo
# and JetBrains Mono variable fonts, fetched from the Google Fonts API on
# 2026-08-29 (SIL OFL 1.1, see public/fonts/LICENSE-OFL.txt):
#   archivo-variable         .../s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLydOxI.woff2
#   archivo-italic-variable  .../s/archivo/v25/k3kBo8UDI-1M0wlSfdzyIEkpwTM29hr-8mTYCxCmuA.woff2
#   jetbrains-mono-variable  .../s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD7OwE.woff2
# (host fonts.gstatic.com). Their unicode-range covers U+0000-00FF and
# U+2000-206F, which is where the typographic characters below come from.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=scripts/fonts-src
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
  U+00A9,        # copyright sign
  U+00E9,        # e acute - the photo title "Ilheus dos Mosteiros"
  U+00AB,U+00BB, # guillemets
  U+2013,U+2014, # en dash, em dash
  U+2018,U+2019,U+201A,   # single quotes; U+2019 is also the English apostrophe
  U+201C,U+201D,U+201E,   # double quotes, English and German
  U+2022,        # bullet
  U+2026,        # ellipsis
  U+2190,U+2192, # arrows - see the note below
  U+2261         # identical to - the mobile menu glyph, see the note below
EOF
)
# The last two lines request characters the sources do not contain: the `latin`
# subset carries U+2191/U+2193 but not U+2190/U+2192/U+2261, so the arrows and
# the mobile menu glyph render from a system fallback, subsetting or not. They
# stay listed so a fuller source would pick them up; the check below tolerates
# exactly these three and fails on anything else.
KNOWN_ABSENT="2190 2192 2261"

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
  src=$SRC/$name.woff2
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

  [ "$CHECK" = "--check" ] || cp "$work/$name.woff2" "$FONTS/$name.woff2"
done

printf '%-30s %7d -> %7d bytes  (-%d%%)\n' TOTAL "$total_before" "$total_after" \
  $(((total_before - total_after) * 100 / total_before))

# --- verify ------------------------------------------------------------------
# Fails the run if the subset dropped a character the site renders. Codepoints
# the source never had are tolerated only for the three in KNOWN_ABSENT.
"$PY" - "$work" "$SRC" "$UNICODES" "$KNOWN_ABSENT" <<'PYEOF'
import sys, os, glob, re
from fontTools.ttLib import TTFont

work, src_dir, spec, known = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

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

known_absent = {int(c, 16) for c in known.split()}


def points(codes):
    return ' '.join(f'U+{c:04X}' for c in codes)


ok = True
for path in sorted(glob.glob(f'{work}/*.woff2')):
    name = os.path.basename(path)
    source = TTFont(f'{src_dir}/{name}', lazy=True).getBestCmap()
    output = TTFont(path, lazy=True).getBestCmap()

    dropped = [c for c in wanted if c in source and c not in output]
    if dropped:
        ok = False
        print(f'  {name}: dropped by the subset: {points(dropped)}')

    unexpected = [c for c in wanted if c not in source and c not in known_absent]
    if unexpected:
        ok = False
        print(f'  {name}: not in the source font: {points(unexpected)}')

    tolerated = [c for c in wanted if c not in source and c in known_absent]
    if tolerated:
        print(f'  {name}: absent from the source, renders from a fallback: {points(tolerated)}')

print('character check: ' + ('ok' if ok else 'FAILED'))
sys.exit(0 if ok else 1)
PYEOF
