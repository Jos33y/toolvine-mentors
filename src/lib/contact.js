import { z } from 'zod'
import { supabase } from './supabase'

export const contactSchema = z.object({
  subject: z.enum(['general', 'partnership', 'press_speaking']),
  name: z.string().trim().min(2, 'Tell us your name.').max(120, 'Keep it under 120 characters.'),
  email: z.string().trim().email('That email looks off.').max(200),
  message: z
    .string()
    .trim()
    .min(10, 'Add a little more so we can help.')
    .max(4000, 'Keep it under 4000 characters.')
})

export async function submitContactForm(values) {
  const parsed = contactSchema.parse(values)

  const payload = {
    ...parsed,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    referrer: typeof document !== 'undefined' ? (document.referrer || null) : null
  }

  const { error } = await supabase.from('contact_submissions').insert(payload)
  if (error) throw error
}
