# Lizenzen der Demo-Fotos

Alle drei Bilder stammen von Wikimedia Commons und wurden am 2026-08-29 per
Commons-API (`action=query&prop=imageinfo&iiprop=url|size|extmetadata`)
verifiziert (Lizenzfeld `LicenseShortName`, Autor aus `Artist`/`Credit`).
Download der Originale via `curl -A "spaeth-photo-demo/1.0 (contact:
github.com/mo-sp)"`.

Die Dateien in `photos/source/` sind **abgeleitete Werke**: aus jedem Original
wurde mit `scripts/export-sources.ts` eine Web-Quelle erzeugt — auf 2560 px
lange Kante verkleinert, ohne Metadaten, mit sRGB-Profil, JPEG q82. Die
Slugs im Repo lauten `demo-weisskopfseeadler`, `demo-nebelwald` und
`demo-segelboot`; die Zuordnung zum jeweiligen Originaldateinamen steht in
`import-map.json`.

Alle drei Lizenzen erlauben Bearbeitung und Weitergabe ohne Auflagen; die
Nennung von Autor und Quelle erfolgt hier freiwillig.

---

## demo-tier.jpg — Weißkopfseeadler (Bald Eagle)

- **Commons-Titel:** File:USFWS bald eagle (23770875811).jpg
- **Dateiseite:** https://commons.wikimedia.org/wiki/File:USFWS_bald_eagle_(23770875811).jpg
- **Original-URL:** https://upload.wikimedia.org/wikipedia/commons/8/8c/USFWS_bald_eagle_%2823770875811%29.jpg
- **Autor:** Peter Pearsall / U.S. Fish and Wildlife Service — Pacific Region
  (Flickr-Quelle: https://www.flickr.com/photos/usfwspacific/23770875811/)
- **Lizenz:** Public Domain — Werk der US-Bundesregierung (17 U.S.C. § 105,
  Kategorie „PD US FWS" auf Commons). Keine Namensnennung erforderlich
  (`AttributionRequired: false`); Credit-Hinweis der Quelle lautet: „You are
  free to use this image with the following photo credit: Peter
  Pearsall/U.S. Fish and Wildlife Service".
- **Maße Original:** 4000 × 2667 px (Querformat), JPEG
- **Änderungen:** verkleinert auf 2560 px lange Kante, alle Metadaten
  entfernt, sRGB-Profil gesetzt (`pnpm export-sources`, JPEG q82)

---

## demo-landschaft.jpg — Nebel über Wald (Fremont-Winema National Forest)

- **Commons-Titel:** File:Fog over Forest, Fremont-Winema National Forest (36168540252).jpg
- **Dateiseite:** https://commons.wikimedia.org/wiki/File:Fog_over_Forest,_Fremont-Winema_National_Forest_(36168540252).jpg
- **Original-URL:** https://upload.wikimedia.org/wikipedia/commons/5/5d/Fog_over_Forest%2C_Fremont-Winema_National_Forest_%2836168540252%29.jpg
- **Autor:** U.S. Forest Service – Pacific Northwest Region
  (Flickr-Quelle: https://www.flickr.com/photos/forestservicenw/36168540252/)
- **Lizenz:** Public Domain — Werk der US-Bundesregierung (Kategorie „PD US
  USDA FS" auf Commons). Keine Namensnennung erforderlich
  (`AttributionRequired: false`).
- **Maße Original:** 5356 × 3596 px (Querformat), JPEG
- **Änderungen:** verkleinert auf 2560 px lange Kante, alle Metadaten
  entfernt, sRGB-Profil gesetzt (`pnpm export-sources`, JPEG q82)

---

## demo-segeln.jpg — Segelboot von oben (Lost at Sea)

- **Commons-Titel:** File:Lost at Sea (Unsplash).jpg
- **Dateiseite:** https://commons.wikimedia.org/wiki/File:Lost_at_Sea_(Unsplash).jpg
- **Original-URL:** https://upload.wikimedia.org/wikipedia/commons/d/d4/Lost_at_Sea_%28Unsplash%29.jpg
- **Autor:** Lance Asper (Unsplash: https://unsplash.com/@lance_asper),
  ursprünglich veröffentlicht auf Unsplash: https://unsplash.com/photos/SLf9CvojiPo
- **Lizenz:** CC0 1.0 Universal (Public Domain Dedication) —
  https://creativecommons.org/publicdomain/zero/1.0/deed.en
  (`LicenseShortName: CC0`, `AttributionRequired: false`). Da CC0, ist eine
  Namensnennung nicht erforderlich; sie wird hier trotzdem der guten Ordnung
  halber dokumentiert.
- **Maße Original:** 3830 × 2151 px (Querformat), JPEG
- **Änderungen:** verkleinert auf 2560 px lange Kante, alle Metadaten
  entfernt, sRGB-Profil gesetzt (`pnpm export-sources`, JPEG q82)

---

## Prüfkriterien (alle drei erfüllt)

- Keine erkennbaren Personen im Bild.
- Keine Logos/Markenzeichen im Bild.
- Querformat.
- Lange Kante ≥ 2560 px im Original.
- JPEG-Format.
- Lizenz eindeutig frei (2× Public Domain / US-Government-Work, 1× CC0 1.0),
  Quelle und Lizenzfeld direkt über die Commons-API verifiziert.
