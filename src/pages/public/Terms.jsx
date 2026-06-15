import { Link } from 'react-router-dom'
import { LegalLayout, LegalSection } from '@/components/shared/LegalLayout/LegalLayout'

export function Terms() {
  return (
    <LegalLayout
      eyebrow="Terms"
      title="Terms of Service"
      intro="Plain terms for a relationship-driven platform. Read once, refer when you need to."
      lastUpdated="7 June 2026"
    >
      <LegalSection id="agreement" title="Agreement">
        <p>
          These terms govern your use of toolvinementors.com and the ToolVine mentoring
          platform, operated by Toolvine Mentors and Leaders Initiative. By creating an
          account or using the service, you agree to be bound by them.
        </p>
        <p>
          Throughout these terms, "we" and "us" refer to Toolvine Mentors and Leaders
          Initiative.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="Who can use ToolVine">
        <p>
          You must be at least 18 years old to create an account. You must provide accurate
          information about yourself, keep it up to date, and not impersonate someone else.
        </p>
        <p>
          By signing up, you also agree to our{' '}
          <Link to="/community-guidelines">Community Guidelines</Link>, which set the
          expectations for how mentors and mentees interact on the platform.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <p>
          You are responsible for the security of your account, including your password and
          any device you remain signed in on. Tell us promptly if you suspect unauthorised
          access.
        </p>
        <p>
          We do not delete user accounts on request alone. If you no longer want to use
          ToolVine, request deactivation. Your history will be preserved in a read-only
          state for community continuity, unless you also request full deletion under our{' '}
          <Link to="/privacy">privacy policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="relationship" title="The mentoring relationship">
        <p>
          ToolVine provides the platform that supports your mentoring relationship. We are
          not a party to the relationship itself. The conversations, the counsel, and the
          decisions that happen between a mentor and a mentee are theirs, not ours.
        </p>
        <p>
          We do not endorse the personal opinions of any individual mentor on the platform.
          The relationship is built on the trust between two adults, not on an endorsement
          from us.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>
          You agree not to use ToolVine to:
        </p>
        <ul>
          <li>Harass, abuse, or harm another person, on or off the platform.</li>
          <li>Share content that is unlawful, defamatory, obscene, or that infringes someone else's rights.</li>
          <li>Misrepresent your identity, qualifications, or affiliations.</li>
          <li>Solicit money, business, or political activity outside of the mentoring purpose.</li>
          <li>Attempt to access another user's account, data, or private notes.</li>
          <li>Interfere with the operation of the platform, including by introducing malicious code or attempting to bypass security.</li>
          <li>Carry out any activity that is prohibited by the law that applies to you, or by the law of Nigeria.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="Content">
        <p>
          You own the content you create on ToolVine, including your profile, your messages,
          and the notes you write as a mentor. You grant us a limited licence to store,
          display, and back up that content for the purpose of operating the service.
        </p>
        <p>
          Mentor notes are private to the mentor and to platform administrators. They are
          part of the working record of the relationship, not a publication. Write them with
          the same care you would write a letter you may need to stand behind.
        </p>
      </LegalSection>

      <LegalSection id="resources" title="Resources library">
        <p>
          Resources in the library are curated by platform administrators. We choose them
          with care, but we do not warrant the accuracy, completeness, or current relevance
          of any individual resource. Linked content is the responsibility of its original
          publisher.
        </p>
        <p>
          You may use resources for your own learning. Do not republish or redistribute them
          without permission from the original publisher.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="Service availability">
        <p>
          We aim for the platform to be available 24 hours a day. We may take it offline for
          maintenance, and we will give notice where we reasonably can. We do not guarantee
          uninterrupted access.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Suspension and termination">
        <p>
          We may suspend or deactivate an account that violates these terms or the Community
          Guidelines, that creates a risk to other users, or that we are required to remove
          by law. Where possible, we will explain the reason and give the user a fair chance
          to respond.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Toolvine Mentors and Leaders Initiative
          and our service providers are not liable for indirect, incidental, or consequential
          losses arising from your use of the platform. Our total liability for any claim is
          limited to the fees you have paid us in the 12 months before the claim, which for
          most users is zero.
        </p>
        <p>
          We do not exclude any liability that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Governing law">
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. Disputes
          are subject to the exclusive jurisdiction of the courts of Lagos State, except
          where mandatory consumer protection law gives you the right to bring a claim where
          you live.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these terms as the platform evolves. We will post the updated version
          here and update the "Last updated" date. For material changes, we will notify you
          by email and give you a reasonable time to review before the change takes effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:hello@toolvinementors.com">hello@toolvinementors.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
