import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Admin invites. Reads invites_with_status for the derived status ladder,
// writes the base table. RLS on both is admin-only, so no extra gating here.
//
// Decisions this file implements, from docs/block-e-tracker.md:
//   D06  default expiry 30 days
//   D07  bulk paste creates rows, sending is a separate explicit action
//   D08  'registered' is shown as "Signed up"
//   D09  'acknowledged' is never offered as a filter, it is unreachable

export const DEFAULT_EXPIRY_DAYS = 30

const VIEW_SELECT =
  'id, email, role_hint, invited_by, invited_at, acknowledged_at, registered_at, onboarded_at, revoked_at, redeemed_at, expires_at, created_at, token, status, is_stale'

/* ============ Status labels ============ */
// 'acknowledged' is stamped in the same statement as registered_at and the
// view checks registered_at first, so no row can ever be observed in it. Kept
// in the map only so an unexpected value renders as words rather than blank.

export const STATUS_LABELS = {
  sent:         'Sent',
  acknowledged: 'Signed up',
  registered:   'Signed up',
  onboarded:    'Onboarded',
  revoked:      'Revoked',
  expired:      'Expired'
}

export const FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'sent',       label: 'Sent' },
  { key: 'registered', label: 'Signed up' },
  { key: 'onboarded',  label: 'Onboarded' },
  { key: 'revoked',    label: 'Revoked' },
  { key: 'expired',    label: 'Expired' }
]

export const DEFAULT_FILTER = 'all'

/* ============ Read ============ */

export async function fetchInvites() {
  const { data, error } = await supabase
    .from('invites_with_status')
    .select(VIEW_SELECT)
    .order('invited_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// Addresses that already have an account. An invite to one of these is
// harmless but pointless, so the list marks it rather than blocking it.
export async function fetchExistingEmails() {
  const { data, error } = await supabase.from('profiles').select('email')
  if (error) throw error
  return new Set((data ?? []).map((r) => (r.email || '').toLowerCase()))
}

/* ============ Link ============ */

export function inviteLink(token) {
  if (!token) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/auth/sign-up?invite=${token}`
}

/* ============ Validation ============ */

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(200, 'Keep the address under 200 characters'),
  roleHint: z.enum(['mentor', 'mentee', 'undecided']),
  expiryDays: z.coerce
    .number()
    .int('Whole days only')
    .min(1, 'At least one day')
    .max(365, 'At most 365 days')
})

function expiresAtFrom(days) {
  const d = new Date()
  d.setDate(d.getDate() + Number(days || DEFAULT_EXPIRY_DAYS))
  return d.toISOString()
}

// Pulls addresses out of pasted text. Handles one per line, comma separated,
// and "Name <addr@host>" from a copied mail client. Deduplicates, preserving
// first-seen order.
export function parseEmailList(text) {
  const found = String(text || '').match(/[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/g) ?? []
  const seen = new Set()
  const out = []

  for (const raw of found) {
    const email = raw.trim().toLowerCase().replace(/[.,;]+$/, '')
    if (seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }

  return out
}

/* ============ Write ============ */

// expires_at has no database default, so every insert supplies it or the row
// is rejected. The token generates itself from the column default.
export async function createInvite(values) {
  const parsed = inviteSchema.parse(values)
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('invites')
    .insert({
      email:      parsed.email,
      role_hint:  parsed.roleHint,
      invited_by: user?.id ?? null,
      expires_at: expiresAtFrom(parsed.expiryDays)
    })
    .select(VIEW_SELECT.replace(', status, is_stale', ''))
    .single()

  if (error) throw error

  logAdminAction('invite_created', 'invites', data.id, data.email)
  return data
}

// Per row, never all-or-nothing. Twenty-five addresses where three already
// exist should insert twenty-two and report the three, not fail the batch.
export async function bulkCreateInvites({ emails, roleHint, expiryDays }) {
  const results = { created: [], skipped: [], failed: [] }

  for (const email of emails) {
    try {
      const row = await createInvite({ email, roleHint, expiryDays })
      results.created.push(row)
    } catch (err) {
      const msg = err?.message || ''
      if (/duplicate key|unique constraint/i.test(msg)) {
        results.skipped.push({ email, reason: 'Already invited' })
      } else {
        results.failed.push({ email, reason: friendlyInviteError(err) })
      }
    }
  }

  return results
}

// Resend reuses the existing token, so a link already sitting in someone's
// inbox keeps working. Clearing revoked_at matters: without it the status
// ladder reports revoked forever even after a resend.
export async function refreshInvite(inviteId, expiryDays = DEFAULT_EXPIRY_DAYS) {
  const { data, error } = await supabase
    .from('invites')
    .update({
      invited_at: new Date().toISOString(),
      expires_at: expiresAtFrom(expiryDays),
      revoked_at: null
    })
    .eq('id', inviteId)
    .select('id, email, token')
    .single()

  if (error) throw error
  return data
}

export async function revokeInvite(inviteId) {
  const { data, error } = await supabase
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
    .select('id, email')
    .single()

  if (error) throw error

  logAdminAction('invite_revoked', 'invites', inviteId, data.email)
  return data
}

/* ============ Email ============ */

// Never throws. A failed send must not undo a row that already exists, and the
// admin can always resend. Mirrors sendRoleDecisionEmail in adminUsers.js.
export async function sendInviteEmail(inviteId) {
  try {
    const { data, error } = await supabase.functions.invoke('invite-send', {
      body: { invite_id: inviteId }
    })
    if (error) {
      console.error('[invite-send] invoke error:', error)
      return { sent: false, reason: 'invoke-failed' }
    }
    logAdminAction('invite_sent', 'invites', inviteId, data?.email ?? null)
    return data || { sent: false, reason: 'no-response' }
  } catch (e) {
    console.error('[invite-send] threw:', e)
    return { sent: false, reason: 'threw' }
  }
}

/* ============ Helpers ============ */

export function friendlyInviteError(err) {
  const msg = err?.message || String(err || '')
  if (/duplicate key|unique constraint/i.test(msg)) {
    return 'That address has already been invited. Resend the existing invite instead.'
  }
  if (/row-level security|permission denied/i.test(msg)) {
    return 'Your account does not have permission for that.'
  }
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return 'Check your connection and try again.'
  }
  return msg || 'That did not go through. Try again.'
}
