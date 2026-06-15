import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import './HowItWorks.css'

/* ============ Data ============ */

const BADGES = ['Free to join', 'Faith-aware', 'Since 2020', '127 active pairs']

const PROPS = [
  {
    icon: 'pairings',
    title: 'Paired, not matched',
    body: 'Our team knows the community personally. They pair you with a mentor based on who you are, not what an algorithm guesses.'
  },
  {
    icon: 'calendar',
    title: 'Structured, not scattered',
    body: 'Regular meetings. Notes after every session. Action items you both commit to. Your mentoring relationship has a rhythm, not just good intentions.'
  },
  {
    icon: 'resources',
    title: 'Curated, not crowdsourced',
    body: 'A library of 115 resources built by mentors. Essays, book reviews, reflections, recorded talks. Read what the community reads.'
  }
]

const STEPS = [
  { num: '01', icon: 'user', title: 'Sign up', desc: 'Three minutes. Tell us about yourself, where you are in your journey, and what you are looking for in a mentor.' },
  { num: '02', icon: 'pairings', title: 'Get paired', desc: 'Our team reviews your profile and pairs you with a mentor who fits your path. Most pairings happen within two weeks.' },
  { num: '03', icon: 'meetings', title: 'Meet', desc: 'Schedule regular meetings with your mentor. Online, by phone, or in person. Your mentor leads; you show up prepared.' },
  { num: '04', icon: 'bookOpen', title: 'Grow', desc: 'Your mentor takes notes after every session. You access the resource library. The relationship deepens with every meeting.' }
]

const STATS = [
  { value: '127', label: 'Pairs walking together' },
  { value: '1,840', label: 'Meetings logged' },
  { value: '6', label: 'Years running' }
]

const FAQS = [
  { q: 'Is ToolVine free?', a: 'Yes. ToolVine is free for both mentors and mentees. The platform is funded by the initiative, not by user fees.' },
  { q: 'How long until I get paired?', a: 'Our team reviews new accounts regularly. Most mentees are paired with a mentor within two weeks of signing up.' },
  { q: 'Do I have to be a Christian?', a: 'ToolVine is a Christian mentoring initiative. The community is faith-aware and welcoming. You do not need to be at any particular stage in your faith to join, but the resources and conversations are rooted in a Christian worldview.' },
  { q: 'How much time does mentoring take?', a: 'One meeting per month is the minimum. Most pairs meet every two weeks. Each session runs 30 to 60 minutes, plus a few minutes for your mentor to write notes.' },
  { q: 'Can I choose my own mentor?', a: 'Pairing is done by our team, not by algorithm and not by the user. This is intentional. The team knows the community personally and makes better matches than self-selection would.' },
  { q: 'What if my pairing is not working?', a: 'Start by talking to your mentor or mentee directly. If that does not resolve it, contact the admin team. Pairings can be changed, and past pairings remain on record for continuity.' }
]

/* ============ Component ============ */

export function HowItWorks() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="hiw">
      <div className="hiw__atmosphere" aria-hidden="true" />

      {/* ============ Hero ============ */}
      <header className="hiw__hero">
        <div className="hiw__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>
        <p className="hiw__eyebrow">HOW IT WORKS</p>
        <h1 className="hiw__title">
          You were not meant to walk{' '}
          <em className="hiw__title-italic">alone.</em>
        </h1>
        <p className="hiw__subtitle">
          ToolVine pairs you with a Christian mentor who has walked your path.
          In faith, in career, in life. Here is how.
        </p>
        <div className="hiw__badges">
          {BADGES.map((b) => <span key={b} className="hiw__badge">{b}</span>)}
        </div>
        <Link to="/auth/sign-up" className="hiw__hero-cta">
          Get started <span aria-hidden="true">&rarr;</span>
        </Link>
      </header>

      {/* ============ Value props ============ */}
      <section className="hiw__props-section" aria-label="Why ToolVine">
        <div className="hiw__props-inner">
          <RevealOnScroll threshold={0.15}>
            <div className="hiw__props">
              {PROPS.map((p) => (
                <div key={p.title} className="hiw__prop">
                  <div className="hiw__prop-icon">
                    <Icon name={p.icon} size={22} />
                  </div>
                  <h2 className="hiw__prop-title">{p.title}</h2>
                  <p className="hiw__prop-body">{p.body}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============ Process: numbered rows on dark atmospheric canvas ============ */}
      <section className="hiw__process" aria-label="The four steps">
        <div className="hiw__process-glow" aria-hidden="true" />
        <div className="hiw__process-grid" aria-hidden="true" />
        <div className="hiw__process-grain" aria-hidden="true" />
        <div className="hiw__process-inner">
          <div className="hiw__process-header">
            <p className="hiw__process-eyebrow">THE PROCESS</p>
            <h2 className="hiw__process-title">Four steps. No red tape.</h2>
          </div>
          <div className="hiw__steps">
            {STEPS.map((s, i) => (
              <RevealOnScroll key={s.num} delay={i * 80} threshold={0.15}>
                <div className="hiw__step">
                  <div className="hiw__step-marker">
                    <span className="hiw__step-num">{s.num}</span>
                    <Icon name={s.icon} size={18} className="hiw__step-icon" />
                  </div>
                  <div className="hiw__step-content">
                    <h3 className="hiw__step-title">{s.title}</h3>
                    <p className="hiw__step-desc">{s.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Social proof ============ */}
      <section className="hiw__proof" aria-label="Community numbers">
        <RevealOnScroll threshold={0.3}>
          <div className="hiw__proof-inner">
            {STATS.map((s) => (
              <div key={s.label} className="hiw__stat">
                <span className="hiw__stat-number">{s.value}</span>
                <span className="hiw__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* ============ FAQ ============ */}
      <section className="hiw__faq" aria-label="Frequently asked questions">
        <div className="hiw__faq-inner">
          <div className="hiw__faq-header">
            <p className="hiw__faq-eyebrow">QUESTIONS</p>
            <h2 className="hiw__faq-title">Before you sign up</h2>
          </div>

          <div className="hiw__faq-layout">
            <div className="hiw__faq-questions" role="tablist" aria-label="FAQ questions">
              {FAQS.map((f, i) => (
                <div key={i} className={`hiw__faq-item${openFaq === i ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="hiw__faq-q"
                    onClick={() => setOpenFaq(i)}
                    role="tab"
                    aria-selected={openFaq === i}
                    aria-controls={`faq-panel-${i}`}
                  >
                    <span className="hiw__faq-q-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="hiw__faq-q-text">{f.q}</span>
                    <span className="hiw__faq-q-chevron" aria-hidden="true">
                      <Icon name="chevronRight" size={16} />
                    </span>
                  </button>
                  <div className="hiw__faq-inline" id={`faq-panel-${i}`} role="tabpanel">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hiw__faq-panel" role="tabpanel" aria-live="polite">
              <div className="hiw__faq-panel-card">
                <p className="hiw__faq-panel-q">{FAQS[openFaq]?.q}</p>
                <p className="hiw__faq-panel-a">{FAQS[openFaq]?.a}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Dark CTA ============ */}
      <section className="hiw__cta">
        <div className="hiw__cta-grain" aria-hidden="true" />
        <div className="hiw__cta-inner">
          <p className="hiw__cta-asterism" aria-hidden="true">⁂</p>
          <h2 className="hiw__cta-title"><em>Find your mentor.</em></h2>
          <p className="hiw__cta-body">Create your account. We will find your mentor.</p>
          <Link to="/auth/sign-up" className="hiw__cta-button">Get started &rarr;</Link>
        </div>
      </section>
    </div>
  )
}
