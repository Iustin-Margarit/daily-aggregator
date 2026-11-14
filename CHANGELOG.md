# Changelog

## Unreleased: "nocturnal broadsheet" interface

### Google bylines (2026-11-14, evening)
- Readers who join with "Continue with Google" now get their first name as their byline (so the
  front page says "Good evening, Maria"), with accents folded to fit the byline rules; names that
  leave fewer than three letters, or are in a non-Latin script, fall back to the e-mail prefix as
  before. A name chosen at sign-up still wins. Migration `20261114185100_google_name_byline`.

### Editions in four languages (2026-11-14, evening)
- **English, French, Spanish and German editions.** Everything the paper prints around the news is
  translated: navigation, masthead line and date, motto, clock, moon phases, the month's almanac and
  thought for the day, greetings, section names, filters, search, empty states, saved stories and
  folders, Settings, sign-in pages, toasts and error pages. "On this day" comes from the edition's
  own Wikipedia. News headlines and summaries stay in the language they were written in, and the
  blackletter title stays "The Daily Aggregator". Not translated: the Newsroom (admin) pages and the
  sign-up / password emails (one Supabase template each).
- Written for each language rather than word for word: *vous* in French, *tú* in Spanish (Spain),
  *Sie* in German as German newspapers use; local typography (« » with non-breaking spaces in
  French, «» and ¿ ¡ in Spanish, „…“ in German); dates, plurals, lists and numbers come from the
  browser's own `Intl` (no translation service, nothing to pay). The French, Spanish and German
  editions read the time on a 24-hour clock unless the reader chose 12-hour.
- **The Editions selector** replaces the plain "English edition" line: a printed dispatch slip in
  a double rule, each edition in its own language with a typed ink-stamp monogram (EN, FR, ES, DE);
  the edition in hand is inked solid and pointed at by a printer's fist. It sits in the masthead's
  edition line, under the ribbon on phones, at the foot of every page, on the sign-in pages, as a
  stamp in the header of inner pages on wide screens, in the account menu and in Settings > The
  printing.
- The choice is remembered on the device (a cookie, so pages arrive already translated, mirrored in
  browser storage, which restores it if the cookie is cleared). It needs no account.
- Fonts checked in Chrome: Fraunces, Source Serif 4, Jost and Special Elite print every accented
  letter (é è ê ç à ñ ¿ ü ö ß Œ …) without a fallback font. Layout checked in all four languages
  from 360 to 1440 px, signed out and signed in: no sideways scrolling, no wrapped labels. Fixed on
  the way: the tablet header (shorter "Sign up" between 768 and 1024 px), Settings columns that could
  grow wider than a phone, tighter ribbons below 400 px, and the footer title that wrapped at 360 px.

### Instruments, street sound, Save and safer sign-up (2026-11-14, later)
- **Masthead ears as engraved instruments**: the clock is a real pocket-watch case from a 1911
  jeweller's catalogue (public domain) round a live enamel dial (cream by day, deep blue by night)
  with Roman hours, Breguet hands and a small seconds dial; the moon is a "Lunar almanac": Claude
  Mellan's engraved full moon (1635, CC0) in the same engraved bezel, with tonight's phase hatched
  over it, a degree ring, twinkling stars and the occasional shooting star (now visible in both
  editions).
- **Street sound rebuilt** from real CC0 field recordings (no wind, no drones): footsteps, the
  occasional passing conversation, birds and pigeons by day, and hooves with wooden wheels that
  follow the cab across the banner. Quieter overall; once switched on it keeps playing while the
  reader moves around the site, with a "Stop sound" ticket in the corner (still off on every visit).
- **Save, not Clip**: every story's button now says Save / Saved with the quill of the Saved tab,
  and the messages around it say "saved stories". "Print clipping" keeps its name.
- **Masthead title** glows softly when pointed at; **Filters** is a boxed ticket with an engraved
  funnel, set apart from the section ribbon.
- **Email**: sign-up confirmation is on again, sent through the paper's own Gmail address; the
  confirmation, password-reset and email-change emails are restyled as printed notices, and every
  "check your inbox" message now mentions the Spam folder.
- **Reliability**: old stories are removed at the start of each news run (so a run cut short by the
  host's time limit still cleans up), runs stay inside a 45-second budget, malformed `?sources=`
  links no longer break the front page, and links from outside feeds and browser storage are kept to
  http(s). The database runs on Postgres 17.
- **Phones (360-430 px)**: the sticky bar is slimmer and its title stays on one line beside the
  buttons; at the top of a front page the bar shows the edition line (Vol. · No. and the date)
  instead of empty space, and the masthead starts with the title. The title and ribbon are smaller,
  the street banner is a slim 96px strip with small icon-only Sound and Pause tickets, and the top
  story now starts on the first screen. Filters sits beside Latest | For you at the same height, so
  the section ribbon gets the full width (fading at both ends). Penfield's reader shows whole on the
  landing page. Desktop is unchanged.
- **Fixes**: the scrollwork divider's rules now meet the centre of the flourish; the bar's title
  reappears after scrolling the front page (it stayed hidden when the page had shown its loading
  skeleton first).
- **Dependabot** no longer opens update pull requests (only security alerts); updates are applied
  and tested by hand.

### Ready for a free live site (2026-11-14)
- **No sign-up wall**: visitors read the front page, search, open stories, choose sections with the
  postage stamps and clip stories (with folders, notes and Print clipping) without an account. Their
  sections are kept in a cookie and their clippings in the browser (up to 200); signing in or
  signing up moves both into the account (a new account starts from the sections chosen as a
  visitor). The header shows Front Page, Saved and Sections to everyone, with a Morning/Night switch
  for visitors. Only Settings and the admin pages need a login. The landing page leads with
  "Read today's paper", and its section stamps open the Sections page.
- **Favicon and link previews**: a blackletter "D" from the masthead's typeface on parchment with a
  gilt rule (favicon, app icon, Apple touch icon), and a 1200×630 preview card (title, motto,
  flourish and Penfield's reader) with Open Graph and Twitter tags. Stories keep their own photo
  as the preview.
- **Graceful failures**: when the database cannot be reached, the front page shows "The presses
  jammed" with Try again (no longer the first-run setup message), a story page shows "Stop the
  presses" instead of a false "not found", the session check falls back to visitor mode, and a
  last-resort `global-error` page covers the root layout.
- **Secrets**: `.gitignore` now blocks every `.env*` file except `.env.example`, plus key files; the
  history holds no secret keys (only public anon keys and a password placeholder), and the built
  browser code contains no server secret.
- **Fix** (migration `20261114090647_anon_feed_muted_keywords`): visitors could not load the feed
  after the muted-words migration (`anon` lacked the table privilege `get_feed` needs; it still
  sees no rows).

### Crisper pages and a few quiet extras (2026-11-14)
- **Shorter pages**: the front page has 16 stories (the lead, three under "In other news" and four
  rows of three), every other page 15 (five rows of three), so the page turn is actually used.
  When a short last page, or two columns on a tablet, would leave empty slots in the last row, a
  "Continued on page N" slip (or "Back to the front page") fills them.
- **On this day**: an almanac box under "In other news" with three anniversaries for today's date
  from Wikipedia's selected anniversaries (spread across the centuries, gentle ones preferred,
  credited and linked). The server keeps the list for half a day; if Wikipedia cannot be reached,
  the box is left out.
- **Sound** (off by default): a ticket beside Pause on the street banner, with a 1912 gramophone
  engraving. It plays soft rain on the cobbles, the odd drip and a faint pocket-watch tick-tock,
  synthesised in the browser with the Web Audio API (no sound files), fading in at low volume. It
  stops when the reader leaves the front page and stays available for readers who ask for less motion.
- **Reading time**: "4 min read" on stories and the story page. Feeds carry only summaries, so the
  ingestion counts the words of the story on the publisher's page when it first reads it (the same
  visit that finds missing photos), within a time limit; each run also measures up to 60 recent
  stories that have no reading time yet (400 for `npm run ingest`). Sites that block page reads
  (e.g. Politico, Forbes, MarketWatch, NPR) show no reading time.
- **Muted words** (Settings > Sections & papers): stories whose headline or summary contains a
  muted word, as a whole word, are left off the front page. Up to 50 words.
- **Print clipping** on saved stories: prints the story as a cut-out newspaper clipping (dashed
  cutting line with scissors, the paper's name, headline, source, date, reading time, summary and
  the reader's note), always in dark ink on white paper, or saves it as a PDF.
- **Database** (migration `20261114085132_reading_time_and_muted_keywords`): `articles.reading_minutes`;
  a private `muted_keywords` table (row level security: each reader sees and changes only their
  own; at most 50 per reader); `get_feed` leaves out muted words and, with `get_article` and
  `get_saved_articles`, returns the reading time.

### A personal paper, not a social network (2026-11-14)
- **Letters to the editor and Endorse (likes) are gone**, with their public counts. The paper is for
  one reader: the story actions are **Clip story** and **More** (Read on the publisher's site,
  Share, Hide this story, Mute the source); the story page has Clip story, Share and More.
  Saved stories, folders, notes, sections and the reading room are unchanged.
- **"For you"** now learns from the reader's sections and the stories they save.
- **Database** (migration `20261114080823_remove_letters_and_likes`): drops `likes`, `comments`,
  their triggers, rate limit and realtime, and `articles.like_count` / `comment_count`;
  `get_feed`, `get_article`, `get_saved_articles` and `admin_list_users` return no like or letter
  columns; `get_article_comments` is removed. The admin dashboard shows saved stories and the most
  saved stories instead of likes and comments.
- Wording updated everywhere (Settings, sign-up, onboarding, the visitor page, the footer motto
  "Read the world · Keep what matters · Read it your way", the admin pages).
- **The night edition's backdrop** is now a moonlit street instead of the walnut desk: wet slate
  cobbles (ambientCG PavingStones119, CC0, toned dark navy, with a moonlit sheen from its normal
  map), evenly lit with no glows. The morning edition keeps the walnut desk by candlelight.
- **The ribbon bookmark ("Top") is removed.**

### Polish
- **The motto follows the ribbon**: "All the news that fits your interests" is set along the arch
  of the engraved ribbon (an SVG text path measured from the engraving), on the front page and the
  sign-in pages.
- **A clearer magnifying glass** in the search fields (front page and Saved): printed in strong
  brass ink with its fine lines thickened a little, and no longer covered by the field itself.
- **Engraved tab icons** instead of the ✦ by the current tab: a folded broadsheet (Front Page), the
  quill (Saved), the Penny Black, perforated (Sections) and the printing press (Newsroom, for
  admins). The phone tab bar uses the same drawings instead of its modern icons.
- **Brighter section stamps**: every stamp is printed in full, richer colour (its section ink with
  more colour) with a printed frame line inside the perforations. Pointing at one lifts it off the
  page with a deeper shadow, inks its frame and brings up the "Choose" ring in its colour. Chosen
  stamps stay tinted, tilted and franked "Chosen".

### The Reader's Ledger, the reading room and the desk
- **Settings as the Reader's Ledger**: a nameplate with an old woodcut of a printer's workshop and
  the reader's own wax seal, more room under the bar, the ledger's contents down a margin column
  (a ribbon on phones), and each part an entry on ledger paper with a red double margin rule and a
  folio numeral (`.ledger-sheet`), set in columns on wide screens: Your byline (seal and fields side
  by side), The printing (edition and type size beside the accent ink), The reading room, Sections
  & papers (side by side), Signing in (email beside password) and Closing the account.
- **Wax-seal inks**: the colour pickers are blobs of sealing wax; the chosen one is pressed with a
  ring and a star and sits a little raised.
- **Antique fields** (`field-antique`): every input, text box and select is an inset well of vellum
  with crisp corners and a heavier ruled bottom edge; focused, it turns brass.
- **The account menu and every menu** are printed slips: double hairline frame, the paper's grain,
  a brass wash on the highlighted line, a brass ✦ for the chosen option. The account menu shows the
  reader's seal and byline, then § Settings, the edition (a woodcut sun, the man in the moon, the
  globe) and Log out with an engraved key. The modern icons are gone.
- **The reading room** (new, kept on this device like the edition, in cookies so the page is
  printed the reader's way at once; `lib/reader-prefs.ts`): **the clock** in 12- or 24-hour time
  (front page and story datelines); **the street under the masthead** moving, still or hidden (the
  banner's Pause button is the same setting); **news photographs** archival or in natural colours;
  **text columns** justified or ragged right.
- **Turning the page**: Previous / Next page (and back / forward) swing the new page in from the
  side it was turned from, with the shadow of the leaf sweeping across; under half a second, none
  for readers who ask for less motion.
- **The desk**: on monitors from 1680px the broadsheet is a little wider (1440px of column). Beside
  it, a figured walnut desk (ambientCG, CC0) lit by candles just off the page, whose light wavers a
  little; the sheet lies on a few more sheets whose edges show along its sides and foot.
- **A ribbon bookmark**: a silk ribbon in the reader's accent ink drops into the sheet's margin once
  the reader is a screen and a half down; pulling it goes back to the top.
- **A slim brass scrollbar** in both editions.

### A true broadsheet, on a desk, by lamplight
- **One broadsheet width on every page**: the front page, Saved, Sections and the story page share
  the same column, at most 1360px (`container`), and the sheet is exactly that wide (`.sheet`).
  From 1520px it lies on the dark desk with a margin all round: a midnight desk (#080a0f) under a
  vellum-slate sheet (#121620) in the night edition, a walnut desk under cream paper by day, with
  the paper's grain (light fibres at night: the same ambientCG paper, inverted), lamplight from
  above, an inner vignette and a soft shadow underneath.
- **Columns that line up**: the lead story and "In other news" stand on the page divided by a
  full-height column rule; the "Latest dispatches" are set in two or three columns with hairline
  column rules and a rule between stories (`news-grid` draws them; story cards have no boxes).
  Photographs, rules, the page buttons and the footer frame now share the same two edges: the grid
  clips its rules exactly at its edges and nothing in a story reaches outside its column.
- **The department ribbon**: the ten boxed section tabs became one full-width band between double
  rules, the departments in small capitals divided by hairlines, the chosen one in brass with an
  inked brass underline (`.dept-bar`, `.dept-tab`). Filters is the ribbon's end cap. Phones and
  tablets scroll the ribbon; from 1280px every department shows. Latest | For you is a small
  ribbon of the same kind, and "For you" has an engraved pen nib instead of the sparkle icon.
- **Victorian scrollwork** between the zones of a page (masthead, lead story, the columns, the
  letters): a double hairline each side of an engraved Spencerian flourish, or a smaller tulip
  flourish (`ScrollDivider`). Section headers are ornate, ═══ ✦ IN OTHER NEWS ✦ ═══, with an
  engraved Morse telegraph key beside "In other news" and the printing press beside "Latest
  dispatches" (`SectionHead`).
- **Corner ornaments only where they are special**: the masthead and the footer colophon
  (`card-ornate`). Other frames keep the double rule and paper grain (`card-paper`).
- **Photo plates**: every news photograph sits in a dark recessed mount with a hairline frame (drawn
  inside its box) and an archival treatment, `saturate(0.68) sepia(0.22) contrast(1.06)` with a
  dark edge vignette, that clears to full colour when the reader points at the story or focuses
  one of its links. Touch screens, which cannot point, get only a light touch of it.
- **Printed story actions**, legible in polished brass and warm parchment (`--action-icon`,
  `--action-ink`): **Endorse** presses a wax seal (red wax once endorsed) while a real 1902
  postmark ring strikes round it in a flash of ink; **Clip story** snips brass scissors and runs a
  dotted "cut here" line under the label, which stamps "Clipped"; **More** points on with a
  printer's fist. The flashes only play when the reader presses. The story page has the same
  controls (plus Share with a carrier pigeon and Letters with a quill) instead of modern buttons
  (`components/articles/story-actions.tsx`).
- **Printer's fists instead of arrows**: Read dispatch, Previous / Next page, Back to the paper,
  Continue reading and Create a free account.
- **Illuminated initials**: the lead story and the story page open with their first letter in
  brass inside an engraved Victorian frame on tinted vellum (`DropCap`, `.initial`).
- **The story page as a broadsheet spread**: the headline across the top, then a margin column with
  the dateline (in the reader's own time), who filed it and the section's desk; the story in a
  reading column of about 72 characters (photograph, summary, the way on to the full report, then
  the letters); and the story's actions in a right-hand column that stays in view. Tablets keep the
  margin column and put the actions above the story; phones stack it all. "More from the desk"
  is set in columns like the front page.
- **Saved** has its folders as an index down a margin column (a ribbon on phones) beside the
  clippings; **Sections** has a margin column (how many are chosen, Select all, the buttons) beside
  the stamps.
- **Masthead**: Flamsteed's 1729 star chart of Orion etched faintly behind the title; the clock and
  tonight's moon are the nameplate's two **ears**, ruled off left and right between the masthead's
  double rules (side by side under the title on tablets). About every 25 seconds a shooting star
  crosses the moon's dial.
- **A livelier town** in the street banner: now and then a **hansom cab** trots past on the road
  behind the pavement, its near wheel turning at the right speed for its pace (a public-domain
  drawing, cut into a silhouette and its wheel); **chimney smoke** rises softly from behind
  Hollar's roofs; the **gas flames gutter** irregularly and their halos breathe; the street mist
  slowly rises and settles. Transform and opacity only. The **Pause** button (now a printed ticket
  stub) stills the whole town, the shooting star included, and readers who ask for less motion
  get a still picture.

The pictures already looked 19th-century; now the interface around them does too. The rounded
SaaS pills, soft cards, coloured dots and iOS switch are replaced with printed ones, decorated
with public-domain ornaments (credits in [docs/ASSETS.md](docs/ASSETS.md), files in
`public/ornaments`).

### Changed
- **Crisp corners everywhere**: the radius scale is 2-4px; only real circles (clock, moon,
  swatches) stay round.
- **Print frames** (`card-paper`, also dialogs and the footer): a double hairline rule, a gilt
  corner piece in each corner (Rebecca Read's corner ornament, CC0) and the paper's grain.
- **Ticket-stub buttons**: 3px corners and a second hairline inside the edge; solid buttons are
  sepia by day and brass by night. A new `stamp` variant prints actions in typewriter capitals in
  a double-ruled box (Mark as read, Put in a folder, Add a note, Remove on the Saved page).
- **Ledger tabs** for Front Page | Saved | Sections: small capitals between hairline rules, the
  current page underlined in brass with a ✦. The phone bar marks it with a brass box.
- **Section labels** (`section-badge`) are printer's slugs in the section's ink; the coloured
  section dots are gone. (The boxed archive tabs, `chip`, gave way to the department ribbon.)
- **Ledger search lines** (`ledger-field`) with an engraved magnifying glass (The Met, CC0)
  instead of rounded search boxes.
- **Wax-seal monograms**: the account letter is pressed into sealing wax in the reader's colour.
- **"English edition"** is set in small capitals beside an engraved globe instead of a flag.
- **Ledger checkbox** with an inked tick ("Hide stories I've read" replaces its iOS switch); the
  admin switches are brass slides.
- **Front page**: the clock and moon tiles are small engraved frames; the clock has brass hands and
  its second hand ticks with a little spring; etched stars twinkle round the moon. The Top Story
  badge is a pressed wax seal with a real 1902 postmark ring in it.
- **Street banner**: moths circle the gas lamps (dark specks by day, lit gold at night) and now
  and then a carrier pigeon with a letter (Yarrell, 1843) crosses the far sky. Transform and
  opacity only; they pause with the rest of the banner.
- **Sections page**: a chosen stamp is franked with a postmark (ring and barred oval from a real
  1902 duplex cancel) that strikes with a small thump; the others show a faint "Choose" ring.
  Select all is now a proper button.

### Fixed
- The empty Saved page told readers to press "Save"; the button is called "Clip story".
- Deleting a letter to the editor said "Comment deleted".
- On phones the page buttons under the stories could push the page 6px sideways.

## 2.6.0 - 2026-11-13: "old press" redesign

A new look: an old-school paper that is soft and warm rather than boxy. Cream paper cards with
rounded corners and soft shadows lie on real newsprint; colour sits between black-and-white and
modern, from muted section inks, the public-domain prints and the photographs.

### Added
- **Public-domain artwork** (credits and licences in [docs/ASSETS.md](docs/ASSETS.md)):
  - **Twelve woodcuts by Edward Penfield**, one for each month, shown in the new **almanac** card
    with a line about the month and a thought for the day (`MonthAlmanac` in
    `components/site/almanac.tsx`). It runs across the front page between rows of stories.
  - **Penfield's reader in a rocking chair (1897)**, in colour, on the landing page and beside the
    log-in and sign-up forms (the magazine name on the poster was painted out).
  - **Steinlen's kittens (1898)** as the office cats on empty pages, "not found" pages and the
    footer, and his colour lithograph **"Winter: Cat on a Cushion"** asleep on the last page
    ("— 30 —").
  - **Real paper texture** (ambientCG Paper006, CC0) instead of generated noise.
  - Engravings from freesvg.org (CC0) for each section, the newsboy, the press, the quill and
    the motto ribbon, printed in the theme's ink through CSS masks
    (`components/site/engraving.tsx`).
- **Front-page masthead card** (`components/site/front-masthead.tsx`): edition line with an
  "English edition" flag and the date, the blackletter title on its ribbon between two matching
  tiles (a live station clock with the weekday, and tonight's moon with how much of it is lit), and
  the street strip along the bottom.
- **The street banner, a Victorian paper theatre** (`components/site/street-theatre.tsx`,
  `styles/street-theatre.css`, pictures in `public/street`), built from real prints instead of
  drawn shapes: Wenceslaus Hollar's etched skyline of London (far, in haze), J. W. Fiske iron
  railings of 1875 and gas lamps made of a Fiske post and a 19th-century French lantern (middle, with
  warm halos as the only light), and cut-paper silhouettes by Auguste Edouart (front, on etched
  cobbles). The planes drift at different speeds; gentlemen walk on jointed paper legs, ladies glide,
  children skip, people further back stand and chat. Sepia on cream by day, near-black against a
  slate dusk at night. GPU transforms only; it pauses off screen, stops mid-stride for readers who
  ask for less motion, and has a Pause button.
- **Section inks**: every section has its own muted colour (dusty blue, brick, bottle green, teal,
  violet, rose, ochre, plum) for its label, chip dot and photo placeholder (`data-section` and the
  `section-badge`, `section-dot` and `stamp` styles in `styles/globals.css`).
- **Sections as postage stamps** with perforated edges on the landing page and the Sections page;
  chosen sections are printed in full ink, the rest stay faded.
- **Bottom tab bar on phones** (Front Page, Saved, Sections), within reach of a thumb.
- A "Top Story" rubber stamp on the lead photo; `components/site/page-header.tsx` for inner pages.
- `lib/use-client-value.ts`: `useHydrated()` and `useClientValue()` for values only the browser
  knows (local time, date, moon, greeting, saved theme).

### Changed
- **One header on every page**: the small title on the left, the reader's places (Front Page,
  Saved, Sections) in a pill in the middle, the account on the right. They no longer move between
  pages. On the front pages the small title appears once the big masthead has scrolled away.
- **A calmer front page**: one row of section chips (single choice: My sections, Everything or one
  section), Latest / For you, a search box and one **Filters** button. How recent and which
  newspapers moved into the Filters dialog. The refresh button, the "By wire" ticker and the
  "Turn to a section" box were removed.
- **Story cards**: soft cards with the photo on top, the section label in its ink, and three
  actions only (Like, Save and a "…" menu with Letters to the editor, Read on the publisher's site,
  Share, Hide and Mute).
- **Softer everything**: rounded corners (`--radius-*`), paper shadows, pill buttons in sentence
  case, rounded fields, menus and dialogs, gentler rules. Fonts: **Fraunces** (soft cut) for
  headlines and **Jost** for labels replace Playfair Display and Oswald; Source Serif for text and
  the blackletter title stay.
- **Night edition**: navy stock with parchment type and gilt (the brown one was disliked).
- Saved stories: folders are a row of chips, like the sections; the list sits on a card.
- Article page, letters, sign-in pages, settings, Sections and the Newsroom follow the new style.
- Colour presets: "Crimson" and "Royal" replaced by "Vermilion" and "Cobalt"; readers who picked
  the old colours keep them.

### Removed
- The bright Tailwind badge and gradient classes in `lib/category-styles.ts`.
- `bulletins.tsx`, `flourish-heading.tsx`, the `ornate` corners and four unused engravings.

### Fixed
- A hydration warning: the clock's numerals are positioned with rounded numbers, because the
  server and the browser can differ in the last digits of `sin`/`cos`.
- Three lint warnings (`react-hooks/set-state-in-effect` in the header and the greeting).

Checked on a production build: landing, front page, Filters, article, saved, settings, Sections
and log-in, in both editions, at 390, 900 and 1440 px. No console errors, no horizontal scrolling.

## 2.5.0 - 2026-11-13: sign-in review and "Continue with Google"

### Added
- **"Continue with Google"** on the login and sign-up pages (Supabase OAuth with PKCE, account
  chooser always shown). The button appears only when Google is enabled in Supabase
  (`lib/supabase/auth-settings.ts` reads `/auth/v1/settings`, cached five minutes), so it can
  never lead to an error. Setup steps for Google Cloud and the dashboard:
  [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md). `[auth.external.google]` added to
  `supabase/config.toml` (off; secrets from environment variables).
- Settings for accounts that only use Google: one "How you sign in" card instead of the email and
  password forms (the server actions refuse those changes too). Deleting such an account needs a
  Google sign-in from the last 10 minutes (the `amr` claim of the session), otherwise the dialog
  offers **Confirm with Google** and reopens on the way back (`/profile?delete=confirm`).
- `lib/auth.ts` with the pure helpers and `tests/auth.test.ts` (8 tests).

### Fixed
- A cancelled or failed Google sign-in now says "Signing in did not finish" instead of "That link is
  invalid or has expired" (`/auth/callback` reads Supabase's `error` / `error_code`).
- Unknown Supabase errors no longer show raw technical text; readers see "Something went wrong.
  Please try again in a moment." and the details go to the browser console.
- Passwords longer than 72 bytes (bcrypt's limit) are refused with a plain message at sign-up,
  password reset and password change, instead of Supabase's technical error.
- The email templates said "Personalized News Aggregator"; they now say "Daily Aggregator". Paste
  them into the hosted project again when setting up the templates.

Checked on a production build with Google enabled locally (placeholder credentials): button and
redirect to Google (client id, Supabase callback, `prompt=select_account`, basic scopes, PKCE
cookie), cancelled sign-in, expired link, sign-up with a too-long password, password account
settings and deletion (wrong and right password), Google-only account settings, deletion with an
old sign-in (asks for Google, account kept) and a fresh one (deleted). No CSP violations.

## 2.4.0 - 2026-11-13: Next.js 16 and Supabase CLI v3

### Changed
- **Next.js 15.5 → 16.4** and `eslint-config-next` 16. `middleware.ts` is now `proxy.ts` (Next.js 16
  naming) and `lib/supabase/middleware.ts` is `lib/supabase/proxy.ts`. Turbopack is the default for
  `next dev` and `next build` (`npm run dev:webpack` now passes `--webpack`). `tsconfig.json` uses
  `jsx: react-jsx` and includes `.next/dev/types`, as Next.js 16 requires.
- **ESLint** uses the native flat configs of `eslint-config-next` (`@eslint/eslintrc` and `FlatCompat`
  removed). Two new React rules, `react-hooks/set-state-in-effect` and `react-hooks/refs`, flag 11
  spots in the existing UI; they are warnings until the redesign rewrites those components.
- **Supabase CLI 2.26.9 → 3.1.** `[inbucket]` is `[local_smtp]`, `auth.email.enable_signup` /
  `auth.sms.enable_signup` are `enabled`. CLI v3 works on the local database unless `--remote` is
  given: the cloud is now updated with `supabase db push --remote`. `npm run db:types` drops the
  `--local` flag (types regenerated; formatting changed, the unused GraphQL schema is gone).
- `supabase/config.toml` now says `major_version = 15`, which is what the local database and the
  cloud actually run (it said 17; CLI v2 silently followed the cloud's version).

Checked on a production build: security headers and the CSP nonce, login redirect, cron secret,
open-redirect guard; reader flow (letters live for a visitor, Save, account deletion); admin
dashboard, sources and readers; menus, dialogs, fonts, night edition and phone widths. The local
stack was restarted with CLI v3 with all data intact, and the database security checks pass.

## 2.3.0 - 2026-11-13: tooling updates before the redesign

### Changed
- **Tailwind CSS 3 → 4.** The theme moved from `tailwind.config.ts` (deleted) into `@theme` in
  `styles/globals.css`; the newspaper classes (`.headline`, `.kicker`, `.paper-box`, `.news-grid`, ...)
  are now `@utility` blocks; PostCSS uses `@tailwindcss/postcss` (autoprefixer is built in).
  Class names were renamed by the official upgrade tool (`outline-none` → `outline-hidden`,
  `aspect-[3/2]` → `aspect-3/2`, `text-[var(--x)]` → `text-(--x)`, ...). Fixed by hand afterwards:
  the font variables (next/font now sets `--font-playfair`, `--font-source-serif`, `--font-oswald`, so
  they no longer clash with Tailwind's `--font-*` theme names), the page container's 1.5rem gutters
  from 640px, a button `variant` the tool had renamed, and buttons keep the pointer cursor
  (Tailwind 4 dropped it).
- `tailwindcss-animate` replaced by `tw-animate-css` (same class names, plain CSS).
- `lucide-react` 0.523 → 1.x (no icon used by the app was renamed).
- **Node.js 22.12+ required** (`engines`); developed on Node 26. `@supabase/supabase-js` 2.109 → 2.119
  and `@supabase/ssr` 0.12.0 → 0.12.7 (they need Node 22). The Node 20 WebSocket polyfill
  (`instrumentation.ts`, `lib/websocket-polyfill.ts`) and the `ws` package are removed.
- Minor updates: Radix UI packages, `tailwind-merge`, `fast-xml-parser`, `ws`, `dotenv`, TypeScript 5.9.
- `typescript-eslint` pinned to 8.x with a patched `minimatch` through `overrides`: `npm audit fix`
  had "fixed" an advisory by downgrading it to 6.x, which crashes ESLint 9. `npm audit` is clean,
  dev dependencies included.

Checked in a production build (Node 26): front page, feed, article, saved, settings, menus and
dialogs, night edition, 390 px and 800 px widths, no CSP violations. After the Supabase update:
login, a letter appearing live for a logged-out visitor, Save, and account deletion through the
real form (wrong password refused, right password deletes the account and its letters and signs
out). `npm run ingest` works without the polyfill.

## 2.2.1 - 2026-11-13: security, round two

New migration `20261113095910_security_round_two.sql`.

### Security
- **Deleting an account really needs the password.** `delete_own_account()` could be called from
  any logged-in browser, which skipped the password step. It is replaced by
  `delete_user_account(uuid)`, which only the service role can run: the server action checks the
  password first, then deletes with the service key.
- **New tables and functions start locked.** Default privileges no longer give `anon` and
  `authenticated` (or, for functions, `PUBLIC`) access to objects created by later migrations;
  every new object needs an explicit `GRANT`.
- **Letters no longer reveal the author's account id**: `comments.user_id` cannot be read by
  visitors or readers (also stripped from realtime events). Letters are still shown through
  `get_article_comments()`, and the "own letter" policies still work.
- **GraphQL switched off** (`pg_graphql` dropped): the app never used it, and it described the
  schema to anyone with the public key.

## 2.2.0 - 2026-11-13: security hardening

### Security
- **Feeds can no longer make the server contact private addresses.** Feed, article and image
  requests go through `safeFetch`: only http(s) on the standard ports, no credentials, every
  redirect re-checked, and any host that resolves to a loopback, private, link-local, cloud
  metadata or other non-public address is refused (IPv4, IPv6 and every disguised form). Feed
  downloads are capped at 5 MB.
- **Column-level database privileges** on top of Row Level Security: guests are read-only; readers
  can only write the columns they own (comment text, their own profile settings); `sources.rss_url`
  and fetch diagnostics are admin-only; nobody but the ingestion job writes articles.
- **Content Security Policy** with a per-request nonce and `strict-dynamic`, plus HSTS and
  `Cross-Origin-Opener-Policy`. Session cookies are `Secure` on HTTPS.
- **Open redirects closed**: `?next=` only accepts paths on this site; error pages no longer echo
  text from the URL; `x-forwarded-host` is validated.
- **Accounts**: deleting an account requires the password; sign-up no longer reveals whether an
  email is registered; passwords need letters and digits; changing a password requires a recent
  login; staff-like usernames are reserved (checked in the database too).
- **Abuse limits**: 5 letters per minute / 60 per hour per reader, 100 folders per reader, search
  limited to 100 characters and 8 words, image URLs must be http(s).
- Error messages shown to readers are generic; details go to the server log only.
- Dependencies: `npm audit fix`, patched `postcss` via `overrides`; production dependencies have no
  known vulnerabilities. Added Dependabot. The GitHub Actions job runs with no repository
  permissions.
- New tests: `tests/security.test.ts`.

### Housekeeping
- The hosted Supabase project was reset and now runs the baseline migrations. From here on the
  baseline files are frozen: every schema change goes into a new migration file.
- Removed the 2025 AI-assistant rule books and helpers (`.clinerules`, `.cursor`, `.roo`,
  `.windsurf`, `.kilocode`, `project_rules`, `memory`, `.github/copilot-instructions.md`, `tools/`,
  `requirements.txt`), the outdated `Architecture/` specs and old debug scripts.

## 2.1.0 - 2026-11-12: the broadsheet edition

### Fixed - speed
- **Scrolling the feed was janky**: several publishers put their full-resolution originals in their
  feeds (up to 12000 × 6750 pixels), so one screen of stories decoded about 270 megapixels.
  Images are now requested from each publisher's CDN at the displayed size (`lib/images.ts`), and
  ingestion replaces oversized images that cannot be resized (`lib/ingestion/image-size.ts`). A
  full scroll of the feed now decodes about 50 megapixels and keeps 60 fps.
- **Clicks felt slow in development**: `npm run dev` now uses Turbopack (pages compile in about
  0.4 s instead of several seconds). `npm run preview` runs the production build locally.
- Removed costly effects (backdrop blur on the sticky header) and let the browser skip rendering
  off-screen stories (`content-visibility`).

### Changed - design
- The whole app is restyled as an old-school newspaper, "The Daily Aggregator": masthead with
  edition number and date, double rules, ruled columns, section kickers in accent ink, drop caps,
  and a "Night edition" dark mode.
- The feed is split into numbered pages of 30 stories instead of scrolling forever
  ("Continued on page 2", page numbers, back/forward support). `get_feed` now returns
  `total_count`.
- Saved stories page rebuilt to be understood at a glance: a plain list of stories with labelled
  buttons (Mark as read, Put in a folder, Add a note, Remove), an optional list of folders, one
  search box and a "Hide stories I've read" switch. Opening a saved story marks it as read.
- Story cards use a printed line of text actions (Like · Letters … Save · More) instead of a row
  of icons; Share moved into More.
- Newspaper wording where it helps (Front Page, Sections, Letters to the Editor, the Newsroom) and
  plain words where it matters: "Save", "Sign up", "Settings". Nothing says "subscribe" or
  "subscriber", so nobody thinks the paper costs money.
- New setting: accent ink (replaces the banner colour).

### Removed
- **Tags** on saved stories, folder colours and descriptions, bulk selection and the sort menu:
  they made the page hard to understand. Folders, notes and search remain.
- **The saved-story quota** ("space left", the per-user limit, the "limit reached" dialog and the
  admin limit editor). Readers can save as many stories as they like; a fixed safety cap of 1000
  stays in the database.
- The two example folders and tags that every new account used to receive.
- Database: tables `saved_tags` and `saved_article_tags`, columns `profiles.saved_articles_limit`,
  `saved_folders.description` and `saved_folders.color`, functions `get_saved_overview`,
  `remove_oldest_saved_article` and `clear_saved_from_disabled_sources`. The baseline migrations
  were edited in place (they have not been pushed to a hosted project yet); a local database
  created from the 2.0 baseline needs `npm run db:reset` (which deletes its local data).
- New default colours are printing inks (oxblood accent, navy avatars).

### Fixed - other
- Guests who opened a mistyped link were sent to the login page instead of the 404 page.
- The account menu button had no accessible name on phones; the landing page had no `<h1>`.
- Saved stories page: changing a filter logged "Cannot update a component (Router) while rendering
  a different component" because the URL was updated inside a React state updater.
- Opening a dialog from a menu item (for example "New folder…") left the whole page unclickable
  after the dialog closed. Menus are now non-modal.

## 2.0.0 - 2026-11-12: the revival

The 2025 version could not be set up again: the hosted Supabase project no longer exists, the
migrations failed on a fresh database, and the production build failed. This release rebuilds the
app on a clean, tested base.

### Fixed - things that were broken
- **Production build failed** (`useSearchParams()` without a Suspense boundary on `/`, `/login`,
  `/email-confirmed`).
- **Fresh database setup failed**: migration `20250708182500` added `banner_color` a second time. The
  ~70 incremental migrations are replaced by one readable baseline (`supabase/migrations`) that
  installs cleanly.
- **Files missing from git**: `.gitignore` had a Python-template `lib/` rule, so `lib/analytics.ts`,
  `lib/category-styles.ts` and `lib/utils/reading-time.ts` were never committed and a fresh clone did
  not build.
- **Articles had no summaries**: ingestion stored text in `description` but the UI read `summary`.
- **Articles had no images**: images were never extracted from feeds.
- **Scheduled ingestion could not work**: the middleware redirected `/api/trigger-ingestion` to `/login`.
- **Sign-up confirmation links pointed to `/auth/callback`, which did not exist**; logged-in users
  were redirected away from `/update-password`, breaking password resets.
- **Article pages crashed for articles with images** (event handler passed to `<img>` in a Server Component).
- **Feed pagination returned duplicates and skipped articles** (client-side filtering of 100 rows,
  offset advanced by the filtered count). Search only looked at the newest 100 articles.
- Saved-articles "limit reached" dialog read the wrong column names, so "Remove oldest" never appeared.
- Tagging a saved article reloaded the whole page; removing a saved article left it on screen;
  some confirm dialogs stayed open after confirming.
- The toast hook changed identity on every render, re-running effects (endless refetch loop on errors).
- A "Loading your session…" overlay flashed on every auth event; theme only applied to some pages;
  many light-only colours in dark mode; no mobile navigation.
- Several RSS feeds were dead (WSJ, New Scientist, ...); the source list was refreshed and verified.

### Security
- **Any user could make themselves admin** (`update profiles set role = 'admin'` from the browser).
  Role and saved-article limit are now protected by a trigger, and the last admin cannot be demoted.
- Database functions that accepted a user id from the client (save/remove saved articles, counts,
  feed) let users act on other users' data. All functions now use `auth.uid()`.
- Maintenance functions (`delete_old_articles`, ...) were callable by anonymous users. Execution
  rights are now explicitly granted per function.
- Likes were readable by everyone; they are now private (counts are stored on articles).
- The ingestion endpoint fell back to the secret `'your-secret-token'`; it now requires `CRON_SECRET`
  and compares it in constant time.
- Changing the password now asks for the current password; `?next=` redirects are restricted to
  same-site paths; security headers added; Next.js upgraded from 14.2.30 (end of life, known CVEs).

### Added
- Comments with live updates mute sources and hide stories, "For you" ranking that learns
  from likes and saves, text size setting, public share links with link previews, skippable
  onboarding.
- Saved articles: notes, undo, bulk tag removal, search in notes, URL-synced filters.
- Admin: real dashboard (stats, ingestion history, errors, articles per topic), add/test/delete
  sources, fetch a single source, topic management, per-user saved limits.
- Ingestion inside the Next.js app: `npm run ingest`, admin button, `/api/cron/ingest`, Vercel cron,
  GitHub Actions workflow and automatic background refresh. No Edge Function deployment needed.
- `npm run make-admin`, a setup page when `.env.local` is missing, landing page for visitors,
  email templates, account deletion, 404/error pages, unit tests (`npm test`), ESLint 9 config.

### Changed
- Next.js 14 → 15.5, React 18 → 19, `@supabase/ssr` 0.6 → 0.12 (cookie `getAll`/`setAll` API).
- Feed, saved articles, article, profile, onboarding, auth and admin UIs rewritten with a consistent
  design (serif headlines, category colours, dark mode, mobile layouts).
- The banner colour now works with any colour (gradient derived automatically).
- Saved-article limit default raised from 50 to 100.

### Removed
- Supabase Edge Function `news-ingestion` (replaced by `lib/ingestion`), `/api/trigger-ingestion`,
  client-side analytics stored in `profiles.analytics_data`, unused dependencies (`react-window`,
  `react-color`, `dompurify`, `node-fetch`, `zxcvbn`, ...), unused components.

### Upgrade notes
- The 2025 hosted Supabase project still has the old schema, which `supabase db push` cannot
  upgrade in place. Reset that project's database (or create a new project), then run
  `supabase db push` (see README).
- Local Supabase now uses project id `agregator-stiri`. The containers and volumes of the old
  `AgregatorStiri` stack are untouched; remove them with Docker Desktop if you no longer need them.
