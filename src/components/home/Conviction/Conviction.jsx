import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import { Scripture } from '@/components/home/Scripture/Scripture'
import './Conviction.css'

export function Conviction() {
  return (
    <section className="conviction" id="conviction">
      <div className="conviction__inner">
        <RevealOnScroll>

          <p className="conviction__eyebrow">Our conviction</p>

          <h2 className="conviction__lead">
            Mentorship is not a transaction.
          </h2>

          <p className="conviction__body">
            It is the slow work of one life shaping another in the way of Christ.
            We were not made to walk alone, and we were not made to lead alone.
            The next generation of Christian leaders will be raised by mentors
            who have themselves been mentored.
          </p>

          <Scripture
            verse="As iron sharpens iron, so one person sharpens another."
            reference="Proverbs 27:17"
          />

          <div className="conviction__close">
            <span className="conviction__close-rule" aria-hidden="true" />
            <p className="conviction__close-line">
              This is the work we have been doing since 2020.
            </p>
          </div>

        </RevealOnScroll>
      </div>
    </section>
  )
}
