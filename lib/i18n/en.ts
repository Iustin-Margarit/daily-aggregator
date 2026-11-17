/**
 * Every word the paper prints around the news, in one place (the paper is in English only since V2.1;
 * the news itself keeps the words its publisher wrote). Components read it through useI18n() or getI18n().
 *
 * - `{name}` is filled in by fmt(); in rich() it can be a link or bold text.
 * - `plural(one, other)` pairs are counts, chosen with Intl.PluralRules.
 * - The masthead title, "The Daily Aggregator", is set in lib/site.ts.
 */

/** A count's two forms: "1 story", "3 stories". */
export type Plural = { one: string; other: string };
const plural = (one: string, other: string): Plural => ({ one, other });

const en = {
  meta: {
    titleDefault: 'your own morning paper',
    description:
      'A personal newspaper in the style of a Victorian broadsheet: headlines from over 50 publishers, printed section by section. Free to read, no account needed.',
    frontPage: 'Front page',
    saved: 'Saved stories',
    sections: 'Sections',
    settings: 'Settings',
    /** The title of a search page. */
    search: 'Search: “{q}”',
    logIn: 'Log in',
    /** Description of a story without a summary, for link previews. */
    articleFallback: '{section} news from {source}',
  },

  common: {
    cancel: 'Cancel',
    close: 'Close',
    undo: 'Undo',
    confirm: 'Confirm',
    tryAgain: 'Try again',
    saved: 'Saved',
    somethingWrong: 'Something went wrong',
    dismiss: 'Dismiss notification',
    typeToConfirm: 'Type {word} to confirm.',
    confirmation: 'Confirmation',
    openSaved: 'Open saved stories',
    logIn: 'Log in',
    /** Shown when the browser refuses to store a visitor's saved stories. */
    storageBlocked: 'Your browser did not let this page store it (private browsing or full storage).',
    /** Under a failed action: the technical reason goes to the console, the reader gets this. */
    errorNote: 'Please check your internet connection and try again in a moment.',
  },

  nav: {
    main: 'Main',
    front: 'Front Page',
    saved: 'Saved',
    sections: 'Sections',
    newsroom: 'Newsroom',
    logIn: 'Log in',
    accountMenu: 'Account menu',
    settings: 'Settings',
    settingsNote: 'the reader’s ledger',
    /** The Settings button's tooltip (the cog by the edition toggle). */
    settingsHint: 'Settings for reading and printing',
    /** The first stop for keyboard readers: jumps over the header and the masthead tabs. */
    skipToContent: 'Skip to main content',
    theEdition: 'The edition',
    logOut: 'Log out',
    toMorning: 'Switch to the Morning edition',
    toNight: 'Switch to the Night edition',
    themes: { light: 'Morning edition', dark: 'Night edition', auto: 'By the clock' },
  },


  masthead: {
    label: 'Masthead',
    motto: 'All the news that fits your interests',
    volNo: 'Vol. {vol} · No. {no}',
    todaysPaper: 'today’s paper',
  },

  almanac: {
    localTime: 'Local time',
    timeIs: 'The time is {time}',
    clock: 'Clock',
    lunar: 'Lunar almanac',
    moon: 'The moon',
    moonTonight: 'The moon tonight: {phase}',
    lit: '{n}% lit',
    phases: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    title: 'The almanac',
    thought: 'Thought for the day',
    /** The thought of the day in quotation marks. */
    quoted: '“{text}”',
    woodcutFor: 'A woodcut for {month}',
    months: [
      { name: 'January', note: 'Sleigh bells on the high road and a fresh year to read.' },
      { name: 'February', note: 'Short days, long letters and the first sign of spring.' },
      { name: 'March', note: 'High winds: hold on to your hat and your paper.' },
      { name: 'April', note: 'Gates mended, seeds sown, showers expected.' },
      { name: 'May', note: 'Ploughing under big skies; evenings grow long.' },
      { name: 'June', note: 'Carriages out, roses in, the longest light of the year.' },
      { name: 'July', note: 'Haymaking weather. Read in the shade.' },
      { name: 'August', note: 'Slow wagons over old bridges; the year at full height.' },
      { name: 'September', note: 'Apples in the cart and a new term begins.' },
      { name: 'October', note: 'Walks with the dog through the turning leaves.' },
      { name: 'November', note: 'The fire is lit, the cat is home. A good month for reading.' },
      { name: 'December', note: 'Wood for the hearth and stories for the long nights.' },
    ],
    /** Short public-domain thoughts, one for each day of the month. */
    thoughts: [
      { text: 'Well begun is half done.', by: 'Aristotle' },
      { text: 'Courage is resistance to fear, mastery of fear, not absence of fear.', by: 'Mark Twain' },
      { text: 'Knowledge is power.', by: 'Francis Bacon' },
      { text: 'Little by little, one travels far.', by: 'Spanish proverb' },
      { text: 'Lost time is never found again.', by: 'Benjamin Franklin' },
      { text: 'Reading is to the mind what exercise is to the body.', by: 'Richard Steele' },
      { text: 'Early to bed and early to rise makes a man healthy, wealthy and wise.', by: 'Benjamin Franklin' },
      { text: 'What do we live for, if it is not to make life less difficult to each other?', by: 'George Eliot' },
      { text: 'Brevity is the soul of wit.', by: 'William Shakespeare' },
      { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
      { text: 'Nothing is so strong as gentleness.', by: 'Francis de Sales' },
      { text: 'Kind hearts are more than coronets.', by: 'Alfred Tennyson' },
      { text: 'The best way out is always through.', by: 'Robert Frost' },
      { text: 'The unexamined life is not worth living.', by: 'Socrates' },
      { text: 'Books are the quietest and most constant of friends.', by: 'Charles W. Eliot' },
      { text: 'Hope is a good breakfast.', by: 'Francis Bacon' },
      { text: 'He that can have patience can have what he will.', by: 'Benjamin Franklin' },
      { text: 'I am large, I contain multitudes.', by: 'Walt Whitman' },
      { text: 'To be, or not to be: that is the question.', by: 'William Shakespeare' },
      { text: 'Every day is a fresh beginning.', by: 'Susan Coolidge' },
      { text: 'Fortune favours the bold.', by: 'Virgil' },
      { text: 'Where there is a will, there is a way.', by: 'Proverb' },
      { text: 'The beginning is the most important part of the work.', by: 'Plato' },
      { text: 'One today is worth two tomorrows.', by: 'Benjamin Franklin' },
      { text: 'A journey of a thousand miles begins with a single step.', by: 'Laozi' },
      { text: 'All things are difficult before they are easy.', by: 'Thomas Fuller' },
      { text: 'Light tomorrow with today.', by: 'Elizabeth Barrett Browning' },
      { text: 'Some books are to be tasted, others to be swallowed, and some few to be chewed and digested.', by: 'Francis Bacon' },
      { text: 'Act well your part; there all the honour lies.', by: 'Alexander Pope' },
      { text: 'What we learn with pleasure we never forget.', by: 'Alfred Mercier' },
      { text: 'Tomorrow is a new day with no mistakes in it yet.', by: 'L. M. Montgomery' },
    ],
    fromAlmanac: 'From the almanac',
    onThisDay: 'On this day, {date}',
    /** {link} is the Wikipedia link, worded by `wikipediaLink`. */
    wikipediaCredit: 'From {link} (CC BY-SA)',
    wikipediaLink: 'Wikipedia’s anniversaries',
  },

  street: {
    /** The banner's Sound ticket says its state: off until the reader presses it. */
    soundOff: 'Sound: off',
    soundOn: 'Sound: on',
    soundTitle: 'Victorian street ambience: click to play',
    soundTitlePlaying: 'Victorian street ambience (playing): click to stop',
    soundSr: ' (Victorian street ambience)',
    play: 'Play',
    pause: 'Pause',
    playTitle: 'Let the town move again',
    pauseTitle: 'Stop everything that moves: the people, the cab, the smoke and the sky',
    motionSr: ' the moving pictures',
    stop: 'Stop sound',
    stopTitle: 'The Victorian street sound is playing: click to stop it',
  },

  /** The sections of the paper, by key (lib/category-styles.ts). */
  sections: {
    world: { name: 'World', description: 'International news and global affairs' },
    politics: { name: 'Politics', description: 'Elections, policy and government' },
    business: { name: 'Business', description: 'Markets, companies and the economy' },
    technology: { name: 'Technology', description: 'Gadgets, software, AI and startups' },
    science: { name: 'Science', description: 'Space, research and discoveries' },
    health: { name: 'Health', description: 'Medicine, wellbeing and public health' },
    sports: { name: 'Sports', description: 'Football, basketball, tennis and more' },
    entertainment: { name: 'Entertainment', description: 'Film, TV, music and celebrities' },
    fallback: 'News and stories',
    stampNo: 'No. {n}',
  },

  time: {
    justNow: 'just now',
    minutes: '{n}m ago',
    hours: '{n}h ago',
    days: '{n}d ago',
    readingTime: '{n} min read',
  },

  landing: {
    deleted: 'Your account has been deleted, along with everything you saved.',
    pictures: {
      breakfast: { alt: 'A woman in a flowered dress reading the morning paper at the breakfast table', caption: 'L. A. Ring, At Breakfast, 1898' },
      armchair: { alt: 'A man in a skullcap reading the newspaper in a flowered armchair', caption: 'Paul Cézanne, The Artist’s Father, 1866' },
      figaro: { alt: 'A woman in spectacles reading the newspaper in an armchair', caption: 'Mary Cassatt, Reading Le Figaro, 1878' },
      farmers: { alt: 'Farmers gathered by the stove while one of them reads the newspaper', caption: 'Albert Anker, The Farmers and the Newspaper, 1867' },
      grandfather: { alt: 'An old man in a cap reading the newspaper at a table, beside a pipe and a carafe', caption: 'Albert Anker, Grandfather with the Newspaper, 1906' },
    },
    kicker: 'Free, and no account needed',
    title: 'Your own morning paper',
    intro: '{count}+ newspapers, printed as one. Read them section by section, like a real paper, with none of the noise.',
    choose: 'Browse the sections',
    /** {account} is a link worded by `account`. */
    guestNote: 'Read, search and save stories without signing up; they stay in this browser. {account} keeps them on every device.',
    account: 'A free account',
    otherNews: 'In other news',
    latest: 'Latest dispatches',
  },

  feed: {
    searching: 'Searching the paper for “{q}”.',
    everySection: 'Every section, freshest first.',
    stories: 'Stories',
    endTitle: 'That is the end of today’s edition.',
    endNote: 'Even the office cat has nodded off. Fresh stories arrive every hour.',
    catAlt: 'A tabby cat asleep on a red cushion (Théophile Steinlen, 1909)',
    continued: 'Continued',
    onPage: 'on page {n}',
    lastPage: 'The last page',
    everyStory: 'That is every story for now',
    turnTo: 'Turn to page {n}',
    backToFront: 'Back to the front page',
    hideFailed: 'Could not hide the story',
    muteFailed: 'Could not mute the source',
    muted: '{source} muted',
    running: 'The presses are running…',
    runningNote: 'Today’s stories are being fetched for the first time. This takes about 20 seconds; the page updates by itself.',
    jammed: 'The presses jammed',
    jammedNote: 'The paper could not be loaded. Check your connection and try again.',
    noPage: 'There is no page {n}',
    noPageNote: 'This edition is shorter than that. New stories may have moved things around.',
    backToPage1: 'Back to page 1',
    notPrinted: 'No stories have been printed yet',
    nothingAbout: 'Nothing in the paper about “{q}”',
    nothingAboutNote: 'Try different words, a longer time range or more sections.',
    noStories: 'No stories for these filters',
    noStoriesNote: 'There is nothing recent here yet. New stories arrive every hour.',
    pageN: 'Page {n}',
    storyCount: plural('{n} story', '{n} stories'),
    pageCount: plural('{n} page', '{n} pages'),
  },

  /** The front page (V2): the digest of every section and the welcome slip. */
  front: {
    allLatest: 'All the latest',
    moreDispatches: 'More dispatches',
    allSection: 'All {name} news',
    sectionsTitle: 'Section by section',
    sectionsNote: 'The newest stories from every section.',
    welcomeClose: 'Close',
    notPrintedShort: 'New stories arrive every hour. Come back a little later.',
  },
  /** The lists: All the latest, a section page, the search page. */
  list: {
    paperKicker: 'Newspaper',
    paperDesk: 'Files for the {section} desk.',
    paperSite: 'Visit its website',
    sectionKicker: 'Section',
    latestKicker: 'Hour by hour',
    latestTitle: 'The latest',
    searchKicker: 'The last 30 days',
    searchTitle: 'Search the paper',
    searchPrompt: 'Type a word or two, then press Search.',
    searchButton: 'Search',
    /** Under the ribbon of a list filtered by newspaper (Filter > Apply). */
    filteredBy: 'Only from {list}.',
    filteredMany: 'Only from {first}, {second} and {n} more.',
    everyPaper: 'Show every newspaper',
  },
  toolbar: {
    latest: 'Latest',
    searchTab: 'Search',
    sections: 'Sections',
    search: 'Search headlines…',
    searchLabel: 'Search headlines',
    /** The Filter ticket at the end of the section ribbon: a checklist of newspapers, applied with one press. */
    filter: 'Filter',
    filterLabel: 'Filter by newspaper',
    filterActive: plural('Filter by newspaper: {n} newspaper chosen', 'Filter by newspaper: {n} newspapers chosen'),
    filterTitle: 'Show stories from',
    filterAll: 'All',
    filterClear: 'Clear',
    filterApply: 'Apply',
    filterApplyCount: plural('Apply: {n} newspaper', 'Apply: {n} newspapers'),
    filterEvery: 'Apply: every newspaper',
  },

  pagination: {
    label: 'Pages',
    previous: 'Previous page',
    prev: 'Prev',
    next: 'Next page',
    nextShort: 'Next',
    page: 'Page {n}',
  },

  story: {
    quickRead: 'Quick read',
    by: 'By {author}',
    readOn: 'Read on {source}',
    readOnTitle: 'Read the full story on {source} (opens in a new tab)',
    share: 'Share',
    /** Shown on the Share button for a moment after the link was copied. */
    copied: 'Copied',
    mute: 'Mute {source}',
    unmute: 'Unmute {source}',
    /** Beside the Unmute item once a newspaper is muted from the sheet. */
    mutedTag: 'Muted',
    /** The slip printed in a hidden story's place (Undo brings it back, × folds the slip away). */
    hiddenSlip: 'Story hidden',
    hiddenSlipNote: 'It will not appear in your paper or your searches again.',
    dismissSlip: 'Dismiss',
    readDispatch: 'Read dispatch',
    save: 'Save',
    saved: 'Saved',
    saveLabel: 'Save this story for later',
    savedLabel: 'Saved: remove from saved stories',
    saveTitle: 'Save this story to read later',
    savedTitle: 'In your saved stories. Press to remove.',
    more: 'More',
    moreOptions: 'More options',
    /** Raised in the wax seal on the lead photograph; keep it short (it runs round a small ring). */
    topStamp: 'TOP STORY ✦ FRONT PAGE ✦',
    topStampNo: 'NO.',
    removeFailed: 'Could not remove the story',
    removed: 'Removed from your saved stories',
    guestFull: 'This browser holds 200 saved stories',
    guestFullNote: 'Remove a few, or create a free account to keep up to 1000.',
    saveFailed: 'Could not save the story',
    accountFull: 'You have saved 1000 stories',
    accountFullNote: 'Remove a few from your saved stories to make room.',
    linkCopied: 'Link copied to clipboard',
    shareFailed: 'Could not share this article',
  },

  /** "New since your last visit" (lib/last-visit.ts): the front page's count line. */
  visit: {
    /** Under Latest dispatches: {count} is `stories` (in red), {when} one of the phrases below. */
    count: '{count} since your last visit {when}.',
    stories: plural('{n} new story', '{n} new stories'),
    minutes: plural('a minute ago', '{n} minutes ago'),
    hours: plural('an hour ago', '{n} hours ago'),
    today: { morning: 'this morning', afternoon: 'this afternoon', evening: 'this evening' },
    yesterday: { morning: 'yesterday morning', afternoon: 'yesterday afternoon', evening: 'yesterday evening' },
    lastNight: 'last night',
    /** {day}: "Saturday"; {date}: "3 November". */
    weekday: 'on {day}',
    date: 'on {date}',
  },

  /** Reading with the keyboard (components/site/keyboard-reading.tsx) and its card of keys. */
  keys: {
    title: 'The compositor’s card',
    intro: 'Read the paper with the keyboard. The keys do nothing while you are typing in a box.',
    next: 'Next story',
    previous: 'Previous story',
    open: 'Open the story you are on',
    save: 'Save the story, or take it out of your saved stories',
    search: 'Search the paper',
    close: 'Close the story or this card',
    help: 'Show this card',
    enter: 'Enter',
    esc: 'Esc',
    /** The footer's button that opens the card. */
    footer: 'Reading with a keyboard? Press ? for the keys',
  },

  article: {
    back: 'Back to the paper',
    shareTitle: 'Share this story with someone',
    hideFromFeed: 'Hide from my paper',
    hiddenFromFeed: 'Hidden from your paper',
    /** In the sheet's More menu on a story the reader hid (opened from Saved, a shared link or its own address). */
    unhide: 'Unhide this story',
    hiddenTag: 'Hidden',
    mutedNote: 'Their stories will no longer appear in your paper.',
    noSummary: 'The publisher did not include a summary for this story.',
    fullReport: 'Read the full report at {source}',
    summaryNote: 'You are reading a summary. The complete article, with all its reporting, is on the publisher’s website.',
    opensPublisher: ' (opens the publisher’s website)',
    moreFromDesk: 'More from the {section} desk',
    /** Over the same news from other papers, in the quick-read sheet. */
    alsoReported: 'Also reported by',
    alsoReportedNote: 'The same news, as other papers tell it.',
    pulled: 'This story has been pulled',
    pulledNote: 'Stories stay in the archive for 30 days unless a reader saved them. This one is no longer on file.',
  },

  saved: {
    title: 'Saved stories',
    guestNote: 'Kept on this device only. {login} to keep them on every device.',
    emptyTitle: 'You have not saved any stories yet',
    /** {save} is the button's name in bold, from `story.save`. */
    emptyNote: 'When you see a story you want to keep, press {save} under it. It will appear here, even after it has left the front page.',
    goFront: 'Go to the front page',
    folders: 'Folders',
    allSaved: 'All saved',
    allSavedStories: 'All saved stories',
    storyCount: plural('{n} story', '{n} stories'),
    renameFolder: 'Rename folder',
    deleteFolder: 'Delete folder',
    /** Short labels beside the folder's own name (the buttons' full names are renameFolder / deleteFolder). */
    rename: 'Rename',
    delete: 'Delete',
    search: 'Search your saved stories…',
    searchLabel: 'Search saved stories',
    clearSearch: 'Clear search',
    emptyFolder: 'This folder is empty',
    showAll: 'Show all saved stories',
    noMatch: 'No saved stories match “{q}”',
    noMatchNote: 'Check the spelling or try fewer words.',
    clearTheSearch: 'Clear the search',
    showing: 'Showing {n} of {total}.',
    moveFailed: 'Could not move the story',
    restoreFailed: 'Could not put the story back',
    removeFailed: 'Could not remove the story',
    removed: 'Removed from your saved stories',
    folderExists: 'You already have a folder with that name.',
    guestFolderLimit: 'This browser holds up to 30 folders. Delete one to add another.',
    folderLimit: 'You can have up to 100 folders. Delete one to add another.',
    folderFailed: 'Could not save the folder. Please try again.',
    folderDeleteFailed: 'Could not delete the folder',
    deleteFolderTitle: 'Delete the folder “{name}”?',
    deleteFolderNote: 'Only the folder is deleted. The stories in it stay in your saved stories.',
    item: {
      saved: 'Saved {time}',
      read: 'Read',
      /** The folder button under a saved story shows the folder's name, or this. */
      unfiled: 'Unfiled',
      /** The folder button's name for screen readers. */
      folderLabel: 'Folder: {name}. Press to change it.',
      putIn: 'Put this story in…',
      noFolder: 'Unfiled (no folder)',
      newFolder: '+ New folder…',
      remove: 'Remove',
    },
    folder: {
      rename: 'Rename folder',
      create: 'New folder',
      help: 'Folders help you keep saved stories in groups, like “Recipes” or “For later”.',
      name: 'Folder name',
      placeholder: 'e.g. Weekend reading',
      needName: 'Please give the folder a name.',
      saveName: 'Save name',
      createButton: 'Create folder',
    },
    imported: plural('{n} saved story moved into your account', '{n} saved stories moved into your account'),
    importedNote: 'The stories you saved before signing in are in Saved, on every device.',
  },

  /** The Sections page: the eight stamps, each opening its section. */
  sectionsPage: {
    title: 'Sections',
    description: 'Tap a stamp to open that section.',
    newspapers: plural('{n} newspaper', '{n} newspapers'),
  },

  settings: {
    kicker: 'Your paper',
    title: 'Settings',
    guestNote: 'Kept in this browser. {login} to keep them on every device.',
    guestLogin: 'Log in',
    guestMoved: 'Your muted newspapers and words are now in your account',
    contents: 'Contents',
    contentsLabel: 'Settings sections',
    unknownSource: 'Unknown source',
    entries: {
      byline: 'Your account',
      printing: 'Appearance',
      'reading-room': 'Reading',
      muted: 'Muted papers & words',
      close: 'Delete account',
    },
    byline: {
      username: 'Your name',
      save: 'Save',
      saved: 'Saved',
    },
    printing: {
      edition: 'Edition',
      themes: {
        light: { label: 'Morning' },
        dark: { label: 'Night' },
        auto: { label: 'By the clock', note: 'Night from 7 pm to 7 am' },
      },
      typeSize: 'Type size',
      sizes: { small: 'Small', medium: 'Medium', large: 'Large' },
      accent: 'Accent ink',
    },
    inks: {
      color: 'Colour',
      mix: 'Mix your own ink',
      mixLabel: 'Mix a custom ink',
      names: ['Oxblood', 'Vermilion', 'Burnt orange', 'Ochre', 'Forest', 'Teal ink', 'Navy', 'Cobalt', 'Plum', 'Sepia', 'Steel', 'Ink'],
    },
    reading: {
      clock: {
        title: 'Clock',
        options: { '12': '12-hour', '24': '24-hour' },
      },
      banner: {
        title: 'Street banner',
        options: { moving: 'Moving', still: 'Still', hidden: 'Hidden' },
      },
      photos: {
        title: 'Photographs',
        options: { archival: 'Sepia', natural: 'Full colour' },
      },
      columns: {
        title: 'Text edges',
        options: { justified: 'Straight', ragged: 'Ragged right' },
      },
    },
    muted: {
      mutedPapers: 'Muted newspapers',
      noMutedPapers: 'No newspapers muted.',
      pickPaper: 'Choose a newspaper…',
      mutePaper: 'Mute',
      mutePaperFailed: 'Could not mute that newspaper',
      unmutePaper: 'Unmute {name}',
      yourPapers: 'Your muted newspapers',
      unmute: 'Unmute',
      unmuteFailed: 'Could not unmute',
      mutedWords: 'Muted words',
      wordPlaceholder: 'A word or name, e.g. football',
      muteWord: 'Mute word',
      noWords: 'No words muted.',
      yourWords: 'Your muted words',
      unmuteWord: 'Unmute “{word}”',
      alreadyMuted: '“{word}” is already muted.',
      tooManyWords: 'You can mute at most {max} words. Unmute one first.',
      muteWordFailed: 'Could not mute that word',
    },
    close: {
      description: 'Deletes your account and everything you saved. This cannot be undone.',
      button: 'Delete my account',
      title: 'Delete your account?',
      note: 'Everything you saved, with your folders, will be removed for good.',
      failed: 'Could not delete the account.',
      google: 'Confirm with Google',
      confirm: 'Delete account',
    },
  },

  /** Messages from the server when settings or sections are saved. */
  actions: {
    sessionExpired: 'Your session expired. Please log in again.',
    validColour: 'Please pick a valid colour.',
    pickSize: 'Please pick a font size.',
    profileFailed: 'Could not save your profile.',
    profileUpdated: 'Profile updated',
    appearanceFailed: 'Could not save your appearance settings.',
    confirmGoogleFirst: 'For your safety, please confirm with Google first. Then you can delete the account.',
    cannotDelete: 'Accounts cannot be deleted right now. Please try again later.',
    deleteFailed: 'Could not delete the account. Please try again.',
    profileRetry: 'Could not save your profile. Please try again.',
  },

  validation: {
    usernameShort: 'Usernames need at least 3 characters.',
    usernameLong: 'Usernames can have at most 30 characters.',
    usernameChars: 'Use only letters, numbers, dots, dashes and underscores.',
    usernameTaken: 'That username is already taken.',
    usernameReserved: 'That username is reserved. Please choose another one.',
    wordShort: 'Type a word of at least 2 letters.',
    wordLong: 'Keep it to 40 characters or fewer.',
    wordChars: 'Use letters and numbers (spaces, - and apostrophes are fine inside).',
  },

  auth: {
    benefits: [
      { title: 'Eight sections', text: 'Stories from 50+ newspapers. Mute the papers and words you do not want.' },
      { title: 'On every device', text: 'Your saved stories, mutes and settings follow you.' },
      { title: 'Save for later', text: 'Keep the stories you like, sorted into folders.' },
    ],
    pictureAlt: 'A woman in a straw hat reading the paper in a green rocking chair (after Edward Penfield, 1897)',
    google: 'Continue with Google',
    openingGoogle: 'Opening Google…',
    login: {
      title: 'Log in',
      description: 'One press with your Google account. New here? The same button makes your free account.',
      note: 'Your saved stories, mutes and settings then follow you to every device. Google sends us only your name and email address.',
      googleOff: 'Signing in is switched off right now. You can still read, save stories and change Settings in this browser.',
      linkInvalid: 'That link is invalid or has expired. Please request a new one.',
      sessionExpired: 'Your session expired. Please log in again.',
      signInFailed: 'Signing in did not finish. Please try again.',
    },
    errors: {
      rateLimit: 'Too many attempts. Please wait a minute and try again.',
      network: 'Could not reach the server. Check your connection and try again.',
      signupDisabled: 'New accounts cannot be created right now. Please try again later.',
      providerDisabled: 'This way of signing in is switched off right now. Please use your email instead.',
      unknown: 'Something went wrong. Please try again in a moment.',
    },
  },

  footer: {
    catLabel: 'A small black cat, looking up',
    motto: 'Read the world · Keep what matters · Read it your way',
    credits:
      'Headlines and photographs belong to their publishers; every story links to the original reporting. Pictures by Edward Penfield, Théophile Steinlen, Auguste Edouart and Wenceslaus Hollar, from the public domain; street sounds recorded by Freesound contributors (CC0).',
    printed: 'Printed on the internet, daily',
    /** The colophon under the copyright line, with a link to the author's GitHub on {name}. */
    builtBy: 'Built by {name} · Next.js, TypeScript, Supabase',
    github: '{name} on GitHub',
  },

  errors: {
    notFound: 'This page was never printed',
    notFoundNote: 'The office cat searched every column. The page you want does not exist, or it was pulled from an earlier edition.',
    backToFront: 'Back to the front page',
    stopPresses: 'Stop the presses',
    stopPressesNote: 'Something went wrong while printing this page. The newsroom may be busy for a moment; please try again.',
    frontPage: 'Front page',
    globalNote: 'The paper could not be printed just now. Please try again in a moment.',
  },
};

export default en;
export type Dictionary = typeof en;
