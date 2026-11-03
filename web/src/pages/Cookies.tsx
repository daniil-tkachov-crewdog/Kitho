import { Link } from 'react-router-dom'

const COOKIES_UPDATED = '3 November 2026'

export default function Cookies() {
  return (
    <div className="container narrow legal">
      <h1>Cookie Policy</h1>
      <p className="muted">Last updated: {COOKIES_UPDATED}</p>
      <p>
        This policy explains what cookies and similar technologies (such as your browser’s local storage) Kitho uses
        and why. It follows the Privacy and Electronic Communications Regulations (PECR). For how we handle personal
        data, see our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Essential storage (no consent needed)</h2>
      <p>These are needed to run Kitho and cannot be switched off:</p>
      <ul>
        <li><strong>Login session</strong> (Supabase, in local storage): keeps you signed in. Lasts until you log out or it expires.</li>
        <li><strong>Your cookie choice</strong> (local storage): remembers whether you accepted or rejected optional storage.</li>
        <li><strong>Feed position</strong> (local storage): remembers your place in the profile list.</li>
        <li><strong>Admin session</strong> (session storage): used only by Kitho administrators and cleared when the browser closes.</li>
      </ul>

      <h2>2. Optional storage (only with your consent)</h2>
      <ul>
        <li>
          <strong>Visitor ID</strong> (local storage, <code>kitho_visitor_id</code>): a random ID so repeat visits from
          the same browser count as one visitor. It stays until you reject optional storage, clear your browser data
          or we remove it.
        </li>
      </ul>
      <p>When you accept, each visit also records the following on our servers:</p>
      <ul>
        <li>your visitor ID, and your account if you are signed in</li>
        <li>approximate location (city and country), worked out from your IP address</li>
        <li>device type and browser</li>
        <li>date and time of the visit</li>
      </ul>
      <p>
        To work out the approximate location, your IP address is sent to a third-party lookup service (ipwho.is). We
        do not store your IP address in this record.
      </p>
      <p><strong>Why:</strong> to count visitors, improve Kitho and keep it safe from abuse.</p>
      <p><strong>How long:</strong> visit records are deleted after 6 months.</p>

      <h2>3. What we do not use</h2>
      <p>
        We do not use advertising cookies or third-party analytics. Our fonts are hosted by us, so no data about your
        visit is sent to a font provider.
      </p>

      <h2>4. Your choices</h2>
      <ul>
        <li>When you first visit, choose <strong>Accept</strong> or <strong>Reject</strong>. Nothing optional is used until you accept.</li>
        <li>Change your mind at any time with <strong>Cookie settings</strong> in the footer. Rejecting removes the visitor ID from your browser.</li>
        <li>You can also clear local storage in your browser settings. If you do, you may be signed out.</li>
      </ul>

      <h2>5. Changes</h2>
      <p>We may update this policy. We will post the new version here with a new date.</p>

      <h2>6. Contact</h2>
      <p>Questions: <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a>.</p>
    </div>
  )
}
