// Team data. One canonical record per person in PEOPLE, keyed by id. Every
// group below references people by id, so a name or a portrait is corrected
// in exactly one place.
//
// When new portraits arrive, drop the file into src/assets/portraits/, import
// it at the top of this file, and set the `photo` field on the matching row.

import michaelPhoto   from '@/assets/portraits/michael-alade.jpg'
import abigailPhoto   from '@/assets/portraits/abigail-alade.png'
import joyPhoto       from '@/assets/portraits/joy-ajayi.png'
import oluwaseyiPhoto from '@/assets/portraits/oluwaseyi-oladepo.png'
import adedoyinPhoto  from '@/assets/portraits/adedoyin-jegede.png'
import olayinkaPhoto  from '@/assets/portraits/olayinka-ajayi.png'

/* ============ People ============ */

export const PEOPLE = {
  michael:  { id: 'michael',  name: 'Dr. Michael Abimbola Alade', photo: michaelPhoto },
  abigail:  { id: 'abigail',  name: 'Abigail Jesutofunmi Alade',  photo: abigailPhoto },
  olamide:  { id: 'olamide',  name: 'Olamide Oluwaseyi Oladepo',  photo: oluwaseyiPhoto },
  joy:      { id: 'joy',      name: 'Joy Oluwaseun Ajayi',        photo: joyPhoto },
  // Portrait not supplied yet. Falls back to initials.
  adedayo:  { id: 'adedayo',  name: 'Adedayo Oreoluwa Adewole',   photo: null },
  olayinka: { id: 'olayinka', name: 'Olayinka Ajayi',             photo: olayinkaPhoto },
  adedoyin: { id: 'adedoyin', name: 'Adedoyin Jegede',            photo: adedoyinPhoto },
  // Portrait not supplied yet. Falls back to initials.
  kikelomo: { id: 'kikelomo', name: 'Kikelomo Olabamiji',         photo: null }
}

export function personFor(id) {
  return PEOPLE[id]
}

/* ============ Founder ============ */

export const FOUNDER = {
  ...PEOPLE.michael,
  role:  'FOUNDER · LEAD MENTOR',
  brief: 'Toolvine was born from a calling that preceded the platform. From leading the University of Ibadan school fellowship, through years of clinical and pastoral mentorship, to the initiative that carries the name today.'
}

/* ============ Board ============ */
// Professional titles as given by the client, lightly normalised for the page.
// Client's verbatim strings, if these ever need reverting:
//   Chairman
//   Civil Service UK
//   Consultant Oral Medicine (UBTH Nigeria)
//   Debt management/Finance specialist UK
//   Lecturer Nigeria

export const BOARD = [
  { id: 'michael', boardRole: 'Chairman' },
  { id: 'abigail', boardRole: 'Civil Service, United Kingdom' },
  { id: 'olamide', boardRole: 'Consultant in Oral Medicine, UBTH Nigeria' },
  { id: 'joy',     boardRole: 'Debt Management and Finance Specialist, United Kingdom' },
  { id: 'adedayo', boardRole: 'Lecturer, Nigeria' }
]

/* ============ Teams ============ */
// Ampersand normalised to "and" so all six names read the same way.

export const TEAMS = [
  { name: 'Recruitment and Training', leadId: 'olamide'  },
  { name: 'Pathway Tracking',         leadId: 'olayinka' },
  { name: 'Social Media',             leadId: 'joy'      },
  { name: 'Welfare and Projects',     leadId: 'adedoyin' },
  { name: 'Secretariat',              leadId: 'abigail'  },
  { name: 'Programs and Publicity',   leadId: 'adedayo'  }
]

/* ============ Administration ============ */
// Sits outside the board and outside the six teams, at the client's request.

export const ADMIN = {
  id:   'kikelomo',
  role: 'Administrative Assistant'
}

/* ============ Mentors ============ */
// Names from the client's July 2026 mentor list. Board, team leads, and the
// administrative assistant are also mentors, but appear in their group above
// rather than twice in this list.

export const MENTORS = [
  { name: 'Ezekiel Ajayi',        photo: null },
  { name: 'Blessed Agbaje',       photo: null },
  { name: 'Oluwasegun Asawole',   photo: null },
  { name: 'Deborah Popoola',      photo: null },
  { name: 'Samuel Diduyemi',      photo: null },
  { name: 'Aisha Omirin',         photo: null },
  { name: 'Christian John Inelo', photo: null },
  { name: 'Oduwa Obilade',        photo: null },
  { name: 'Boluwatife Adeyemo',   photo: null },
  { name: 'Emmanuel Dania',       photo: null },
  { name: 'Busayo Oladepo',       photo: null },
  { name: 'Ebunoluwa Asenuga',    photo: null },
  { name: 'Gbemisola Okeowo',     photo: null },
  { name: 'Christiana Daniel',    photo: null },
  { name: 'Ayoade Adeyanju',      photo: null },
  { name: 'Yetunde Sorinola',     photo: null },
  { name: 'Sheyi Odebiyi',        photo: null },
  { name: 'Ebunoluwa Akinbo',     photo: null }
]

/* ============ Helpers ============ */

// How many places on the team page each person shows up. Four of the six team
// leads also sit on the board, so the page can mark the connection.
const APPEARANCES = (() => {
  const counts = {}
  const bump = (id) => { counts[id] = (counts[id] || 0) + 1 }

  bump(FOUNDER.id)
  BOARD.forEach((entry) => bump(entry.id))
  TEAMS.forEach((team) => bump(team.leadId))
  bump(ADMIN.id)

  return counts
})()

export function appearsMoreThanOnce(id) {
  return (APPEARANCES[id] || 0) > 1
}

// First letter of each of the first two words in the displayed name.
export function initialsFor(name) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase()
}
