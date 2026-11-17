# Artwork credits

Every picture on the site (other than the news photographs, which belong to their publishers) is
in the public domain or CC0: free to use, change and publish, no attribution required. They are
credited here anyway, and in the site footer.

Most of the artwork is printed as a CSS mask: only the alpha channel shows, in the current ink.
Masks are saved as WebP with black colour and the picture in the alpha. To keep them light, the
alpha is reduced where the eye cannot tell: the month woodcuts use 16 alpha levels (lossless), the
star chart 8, and the far street (`street/far.webp`, a soft sky) lossy alpha at quality 70.

## Engravings (`public/engravings`, ink masks)

Stored as black-on-transparent WebP masks; the site prints them in its own ink colour through CSS
`mask-image` (`components/site/engraving.tsx`), so they follow the light and night editions.

### From freesvg.org (Public Domain, CC0)

Mostly traced from 19th-century book and magazine illustrations; converted to masks and trimmed.

| File | Source page |
|---|---|
| `world.webp` | [somewhat-elaborate-compass-rose](https://freesvg.org/somewhat-elaborate-compass-rose) |
| `politics.webp` | [us-capitol-building-vector-drawing](https://freesvg.org/us-capitol-building-vector-drawing) |
| `business.webp` | [sailing-ship-monochrome-art](https://freesvg.org/sailing-ship-monochrome-art) |
| `technology.webp` | [vintage-airship](https://freesvg.org/vintage-airship) |
| `science.webp` | [johnny-automatic-microscope](https://freesvg.org/johnny-automatic-microscope): a brass microscope traced from an old engraving (replaced the woman with a telescope, 2026-11-15: the section stamps show objects, not people) |
| `health.webp` | [1541895045](https://freesvg.org/1541895045) |
| `sports.webp` | [boxing-gloves](https://freesvg.org/boxing-gloves): a pair of laced leather gloves (replaced a 1931 press photograph, which stood out among the engravings, 2026-11-15; before that a golf lady and a bicycle) |
| `entertainment.webp` | [theater-masks](https://freesvg.org/theater-masks) |
| `press.webp` | [1536075490](https://freesvg.org/1536075490) |
| `newsboy.webp` | [johnny-automatic-newsboy](https://freesvg.org/johnny-automatic-newsboy) |
| `quill.webp` | [quill-and-inkwell](https://freesvg.org/quill-and-inkwell) |
| `ribbon.webp` | [vintage-ribbon-scroll](https://freesvg.org/vintage-ribbon-scroll) |
| `telegraph.webp` | [Morse Code Signal Key Line Art](https://freesvg.org/1547509504) (beside "In other news") |
| `printing-office.webp` | [Early printing](https://freesvg.org/early-printing): an old woodcut of a printer's workshop, the Settings page's nameplate |
| `typewriter.webp` | [Classic typewriter](https://freesvg.org/classic-typewriter): the reading room in Settings |

### Edward Penfield, woodcut calendar (Public Domain)

`month-january.webp` … `month-december.webp`: the twelve month scenes from Edward Penfield's calendar
printed by The Printing Art, Cambridge, Massachusetts (early 1900s). Scans from Wikimedia Commons:
[Penfield-January-February.jpg](https://commons.wikimedia.org/wiki/File:Penfield-January-February.jpg),
[Penfield-March-April.jpg](https://commons.wikimedia.org/wiki/File:Penfield-March-April.jpg),
[Penfield-May-June.jpg](https://commons.wikimedia.org/wiki/File:Penfield-May-June.jpg),
[Penfield-July-August.jpg](https://commons.wikimedia.org/wiki/File:Penfield-July-August.jpg),
[Penfield-September-October.jpg](https://commons.wikimedia.org/wiki/File:Penfield-September-October.jpg),
[Penfield-November-December.jpg](https://commons.wikimedia.org/wiki/File:Penfield-November-December.jpg).
Each scene was cropped inside its frame and turned into a mask; the page fades its edges.

### Théophile Steinlen, "It Burns!" (1898, Public Domain)

`kitten-sit.webp`, `kitten-curious.webp`, `kitten-peer.webp`, `kitten-pounce.webp`: four kittens cut
from Steinlen's picture story, scan on Wikimedia Commons:
[Steinlen - cat-it-burns-1898.jpg](https://commons.wikimedia.org/wiki/File:Steinlen_-_cat-it-burns-1898.jpg).

## Colour plates (`public/plates`)

| File | Work | Source |
|---|---|---|
| `reader.webp` | Edward Penfield, poster for *Harper's* June issue (1897), Public Domain. The magazine's name was painted out so the picture stands alone. Used beside the sign-in and sign-up forms. | [Library of Congress scan on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Harper%27s_(for)_June_-_Edward_Penfield_LCCN2002721210.jpg) |
| `breakfast.webp` | Laurits Andersen Ring, *At Breakfast* (*Ved frokostbordet*, 1898), Public Domain (Nationalmuseum, Stockholm). Cropped to 5:4 (1000 × 800); one of the five pictures the front page's welcome picks from at random (`lib/welcome-plates.ts`). | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:At_Breakfast_(Laurits_Andersen_Ring)_-_Nationalmuseum_-_21399.tif) |
| `armchair.webp` | Paul Cézanne, *The Artist's Father, Reading "L'Événement"* (1866), CC0 (National Gallery of Art, Washington, Open Access). Cropped to 5:4 (1000 × 800); one of the five pictures the front page's welcome picks from at random (`lib/welcome-plates.ts`). | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Paul_C%C3%A9zanne,_The_Artist%27s_Father,_Reading_%22L%27%C3%89v%C3%A9nement%22,_1866,_NGA_52085.jpg) |
| `figaro.webp` | Mary Cassatt, *Reading "Le Figaro"* (1878), Public Domain (the artist died in 1926). Cropped to 5:4 (1000 × 800); one of the five pictures the front page's welcome picks from at random (`lib/welcome-plates.ts`). | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mary_Cassatt_Reading_Le_Figaro.jpg) |
| `farmers.webp` | Albert Anker, *Die Bauern und die Zeitung* (1867), Public Domain (the artist died in 1910). Cropped to 5:4 (1000 × 800); one of the five pictures the front page's welcome picks from at random (`lib/welcome-plates.ts`). | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Anker_Die_Bauern_und_die_Zeitung_1867.jpg) |
| `grandfather.webp` | Albert Anker, *Grossvater mit Zeitung* (1906), Public Domain. Cropped to 5:4 (1000 × 800); one of the five pictures the front page's welcome picks from at random (`lib/welcome-plates.ts`). | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Albert_Anker_-_Grossvater_mit_Zeitung.jpg) |
| `cat.webp` | Théophile Steinlen, *Winter: Cat on a Cushion* (1909), CC0 (The Metropolitan Museum of Art, Open Access) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Winter-_Cat_on_a_Cushion_MET_DP242969.jpg) |

## The street banner (`public/street`, ink masks)

| File | Work | Source | Licence |
|---|---|---|---|
| `far.webp` | Wenceslaus Hollar, *Long View of London from Bankside* (1647), the City from St Paul's to St Dunstan-in-the-East; church names painted out | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:1647_Long_view_of_London_From_Bankside_-_Wenceslaus_Hollar.jpg) | Public domain |
| `mid-railing.webp` | J. W. Fiske, *Illustrated catalogue and price list* (New York, 1875), wrought-iron railing No. 224 | [Internet Archive](https://archive.org/details/illustratedcatal00jwfi) | Public domain |
| `mid-lamp.webp` | A lantern (No. 44) from M. Dessertenne's plate *Éclairage* (Larousse) on a Fiske railing post, joined for this site | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Eclairage.jpg) and the Fiske catalogue | Public domain |
| `fig-gent-hat`, `fig-lady-book`, `fig-girl-doll`, `fig-ladies-talking` | Auguste Edouart, *Jane Anderson; Esther Ainslie; Helena Anderson; Mrs Arkley; Charles Atherton* (cut paper) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Jane_Anderson;_Esther_Ainslie;_Helena_Anderson;_Mrs_Arkley;_Charles_Atherton_by_Augustin_Edouart.jpg) | Public domain |
| `fig-lady-reading` | Auguste Edouart, *Cut Silhouette of Two Women Facing Right* (Brooklyn Museum) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_Cut_Silhouette_of_Two_Women_Facing_Right_-_August_Edouart.jpg) | Public domain |
| `fig-gent-cane` | Auguste Edouart, *Cut Silhouette of Four Full Figures* (Brooklyn Museum) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_Cut_Silhouette_of_Four_Full_Figures_-_August_Edouart.jpg) | Public domain |
| `fig-boy-running` | Auguste Edouart, *Silhouette of Master Colin Gibb and Charles Gibb* (Brooklyn Museum) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_Silhouette_of_Master_Colin_Gibb_and_Charles_Gibb_-_August_Edouart.jpg) | Public domain |
| `fig-gent-pointing` | Auguste Edouart, *Dr. John Neilson* | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Dr._John_Neilson_by_Auguste_Edouart.jpg) | Public domain |
| `fig-girl-flower` | Auguste Edouart, *Young Girl with Long Braids and Pantalettes, Holding a Flower* (The Met) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Young_Girl_with_Long_Braids_and_Pantalettes,_Holding_a_Flower_Met_DP890500.jpg) | CC0 |
| `fig-newsboy.webp`, `fig-newsboy-paper.webp` | The newsboy on his crate, pieced together for this site from cut silhouettes: Master James Gibb standing on a chair with one arm raised, from Auguste Edouart's *Cut Silhouette of Four Full Figures* (the chair, a neighbour's pointing hand and a cord cut away); his crate, Pearson Scott Foresman's line drawing of a crate, its front face filled solid and levelled; the newspaper, the folded journal held by Madame de Sainte-Preuve in an Edouart sheet of 1831 (Bibliothèque nationale de France), opened out wide; on his head, mirrored and without its tassel, the soft cap from George Angelo Crowhurst's *Silhouette of an unknown young boy, full length to the left* (1827-44, The Met). The paper is a separate piece that turns in his fist | [Wikimedia Commons (James Gibb)](https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_Cut_Silhouette_of_Four_Full_Figures_-_August_Edouart.jpg), [Wikimedia Commons (crate)](https://commons.wikimedia.org/wiki/File:Crate_(PSF).png), [Wikimedia Commons (journal)](https://commons.wikimedia.org/wiki/File:Monsieur_F.s_de_S.te_Preuve_Garde_du_Corps,_de_profil_%C3%A0_dr.,_Madame_Mountlouis_(sic)_de_S.te_Preuve_27.th_May_1831_Femme_de_Chambre_de_Mad.me_la_Dauphine,_de_profil_%C3%A0_g.,_et_tenant_%C3%A0_la_main_un_journal_ou_une..._-_btv1b54001646d.jpg), [Wikimedia Commons (cap)](https://commons.wikimedia.org/wiki/File:Silhouette_of_an_unknown_young_boy,_full_length_to_the_left_Met_DP887364.jpg) | Public domain; the cap CC0 |
| `cab-body.webp`, `cab-wheel.webp` | A hansom cab with its driver up behind (OpenClipart's "Hansom", traced from a public-domain drawing on Wikimedia Commons). Cut for the banner into a filled silhouette and its near wheel, which turns: the ground strokes were dropped, enclosed areas filled from the outside in (with points under the reins marked as sky), and the wheel's spokes kept as drawn | [freesvg.org](https://freesvg.org/hansom) | Public domain |

`fg-cobbles.webp` (etched cobbles) and `grain.webp` (paper grain) are generated for this site, as are
the chimney smoke and the gas flames (CSS gradients).

## Ornaments (`public/ornaments`, ink masks)

Small pieces for the interface, printed in brass or ink through CSS masks
(`components/site/ornament.tsx`, the `card-paper` frames, the wax seals and the banner).

| File | Work | Source | Licence |
|---|---|---|---|
| `frame-{day,night}-{tl,tr,bl,br}.webp` | Rebecca Read, *Corner Ornament 5*, recoloured in each edition's gilt and turned for each corner of the print frames | [freesvg.org](https://freesvg.org/corner-ornament-5-by-rebeccaread) | CC0 |
| `seal.webp` | The outline of a wax seal (shape only; the monogram and shading are added by the page). Also the wax seal on the notices (toasts, form messages) | [freesvg.org](https://freesvg.org/red-waxed-seal) | CC0 |
| `star.webp` | The star of an antique emblem, without its crown | [freesvg.org](https://freesvg.org/antique-emblem-star-with-crown) | CC0 |
| `globe.webp` | Globe on a stand, Pearson Scott Foresman line art | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Globe_(PSF).png) | Public domain |
| `moth.webp` | Owlet moth, Pearson Scott Foresman line art, filled solid | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Owlet_Moth_(PSF).png) | Public domain |
| `magnifier.webp` | A silver magnifying glass with an engraved handle (The Metropolitan Museum of Art, 255262), cut from its photograph | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Magnifying_Glass_MET_255262.jpg) | CC0 |
| `postmark-ring.webp`, `postmark-bars.webp` | A duplex postmark struck at Caibarién, Cuba, 7 January 1902: the ring (its town and date erased) and the barred oval. The ring is also the ink-stamp flash when a story is endorsed | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:DuplexCancellation1902.jpg) | Public domain |
| `scissors.webp` | Scissors, Pearson Scott Foresman line art, turned on its side (Remove and Hide) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Scissors_(PSF).png) | Public domain |
| `fist.webp` | A printer's fist (manicule), engraved pointing hand: "Read dispatch", the page buttons, Back to the paper, Continue reading (mirrored where it points back) | [freesvg.org](https://freesvg.org/pointing-hand) | CC0 |
| `star-chart.webp` | Johann Gabriel Doppelmayr, *Hemisphaerium Coeli Boreale* (Nuremberg, Homann, 1730): a band across the middle of the chart (the Great Bear, Draco and the pole, Cepheus, Cassiopeia, Andromeda), its ink turned into a mask, printed faintly behind the masthead title and in gilt under the lantern (replaced a small crop of Flamsteed's Orion, 2026-11-15) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:1730_celestial_map_of_the_Northern_Hemisphere_Sky.jpg) | Public domain |
| `pigeon.webp` | The carrier pigeon with its letter from a tail-piece in William Yarrell's *History of British Birds* (1843), cut out and turned to fly level. Also the Share button under every story and on the story page | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tail-piece_of_Lady_and_Pigeon_Post_from_Yarrell_History_of_British_Birds_1843.jpg) | Public domain |
| `flourish.webp` | A Spencerian penmanship flourish (OpenClipart's "Flourish line art divider"): the scrollwork between the zones of a page | [freesvg.org](https://freesvg.org/flourish-line-art-divider) | CC0 |
| `tailpiece.webp` | A smaller scroll flourish with a tulip (OpenClipart's "Flourish Divider"): the lesser breaks | [freesvg.org](https://freesvg.org/1539375404) | CC0 |
| `label.webp` | A blank Victorian printer's label (OpenClipart's "Victorian graphic label"): a spiked cartouche with its "No.", its hatching thickened a little to read at button size: the folder slip under every saved story | [freesvg.org](https://freesvg.org/victorian-graphic-label-vector-image) | CC0 |
| `nib.webp` | The nib of a dip pen, cut from "Fountain pen" and turned to write downwards ("For you") | [freesvg.org](https://freesvg.org/fountain-pen) | CC0 |
| `initial-frame.webp` | A square Victorian frame (OpenClipart's "Ornamental Frame") round the illuminated initial | [freesvg.org](https://freesvg.org/1511991464) | CC0 |
| `sun.webp` | The cut lines of an old woodcut sun with a face (the yellow fill left out): the morning edition | [freesvg.org](https://freesvg.org/old-woodcut-sun-vector-image) | CC0 |
| `moon.webp` | Johnny Automatic's man in the moon, from an old sheet-music cover, made solid: the night edition | [freesvg.org](https://freesvg.org/johnny-automatic-man-in-the-moon) | CC0 |
| `watch-case.webp` | A gentleman's pocket watch with an engraved nickel case, from the United Watch & Jewelry Company catalogue (1911): its bow, crown and engraved bezel, with the dial cut away, printed in brass round the masthead's live watch dial | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pocket_Watch_for_Young_Men_with_Engraved_Nickel_Case.png) | Public domain |
| `watch-bezel.webp` | The same watch's engraved bezel on its own, framing the lunar almanac so the two masthead instruments match | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pocket_Watch_for_Young_Men_with_Engraved_Nickel_Case.png) | Public domain |
| `moon-engraving.webp` | Claude Mellan, *Full Moon* (1635, engraved for Peiresc and Gassendi; Metropolitan Museum of Art), the disc only: the lunar almanac's moon, with tonight's shadow laid over it | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Full_moon_by_Claude_Mellan_1635.jpg) | CC0 |
| `key.webp` | A skeleton key: Log out | [freesvg.org](https://freesvg.org/skeleton-key) | CC0 |
| `broadsheet.webp` | A folded newspaper with a turned corner (OpenClipartVectors), its greys made into ink: the Front Page tab | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Newspaper-154444.svg) | CC0 |
| `gramophone.webp` | A horn gramophone ("Style 7 Genuine Gramophone") from a 1912 catalogue: the banner's Sound ticket | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Style_7_Genuine_Gramophone.svg) | Public domain |
| `funnel.webp` | A funnel from August Pforr's US patent No. 159,445 (1875), cut from the drawing without its handles, reference letters and pencil notes: the front page's Filters button | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:August_Pforr_Funnel_-_DPLA_-_f46a3b1a4557a6ffa42b91f9f709b9b4_(page_1).jpg) | Public domain |
| `stamp.webp` | The Penny Black (General Post Office, 1840), its scan trimmed and perforated along every edge for this site: the Sections tab | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Penny_black.jpg) | Public domain |
| `spectacles.webp` | Spectacles, Pearson Scott Foresman line art, its lines thickened a little to read at button size: "Read on [source]" under every story | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Spectacles_(PSF).png) | Public domain |
| `gear.webp` | A cogwheel and its pinion (Pearson Scott Foresman line art), cut from the sheet without its label and arrows and filled solid between the outlines so it reads at button size: Settings (the header, the bottom tab bar and the account menu) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cogwheel_(PSF).jpg) | Public domain |

## Texture (`public/textures`)

`paper.webp`: [Paper006](https://ambientcg.com/view?id=Paper006) from ambientCG (CC0), converted to a
grey detail map that is multiplied onto the paper colour of either edition. `paper-night.webp` is the
same texture inverted and darkened (light fibres), screened onto the night edition's sheet.

`desk-day.webp`: [Wood067](https://ambientcg.com/view?id=Wood067) from ambientCG (CC0), a figured
walnut, toned darker and less saturated: the morning desk.

`stone-night.webp`: [PavingStones119](https://ambientcg.com/view?id=PavingStones119) from ambientCG
(CC0), old irregular setts: the colour map turned grey (the moss in the joints goes too), toned very
dark slate navy, with a cold sheen from its normal map where the stones face the moon (upper right).
768px, tiled at 640px: the night edition's street beside the sheet.

## Text from elsewhere

The "On this day" box on the front page quotes three entries a day from Wikipedia's
[selected anniversaries](https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries), fetched from
the Wikimedia feed API (`/api/rest_v1/feed/onthisday/selected`). The text is CC BY-SA 4.0; the box
links each entry to its article and credits Wikipedia under the list.

## Sound

The banner's ambient sound, a calm 1890s promenade (`lib/ambience.ts`), is made from real field
recordings in `public/sounds/street`, all released under CC0 on [Freesound](https://freesound.org).
They were cut from the Freesound previews, filtered (no rumble below the cut-off), mixed down to mono,
loudness-matched (EBU R128) and saved as small MP3s; the beds were crossfaded into seamless loops. The
browser places the passers-by on the street, and the carriage follows the cab across the banner.

| File | Source (Freesound, CC0) | Cut |
|---|---|---|
| `people.mp3` | [People Ambience In The Old Town](https://freesound.org/s/725605/) by WhiteNoiseSleeper | 4:25-5:29, folded into a 62 s loop, above 140 Hz |
| `birds.mp3` | [birds chirping in the suburbs in a calm afternoon](https://freesound.org/s/727712/) by Simonus18 | 0:00-1:04, folded into a 62 s loop, above 500 Hz |
| `carriage.mp3` | [G52-07-Horse Drawn Carriage](https://freesound.org/s/437076/) by craigsmith | 0:08-0:41.6 (the steady trot), folded into a 32 s loop |
| `steps-1.mp3`, `steps-2.mp3` | [2 persons walking on stonefloor](https://freesound.org/s/220335/) by Reikun | 0:02-0:20 and 0:24-0:42 |
| `steps-3.mp3` | [Three People Walking on Concrete](https://freesound.org/s/789609/) by ZackSoundLab | 0:00-0:09.5 |
| `voices.mp3` | [Medium Crowd Walla](https://freesound.org/s/867051/) by IENBA | 0:01.5-0:18.5 |
| `pigeon.mp3` | [pigeon walking and cooing](https://freesound.org/s/701282/) by 5ro4 | 0:09-0:24.5 |
| `wings.mp3` | [pigeons_fly away_ wing flaps_CsG](https://freesound.org/s/528250/) by csaszi | 0:00-0:03.3 |

## Icons and link preview (`app/`)

`favicon.ico`, `icon.png` and `apple-icon.png` are a blackletter "D" set in UnifrakturMaguntia (SIL
Open Font License, the masthead's typeface) on a parchment tile with a gilt rule, made for this site.
`public/icons/icon-512.png` and `icon-maskable-512.png` (the home-screen icons of `app/manifest.ts`) are the
same tile set again at 512 px; the maskable one fills the square, so phones can cut it to their own shape.
`opengraph-image.png` / `twitter-image.png` (1200×630) set the title, the motto and a line of copy in
the site's fonts (OFL) on the paper texture above, with the Spencerian flourish (CC0) and Edward
Penfield's reader (1897, public domain), both credited above.

## Drawn for this project

The watch's enamel dial, numerals and Breguet hands, the almanac's degree ring and the moon's shadow, the shooting star, the perforated stamp edges, the candlelight
on the desk, the moonlight and gas lamp on the cobbles are drawn in SVG/CSS for this site; the "Top Story" seal is set in type on the wax seal and postmark ring above. The fonts come from Google Fonts and are self-hosted by next/font: Fraunces, Jost, Source Serif 4 and
UnifrakturMaguntia under the SIL Open Font License, Special Elite (Astigmatic) under the Apache License
2.0.
