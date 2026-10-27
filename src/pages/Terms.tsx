import { Link } from 'react-router-dom'
import { LEGAL_UPDATED } from '../lib/config'

export default function Terms() {
  return (
    <div className="container narrow legal">
      <h1>Terms of Use</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}</p>
      <p>
        Welcome to Kitho. These Terms of Use (“Terms”) are an agreement between you and Kitho (“Kitho”, “we”, “us”)
        and govern your use of the Kitho website and services (the “Service”). By creating an account or using the
        Service you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old to use Kitho.</li>
        <li>You may hold only one account, and it must represent you — a real, single person.</li>
        <li>You may not use Kitho if you have been previously removed from the Service or are legally prohibited from using it.</li>
      </ul>

      <h2>2. Your account</h2>
      <p>
        You are responsible for keeping your login details confidential and for all activity on your account. Use a
        strong, unique password and tell us promptly if you believe your account has been compromised. You must provide
        accurate information, including a working email address that you verify.
      </p>

      <h2>3. The Service is free</h2>
      <p>
        Kitho is currently provided free of charge, without paid tiers or limits on likes. We may introduce optional
        paid features or advertising in the future; if we do, we will update these Terms and tell you before any
        charge applies. We will never charge you without your explicit consent.
      </p>

      <h2>4. Your content</h2>
      <p>
        You own the content you post (photos, name, age, location, description and messages — “Your Content”). By
        posting it, you grant Kitho a worldwide, non-exclusive, royalty-free licence to host, store, display and
        transmit Your Content solely to operate and provide the Service. This licence ends when you delete the content
        or your account, except where we must keep data to comply with law.
      </p>
      <p>You confirm that you have the right to post Your Content and that it does not violate these Terms or anyone else’s rights.</p>

      <h2>5. Community rules</h2>
      <p>You agree not to:</p>
      <ul>
        <li>impersonate anyone, create fake profiles, or post photos of other people without their consent;</li>
        <li>post nudity, sexually explicit material, violence, hate speech, or anything illegal;</li>
        <li>harass, threaten, bully, stalk, or intimidate other users;</li>
        <li>solicit money, promote commercial services, spam, or run scams;</li>
        <li>use the Service if you are under 18, or post content involving minors;</li>
        <li>scrape, copy, or collect other users’ data, or use bots or automated tools;</li>
        <li>attempt to break, overload, or bypass the security of the Service.</li>
      </ul>

      <h2>6. Interactions with other users</h2>
      <p>
        You are solely responsible for your interactions with other users. Kitho does not run criminal background
        checks or verify the identity of users. Use caution and good judgement when communicating with or meeting
        people, especially in person for the first time: meet in public places and tell a friend where you are going.
      </p>

      <h2>7. Moderation and termination</h2>
      <p>
        We may remove content, or suspend or terminate accounts, that we reasonably believe break these Terms or put
        others at risk. You can delete your account at any time from <strong>Settings → Delete my account</strong>;
        deletion is permanent.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind. We do not guarantee that
        you will meet anyone, that the Service will be uninterrupted or error-free, or that information provided by
        other users is accurate.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Kitho will not be liable for any indirect, incidental, special,
        consequential or punitive damages, or for any loss arising from your use of the Service or your interactions
        with other users. Nothing in these Terms limits liability that cannot be limited by law.
      </p>

      <h2>10. Privacy</h2>
      <p>How we handle your personal data is explained in our <Link to="/privacy">Privacy Policy</Link>.</p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms from time to time. If changes are material, we will notify you in the Service before
        they take effect. Continuing to use Kitho after changes take effect means you accept the updated Terms.
      </p>

      <h2>12. Contact</h2>
      <p>Questions about these Terms? Visit our <Link to="/contact">Contact page</Link>.</p>
    </div>
  )
}
