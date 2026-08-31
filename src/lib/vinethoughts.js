// Every Vinethoughts edition, in one place. Four surfaces read from here: the
// About rack, the home hero, the Community cover, and the dashboard card.
//
// Before this existed the editions were copied into each of them by hand, with
// a comment in VinethoughtsCard naming About.jsx as the source of truth. They
// had already drifted: the dashboard said Issue 06 was March 2026 while the
// hero and the Community cover said Summer 2026, and the hero's three volumes
// carried seasons and cover lines that matched nothing.
//
// A module rather than a table. Six editions in two years is not a rate that
// earns a CRUD surface, and the flipbook links come out of Heyzine by hand
// regardless. If the cadence changes, promoting this to a table is mechanical.
//
// To publish an edition: add it to the top of EDITIONS. Nothing else needs
// touching, on any surface.

export const EDITIONS = [
  {
    num:       '07',
    roman:     'VII',
    date:      'JUNE 2026',
    featured:  'Mentor Babatunde Ayeni',
    coverline: 'On stewardship, quiet leadership, and the years before the title',
    flipbook:  'https://heyzine.com/flip-book/b0606681cf.html',
    stories: [
      { type: 'EXCLUSIVE INTERVIEW', title: 'On stewardship, quiet leadership, and the years before the title', byline: 'Mentor Babatunde Ayeni', subline: 'Budgeting and Financial Analysis, downstream oil and gas', quote: 'Many see the title but not the years of preparation. Leadership is not mainly about position; it is about responsibility, solving problems, serving.' },
      { type: 'FEATURED ARTICLE',    title: 'Stewardship and Financial Wisdom: Managing Resources God\u2019s Way', byline: 'Dr. Festus Adejoro', subline: '', quote: 'Financial stewardship is not about how much we have but how faithfully we manage what has been entrusted.' },
      { type: 'BOOK REVIEW',         title: 'The Purpose Driven Life, by Rick Warren', byline: '', subline: 'reviewer', quote: 'The most important question is not what I want from life, but what God wants to accomplish through my life.' }
    ]
  },
  {
    num:       '06',
    roman:     'VI',
    date:      'MARCH 2026',
    featured:  'Mentor Yetunde Sorinola',
    coverline: 'On faith, career, and rising through delays',
    flipbook:  'https://heyzine.com/flip-book/1fa3ba745b.html',
    stories: [
      { type: 'EXCLUSIVE INTERVIEW', title: 'On faith, career, and the long climb to leadership', byline: 'Mentor Yetunde Sorinola', subline: 'CFO, Egbin Power PLC',        quote: 'Faith has been my absolute compass. In seasons of uncertainty, my reliance on God gave me a shield and ordered my steps.' },
      { type: 'FEATURED ARTICLE',    title: 'The Leadership of Pontius Pilate',                   byline: 'Mentor Dayo Adewole',      subline: '',                             quote: 'Pilate chose peace over justice. Leaders often face the temptation to maintain harmony at the expense of truth.' },
      { type: 'SPEAKER SERIES',      title: 'From Desire to Reality',                             byline: 'Aramide Kayode',           subline: 'Founder, Talent Mike Academy', quote: 'I had a choice to make. Driven by a deep conviction, I declined the investment banking job and signed up to teach in a rural community.' },
      { type: 'BOOK REVIEW',         title: 'The Fourth Dimension, by David Yonggi Cho',          byline: 'Mentor Samuel Asawole',    subline: 'reviewer',                     quote: 'Faith must be intentional and incubated. Spiritual breakthroughs often grow quietly before appearing outwardly.' }
    ]
  },
  {
    num:       '05',
    roman:     'V',
    date:      'DEC 2025',
    featured:  'Dr. Busayo Oladepo',
    coverline: 'Christmas Special',
    flipbook:  'https://heyzine.com/flip-book/93ba1ab5de.html',
    stories: [
      { type: 'EXCLUSIVE INTERVIEW', title: 'On faith, nursing, and breaking barriers as an immigrant', byline: 'Dr. Busayo Oladepo',         subline: 'DNP, Nurse Practitioner', quote: 'Never let anyone define your worth or your potential.' },
      { type: 'SPEAKER SERIES',      title: 'Nurturing Mental Wellness and Healing in Uncertain Times', byline: 'Dr. Oluwatofunmi Eyekpegha', subline: '',                        quote: 'Mental wellness is not merely the absence of illness; it is the capacity to adapt, find meaning, and thrive.' },
      { type: 'FEATURED ARTICLE',    title: 'It Is Not Your Fault',                                     byline: 'Grace Ochigbo',              subline: 'Author',                  quote: 'You are not God. You do not control all outcomes. Release yourself from guilt that never belonged to you.' },
      { type: 'BOOK REVIEW',         title: 'The 12 Week Year, by Brian P. Moran & Michael Lennington', byline: 'Ayodele Oladiran',           subline: 'reviewer',                quote: 'Extraordinary results are often not the product of extraordinary talent, but of extraordinary focus applied over a short, intense period.' }
    ]
  },
  { num: '04', roman: 'IV', date: 'Q3 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  { num: '03', roman: 'III', date: 'Q2 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  { num: '02', roman: 'II', date: 'Q1 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  {
    num:       '01',
    roman:     'I',
    date:      'Q4 2024',
    featured:  'Archive',
    coverline: 'First edition',
    flipbook:  'https://heyzine.com/flip-book/fd3044c0be.html',
    stories: []
  }
]

// Newest first is the array order, so the current edition is the first entry
// rather than a number written down somewhere. About.jsx compared against the
// literal '06' in two places, which is one more thing to remember on the day a
// new edition ships.
export function currentEdition() {
  return EDITIONS[0] ?? null
}

export function isCurrentEdition(num) {
  return Boolean(num) && num === EDITIONS[0]?.num
}

export function editionByNumber(num) {
  return EDITIONS.find((e) => e.num === num) ?? null
}

// Oldest of the three first, because the hero renders them back to front and
// the newest has to land on top.
export function recentEditions(count = 3) {
  return EDITIONS.slice(0, count).reverse()
}

export function archiveEditions(excludeNum) {
  return EDITIONS.filter((e) => e.num !== excludeNum)
}

// The two stories the hero's front volume shows. Falls back to nothing rather
// than to placeholder text: an edition with no stories recorded should render
// its colophon, which is what the hero already does when features are absent.
export function heroFeatures(edition) {
  if (!edition?.stories?.length) return null

  return edition.stories.slice(0, 2).map((s) => ({
    label:  s.type === 'EXCLUSIVE INTERVIEW' ? 'The Interview' : 'The Essay',
    title:  s.title,
    author: s.byline ? `by ${s.byline}` : ''
  }))
}
