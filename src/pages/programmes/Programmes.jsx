import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  fetchMemberSchedule,
  programmeWhen,
  programmeWhenParts,
  programmeDayOnly,
  upcoming,
  past
} from '@/lib/programmes'
import './programmes.css'

// The member view of the rhythm the community meets on. Working surface, so it
// takes the app canvas and the calm register: no hero, no scripture, no
// motion. The one thing anyone comes here for is where to be and how to join,
// so the joining link is the first control on the page.
//
// Reads the base tables rather than programme_schedule_public, because a
// signed-in member is exactly who the link is for.

export function Programmes() {
  const [data, setData]       = useState({ programmes: [], occurrences: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchMemberSchedule())
    } catch (e) {
      console.error('[programmes] member schedule failed:', e?.message || e, e)
      setError('We could not load the schedule. Reload the page, or try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const ahead  = useMemo(() => upcoming(data.occurrences), [data.occurrences])
  const behind = useMemo(() => past(data.occurrences),     [data.occurrences])
  const next   = ahead.find((o) => !o.is_skipped) ?? null
  const rest   = ahead.filter((o) => o.id !== next?.id)

  return (
    <section className="mprog">
      <header className="mprog__head">
        <h1 className="page-title">Programmes</h1>
        <p className="mprog__lede">
          When the community meets, and how to join. Times are West Africa time.
        </p>
      </header>

      {error && <p className="mprog__error" role="alert">{error}</p>}

      {loading ? (
        <p className="mprog__state">Loading the schedule</p>
      ) : ahead.length === 0 && behind.length === 0 ? (
        <p className="mprog__state">
          Nothing is on the calendar yet. When the next gathering is set it appears
          here, and you will get a notification a couple of days beforehand.
        </p>
      ) : (
        <>
          {next && <NextCard occurrence={next} />}

          {rest.length > 0 && (
            <section className="mprog__block" aria-label="Coming up">
              <h2 className="mprog__block-title">Coming up</h2>
              <ol className="mprog__list">
                {rest.map((o) => <UpcomingRow key={o.id} occurrence={o} />)}
              </ol>
            </section>
          )}

          {behind.length > 0 && (
            <section className="mprog__block" aria-label="Recent gatherings">
              <h2 className="mprog__block-title">Recently</h2>
              <ol className="mprog__list">
                {behind.slice(0, 8).map((o) => <PastRow key={o.id} occurrence={o} />)}
              </ol>
            </section>
          )}
        </>
      )}
    </section>
  )
}

/* ============ Next ============ */

// The one occurrence anyone is likely to act on gets the whole width and the
// link as a real button. Everything below it is a list.
function NextCard({ occurrence: o }) {
  const parts = programmeWhenParts(o)

  return (
    <article className="mprog__next">
      <div className="mprog__next-when" aria-hidden="true">
        <span className="mprog__next-dow">{parts?.weekday}</span>
        <span className="mprog__next-day">{parts?.day}</span>
        <span className="mprog__next-mon">{parts?.month}</span>
      </div>

      <div className="mprog__next-main">
        <p className="mprog__next-eyebrow">Next</p>
        <h2 className="mprog__next-title">{o.title || o.programme_name}</h2>
        <p className="mprog__next-time">{programmeWhen(o)}</p>

        {o.description && <p className="mprog__next-desc">{o.description}</p>}

        {o.place && (
          <p className="mprog__next-place">
            <Icon name="mapPin" size={13} strokeWidth={1.75} />
            <span>{o.place}</span>
          </p>
        )}
      </div>

      <div className="mprog__next-actions">
        {o.joinUrl ? (
          <a className="mprog__join" href={o.joinUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="externalLink" size={15} strokeWidth={1.75} />
            <span>Join</span>
          </a>
        ) : (
          /* Said plainly rather than shown as a dead button. Somebody has to
             add the link, and it is not the person reading this. */
          <p className="mprog__nolink">No joining link yet</p>
        )}
      </div>
    </article>
  )
}

/* ============ Rows ============ */

function UpcomingRow({ occurrence: o }) {
  const parts = programmeWhenParts(o)

  return (
    <li className={'mprog__row' + (o.is_skipped ? ' mprog__row--off' : '')}>
      <div className="mprog__when" aria-hidden="true">
        <span className="mprog__day">{parts?.day}</span>
        <span className="mprog__mon">{parts?.month?.slice(0, 3)}</span>
      </div>

      <div className="mprog__main">
        <p className="mprog__title">
          <span>{o.title || o.programme_name}</span>
          {o.is_skipped && <span className="mprog__pill">Not this month</span>}
        </p>
        <p className="mprog__meta">
          <span>{parts?.weekday && titleCase(parts.weekday)}</span>
          <span className="mprog__dot" aria-hidden="true">·</span>
          <span>{parts?.time} {parts?.zone}</span>
        </p>
        {o.is_skipped && o.skip_note && <p className="mprog__note">{o.skip_note}</p>}
      </div>

      {!o.is_skipped && o.joinUrl && (
        <a className="mprog__link" href={o.joinUrl} target="_blank" rel="noopener noreferrer">
          Join
        </a>
      )}
    </li>
  )
}

function PastRow({ occurrence: o }) {
  return (
    <li className="mprog__row mprog__row--past">
      <div className="mprog__when" aria-hidden="true">
        <span className="mprog__day">{programmeDayOnly(o).split(' ')[0]}</span>
        <span className="mprog__mon">{programmeDayOnly(o).split(' ')[1]?.slice(0, 3).toUpperCase()}</span>
      </div>

      <div className="mprog__main">
        <p className="mprog__title">
          <span>{o.title || o.programme_name}</span>
          {o.is_skipped && <span className="mprog__pill">Did not run</span>}
        </p>
        {o.is_skipped
          ? <p className="mprog__note">{o.skip_note}</p>
          : <p className="mprog__recap">{o.recap || o.description}</p>}
      </div>
    </li>
  )
}

function titleCase(s) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}
