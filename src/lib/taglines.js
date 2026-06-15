// Four official taglines, mapped to surfaces per docs/client-voice.md.
// Treat this module as the single source of truth. Do not hardcode taglines elsewhere.

export const TAGLINES = {
  homeHero:    'Raising Godly Mentors and Leaders',
  aboutHero:   'Building Godly Leaders for Global Influence',
  programs:    'Mentorship for Kingdom Impact',
  authScreens: 'Raising Christ-Centered Leaders Through Mentorship'
}

export const ALL_TAGLINES = Object.values(TAGLINES)

// Footer carries a rotating line beneath the legal name.
// Picked once per page load, stable for the session via useState in the consumer.
export function pickFooterTagline() {
  const i = Math.floor(Math.random() * ALL_TAGLINES.length)
  return ALL_TAGLINES[i]
}

// Naming forms by surface, per docs/client-voice.md.
export const NAMES = {
  short:  'ToolVine',
  medium: 'ToolVine Mentors',
  legal:  'Toolvine Mentors & Leaders Initiative',
  shout:  'TOOLVINE MENTORS AND LEADERS INITIATIVE'
}
