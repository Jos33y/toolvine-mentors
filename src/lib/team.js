// Team page data. Names and roles kept close to how the client refers to them.
// Photos load from src/assets/portraits/. Missing photos fall back to initials.
//
// When new portraits arrive, drop the JPG into src/assets/portraits/, import
// it at the top of this file, and set the `photo` field on the matching row.

import michaelPhoto  from '@/assets/portraits/michael-alade.jpg'
import abigailPhoto  from '@/assets/portraits/abigail-alade.png'
import joyPhoto      from '@/assets/portraits/joy-ajayi.png'

// Three more portraits are expected in the folder (from the client's July 2026
// review pack). Uncomment as each file lands to wire them onto the correct row:
import oluwaseyiPhoto from '@/assets/portraits/oluwaseyi-oladepo.png'
import adedoyinPhoto  from '@/assets/portraits/adedoyin-jegede.png'
import olayinkaPhoto  from '@/assets/portraits/olayinka-ajayi.png'

/* ============ Founder ============ */

export const FOUNDER = {
  name:  'Dr. Michael Abimbola Alade',
  role:  'FOUNDER · LEAD MENTOR',
  photo: michaelPhoto,
  brief: 'Toolvine was born from a calling that preceded the platform. From leading the University of Ibadan school fellowship, through years of clinical and pastoral mentorship, to the initiative that carries the name today.'
}

/* ============ Board ============ */

export const BOARD = [
  {
    name:  'Abigail Jesutonmi Alade',
    role:  'Secretariat Lead',
    photo: abigailPhoto
  },
  {
    name:  'Joy Oluwaseun Ajayi',
    role:  'Social Media Lead',
    photo: joyPhoto
  },
  {
    name:  'Olamide Oluwaseyi Oladepo',
    role:  'Recruitment & Training Lead',
    photo: oluwaseyiPhoto // wire oluwaseyiPhoto when file lands
  },
  {
    name:  'Adedayo Oreoluwa Adewole',
    role:  'Programme Unit Lead',
    photo: null
  }
]

/* ============ Operations ============ */

export const OPS = [
  {
    name:  'Olayinka Ajayi',
    role:  'Pathway Tracking Lead',
    photo: olayinkaPhoto // wire olayinkaPhoto when file lands
  },
  {
    name:  'Adedoyin Jegede',
    role:  'Welfare Lead',
    photo: adedoyinPhoto // wire adedoyinPhoto when file lands
  },
  {
    name:  'Kikelomo Olabamiji',
    role:  'Administrator',
    photo: null
  }
]

/* ============ Mentors ============ */
// Names from the client's July 2026 mentor list. Board and ops members are
// also mentors, but only appear in their leadership group above.

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

// First letter of each of the first two words in the displayed name.
export function initialsFor(name) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase()
}

// Handy total for hero / marketing counts. Kept as a helper (not stored)
// so it stays truthful as the mentor list grows.
export function totalPeople() {
  return 1 + BOARD.length + OPS.length + MENTORS.length
}
