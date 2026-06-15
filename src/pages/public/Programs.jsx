import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import './Programs.css'

/* ============ Data ============ */

const BADGES = ['Six streams', 'One mentor at a time', '12-week rhythm', 'Free to join']

const STREAMS = [
  {
    mark: 'A',
    title: 'Spiritual & Ministry',
    body: 'Following Jesus in daily practice, scripture, prayer, and the work of the local church.',
    focus: ['Prayer', 'Scripture', 'Calling', 'Ministry'],
    scope: '34 pairs'
  },
  {
    mark: 'B',
    title: 'Career & Professional',
    body: 'Work that fits the person God has shaped, from early career to the harder transitions.',
    focus: ['Discernment', 'Transitions', 'Workplace', 'Integrity'],
    scope: '41 pairs'
  },
  {
    mark: 'C',
    title: 'Relationship & Marriage',
    body: 'Friendship, courtship, marriage, family. The long obedience of loving the people closest to us.',
    focus: ['Courtship', 'Marriage', 'Communication', 'Conflict'],
    scope: '22 pairs'
  },
  {
    mark: 'D',
    title: 'Leadership & Mentorship',
    body: 'Carrying weight on behalf of others. Leading teams, making decisions, growing into responsibility.',
    focus: ['Teams', 'Decisions', 'Influence', 'Succession'],
    scope: '19 pairs'
  },
  {
    mark: 'E',
    title: 'Health & Fitness',
    body: 'A body cared for and a mind looked after. The everyday discipline of being well.',
    focus: ['Physical', 'Mental', 'Habits', 'Rest'],
    scope: '7 pairs'
  },
  {
    mark: 'F',
    title: 'Finance & Stewardship',
    body: 'Money, time, and gifts. Stewardship without anxiety, generosity without performance.',
    focus: ['Budgeting', 'Giving', 'Saving', 'Generosity'],
    scope: '4 pairs'
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

/* ============ Component ============ */

export function Programs() {
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
          Six streams. One{' '}
          <em className="prog__title-italic">rhythm.</em>
        </h1>
        <p className="prog__subtitle">
          Toolvine pairings move through the streams of life where mentorship matters most.
          Faith, career, relationship, leadership, health, and the steady work of stewardship.
        </p>
        <div className="prog__badges">
          {BADGES.map((b) => <span key={b} className="prog__badge">{b}</span>)}
        </div>
        <Link to="/auth/sign-up" className="prog__hero-cta">
          Get started <span aria-hidden="true">&rarr;</span>
        </Link>
      </header>

      {/* ============ Streams: dossier rows on atmospheric dark teal ============ */}
      <section className="prog__streams" aria-label="The six streams">
        <div className="prog__streams-glow" aria-hidden="true" />
        <div className="prog__streams-grid" aria-hidden="true" />
        <div className="prog__streams-grain" aria-hidden="true" />

        <div className="prog__streams-inner">
          <div className="prog__streams-header">
            <p className="prog__streams-eyebrow">THE STREAMS</p>
            <h2 className="prog__streams-title">Where mentorship meets life.</h2>
          </div>

          <div className="prog__stream-list">
            {STREAMS.map((s, i) => (
              <RevealOnScroll key={s.mark} delay={i * 60} threshold={0.12}>
                <article className="prog__stream">
                  <div className="prog__stream-mark-wrap" aria-hidden="true">
                    <span className="prog__stream-mark">{s.mark}</span>
                  </div>

                  <div className="prog__stream-body">
                    <h3 className="prog__stream-name">{s.title}</h3>
                    <p className="prog__stream-desc">{s.body}</p>
                    <ul className="prog__stream-chips">
                      {s.focus.map((f) => (
                        <li key={f} className="prog__stream-chip">{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="prog__stream-scope" aria-label={`${s.scope} active in this stream`}>
                    <span className="prog__stream-scope-num">{s.scope.split(' ')[0]}</span>
                    <span className="prog__stream-scope-label">{s.scope.split(' ').slice(1).join(' ')}</span>
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>

          <p className="prog__streams-note">
            <span aria-hidden="true">⁂</span> Streams are not categories you pick. Your mentor walks with you across whichever streams the season holds.
          </p>
        </div>
      </section>

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
          <p className="prog__cta-asterism" aria-hidden="true">⁂</p>
          <h2 className="prog__cta-title"><em>Start a pairing.</em></h2>
          <p className="prog__cta-body">Create your account. Our team will pair you within two weeks.</p>
          <Link to="/auth/sign-up" className="prog__cta-button">Get started &rarr;</Link>
        </div>
      </section>
    </div>
  )
}
