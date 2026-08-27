import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroStack } from '@/components/home/HeroStack/HeroStack'
import { fetchPublicSchedule, programmeWhenParts } from '@/lib/programmes'
import { fetchPublicVerses, isVerseStale } from '@/lib/verseOfTheWeek'
import './HeroRotator.css'

// The hero media slot, given faces. Decision 35: the marketing hero rotates
// and visuals carry the weight there. Decision 36: manual controls, no
// auto-advance, which is what keeps this off the carousel ban in
// toolvine-ux-principles.md rather than arguing about the definition.
//
// Order is decision 34's reasoning: the items run on different clocks, so the
// nearest in time leads. A quarterly publication must not get the same billing
// as a gathering happening on Saturday.
//
// HeroStack is one of the faces, unchanged. Its tilt, its fan-open hover and
// its three volumes are all intact: faces move on opacity alone, never on
// transform, so nothing here competes with the transform it sets on itself.

const VINETHOUGHTS = { key: 'vinethoughts', label: 'Vinethoughts' }

export function HeroRotator() {
  const [programmes, setProgrammes] = useState([])
  const [verses, setVerses] = useState([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    // Independent, because either can fail without costing the other. The hero
    // always has Vinethoughts to fall back on, so a failure here loses a face
    // rather than the slot.
    fetchPublicSchedule()
      .then((rows) => {
        if (cancelled) return
        const today = new Date().toISOString().slice(0, 10)
        // Every programme in date order, not one per programme. The card leads
        // with the nearest and lists the two behind it, which is what makes it
        // a schedule rather than a single fact.
        setProgrammes(
          rows
            .filter((r) => !r.is_skipped && r.occurs_on >= today)
            .sort((a, b) => (a.occurs_on < b.occurs_on ? -1 : 1))
            .slice(0, 3)
        )
      })
      .catch((e) => console.warn('[hero] programme face unavailable:', e?.message || e))

    fetchPublicVerses(3)
      .then((rows) => {
        if (cancelled) return
        // The same fourteen-day rule the dashboard card uses, applied to the
        // newest. A hero cannot show a verse somebody forgot to change a month
        // ago, and if the newest is stale the older ones are worse.
        setVerses(rows.length && !isVerseStale(rows[0]) ? rows : [])
      })
      .catch((e) => console.warn('[hero] verse face unavailable:', e?.message || e))

    return () => { cancelled = true }
  }, [])

  const faces = useMemo(() => {
    const out = []
    if (programmes.length) out.push({ key: 'programme', label: 'Next gathering' })
    if (verses.length)     out.push({ key: 'verse',     label: 'This week' })
    out.push(VINETHOUGHTS)
    return out
  }, [programmes, verses])

  // Faces arrive asynchronously, so an index pointing past the end is a real
  // state rather than a hypothetical one.
  const active = Math.min(index, faces.length - 1)

  return (
    <div className="hrot">
      <div className="hrot__stage">
        {programmes.length > 0 && (
          <Face on={faces[active]?.key === 'programme'} label="Next gathering">
            <ProgrammeFace occurrences={programmes} />
          </Face>
        )}

        {verses.length > 0 && (
          <Face on={faces[active]?.key === 'verse'} label="Verse for this week">
            <VerseFace verses={verses} />
          </Face>
        )}

        <Face on={faces[active]?.key === 'vinethoughts'} label="Vinethoughts">
          <HeroStack />
        </Face>
      </div>

      {/* One face means nothing to switch between, so the control is absent
          rather than present and inert. */}
      {faces.length > 1 && (
        <div className="hrot__controls">
          <div className="hrot__dots" role="tablist" aria-label="Hero panels">
            {faces.map((f, i) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                className={'hrot__dot' + (i === active ? ' hrot__dot--on' : '')}
                aria-selected={i === active}
                aria-label={f.label}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <span className="hrot__label" aria-hidden="true">{faces[active]?.label}</span>
        </div>
      )}
    </div>
  )
}

// Inert faces are hidden from assistive tech and from the tab order, so the
// keyboard does not walk into a panel nobody can see.
function Face({ on, label, children }) {
  return (
    <div
      className={'hrot__face' + (on ? ' hrot__face--on' : '')}
      aria-label={label}
      aria-hidden={on ? undefined : true}
      inert={on ? undefined : ''}
    >
      {children}
    </div>
  )
}

/* ============ Stack ============ */

// The device the volumes already use, given to the other two faces. Depth here
// means the same thing it means there: this is one of a series, and the slivers
// at the corner are real entries rather than drawn shadows.
//
// Only the front card carries content. The two behind show a corner, so they
// render as tone alone. Inventing text nobody can read to fill them would be
// decoration pretending to be information.
function Stack({ tone, count, children }) {
  const behind = Math.max(0, Math.min(count, 3) - 1)

  return (
    <div className={`hrot__stack hrot__stack--${tone}`}>
      {behind > 1 && <span className="hrot__layer hrot__layer--back" aria-hidden="true" />}
      {behind > 0 && <span className="hrot__layer hrot__layer--mid" aria-hidden="true" />}
      {children}
    </div>
  )
}

/* ============ Programme ============ */

// Built in the volume's grammar rather than as a different kind of card:
// masthead, rule, the thing itself, rule, foot. Three faces, one object.
function ProgrammeFace({ occurrences }) {
  const [lead, ...rest] = occurrences
  const parts = programmeWhenParts(lead)

  return (
    <Stack tone="programme" count={occurrences.length}>
    <Link to="/programs" className="hrot__card hrot__card--programme">
      <span className="hrot__art" aria-hidden="true">{parts.day}</span>

      <header className="hrot__masthead">
        <span className="hrot__mark" aria-hidden="true">
          <svg viewBox="0 0 24 14" width="20" height="12">
            <path d="M 12 1 Q 3 7, 12 13" fill="currentColor" opacity="0.95" />
            <path d="M 12 1 Q 21 7, 12 13" fill="currentColor" opacity="0.55" />
          </svg>
        </span>
        <span className="hrot__pub">Programmes</span>
        <span className="hrot__meta">
          {parts.weekdayLong.slice(0, 3)} {parts.day} {parts.month.slice(0, 3)}
        </span>
      </header>

      <span className="hrot__rule" aria-hidden="true" />

      {/* The coverline slot on the volume beside it. The name of the thing,
          set the same way that issue's line is set. */}
      <div className="hrot__lead-block">
        <p className="hrot__lead">{lead.title || lead.programme_name}</p>
        <p className="hrot__lead-when">{parts.weekdayLong} {parts.day} {parts.month}, {parts.time} {parts.zone}</p>
      </div>

      <span className="hrot__rule" aria-hidden="true" />

      {/* The two-card footer the featured volume uses for its interview and
          essay, carrying the next two gatherings instead. */}
      {rest.length > 0 ? (
        <footer className="hrot__grid">
          {rest.map((o) => {
            const p = programmeWhenParts(o)
            return (
              <div key={o.occurrence_id} className="hrot__grid-card">
                <p className="hrot__grid-label">{p.weekdayLong.slice(0, 3)} {p.day} {p.month.slice(0, 3)}</p>
                <p className="hrot__grid-title">{o.title || o.programme_name}</p>
                <p className="hrot__grid-time">{p.time}</p>
              </div>
            )
          })}
        </footer>
      ) : (
        <footer className="hrot__foot">
          <span className="hrot__foot-weak">Every month, online</span>
        </footer>
      )}
    </Link>
    </Stack>
  )
}

/* ============ Verse ============ */

function VerseFace({ verses }) {
  const [verse] = verses

  return (
    <Stack tone="verse" count={verses.length}>
      <div className="hrot__card hrot__card--verse">
        <span className="hrot__art hrot__art--quote" aria-hidden="true">&ldquo;</span>

        <header className="hrot__masthead">
          <span className="hrot__pub">Verse</span>
          <span className="hrot__meta">This week</span>
        </header>

        <span className="hrot__rule" aria-hidden="true" />

        {/* EB Garamond italic, the third family, reserved for scripture. */}
        <blockquote className="hrot__scripture">{verse.body}</blockquote>

        <span className="hrot__rule" aria-hidden="true" />

        <footer className="hrot__foot">
          <span className="hrot__foot-strong">{verse.reference}</span>
          {verse.source && <span className="hrot__foot-weak">{verse.source}</span>}
        </footer>
      </div>
    </Stack>
  )
}
