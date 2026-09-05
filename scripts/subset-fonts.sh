#!/usr/bin/env bash
#
# Subset the webfonts in scripts/fonts-src/ down to the characters this site
# renders, pin or clamp their weight axis to what the CSS declares, and write
# the result to public/fonts/.
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
# Sources (SIL OFL 1.1, see public/fonts/LICENSE-OFL.txt):
#
#   archivo-variable         the `latin` subset files of the Archivo and
#   archivo-italic-variable  JetBrains Mono variable fonts, fetched from the
#   jetbrains-mono-variable  Google Fonts API on 2026-08-29 -
#     .../s/archivo/v25/k3kPo8UDI-1M0wlSV9XAw6lQkqWY8Q82sLydOxI.woff2
#     .../s/archivo/v25/k3kBo8UDI-1M0wlSfdzyIEkpwTM29hr-8mTYCxCmuA.woff2
#     .../s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD7OwE.woff2
#     (host fonts.gstatic.com). Their unicode-range covers U+0000-00FF and
#     U+2000-206F, which is where the typographic characters below come from.
#
#   italianno                the upstream Italianno-Regular.ttf from the Google
#     Fonts repository, https://github.com/google/fonts (ofl/italianno),
#     fetched 2026-09-05. A whole font rather than a `latin` subset: it is a
#     versioned file in a repository rather than a hashed API URL, so widening
#     the six-glyph subset below will still find it years from now.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=scripts/fonts-src
FONTS=public/fonts
CHECK=${1:-}

# --- character sets ----------------------------------------------------------
#
# One set per purpose, not one set per run: the two motto faces set two words
# and never anything else, and giving them the body set would ship a few
# hundred glyphs to draw ten letters.

# Strips the trailing comments and whitespace of a heredoc'd list.
list() { sed 's/#.*//' | tr -d ' \n' | sed 's/,*$//'; }

# Everything the pages and the photo index render in the body faces. Grouped so
# a future addition is obvious rather than appended to a wall of hex.
SET_TEXT=$(list <<'EOF'
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

# The script word of the motto: "Light" and "Licht", the two spellings the site
# has. No capitals but the L, because no other word is ever set in this face.
SET_MOTTO_SCRIPT=$(list <<'EOF'
  U+004C,                             # L
  U+0063,U+0067,U+0068,U+0069,U+0074  # c g h i t
EOF
)

# The upright word of the motto: "SHADOW" and "SCHATTEN". Capitals only - the
# CSS sets `text-transform: uppercase`, so the lowercase glyphs would never be
# drawn even though the markup carries them.
SET_MOTTO_CAPS=$(list <<'EOF'
  U+0041,U+0043,U+0044,U+0045,U+0048,  # A C D E H
  U+004E,U+004F,U+0053,U+0054,U+0057   # N O S T W
EOF
)

# --- the files ---------------------------------------------------------------
#
# One row per output file, in the order they are reported. SOURCE names the file
# in $SRC it is cut from (several outputs may share one source); AXIS is the
# `fontTools.varLib.instancer` argument, empty for a font that has no axis.
#
# These are variable fonts, and clamping the axis to exactly what @font-face in
# app/assets/css/fonts.css promises is where most of the saving comes from - it
# means the file can render everything the CSS says it can, no more and no less.
# Archivo ships a 100-900 axis and JetBrains Mono a 400-800 one. The motto's
# upright face is the same Archivo source pinned to a single weight, 900, which
# the body ranges deliberately do not reach.
#
# Changing a font-weight in the CSS therefore means changing it here and
# re-running this script.
FILES=(
  archivo-variable
  archivo-italic-variable
  jetbrains-mono-variable
  italianno-motto
  archivo-motto
)
declare -A SOURCE=(
  [archivo-variable]=archivo-variable.woff2
  [archivo-italic-variable]=archivo-italic-variable.woff2
  [jetbrains-mono-variable]=jetbrains-mono-variable.woff2
  [italianno-motto]=italianno.ttf
  [archivo-motto]=archivo-variable.woff2
)
declare -A AXIS=(
  [archivo-variable]=wght=400:600
  [archivo-italic-variable]=wght=400:500
  [jetbrains-mono-variable]=wght=400:500
  [italianno-motto]=
  [archivo-motto]=wght=900
)
declare -A UNICODES=(
  [archivo-variable]=$SET_TEXT
  [archivo-italic-variable]=$SET_TEXT
  [jetbrains-mono-variable]=$SET_TEXT
  [italianno-motto]=$SET_MOTTO_SCRIPT
  [archivo-motto]=$SET_MOTTO_CAPS
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
# name<TAB>source path<TAB>unicodes, one line per output, for the check below.
manifest=$work/manifest.tsv
: >"$manifest"

for name in "${FILES[@]}"; do
  src=$SRC/${SOURCE[$name]}
  [ -f "$src" ] || { echo "missing: $src" >&2; exit 1; }

  # varLib.instancer first (it needs a real font table tree), pyftsubset second.
  # --layout-features='*' keeps kern/liga/calt/tnum and the ccmp+mark rules the
  # accented characters need; dropping features to save bytes would break
  # tabular figures in the counters.
  # Both tools log at INFO; the log is only interesting when they fail.
  {
    if [ -n "${AXIS[$name]}" ]; then
      "$PY" -m fontTools.varLib.instancer "$src" "${AXIS[$name]}" -o "$work/$name.in" &&
        cut=$work/$name.in
    else
      cut=$src
    fi
    "$PY" -m fontTools.subset "$cut" \
      --output-file="$work/$name.woff2" \
      --flavor=woff2 \
      --layout-features='*' \
      --unicodes="${UNICODES[$name]}"
  } >"$work/$name.log" 2>&1 || { cat "$work/$name.log" >&2; exit 1; }

  before=$(stat -c%s "$src")
  after=$(stat -c%s "$work/$name.woff2")
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  printf '%-30s %7d -> %7d bytes  (-%d%%)\n' "$name" "$before" "$after" \
    $(((before - after) * 100 / before))
  printf '%s\t%s\t%s\n' "$name" "$src" "${UNICODES[$name]}" >>"$manifest"

  [ "$CHECK" = "--check" ] || cp "$work/$name.woff2" "$FONTS/$name.woff2"
done

printf '%-30s %7d -> %7d bytes  (-%d%%)\n' TOTAL "$total_before" "$total_after" \
  $(((total_before - total_after) * 100 / total_before))

# --- verify ------------------------------------------------------------------
# Fails the run if a subset dropped a character its font is asked to render.
# Codepoints the source never had are tolerated only for KNOWN_ABSENT.
"$PY" - "$work" "$manifest" "$KNOWN_ABSENT" <<'PYEOF'
import re
import sys

from fontTools.ttLib import TTFont

work, manifest, known = sys.argv[1], sys.argv[2], sys.argv[3]


def codepoints(spec):
    out = []
    for part in spec.split(','):
        part = re.sub(r'#.*', '', part).strip()
        if not part:
            continue
        if '-' in part:
            lo, hi = part.split('-')
            out += list(range(int(lo[2:], 16), int(hi, 16) + 1))
        else:
            out.append(int(part[2:], 16))
    return out


known_absent = {int(c, 16) for c in known.split()}


def points(codes):
    return ' '.join(f'U+{c:04X}' for c in codes)


ok = True
for line in open(manifest):
    name, src, spec = line.rstrip('\n').split('\t')
    wanted = codepoints(spec)
    source = TTFont(src, lazy=True).getBestCmap()
    output = TTFont(f'{work}/{name}.woff2', lazy=True).getBestCmap()

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
