import { Link } from 'react-router-dom'

const PRIVACY_UPDATED = '2 November 2026'

export default function Privacy() {
  return (
    <div className="container narrow legal">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: {PRIVACY_UPDATED}</p>
      <p>
        This policy explains how Kitho (“we”, “us”) collects and uses your personal data when you use the Kitho app and
        website. It follows the UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The controller of your personal data is <strong>Kitho</strong> (company number: [COMPANY NUMBER]; registered
        office: [REGISTERED ADDRESS]).
      </p>
      <p>
        Contact for all privacy matters: <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a>
      </p>
      <p>We have not appointed a Data Protection Officer. Use the email above for any request or question.</p>

      <h2>2. Who can use Kitho</h2>
      <p>
        Kitho is for adults only. You must be at least <strong>18</strong> years old to use Kitho. If we learn that a
        user is under 18, we delete their account and data.
      </p>

      <h2>3. What data we collect</h2>
      <p><strong>Data you give us</strong></p>
      <ul>
        <li>Name, email address, phone number, gender</li>
        <li>Photos, bio and profile details</li>
        <li>Messages you send in chats</li>
        <li>Reports and messages you send to us</li>
      </ul>
      <p><strong>Data collected automatically</strong></p>
      <ul>
        <li>Location (only if you allow it in your device settings)</li>
        <li>Device data (device type, operating system, app version, identifiers)</li>
        <li>Server logs kept by our hosting providers (such as IP address and request times) for security</li>
        <li>Visit data, only if you accept optional cookies: a random visitor ID, your account if signed in, approximate location (city and country, worked out from your IP address), device type, browser and time of visit</li>
      </ul>
      <p><strong>Data from third parties</strong></p>
      <ul>
        <li>If you sign in with Google or Apple, we receive your name, email address and account identifier from them.</li>
      </ul>
      <p>
        We do not knowingly collect special category data (such as sexual orientation, religion, ethnicity or health
        data). Please do not include it in your profile or bio. If you choose to share it, you do so voluntarily.
      </p>

      <h2>4. How and why we use your data</h2>
      <ul>
        <li><strong>Create and manage your account, sign you in</strong> (name, email, phone, sign-in data). Lawful basis: contract.</li>
        <li><strong>Show your profile and let you chat with other users</strong> (profile, photos, bio, messages). Lawful basis: contract.</li>
        <li><strong>Show people near you</strong> (location). Lawful basis: consent.</li>
        <li><strong>Keep the service safe: moderation, reports, fraud and abuse prevention</strong> (profile, messages, device and usage data). Lawful basis: legitimate interests (keeping users safe) and legal obligation (Online Safety Act 2023).</li>
        <li><strong>Count visits, improve Kitho and protect it from abuse</strong> (visit data). Lawful basis: consent (cookie banner).</li>
        <li><strong>Fix the app and keep it secure</strong> (server logs). Lawful basis: legitimate interests.</li>
        <li><strong>Send marketing emails</strong> (email). Lawful basis: consent.</li>
        <li><strong>Send push notifications</strong> (device identifier). Lawful basis: consent.</li>
        <li><strong>Respond to your requests and complaints</strong> (contact details, messages). Lawful basis: legitimate interests and legal obligation.</li>
      </ul>
      <p>You can withdraw consent at any time (see section 9). Withdrawing does not affect earlier use.</p>

      <h2>5. Automated decisions</h2>
      <p>We do not use automated matching or profiling to decide who you are shown.</p>
      <p>
        We use an automated reporting system for safety. Each report made against an account adds points to it. When
        the points reach a set limit, the account is automatically restricted. If more reports come in, the account is
        automatically banned. This can significantly affect your access to Kitho.
      </p>
      <p>
        An administrator reviews every restriction and ban and can reverse it if it was a mistake. You can also ask for
        a human review, tell us your view or challenge a decision by messaging the administrator in the Inbox tab or
        emailing <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a>.
      </p>

      <h2>6. Who we share your data with</h2>
      <ul>
        <li><strong>Other users:</strong> your profile, photos and messages are visible to other users as the app is designed to work.</li>
        <li>
          <strong>Service providers (processors)</strong> acting on our instructions: Supabase (database,
          authentication and storage; region: Ireland), Render (hosting), Google and Apple (sign-in), and ipwho.is (approximate location lookup from your IP address, only if you accept optional cookies).
        </li>
        <li><strong>Authorities:</strong> the police, regulators (such as Ofcom or the ICO) or courts, when the law requires it or to protect users from serious harm.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>7. Transfers outside the UK</h2>
      <p>
        Our database is stored in Ireland, which the UK treats as adequate. Our application servers are hosted by
        Render in Oregon, United States, so your data is processed there too. Google and Apple are also based in the
        United States. For these transfers we rely on UK-approved safeguards: the UK-US Data Bridge where the provider
        is certified, or otherwise the International Data Transfer Agreement or the UK Addendum to the EU Standard
        Contractual Clauses in the provider’s data processing terms. [CONFIRM Render, Supabase and ipwho.is transfer mechanism]
      </p>

      <h2>8. How long we keep your data</h2>
      <ul>
        <li><strong>Account data, photos, bio and messages:</strong> deleted immediately when you delete your account. [CONFIRM backup retention period, if any]</li>
        <li><strong>Visit data:</strong> deleted after 6 months.</li>
        <li><strong>Moderation and safety reports:</strong> kept only as long as needed to handle the report and protect users, [PERIOD].</li>
        <li><strong>Records required by law:</strong> kept for the period the law requires.</li>
      </ul>

      <h2>9. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>be informed</strong> about how we use your data (this policy)</li>
        <li><strong>access</strong> a copy of your data</li>
        <li><strong>correct</strong> inaccurate data</li>
        <li><strong>erase</strong> your data</li>
        <li><strong>restrict</strong> how we use your data</li>
        <li><strong>data portability</strong> (receive your data in a portable format)</li>
        <li><strong>object</strong> to processing based on legitimate interests, and to direct marketing</li>
        <li><strong>withdraw consent</strong> at any time (in app settings, device settings or by emailing us)</li>
        <li><strong>not be subject to solely automated decisions</strong> with legal or similarly significant effects</li>
      </ul>
      <p>
        To use any right, email <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a> or use our{' '}
        <Link to="/contact">Contact page</Link>. We reply within one month.
      </p>

      <h2>10. Marketing and notifications</h2>
      <p>
        We only send marketing emails and push notifications if you agree. You can unsubscribe using the link in any
        email or in your app and device settings.
      </p>

      <h2>11. Cookies and similar technologies</h2>
      <p>See our <Link to="/cookies">Cookie Policy</Link>.</p>

      <h2>12. Security</h2>
      <p>
        We protect your data with measures such as encrypted connections and access controls. No system is completely
        secure. If a breach is likely to seriously affect you, we will tell you and, where required, the ICO.
      </p>

      <h2>13. Complaints</h2>
      <p>
        Please contact us first. You can also complain to the Information Commissioner’s Office (ICO):{' '}
        <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>, 0303 123 1113.
      </p>

      <h2>14. Changes</h2>
      <p>
        We may update this policy. We will post the new version here with a new date and notify you of significant
        changes in the app or by email.
      </p>
    </div>
  )
}
