import { z } from 'zod'
import { supabase } from './supabase'

// Four intake paths mirror the schema check on contact_submissions.interest.
export const INTERESTS = [
  {
    value:   'volunteer',
    label:   'Volunteer',
    icon:    'hand',
    caption: 'Offer time, skills, or expertise. Help run events, teach a session, lend hands where needed.'
  },
  {
    value:   'sponsor',
    label:   'Sponsor',
    icon:    'heart',
    caption: 'Fund a specific program, outreach, or resource. One-time or ongoing. Every naira lands where it is earmarked.'
  },
  {
    value:   'invest',
    label:   'Invest',
    icon:    'trendingUp',
    caption: 'Longer-term partnership. Grow with the initiative as it scales beyond Lagos.'
  },
  {
    value:   'partner',
    label:   'Partner',
    icon:    'handshake',
    caption: 'Organizations working the same soil. Churches, schools, workplaces, other initiatives.'
  }
]

export const getInvolvedSchema = z.object({
  interest:     z.enum(['volunteer', 'sponsor', 'invest', 'partner'], {
    required_error: 'Choose how you would like to walk with us.'
  }),
  name:         z.string().trim().min(2, 'Tell us your name.').max(120, 'Keep it under 120 characters.'),
  email:        z.string().trim().email('That email looks off.').max(200),
  phone:        z.string().trim().max(40).optional().or(z.literal('')),
  organization: z.string().trim().max(200).optional().or(z.literal('')),
  message:      z
    .string()
    .trim()
    .min(10, 'Add a little more so we know how to respond.')
    .max(4000, 'Keep it under 4000 characters.')
})

export async function submitGetInvolvedForm(values) {
  const parsed = getInvolvedSchema.parse(values)

  const payload = {
    source:       'get_involved',
    interest:     parsed.interest,
    name:         parsed.name,
    email:        parsed.email,
    phone:        parsed.phone         || null,
    organization: parsed.organization  || null,
    message:      parsed.message,
    user_agent:   typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    referrer:     typeof document !== 'undefined' ? (document.referrer || null) : null
  }

  const { error } = await supabase.from('contact_submissions').insert(payload)
  if (error) throw error
}
