import { LegalLayout, LegalSection } from '@/components/shared/LegalLayout/LegalLayout'

export function CommunityGuidelines() {
  return (
    <LegalLayout
      eyebrow="Community"
      title="Community Guidelines"
      intro="How we walk together. The expectations that make a mentoring relationship safe, honest, and useful."
      lastUpdated="7 June 2026"
    >
      <LegalSection id="why" title="Why these matter">
        <p>
          ToolVine exists to support mentoring relationships, and a mentoring relationship is
          only as good as the trust inside it. These guidelines set the expectations that
          make that trust possible. They apply to every mentor, every mentee, and every
          administrator on the platform.
        </p>
      </LegalSection>

      <LegalSection id="respect" title="Mutual respect">
        <p>
          Address each other by name. Listen before you respond. Disagree without
          diminishing. The fact that one person is mentoring another does not place either
          above the other in worth or dignity.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality" title="Confidentiality">
        <p>
          What is shared inside a pairing stays inside the pairing, unless one party gives
          the other permission to share, or unless someone is in danger.
        </p>
        <p>
          Mentors record notes after a meeting. Those notes are visible only to the mentor
          and to platform administrators, never to other mentors, other mentees, or the
          public. Mentees do not have access to those notes. A mentor writes them as their
          own working record, not as a report on the mentee.
        </p>
      </LegalSection>

      <LegalSection id="mentor-posture" title="The mentor's posture">
        <p>
          A mentor on ToolVine is a guide, not an authority. Offer counsel; do not impose it.
          Do not use the relationship to push specific views on a mentee's career, finances,
          choice of partner, or doctrine.
        </p>
        <p>
          Do not borrow from, lend to, or do business with someone you are actively mentoring
          on the platform. Money complicates the relationship.
        </p>
        <p>
          Romantic or sexual relationships between a mentor and a current mentee are not
          permitted under any circumstances. If feelings of that nature develop, the pairing
          must end first, with an administrator informed, and a clear separation observed
          before any other relationship is pursued.
        </p>
      </LegalSection>

      <LegalSection id="mentee-posture" title="The mentee's posture">
        <p>
          Show up to your scheduled meetings, or give your mentor reasonable notice when you
          cannot. Come prepared with what is on your mind. Be honest about what is working
          and what is not.
        </p>
        <p>
          A mentor's time is a gift. Treat it that way.
        </p>
      </LegalSection>

      <LegalSection id="not-allowed" title="What is not allowed">
        <p>
          Harassment, abuse, threats, or discrimination of any kind. Sharing another person's
          private information without their consent. Using the platform to recruit for
          unrelated business or political activity. Soliciting funds outside the platform's
          purpose. Any conduct that creates a safeguarding concern.
        </p>
      </LegalSection>

      <LegalSection id="help" title="When to ask for help">
        <p>
          If a pairing is not working, the first step is to talk to your counterpart. If
          that does not resolve it, talk to a platform administrator. We will help.
        </p>
        <p>
          If you become aware of a safeguarding concern, including any conduct that
          endangers a person on or off the platform, contact an administrator immediately at{' '}
          <a href="mailto:safeguarding@toolvinementors.com">safeguarding@toolvinementors.com</a>.
        </p>
      </LegalSection>

      <LegalSection id="consequences" title="What happens when guidelines are broken">
        <p>
          We investigate concerns in good faith. Depending on the nature of the conduct, we
          may issue a private warning, end a pairing, deactivate an account, or report the
          matter to the appropriate authority. We do not act on anonymous complaints alone,
          but we take every concern seriously, and we keep the person who raised it
          informed.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
