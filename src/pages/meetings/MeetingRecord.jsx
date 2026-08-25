import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import { fetchNote, saveNote, friendlyNoteError } from '@/lib/meetingNotes'
import {
  fetchActionItemsForMeeting,
  createActionItem,
  setActionItemStatus,
  cancelActionItem,
  needsCompletionNote,
  friendlyItemError,
  isOverdue,
  dueLabel,
  ITEM_STATUS
} from '@/lib/meetingActionItems'
import './meetingRecord.css'

// The record of a meeting: what was said, and what was agreed. One component
// because they share a screen and a trust boundary, per the brief.
//
// A mentee gets the action items list and nothing else. The notes block is
// not rendered for them at all: no empty state, no "you do not have access".
// The field does not exist.
//
// Privacy runs one way. The mentor's notes stay private. What a mentee writes
// about finishing an item travels up to the mentor, and it lives on
// meeting_action_items rather than anywhere near meeting_notes.
export function MeetingRecord({
  meetingId,
  canWriteNotes,
  canManageItems,
  authorId,
  mentor,
  mentee,
  viewerId
}) {
  return (
    <section className="record" aria-label="Meeting record">
      {canWriteNotes && (
        <NotesBlock meetingId={meetingId} authorId={authorId} />
      )}
      <ItemsBlock
        meetingId={meetingId}
        canManage={canManageItems}
        mentor={mentor}
        mentee={mentee}
        viewerId={viewerId}
        authorId={authorId}
      />
    </section>
  )
}

/* ============ Notes ============ */

function NotesBlock({ meetingId, authorId }) {
  const [value, setValue]   = useState('')
  const [saved, setSaved]   = useState('')
  const [state, setState]   = useState('loading')
  const [error, setError]   = useState('')

  const savedRef = useRef('')

  useEffect(() => {
    let cancelled = false
    fetchNote(meetingId)
      .then((row) => {
        if (cancelled) return
        const text = row?.notes ?? ''
        setValue(text)
        setSaved(text)
        savedRef.current = text
        setState('idle')
      })
      .catch((e) => {
        if (cancelled) return
        setError(friendlyNoteError(e))
        setState('idle')
      })
    return () => { cancelled = true }
  }, [meetingId])

  // Auto-save on blur, per the UX principles. Not on keystroke, and not on a
  // no-op: blurring a field nobody touched should not toast.
  const onBlur = useCallback(async () => {
    if (value === savedRef.current) return
    setState('saving')
    setError('')
    try {
      await saveNote(meetingId, value, authorId)
      savedRef.current = value
      setSaved(value)
      setState('saved')
    } catch (e) {
      // The text stays in the field. Losing what someone just wrote because
      // their connection dropped is the worst thing this screen could do.
      setError(friendlyNoteError(e))
      setState('idle')
    }
  }, [meetingId, value, authorId])

  const dirty = value !== saved

  return (
    <article className="record__block">
      <header className="record__head">
        <div>
          <h2 className="record__title">Notes</h2>
          <p className="record__hint">
            Visible to you and our team. Your mentee never sees this, on this page or anywhere else.
          </p>
        </div>
        <StatusChip state={state} dirty={dirty} />
      </header>

      {error && <p className="record__error" role="alert">{error}</p>}

      {state === 'loading' ? (
        <div className="record__skeleton" aria-busy="true" />
      ) : (
        <textarea
          className="record__textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          rows={8}
          placeholder="What was discussed, what you noticed, what to pick up next time."
          spellCheck="true"
        />
      )}
    </article>
  )
}

function StatusChip({ state, dirty }) {
  if (state === 'saving') {
    return <span className="record__chip">Saving</span>
  }
  if (dirty) {
    return <span className="record__chip record__chip--dirty">Unsaved</span>
  }
  if (state === 'saved') {
    return (
      <span className="record__chip record__chip--ok">
        <Icon name="check" size={12} strokeWidth={2} />
        <span>Saved</span>
      </span>
    )
  }
  return null
}

/* ============ Action items ============ */

function ItemsBlock({ meetingId, canManage, mentor, mentee, viewerId, authorId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [busyId,  setBusyId]  = useState(null)
  const [adding,  setAdding]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await fetchActionItemsForMeeting(meetingId))
      setError('')
    } catch (e) {
      setError(friendlyItemError(e))
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  useEffect(() => { load() }, [load])

  // One entry point for both directions. The note travels with the status
  // change because meeting_action_items_check ties done to completed_at and
  // the RPC clears the note on the way back to open, so the two cannot move
  // separately without leaving the row describing work nobody is claiming.
  async function onSetStatus(item, next, note) {
    setBusyId(item.id)
    setError('')
    try {
      await setActionItemStatus(item.id, next, note)
      await load()
    } catch (e) {
      setError(friendlyItemError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onCancel(item) {
    setBusyId(item.id)
    setError('')
    try {
      await cancelActionItem(item.id)
      await load()
    } catch (e) {
      setError(friendlyItemError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onCreate(form) {
    await createActionItem({
      meetingId,
      assignedTo: form.assignedTo,
      body:       form.body,
      dueOn:      form.dueOn || null,
      createdBy:  authorId
    })
    setAdding(false)
    await load()
  }

  const open = items.filter((i) => i.status === ITEM_STATUS.OPEN)
  const rest = items.filter((i) => i.status !== ITEM_STATUS.OPEN)

  return (
    <article className="record__block">
      <header className="record__head">
        <div>
          <h2 className="record__title">Action items</h2>
          <p className="record__hint">
            {canManage
              ? 'What either of you agreed to do. When your mentee marks one done they say what happened, and you read it here.'
              : 'What you agreed to do. Mark each one done and write a line about how it went.'}
          </p>
        </div>
        {canManage && !adding && (
          <button type="button" className="record__add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} />
            <span>Add item</span>
          </button>
        )}
      </header>

      {error && <p className="record__error" role="alert">{error}</p>}

      {adding && (
        <ItemForm
          mentor={mentor}
          mentee={mentee}
          onCancel={() => setAdding(false)}
          onSubmit={onCreate}
        />
      )}

      {loading ? (
        <div className="record__skeleton" aria-busy="true" />
      ) : items.length === 0 ? (
        <p className="record__empty">
          {canManage
            ? 'Nothing agreed yet. Add what either of you committed to and it appears on their dashboard.'
            : 'Nothing set from this session.'}
        </p>
      ) : (
        <>
          <ul className="record__items">
            {open.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                canManage={canManage}
                canToggle={canManage || item.assigned_to === viewerId}
                viewerId={viewerId}
                busy={busyId === item.id}
                onSetStatus={(next, note) => onSetStatus(item, next, note)}
                onCancel={() => onCancel(item)}
              />
            ))}
          </ul>

          {rest.length > 0 && (
            <ul className="record__items record__items--closed">
              {rest.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  canToggle={item.status === ITEM_STATUS.DONE && (canManage || item.assigned_to === viewerId)}
                  viewerId={viewerId}
                  busy={busyId === item.id}
                  onSetStatus={(next, note) => onSetStatus(item, next, note)}
                  onCancel={() => onCancel(item)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  )
}

function ItemRow({ item, canManage, canToggle, viewerId, busy, onSetStatus, onCancel }) {
  const done      = item.status === ITEM_STATUS.DONE
  const cancelled = item.status === ITEM_STATUS.CANCELLED
  const over      = !done && !cancelled && isOverdue(item.due_on)

  const [noting, setNoting]           = useState(false)
  const [note, setNote]               = useState('')
  const [confirmUndo, setConfirmUndo] = useState(false)

  // Mirrors the rule inside set_action_item_status. Asking here rather than
  // letting the database refuse means the person is asked for the note instead
  // of being told off for not having sent one.
  const owesNote = needsCompletionNote(item, viewerId)

  function onCheck() {
    if (done) {
      // Reopening clears the note. Somebody's own words are not something to
      // discard on a stray tap.
      if (item.completion_note) setConfirmUndo(true)
      else onSetStatus(ITEM_STATUS.OPEN, null)
      return
    }
    if (owesNote) {
      setNoting(true)
      return
    }
    onSetStatus(ITEM_STATUS.DONE, null)
  }

  return (
    <li className={'item' + (done ? ' item--done' : '') + (cancelled ? ' item--cancelled' : '')}>
      <button
        type="button"
        className="item__check"
        onClick={onCheck}
        disabled={!canToggle || busy || cancelled}
        aria-pressed={done}
        aria-expanded={noting || confirmUndo ? true : undefined}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done && <Icon name="check" size={12} strokeWidth={2.5} />}
      </button>

      <div className="item__body">
        <p className="item__text">{item.body}</p>
        <p className="item__meta">
          <span className="item__who">{item.assignee?.full_name ?? 'Unassigned'}</span>
          {item.due_on && (
            <span className={'item__due' + (over ? ' item__due--over' : '')}>
              {over ? `Overdue ${dueLabel(item.due_on)}` : `Due ${dueLabel(item.due_on)}`}
            </span>
          )}
          {cancelled && <span className="item__tag">Cancelled</span>}
        </p>

        {/* The point of the whole change. A done item that says only "done"
            throws away the part that mattered. */}
        {done && item.completion_note && (
          <p className="item__note">{item.completion_note}</p>
        )}

        {noting && (
          <div className="item__noteform">
            <label className="record__field">
              <span className="record__label">What happened</span>
              <input
                type="text"
                className="record__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="I read it on the bus on Tuesday and one line stopped me"
                autoFocus
              />
            </label>
            <p className="item__note-hint">
              The person who set this reads it. A line is enough.
            </p>
            <div className="item__note-actions">
              <button
                type="button"
                className="record__ghost"
                onClick={() => { setNoting(false); setNote('') }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="record__save"
                onClick={() => onSetStatus(ITEM_STATUS.DONE, note)}
                disabled={busy || note.trim().length === 0}
              >
                {busy ? 'Saving' : 'Mark done'}
              </button>
            </div>
          </div>
        )}

        {confirmUndo && (
          <div className="item__noteform">
            <p className="item__note-warn">
              Reopening this clears what you wrote about doing it.
            </p>
            <div className="item__note-actions">
              <button
                type="button"
                className="record__ghost"
                onClick={() => setConfirmUndo(false)}
                disabled={busy}
              >
                Keep it done
              </button>
              <button
                type="button"
                className="record__danger"
                onClick={() => onSetStatus(ITEM_STATUS.OPEN, null)}
                disabled={busy}
              >
                {busy ? 'Reopening' : 'Reopen anyway'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* D32. Only a mentor or admin cancels. The RPC refuses cancelled, so a
          mentee cannot dismiss work by cancelling it instead of doing it. */}
      {canManage && !cancelled && !done && (
        <button
          type="button"
          className="item__cancel"
          onClick={onCancel}
          disabled={busy}
          aria-label="Cancel this item"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </li>
  )
}

function ItemForm({ mentor, mentee, onCancel, onSubmit }) {
  // Exactly two people. The insert policy rejects anyone else, so the picker
  // offers no way to get it wrong.
  const people = [mentee, mentor].filter(Boolean)

  const [form, setForm] = useState({
    body:       '',
    assignedTo: mentee?.id ?? mentor?.id ?? '',
    dueOn:      ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const ready = form.body.trim().length > 0 && form.assignedTo

  async function submit() {
    if (!ready) return
    setSaving(true)
    setErr('')
    try {
      await onSubmit(form)
    } catch (e) {
      setErr(friendlyItemError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="record__form">
      {err && <p className="record__error" role="alert">{err}</p>}

      <label className="record__field">
        <span className="record__label">What was agreed</span>
        <input
          type="text"
          className="record__input"
          value={form.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder="Read Proverbs 3 and note what stands out"
          autoFocus
        />
      </label>

      <div className="record__form-row">
        <label className="record__field">
          <span className="record__label">For</span>
          <select
            className="record__input"
            value={form.assignedTo}
            onChange={(e) => set({ assignedTo: e.target.value })}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </label>

        <label className="record__field">
          <span className="record__label">Due, optional</span>
          <input
            type="date"
            className="record__input"
            value={form.dueOn}
            onChange={(e) => set({ dueOn: e.target.value })}
          />
        </label>
      </div>

      <div className="record__form-actions">
        <button type="button" className="record__ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="record__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Adding' : 'Add item'}
        </button>
      </div>
    </div>
  )
}
