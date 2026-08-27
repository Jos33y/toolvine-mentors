import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { fetchMemberSchedule, upcoming, programmeWhenParts, daysUntil } from '@/lib/programmes'
import './nextProgramme.css'

// Sits directly under VerseOfWeek as the second half of the bridge band,
// above every role group. First the person, then the Word, then where we
// gather, then the work.
//
// Above the groups on purpose. Dashboard.jsx silos its cards by role, so a
// mentor who is also a mentee never sees the mentee branch. Where the
// community meets is not a role's business, and this is the only slot that
// reaches everybody once.
//
// This band and the ProgrammeBanner show the same occurrence when one is a day
// or two away, and that is not duplication. The band is the rhythm and is
// always there; the banner is the interruption and is almost never there. A
// banner that never goes away is chrome, and people learn to dismiss chrome
// without reading it, including on the day it matters.
export function NextProgramme() {
  const [occurrence, setOccurrence] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMemberSchedule()
      .then(({ occurrences }) => {
        if (cancelled) return
        setOccurrence(upcoming(occurrences).find((o) => !o.is_skipped) ?? null)
      })
      .catch((e) => {
        // Logged, never surfaced. A dashboard is not the place to explain a
        // failed lookup, and swallowing it silently is what cost a debugging
        // round trip on the public page.
        if (!cancelled) console.warn('[programmes] next gathering lookup failed:', e?.message || e)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  // Nothing renders until it is known, so the band does not appear and then
  // change height under the reader.
  if (loading) return null

  if (!occurrence) {
    return (
      <section className="nprog nprog--empty" aria-label="Next gathering">
        <div className="nprog__meta">
          <p className="nprog__eyebrow">Next gathering</p>
        </div>
        <div className="nprog__body">
          <p className="nprog__none">
            Nothing is on the calendar yet. When the next one is set it appears
            here, and you will hear about it a couple of days beforehand.
          </p>
        </div>
      </section>
    )
  }

  const parts = programmeWhenParts(occurrence)
  const away  = daysUntil(occurrence.occurs_on)

  return (
    <section className="nprog" aria-label="Next gathering">
      <div className="nprog__meta">
        <p className="nprog__eyebrow">Next gathering</p>
        <p className="nprog__name">{occurrence.title || occurrence.programme_name}</p>
        {/* A date alone does not say whether to act now or forget it until
            next month. This is the part a reader actually wants. */}
        {away && <p className="nprog__away">{away}</p>}
      </div>

      <div className="nprog__body">
        {/* The band runs the full width, so the action sits at the far edge and
            the eye travels what, then when, then act. Everything crowded
            against the left was the whole problem with the first version. */}
        <div className="nprog__row">
          {/* The numeral is the visual, not an icon. It is already the
              language of the meetings rail and the public programmes page,
              and it carries information where a glyph per programme would
              carry none. */}
          <p className="nprog__when">
            <span className="nprog__day" aria-hidden="true">{parts.day}</span>
            <span className="nprog__stack" aria-hidden="true">
              <span className="nprog__dow">{parts.weekdayLong}</span>
              <span className="nprog__rest">
                {parts.month} <span className="nprog__sep">/</span> {parts.time} {parts.zone}
              </span>
            </span>
            <span className="nprog__sr">
              {titleCase(parts.weekdayLong)} {parts.day} {titleCase(parts.month)}, {parts.time} {parts.zone}
            </span>
          </p>

          <div className="nprog__actions">
          {/* The link is the only reason anyone reads this band on the night.
              Where there is none, say so rather than showing a dead control:
              the person who has to add it is not the person reading. */}
            {occurrence.joinUrl ? (
              <a
                className="nprog__join"
                href={occurrence.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="externalLink" size={14} strokeWidth={1.75} />
                <span>Join</span>
              </a>
            ) : (
              <span className="nprog__nolink">No joining link yet</span>
            )}
            <Link to="/programmes" className="nprog__all">All programmes</Link>
          </div>
        </div>

        {occurrence.description && (
          <p className="nprog__desc">{occurrence.description}</p>
        )}
      </div>
    </section>
  )
}

function titleCase(s) {
  if (!s) return ''
  return s.charAt(0) + s.slice(1).toLowerCase()
}
