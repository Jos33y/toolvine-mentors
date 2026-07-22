import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import './SupportBand.css'

// Quiet band between WallOfWitness and CinematicClose. Names the four
// supporter paths (Volunteer, Sponsor, Invest, Partner) so visitors who
// are not signing up as mentors or mentees still see a way in. Reads as
// an aside, not a pitch. Single CTA to /get-involved.

const CHIPS = [
  { icon: 'hand',       label: 'Volunteer' },
  { icon: 'heart',      label: 'Sponsor' },
  { icon: 'trendingUp', label: 'Invest' },
  { icon: 'handshake',  label: 'Partner' }
]

export function SupportBand() {
  return (
    <section className="support-band" aria-label="Other ways to support">
      <div className="support-band__inner">
        <RevealOnScroll threshold={0.2}>
          <p className="support-band__eyebrow">OTHER WAYS TO SUPPORT</p>
          <h2 className="support-band__title">
            You do not have to be a mentor to{' '}
            <em className="support-band__title-italic">build with us.</em>
          </h2>
          <p className="support-band__body">
            Volunteer time, sponsor a program, invest in the work, or partner with your organization.
          </p>

          <ul className="support-band__chips" role="list">
            {CHIPS.map((c) => (
              <li className="support-band__chip" key={c.label}>
                <span className="support-band__chip-icon" aria-hidden="true">
                  <Icon name={c.icon} size={18} strokeWidth={1.5} />
                </span>
                <span className="support-band__chip-label">{c.label}</span>
              </li>
            ))}
          </ul>

          <Link to="/get-involved" className="support-band__cta">
            Get involved <span aria-hidden="true">&rarr;</span>
          </Link>
        </RevealOnScroll>
      </div>
    </section>
  )
}
