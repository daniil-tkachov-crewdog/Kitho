import { Link } from 'react-router-dom'
import { LEGAL_UPDATED } from '../lib/config'

export default function Privacy() {
  return (
    <div className="container narrow legal">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}</p>
      <p>
        This Privacy Policy explains what personal data Kitho collects, why, how it is protected, and the choices you
        have. We collect only what we need to run a simple dating service. We do not sell your data and we do not use
        advertising trackers.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address and password. Passwords are stored only as secure hashes by our authentication provider.</li>
        <li><strong>Public profile:</strong> name, age, location (as you type it), description and 1–3 photos. These are visible to other signed-in Kitho users.</li>
        <li><strong>Private profile data:</strong> phone number (optional, visible only to you) and personal ID (optional, stored encrypted and never shown to anyone, including you, after saving).</li>
        <li><strong>Activity:</strong> the likes you send and receive, and greeting messages you send and receive.</li>
        <li><strong>Technical data:</strong> basic server logs (such as IP address, browser type and request times) kept by our hosting providers for security and reliability.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create and secure your account, including verifying your email with a one-time code.</li>
        <li>To show your public profile to other users and show you theirs.</li>
        <li>To deliver likes and messages.</li>
        <li>To keep the Service safe, prevent abuse and enforce our <Link to="/terms">Terms of Use</Link>.</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <p>
        Our legal bases are: performance of our contract with you (running the Service), our legitimate interests
        (security and abuse prevention), your consent (optional fields such as phone and personal ID — you can remove
        them at any time), and legal obligations.
      </p>

      <h2>3. Who can see what</h2>
      <ul>
        <li><strong>Other users</strong> see your name, age, location, description and photos.</li>
        <li><strong>The person you like or message</strong> sees that like or message along with your public profile.</li>
        <li><strong>Only you</strong> can see your email and phone number.</li>
        <li><strong>No one</strong> can read your personal ID through the Service; it is encrypted in our database.</li>
      </ul>

      <h2>4. Service providers</h2>
      <p>We use trusted providers to run Kitho, who process data only on our instructions:</p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, file storage and email delivery (data hosted in the EU, Ireland).</li>
        <li><strong>Render</strong> — website hosting.</li>
      </ul>
      <p>Where data is transferred outside your country, we rely on appropriate safeguards such as standard contractual clauses.</p>

      <h2>5. Cookies and local storage</h2>
      <p>
        We use your browser’s local storage only for essentials: keeping you signed in and remembering your place in
        the profile list. We do not use advertising or analytics cookies.
      </p>

      <h2>6. Retention and deletion</h2>
      <p>
        We keep your data while your account is active. When you choose <strong>Settings → Delete my account</strong>,
        we permanently delete your profile, photos, likes and messages, and your login. Backups held by our providers
        are overwritten on their normal cycle. Server logs are kept for a limited period for security.
      </p>

      <h2>7. Security</h2>
      <p>
        Data is encrypted in transit (HTTPS) and protected by access rules in our database so that users can only read
        what they are allowed to. Your personal ID is additionally encrypted at rest. No system is perfectly secure, so
        please use a strong, unique password.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete or export your data, to object
        to or restrict processing, and to withdraw consent. You can edit or delete most data yourself in the app. For
        anything else, contact us via our <Link to="/contact">Contact page</Link>. You also have the right to complain
        to your local data protection authority.
      </p>

      <h2>9. Age</h2>
      <p>Kitho is for adults aged 18 and over. We do not knowingly collect data from anyone under 18.</p>

      <h2>10. Changes</h2>
      <p>We may update this policy. If changes are significant we will let you know in the Service before they take effect.</p>
    </div>
  )
}
