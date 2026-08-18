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
import adedayoPhoto   from '@/assets/portraits/adedayo-adewole.jpg'

/* ============ People ============ */

export const PEOPLE = {
  michael:  { id: 'michael',  name: 'Dr. Michael Abimbola Alade', photo: michaelPhoto },
  abigail:  { id: 'abigail',  name: 'Abigail Jesutofunmi Alade',  photo: abigailPhoto },
  olamide:  { id: 'olamide',  name: 'Dr. Olamide Oluwaseyi Oladepo', photo: oluwaseyiPhoto },
  joy:      { id: 'joy',      name: 'Joy Oluwaseun Ajayi',        photo: joyPhoto },
  adedayo:  { id: 'adedayo',  name: 'Adedayo Oreoluwa Adewole, PhD', photo: adedayoPhoto },
  olayinka: { id: 'olayinka', name: 'Olayinka Ajayi',             photo: olayinkaPhoto },
  adedoyin: { id: 'adedoyin', name: 'Adedoyin Jegede',            photo: adedoyinPhoto },
  // Portrait not supplied yet. Falls back to initials.
  kikelomo: { id: 'kikelomo', name: 'Kikelomo Olabamiji',         photo: null },
  // Portrait not supplied yet. Falls back to initials.
  emmanuel: { id: 'emmanuel', name: 'Emmanuel Dania',             photo: null }
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
//   Lecturer OOU, Nigeria

export const BOARD = [
  { id: 'michael', boardRole: 'Chairman' },
  { id: 'abigail', boardRole: 'Civil Service, United Kingdom' },
  { id: 'olamide', boardRole: 'Consultant in Oral Medicine, UBTH Nigeria' },
  { id: 'joy',     boardRole: 'Debt Management and Finance Specialist, United Kingdom' },
  { id: 'adedayo', boardRole: 'Lecturer, OOU Nigeria' }
]

/* ============ Teams ============ */
// Ampersand normalised to "and" so all seven names read the same way.
// Student Resource is the seventh, added August 2026. Adedayo moved across to
// lead it and Emmanuel took Programs and Publicity.

export const TEAMS = [
  { name: 'Recruitment and Training', leadId: 'olamide'  },
  { name: 'Pathway Tracking',         leadId: 'olayinka' },
  { name: 'Social Media',             leadId: 'joy'      },
  { name: 'Welfare and Projects',     leadId: 'adedoyin' },
  { name: 'Secretariat',              leadId: 'abigail'  },
  { name: 'Programs and Publicity',   leadId: 'emmanuel' },
  { name: 'Student Resource',         leadId: 'adedayo'  }
]

/* ============ Administration ============ */
// Sits outside the board and outside the seven teams, at the client's request.

export const ADMIN = {
  id:   'kikelomo',
  role: 'Administrative Assistant'
}

/* ============ Helpers ============ */

// How many places on the team page each person shows up. Several team leads
// also sit on the board, so the page can mark the connection.
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
