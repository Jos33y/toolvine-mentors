import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import {
  fetchPublicSchedule,
  nextBySlug,
  pastWorthShowing,
  programmeWhenParts,
  programmeDayOnly
} from '@/lib/programmes'
import './Programs.css'

/* ============ Data ============ */

const BADGES = ['Four programs', 'Monthly rhythm', 'Open to all', 'Free to join']

const PROGRAMS = [
  {
    mark: 'A',
    slug: 'family_meeting',
    title: 'Toolvine Family Meeting',
    body: 'Our monthly gathering. Guest speakers, mentoring interactions, discussions, prayer, and Q&A. Open to the whole community.',
    cadence: 'Monthly',
    audience: 'Community-wide'
  },
  {
    mark: 'B',
    slug: 'pray',
    title: 'Toolvine Pray',
    body: 'Our monthly prayer meeting, led by a team drawn from across the community.',
    cadence: 'Monthly',
    audience: 'Prayer team-led'
  },
  {
    mark: 'C',
    slug: 'pillars',
    title: 'Toolvine Pillars Meeting',
    body: "Every team leader brings the month's updates from their unit. This is how the initiative stays connected to itself.",
    cadence: 'Monthly',
    audience: 'Team leaders'
  },
  {
    mark: 'D',
    slug: 'equip',
    title: 'Toolvine Equip',
    body: 'Training for mentors and mentees, present and incoming. Where the work of mentoring gets sharpened.',
    cadence: 'Ongoing',
    audience: 'Mentors and mentees'
  }
]

const CADENCE = [
  {
    marker: 'Month 1',
    title: 'Settling',
    body: 'The first three meetings. Knowing each other, naming what brought you here, setting a rhythm you can both keep.'
  },
  {
    marker: 'Month 2',
    title: 'Working',
    body: 'The pattern is set. Conversations get specific. Notes after every meeting. Action items you both commit to.'
  },
  {
    marker: 'Month 3',
    title: 'Reflecting',
    body: 'A pause to look back. What shifted. What is still hard. What the next season of this pairing will hold.'
  }
]

const MENTEE_COMMITMENTS = [
  { icon: 'user', text: 'Show up prepared to every session.' },
  { icon: 'calendar', text: 'Meet at least once a month. Bi-weekly is the norm.' },
  { icon: 'bookOpen', text: 'Be honest about where you actually are.' },
  { icon: 'check', text: 'Carry your action items forward between meetings.' }
]

const MENTOR_COMMITMENTS = [
  { icon: 'users', text: 'Lead the conversation. The mentee comes to listen as much as to speak.' },
  { icon: 'edit', text: 'Write notes after every session. The record matters.' },
  { icon: 'bookOpen', text: 'Pray for the person you mentor by name.' },
  { icon: 'pairings', text: 'Hold the action items honestly, week by week.' },
  { icon: 'info', text: 'Refer up when the conversation is beyond mentoring.' }
]

/* ============ Date plate ============ */

// The visual stack is hidden from assistive tech and the whole sentence is
// exposed once instead. "SUN 20 SEPTEMBER" read out is worse than "Sunday 20
// September, 7:00 PM WAT", and reading both is worst of all.
function WhenPlate({ row, slug }) {
  const parts = programmeWhenParts(row)

  if (!parts) {
    return (
      <p className="prog__when prog__when--none">
        {slug === 'equip' ? 'Announced when scheduled' : 'Date to be confirmed'}
      </p>
    )
  }

  return (
    <p className="prog__when">
      <span className="prog__sr">Next: {parts.full}</span>
      <span className="prog__when-stack" aria-hidden="true">
        <span className="prog__when-dow">{parts.weekday}</span>
        <span className="prog__when-day">{parts.day}</span>
        <span className="prog__when-month">{parts.month}</span>
        <span className="prog__when-rule" />
        <span className="prog__when-time">{parts.time} {parts.zone}</span>
      </span>
    </p>
  )
}

/* ============ Component ============ */

export function Programs() {
  const [rows, setRows] = useState([])
  const [fetchError, setFetchError] = useState(null)

  // A visitor still gets no spinner and no error banner: the dates are an
  // addition to a page that reads completely without them. What changed is
  // that the failure is no longer thrown away. Swallowing it meant a broken
  // fetch and an empty result looked identical, which cost a debugging round
  // trip that the console would have answered in ten seconds.
  useEffect(() => {
    let cancelled = false
    fetchPublicSchedule()
      .then((data) => {
        if (cancelled) return
        setRows(data)
        setFetchError(null)
        if (import.meta.env.DEV) {
          console.info(`[programmes] ${data.length} occurrences loaded`)
        }
      })
      .catch((e) => {
        if (cancelled) return
        setRows([])
        setFetchError(e)
        console.error('[programmes] schedule fetch failed:', e?.message || e, e)
      })
    return () => { cancelled = true }
  }, [])

  const next = nextBySlug(rows)
  const past = pastWorthShowing(rows)

  return (
    <div className="prog">
      <div className="prog__atmosphere" aria-hidden="true" />

      {/* ============ Hero ============ */}
      <header className="prog__hero">
        <div className="prog__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>
        <p className="prog__eyebrow">PROGRAMS</p>
        <h1 className="prog__title">
          The <em className="prog__title-italic">programs</em> we run.
        </h1>
        <p className="prog__subtitle">
          Every month, our community meets. Four programs shape how we gather, pray, train, and stay connected.
        </p>
        <div className="prog__badges">
          {BADGES.map((b) => <span key={b} className="prog__badge">{b}</span>)}
        </div>
        <Link to="/auth/sign-up" className="prog__hero-cta">
          Get started <span aria-hidden="true">&rarr;</span>
        </Link>
      </header>

      {/* ============ Programs: dossier rows on atmospheric dark teal ============ */}
      <section className="prog__programs" aria-label="The four programs">
        <div className="prog__programs-glow" aria-hidden="true" />
        <div className="prog__programs-grid" aria-hidden="true" />
        <div className="prog__programs-grain" aria-hidden="true" />

        <div className="prog__programs-inner">
          <div className="prog__programs-header">
            <p className="prog__programs-eyebrow">THE PROGRAMS</p>
            <h2 className="prog__programs-title">The rhythm we keep.</h2>
            <p className="prog__programs-lead">
              Some are open to all, others gather specific teams. Together they carry the month's rhythm.
            </p>
          </div>

          <div className="prog__program-list">
            {PROGRAMS.map((p, i) => (
              <RevealOnScroll key={p.mark} delay={i * 60} threshold={0.12}>
                <article className="prog__program">
                  <div className="prog__program-mark-wrap" aria-hidden="true">
                    <span className="prog__program-mark">{p.mark}</span>
                  </div>

                  <div className="prog__program-body">
                    <h3 className="prog__program-name">{p.title}</h3>
                    <p className="prog__program-desc">{p.body}</p>
                    <p className="prog__program-detail">
                      <span>{p.cadence}</span>
                      <span className="prog__program-detail-sep" aria-hidden="true">·</span>
                      <span>{p.audience}</span>
                    </p>

                  </div>

                  {/* Q28. The next one only. The serif letter anchors the row
                      on the left; this is what answers it on the right. */}
                  <WhenPlate row={next.get(p.slug)} slug={p.slug} />
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {import.meta.env.DEV && fetchError && (
        <p className="prog__devnote" role="status">
          Dates did not load: {fetchError.message || String(fetchError)}
        </p>
      )}

      {/* ============ Past gatherings ============ */}
      {/* Hides itself entirely when there is nothing to show. The migration
          never backfills, so this is empty until a month has actually passed,
          and an empty section on a live page is worse than no section. Same
          principle as the verse card dropping itself once it goes stale. */}
      {past.length > 0 && (
        <section className="prog__past" aria-label="Past gatherings">
          <div className="prog__past-inner">
            <div className="prog__past-header">
              <p className="prog__past-eyebrow">WHAT HAPPENED</p>
              <h2 className="prog__past-title">Recent gatherings.</h2>
              <p className="prog__past-lede">
                The months behind us, and what was said in them.
              </p>
            </div>

            <ol className="prog__past-list">
              {past.map((o, i) => (
                <RevealOnScroll key={o.occurrence_id} delay={i * 60} threshold={0.15}>
                  <li className={'prog__past-row' + (o.is_skipped ? ' prog__past-row--skipped' : '')}>
                    <p className="prog__past-date">{programmeDayOnly(o)}</p>
                    <div className="prog__past-content">
                      <h3 className="prog__past-row-title">{o.title}</h3>
                      {o.is_skipped ? (
                        <p className="prog__past-note">{o.skip_note}</p>
                      ) : (
                        <p className="prog__past-body">{o.recap || o.description}</p>
                      )}
                    </div>
                  </li>
                </RevealOnScroll>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ============ Cadence: what 12 weeks looks like ============ */}
      <section className="prog__cadence" aria-label="The cadence of a pairing">
        <div className="prog__cadence-inner">
          <div className="prog__cadence-header">
            <p className="prog__cadence-eyebrow">THE CADENCE</p>
            <h2 className="prog__cadence-title">
              Twelve weeks. <em>Three movements.</em>
            </h2>
            <p className="prog__cadence-lede">
              The first quarter of a pairing has a shape. After that, the pattern carries you.
            </p>
          </div>

          <ol className="prog__cadence-list">
            {CADENCE.map((c, i) => (
              <RevealOnScroll key={c.marker} delay={i * 80} threshold={0.2}>
                <li className="prog__cadence-row">
                  <div className="prog__cadence-marker">
                    <span className="prog__cadence-tick" aria-hidden="true" />
                    <span className="prog__cadence-month">{c.marker}</span>
                  </div>
                  <div className="prog__cadence-content">
                    <h3 className="prog__cadence-row-title">{c.title}</h3>
                    <p className="prog__cadence-row-body">{c.body}</p>
                  </div>
                </li>
              </RevealOnScroll>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ Commitments: asymmetric two-column ============ */}
      <section className="prog__commit" aria-label="What both sides commit to">
        <div className="prog__commit-inner">
          <div className="prog__commit-header">
            <p className="prog__commit-eyebrow">THE PAIRING</p>
            <h2 className="prog__commit-title">Two sides of one promise.</h2>
          </div>

          <div className="prog__commit-grid">
            <RevealOnScroll threshold={0.15}>
              <div className="prog__commit-col prog__commit-col--mentee">
                <p className="prog__commit-label">If you are a mentee</p>
                <h3 className="prog__commit-col-title">You bring presence.</h3>
                <ul className="prog__commit-list">
                  {MENTEE_COMMITMENTS.map((c) => (
                    <li key={c.text} className="prog__commit-item">
                      <span className="prog__commit-icon">
                        <Icon name={c.icon} size={18} />
                      </span>
                      <span className="prog__commit-text">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>

            <div className="prog__commit-divider" aria-hidden="true" />

            <RevealOnScroll threshold={0.15} delay={120}>
              <div className="prog__commit-col prog__commit-col--mentor">
                <p className="prog__commit-label">If you are a mentor</p>
                <h3 className="prog__commit-col-title">You hold the record.</h3>
                <ul className="prog__commit-list">
                  {MENTOR_COMMITMENTS.map((c) => (
                    <li key={c.text} className="prog__commit-item">
                      <span className="prog__commit-icon">
                        <Icon name={c.icon} size={18} />
                      </span>
                      <span className="prog__commit-text">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ============ Dark CTA ============ */}
      <section className="prog__cta">
        <div className="prog__cta-grain" aria-hidden="true" />
        <div className="prog__cta-inner">
          <p className="prog__cta-asterism" aria-hidden="true">&#8258;</p>
          <h2 className="prog__cta-title"><em>Start a pairing.</em></h2>
          <p className="prog__cta-body">Create your account. Our team will pair you within two weeks.</p>
          <Link to="/auth/sign-up" className="prog__cta-button">Get started &rarr;</Link>
        </div>
      </section>
    </div>
  )
}
