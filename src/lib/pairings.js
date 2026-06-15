import { supabase } from '@/lib/supabase'

// Active pairings where this user is the mentor, each enriched with the
// mentee profile, the mentee's seeking focus, and the last completed meeting.
// Open task counts are NOT included here. Combine with countOpenItemsByPairing
// at the call site (typically the mentor dashboard hook).
//
// Shape:
//   {
//     id:         pairing id,
//     menteeId,
//     startedAt:  ISO,
//     mentee:     { id, full_name, photo_url, email },
//     focus:      [{ categoryId, slug, label }, ...],   // sorted by sort_order
//     lastMetAt:  ISO | null
//   }
export async function fetchActiveMenteesForMentor(mentorId) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select(`
      id,
      mentee_id,
      started_at,
      mentee:profiles!pairings_mentee_id_fkey ( id, full_name, photo_url, email )
    `)
    .eq('mentor_id', mentorId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })

  if (pErr) throw pErr
  if (!pairings || pairings.length === 0) return []

  const menteeIds  = pairings.map((p) => p.mentee_id)
  const pairingIds = pairings.map((p) => p.id)

  const [focusRes, lastMetRes] = await Promise.all([
    supabase
      .from('user_focus')
      .select('user_id, category_id, mentoring_categories ( id, slug, label, sort_order )')
      .in('user_id', menteeIds)
      .eq('kind', 'seeking'),
    supabase
      .from('meetings')
      .select('pairing_id, scheduled_for')
      .in('pairing_id', pairingIds)
      .eq('status', 'completed')
      .order('scheduled_for', { ascending: false })
  ])

  if (focusRes.error)   throw focusRes.error
  if (lastMetRes.error) throw lastMetRes.error

  // Group focus by mentee, sorted by category sort_order.
  const focusByMentee = new Map()
  for (const row of focusRes.data ?? []) {
    if (!row.mentoring_categories) continue
    const list = focusByMentee.get(row.user_id) ?? []
    list.push({
      categoryId: row.category_id,
      slug:       row.mentoring_categories.slug,
      label:      row.mentoring_categories.label,
      sortOrder:  row.mentoring_categories.sort_order ?? 0
    })
    focusByMentee.set(row.user_id, list)
  }
  for (const list of focusByMentee.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Last-met per pairing. The first row per pairing wins because the server
  // ordered scheduled_for desc.
  const lastMetByPairing = new Map()
  for (const row of lastMetRes.data ?? []) {
    if (!lastMetByPairing.has(row.pairing_id)) {
      lastMetByPairing.set(row.pairing_id, row.scheduled_for)
    }
  }

  return pairings.map((p) => ({
    id:        p.id,
    menteeId:  p.mentee_id,
    startedAt: p.started_at,
    mentee:    p.mentee,
    focus:     focusByMentee.get(p.mentee_id) ?? [],
    lastMetAt: lastMetByPairing.get(p.id) ?? null
  }))
}
