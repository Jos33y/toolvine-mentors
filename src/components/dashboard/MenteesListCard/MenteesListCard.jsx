import { labelFor, daysAgoLabel } from '@/lib/mentorStatus'
import { pairedSinceLabel } from '@/lib/format'
import './menteesListCard.css'

const DISPLAY_CAP = 6
const FOCUS_INLINE_CAP = 2

// Triage view. Who am I mentoring, what are they working on, where does each
// relationship stand. Status pill answers "who needs my attention this week."
// No "Active" badge on every row, no fabricated category subtitles, no
// pastel-icon containers per status. Brand-coherent throughout.
export function MenteesListCard({ mentees = [], loading }) {
  if (loading) {
    return (
      <article className="mentees-card mentees-card--loading">
        <Header />
        <div className="mentees-card__skeleton" aria-hidden="true" />
      </article>
    )
  }

  if (mentees.length === 0) {
    return (
      <article className="mentees-card mentees-card--empty">
        <Header />
        <p className="mentees-card__copy">
          An admin will pair you with mentees soon. You will receive an email when that happens. Until then, this is the quiet before the work.
        </p>
      </article>
    )
  }

  const shown    = mentees.slice(0, DISPLAY_CAP)
  const overflow = Math.max(0, mentees.length - DISPLAY_CAP)

  return (
    <article className="mentees-card">
      <Header count={mentees.length} />

      <ul className="mentees-card__list">
        {shown.map((m) => (
          <li key={m.id} className="mentees-card__item">
            <MenteeRow mentee={m} />
          </li>
        ))}
      </ul>

      {overflow > 0 && (
        <p className="mentees-card__overflow">+ {overflow} more</p>
      )}
    </article>
  )
}

function Header({ count }) {
  return (
    <header className="mentees-card__head">
      <p className="mentees-card__eyebrow">Mentees</p>
      <h2 className="mentees-card__title">
        Who you are mentoring{count ? <span className="mentees-card__count"> · {count}</span> : null}
      </h2>
    </header>
  )
}

function MenteeRow({ mentee }) {
  const name        = mentee.mentee?.full_name ?? 'Mentee'
  const photo       = mentee.mentee?.photo_url
  const focus       = mentee.focus ?? []
  const status      = mentee.status
  const lastMet     = mentee.lastMetAt
  const pairedSince = mentee.startedAt

  return (
    <div className="mentee-row">
      <Avatar name={name} photo={photo} />

      <div className="mentee-row__body">
        <div className="mentee-row__top">
          <h3 className="mentee-row__name">{name}</h3>
          <StatusPill status={status} />
        </div>
        <p className="mentee-row__meta">
          <FocusTags focus={focus} />
          <MetaSeparator hidden={focus.length === 0} />
          <span className="mentee-row__met">
            {lastMet
              ? `Last met ${daysAgoLabel(lastMet)}`
              : `Paired ${pairedSinceLabel(pairedSince) ?? 'recently'}`}
          </span>
        </p>
      </div>
    </div>
  )
}

function Avatar({ name, photo }) {
  if (photo) {
    return (
      <span className="mentee-row__avatar">
        <img src={photo} alt="" className="mentee-row__avatar-img" />
      </span>
    )
  }
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span className="mentee-row__avatar mentee-row__avatar--initials" aria-hidden="true">
      {initials || '·'}
    </span>
  )
}

function FocusTags({ focus }) {
  if (!focus || focus.length === 0) return null
  const shown    = focus.slice(0, FOCUS_INLINE_CAP)
  const overflow = focus.length - shown.length
  const labels   = shown.map((f) => f.label).join(', ')
  return (
    <span className="mentee-row__focus">
      {labels}
      {overflow > 0 && <span className="mentee-row__focus-more"> +{overflow}</span>}
    </span>
  )
}

function MetaSeparator({ hidden }) {
  if (hidden) return null
  return <span className="mentee-row__sep" aria-hidden="true">·</span>
}

function StatusPill({ status }) {
  if (!status) return null
  return (
    <span className={`status-pill status-pill--${status}`}>
      {labelFor(status)}
    </span>
  )
}
