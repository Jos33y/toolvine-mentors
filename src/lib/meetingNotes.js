import { supabase } from '@/lib/supabase'

// The mentor's record of a meeting. One row per meeting, enforced by the
// meeting_notes_meeting_unique index from 0025.
//
// RLS blocks mentees at the database, not by hiding a component. That is the
// platform's core privacy promise: it holds even if a bug renders the field.

/* ============ Read ============ */

// Returns null when there is no note yet, and also when the caller is a
// mentee, because the select policy returns them no rows at all. The caller
// must not treat null as "no note" for a mentee; it never renders for them.
export async function fetchNote(meetingId) {
  const { data, error } = await supabase
    .from('meeting_notes')
    .select('id, meeting_id, author_id, notes, created_at, updated_at')
    .eq('meeting_id', meetingId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/* ============ Write ============ */

// Read, then insert or update. Deliberately not an upsert.
//
// The insert policy requires author_id = auth.uid(), and D29 fixes author_id
// as who created the note, never who last edited it. A Supabase upsert writes
// every column it is given on the update path too, so an admin editing a
// mentor's note would silently become its author.
//
// The unique index still guards the race: if two saves land together the
// loser gets 23505 and retries as an update, which is the correct outcome
// under D28's last-write-wins.
export async function saveNote(meetingId, notes, authorId) {
  const body = typeof notes === 'string' ? notes : ''

  const existing = await fetchNote(meetingId)

  if (existing) {
    const { data, error } = await supabase
      .from('meeting_notes')
      .update({ notes: body })
      .eq('meeting_id', meetingId)
      .select('id, meeting_id, author_id, notes, created_at, updated_at')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('meeting_notes')
    .insert({ meeting_id: meetingId, author_id: authorId, notes: body })
    .select('id, meeting_id, author_id, notes, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') return saveNote(meetingId, body, authorId)
    throw error
  }
  return data
}

/* ============ Errors ============ */

export function friendlyNoteError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'You do not have permission to write notes on this meeting.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again. Copy your text first so you do not lose it.'
  }
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return 'We could not save your notes. Your connection may have dropped. Copy your text, then try again.'
  }

  return raw || 'We could not save your notes. Copy your text, then try again.'
}
