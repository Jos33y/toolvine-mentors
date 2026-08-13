import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import { fetchNote, saveNote, friendlyNoteError } from '@/lib/meetingNotes'
import {
  fetchActionItemsForMeeting,
  createActionItem,
  updateActionItem,
  setActionItemStatus,
  cancelActionItem,
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

  async function onToggle(item) {
    setBusyId(item.id)
    setError('')
    try {
      const next = item.status === ITEM_STATUS.DONE ? ITEM_STATUS.OPEN : ITEM_STATUS.DONE
      await setActionItemStatus(item.id, next)
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
              ? 'What either of you agreed to do. Each person can mark their own done.'
              : 'What you agreed to do. Mark each one done as you finish it.'}
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
                busy={busyId === item.id}
                onToggle={() => onToggle(item)}
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
                  busy={busyId === item.id}
                  onToggle={() => onToggle(item)}
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

function ItemRow({ item, canManage, canToggle, busy, onToggle, onCancel }) {
  const done      = item.status === ITEM_STATUS.DONE
  const cancelled = item.status === ITEM_STATUS.CANCELLED
  const over      = !done && !cancelled && isOverdue(item.due_on)

  return (
    <li className={'item' + (done ? ' item--done' : '') + (cancelled ? ' item--cancelled' : '')}>
      <button
        type="button"
        className="item__check"
        onClick={onToggle}
        disabled={!canToggle || busy || cancelled}
        aria-pressed={done}
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
