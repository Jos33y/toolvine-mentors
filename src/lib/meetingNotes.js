import { supabase } from '@/lib/supabase'

// The record of a meeting. 0048 replaced meeting_notes_meeting_unique with
// meeting_notes_meeting_author_unique, so a meeting now holds one row per
// author rather than one row full stop. A convened meeting with four mentors
// in it has no single mentor to own the record.
//
// Every read and write below is scoped by author_id. Before 0048 the update
// path matched on meeting_id alone, which with two authors would have
// overwritten whichever note was found first.
//
// Who may write is meeting_attendees.can_write_notes on a convened meeting,
// and the pairing's mentor on a pairing meeting. RLS blocks mentees at the
// database, not by hiding a component. That is the platform's core privacy
// promise: it holds even if a bug renders the field.

const NOTE_FIELDS = 'id, meeting_id, author_id, notes, created_at, updated_at'

/* ============ Read ============ */

// The caller's own note. Returns null when they have not written one, and
// also when the select policy returns them no rows at all. The caller must not
// treat null as "no note" for a mentee; it never renders for them.
export async function fetchMyNote(meetingId, authorId) {
  if (!meetingId || !authorId) return null

  const { data, error } = await supabase
    .from('meeting_notes')
    .select(NOTE_FIELDS)
    .eq('meeting_id', meetingId)
    .eq('author_id', authorId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// Every note on the meeting the caller may read. One row on a pairing meeting,
// up to one per note-keeper on a convened one. Oldest first, so the order does
// not shuffle when somebody edits.
export async function fetchNotes(meetingId) {
  if (!meetingId) return []

  const { data, error } = await supabase
    .from('meeting_notes')
    .select(NOTE_FIELDS)
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
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
// under D28's last-write-wins. Its arbiter is now the pair, so the retry only
// ever collides with the same author's own row.
export async function saveNote(meetingId, notes, authorId) {
  const body = typeof notes === 'string' ? notes : ''

  const existing = await fetchMyNote(meetingId, authorId)

  if (existing) {
    const { data, error } = await supabase
      .from('meeting_notes')
      .update({ notes: body })
      .eq('meeting_id', meetingId)
      .eq('author_id', authorId)
      .select(NOTE_FIELDS)
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('meeting_notes')
    .insert({ meeting_id: meetingId, author_id: authorId, notes: body })
    .select(NOTE_FIELDS)
    .single()

  if (error) {
    if (error.code === '23505') return saveNote(meetingId, body, authorId)
    throw error
  }
  return data
}

/* ============ Permission ============ */

// Whether to render the editor. RLS is what enforces this; the check exists so
// a note-keeper is not shown a field that fails on save. attendees comes from
// fetchAttendees and is empty on a pairing meeting.
export function canWriteNote(meeting, viewerId, { isAdmin = false, attendees = [] } = {}) {
  if (!meeting || !viewerId) return false
  if (isAdmin) return true

  if (meeting.kind === 'admin') {
    return attendees.some((a) => a.profileId === viewerId && a.canWriteNotes)
  }

  return meeting.mentor?.id === viewerId
}

// Editing somebody else's record is not editing a note. The update policy
// refuses it for everyone but an admin, so the control has to as well.
export function canEditNote(note, viewerId, { isAdmin = false } = {}) {
  if (!note || !viewerId) return false
  return isAdmin || note.author_id === viewerId
}

/* ============ Errors ============ */

export function friendlyNoteError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'You do not have permission to write notes on this meeting.'
  }
  if (code === '23505') {
    return 'Your note was saved somewhere else in the meantime. Reload to see it.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again. Copy your text first so you do not lose it.'
  }
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return 'We could not save your notes. Your connection may have dropped. Copy your text, then try again.'
  }

  return raw || 'We could not save your notes. Copy your text, then try again.'
}
