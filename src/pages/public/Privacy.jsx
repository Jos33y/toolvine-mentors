import { LegalLayout, LegalSection } from '@/components/shared/LegalLayout/LegalLayout'

export function Privacy() {
  return (
    <LegalLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="Your trust is the foundation of every pairing. Here is exactly what we hold, why we hold it, and what you can ask us to do with it."
      lastUpdated="7 June 2026"
    >
      <LegalSection id="overview" title="Overview">
        <p>
          This policy explains what personal information Toolvine Mentors and Leaders
          Initiative collects when you use toolvinementors.com, how we use it, and the
          choices you have about it.
        </p>
        <p>
          We aim to comply with the Nigeria Data Protection Act 2023 (NDPA) and, where it
          applies, the EU General Data Protection Regulation (GDPR).
        </p>
      </LegalSection>

      <LegalSection id="collect" title="Information we collect">
        <p>
          When you create an account, we collect your name, email address, and the role you
          sign up under, mentor or mentee.
        </p>
        <p>
          You can choose to add more to your profile: a photo, a phone number, a short
          biography, your location, and areas of interest. Sharing this is optional, and you
          can edit or remove it at any time.
        </p>
        <p>
          When you use the platform, we record the pairings you are part of, the meetings
          scheduled under those pairings, the notes a mentor writes about a meeting, and the
          resources you open.
        </p>
        <p>
          Standard technical information is captured automatically: IP address, browser type,
          device type, and pages visited. This is used to keep the service running and
          secure.
        </p>
      </LegalSection>

      <LegalSection id="use" title="How we use it">
        <p>
          We use your information to operate the platform, including showing you your
          pairings, scheduling and recording meetings, surfacing the right resources, and
          sending the small number of transactional emails described in our terms.
        </p>
        <p>
          We use aggregated, anonymous data to understand how the platform is being used and
          to improve it. We do not build advertising profiles. We do not sell your data.
        </p>
      </LegalSection>

      <LegalSection id="notes" title="Mentor notes">
        <p>
          Notes a mentor writes about a meeting are visible only to that mentor and to
          platform administrators. Mentees do not see their mentor's notes. This is enforced
          at the database level, not just in the interface.
        </p>
        <p>
          Mentors are expected to write notes that respect the dignity of the people they
          describe. Our terms and Community Guidelines set the standard for this.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and similar technologies">
        <p>
          We use a small number of cookies. A session cookie keeps you signed in. A
          preferences cookie remembers settings such as your timezone.
        </p>
        <p>
          We use Plausible Analytics, a privacy-respecting analytics tool that does not use
          cookies or collect personal data, to understand which pages are visited.
        </p>
        <p>
          We do not use third-party advertising trackers, and we do not allow third parties
          to set tracking cookies through our platform.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="How we share information">
        <p>
          We share information with the third-party services that help us run the platform:
        </p>
        <ul>
          <li><strong>Supabase</strong> for database, authentication, and storage.</li>
          <li><strong>Resend</strong> for transactional email delivery.</li>
          <li><strong>Cloudflare</strong> for DNS, content delivery, and, when the feature is active, video calls and recording storage.</li>
          <li><strong>Plausible</strong> for anonymous analytics.</li>
        </ul>
        <p>
          Each of these is contractually required to handle your data securely and only on
          our instruction. We may share information when required by law, in response to a
          valid legal process, or to protect the safety of our users.
        </p>
      </LegalSection>

      <LegalSection id="storage" title="Where your data is stored">
        <p>
          The platform is hosted on Vercel and uses Supabase for its database. Both have data
          residency options in the European Union and the United States. If your country's
          law requires personal data to remain within its borders, contact us before signing
          up so we can confirm whether we can serve you.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <p>
          We keep your data for as long as your account is active.
        </p>
        <p>
          If your account is deactivated, we retain your profile, pairings, and meeting
          history in a read-only state for community continuity. We will permanently delete
          your data on written request, subject to any legal obligation we have to keep
          certain records.
        </p>
        <p>
          Recordings of native video calls, when this feature is active, are retained for
          180 days by default and then automatically deleted. An administrator can adjust
          this for the whole platform.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>
          You can:
        </p>
        <ul>
          <li>Access the personal information we hold about you.</li>
          <li>Correct anything that is inaccurate.</li>
          <li>Request the deletion of your data, subject to our retention obligations.</li>
          <li>Withdraw consent for any optional processing at any time.</li>
          <li>Receive a copy of your data in a portable format.</li>
          <li>Lodge a complaint with the Nigeria Data Protection Commission, or with the supervisory authority in your country.</li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:privacy@toolvinementors.com">privacy@toolvinementors.com</a>.
          We will respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          ToolVine is for adults. The platform is not directed at people under 18 and we do
          not knowingly collect their data. If you believe a minor has registered, contact us
          and we will deactivate the account.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          We use industry-standard practices to protect your data, including encryption in
          transit and at rest, row-level security on every database table, and access
          controls on administrative tools.
        </p>
        <p>
          No system is perfectly secure. If we become aware of a breach that affects your
          personal data, we will notify you and the relevant regulators within 72 hours, as
          required by law.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this policy as the platform evolves. We will post the updated version
          here and update the "Last updated" date at the top. For material changes, we will
          notify you by email and, where appropriate, ask for your renewed consent.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          For any privacy-related question, email{' '}
          <a href="mailto:privacy@toolvinementors.com">privacy@toolvinementors.com</a>.
          For everything else, write to{' '}
          <a href="mailto:hello@toolvinementors.com">hello@toolvinementors.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
