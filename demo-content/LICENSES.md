# Licences of the demo photographs

All three images come from Wikimedia Commons and were verified on 2026-08-29
through the Commons API (`action=query&prop=imageinfo&iiprop=url|size|extmetadata`;
licence field `LicenseShortName`, author from `Artist`/`Credit`). The originals
were downloaded with `curl -A "spaeth-photo-demo/1.0 (contact:
github.com/mo-sp)"`.

The files in `photos/source/` are **derivative works**: each original was turned
into a web source with `scripts/export-sources.ts` — resized to 2560 px on the
long edge, stripped of metadata, with an sRGB profile, JPEG q82. The slugs in
this repo are `demo-bald-eagle`, `demo-fog-over-forest` and `demo-sailboat`;
`import-map.json` records which original file each one came from.

All three licences permit modification and redistribution without conditions;
naming author and source here is voluntary.

---

## demo-tier.jpg — Bald Eagle

- **Commons title:** File:USFWS bald eagle (23770875811).jpg
- **File page:** https://commons.wikimedia.org/wiki/File:USFWS_bald_eagle_(23770875811).jpg
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/8/8c/USFWS_bald_eagle_%2823770875811%29.jpg
- **Author:** Peter Pearsall / U.S. Fish and Wildlife Service — Pacific Region
  (Flickr source: https://www.flickr.com/photos/usfwspacific/23770875811/)
- **Licence:** Public Domain — work of the US federal government (17 U.S.C. § 105,
  category "PD US FWS" on Commons). No attribution required
  (`AttributionRequired: false`); the source's own credit note reads: "You are
  free to use this image with the following photo credit: Peter
  Pearsall/U.S. Fish and Wildlife Service".
- **Original dimensions:** 4000 × 2667 px (landscape), JPEG
- **Modifications:** resized to 2560 px on the long edge, all metadata removed,
  sRGB profile set (`pnpm export-sources`, JPEG q82)

---

## demo-landschaft.jpg — Fog over forest (Fremont-Winema National Forest)

- **Commons title:** File:Fog over Forest, Fremont-Winema National Forest (36168540252).jpg
- **File page:** https://commons.wikimedia.org/wiki/File:Fog_over_Forest,_Fremont-Winema_National_Forest_(36168540252).jpg
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/5/5d/Fog_over_Forest%2C_Fremont-Winema_National_Forest_%2836168540252%29.jpg
- **Author:** U.S. Forest Service – Pacific Northwest Region
  (Flickr source: https://www.flickr.com/photos/forestservicenw/36168540252/)
- **Licence:** Public Domain — work of the US federal government (category
  "PD US USDA FS" on Commons). No attribution required
  (`AttributionRequired: false`).
- **Original dimensions:** 5356 × 3596 px (landscape), JPEG
- **Modifications:** resized to 2560 px on the long edge, all metadata removed,
  sRGB profile set (`pnpm export-sources`, JPEG q82)

---

## demo-segeln.jpg — Sailboat from above (Lost at Sea)

- **Commons title:** File:Lost at Sea (Unsplash).jpg
- **File page:** https://commons.wikimedia.org/wiki/File:Lost_at_Sea_(Unsplash).jpg
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/d/d4/Lost_at_Sea_%28Unsplash%29.jpg
- **Author:** Lance Asper (Unsplash: https://unsplash.com/@lance_asper),
  originally published on Unsplash: https://unsplash.com/photos/SLf9CvojiPo
- **Licence:** CC0 1.0 Universal (Public Domain Dedication) —
  https://creativecommons.org/publicdomain/zero/1.0/deed.en
  (`LicenseShortName: CC0`, `AttributionRequired: false`). Under CC0 attribution
  is not required; it is documented here anyway, for good order.
- **Original dimensions:** 3830 × 2151 px (landscape), JPEG
- **Modifications:** resized to 2560 px on the long edge, all metadata removed,
  sRGB profile set (`pnpm export-sources`, JPEG q82)

---

## Selection criteria (all three met)

- No identifiable people in the image.
- No logos or trademarks in the image.
- Landscape orientation.
- Long edge ≥ 2560 px in the original.
- JPEG format.
- Unambiguously free licence (2× public domain / US government work, 1× CC0 1.0),
  source and licence field verified directly through the Commons API.
