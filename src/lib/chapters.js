// Each chapter carries one mark and one accent, and they follow it everywhere:
// the shelf, the filter chips, the card, the admin row, the public page. Six
// identical pills is a taxonomy the eye cannot hold; six marks is one it can.
//
// The marks are drawn for this job and checked at 18px. Reusing the nav set
// gave Spiritual a book spine that rendered as a dash, then an open book that
// said reading rather than ministry. Sunrise carries light and calling without
// the row reading as doctrine, which a cross beside a briefcase would.
//
// Keyed by mentoring_categories.slug, which owns labels and descriptions.

const CHAPTERS = {
  spiritual_ministry:    { icon: 'sunrise',    tone: 'teal'  },
  professional_careers:  { icon: 'briefcase',  tone: 'amber' },
  relationship_marriage: { icon: 'heart',      tone: 'teal'  },
  leadership_mentorship: { icon: 'mentoring',  tone: 'amber' },
  health_fitness:        { icon: 'activity',   tone: 'teal'  },
  finance_others:        { icon: 'banknote',   tone: 'amber' },
  newsletter:            { icon: 'newspaper',  tone: 'teal'  }
}

const FALLBACK = { icon: 'resources', tone: 'teal' }

// A chapter added by an admin after launch has no entry here and still renders.
export function chapterOf(slug) {
  return CHAPTERS[slug] ?? FALLBACK
}
