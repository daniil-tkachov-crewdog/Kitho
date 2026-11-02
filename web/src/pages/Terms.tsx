import { Link } from 'react-router-dom'

const TERMS_UPDATED = '2 November 2026'

export default function Terms() {
  return (
    <div className="container narrow legal">
      <h1>Terms of Use</h1>
      <p className="muted">Last updated: {TERMS_UPDATED}</p>
      <p>
        These Terms of Use (“Terms”) are the agreement between you and Kitho (“we”, “us”) for using the Kitho app and
        website (the “Service”). By creating an account or using Kitho you agree to them. If you do not agree, do not
        use Kitho.
      </p>

      <h2>1. About us</h2>
      <p>
        Kitho (company number: [COMPANY NUMBER]; registered office: [REGISTERED ADDRESS]). Contact:{' '}
        <strong>admin@kitho.co.uk</strong>. See also our <Link to="/privacy">Privacy Policy</Link>, which explains how
        we use your personal data.
      </p>

      <h2>2. Who can use Kitho</h2>
      <ul>
        <li>Kitho is for adults only. You must be <strong>18 or over</strong>.</li>
        <li>You must give your correct date of birth when you register. Giving a false date of birth breaks these Terms.</li>
        <li>You may have <strong>one account</strong>. Do not create accounts for other people or create additional accounts for yourself.</li>
        <li>If we find a user is under 18, we remove their account.</li>
      </ul>

      <h2>3. Your account</h2>
      <ul>
        <li>You can sign up with your email, or with Google or Apple.</li>
        <li>Keep your login details secure. You are responsible for activity on your account. Tell us at once if you think someone else has used it.</li>
        <li>Information in your profile must be true and must be about you.</li>
      </ul>

      <h2>4. Rules of conduct</h2>
      <p>When using Kitho you must not:</p>
      <ul>
        <li>harass, threaten, abuse, stalk or discriminate against anyone, or use hate speech</li>
        <li>pretend to be someone else, use fake or misleading profiles, or use photos of other people</li>
        <li>post nudity or sexually explicit content. Kitho does not allow it</li>
        <li>post anything illegal, including content that sexualises minors, shares intimate images without consent, encourages terrorism or violence, or is a fraud</li>
        <li>scam, ask for money, or try to get personal or financial information from others</li>
        <li>use Kitho for business or professional purposes, including advertising goods or services, or for sex work or escort services</li>
        <li>send spam or unwanted mass messages</li>
        <li>collect other users’ data, scrape the Service, or use bots or automated tools</li>
        <li>try to hack, disrupt or bypass the security of the Service</li>
        <li>help anyone else to break these rules</li>
      </ul>

      <h2>5. Your content</h2>
      <ul>
        <li>You own your photos, bio, messages and other content (“your content”). You are responsible for it and confirm you have the right to post it.</li>
        <li>You give us a non-exclusive, worldwide, royalty-free licence to host, store, display and process your content, only to run, secure and improve the Service. Other users can see your profile content as the app is designed to work.</li>
        <li>The licence ends when you delete your content or your account, except for content that has already been sent to other users in chats, and copies we must keep by law.</li>
        <li>We do not use your photos for advertising.</li>
      </ul>

      <h2>6. Reporting and moderation</h2>
      <ul>
        <li>You can report a profile, message or user in the app. Reports are tracked automatically.</li>
        <li>Each report adds points to the account reported. When the points reach a set limit the account is <strong>restricted</strong>. If more reports come in, the account is <strong>banned</strong>. This happens automatically.</li>
        <li>An administrator reviews every restriction and ban and can undo it if it was a mistake.</li>
        <li>We may also remove content, restrict or ban an account directly where needed to protect users or to deal with illegal content. We act on illegal content as soon as we become aware of it.</li>
        <li>If you think we made a mistake, <strong>message the administrator in the Inbox tab</strong> and ask for a review. An administrator will look at it and reply.</li>
        <li>We may share information with the police or other authorities when the law requires or to protect people from serious harm.</li>
      </ul>

      <h2>7. Your safety</h2>
      <ul>
        <li>We do not run identity or background checks on users. We cannot confirm that people are who they say they are.</li>
        <li>Be careful when sharing personal information and when meeting someone in person. Meet in a public place and tell someone you trust.</li>
        <li>You are responsible for your own interactions with other users, online and offline.</li>
      </ul>

      <h2>8. The Service</h2>
      <ul>
        <li>Kitho is free to use.</li>
        <li>We provide the Service “as is” and “as available”. We do not promise it will always be available, error-free or uninterrupted, and we may change or stop features.</li>
        <li>We do not promise you will find a match or a relationship.</li>
      </ul>

      <h2>9. Ending your account</h2>
      <ul>
        <li>You can delete your account at any time in the app (Settings → Delete my account). Your data is deleted straight away, as explained in our <Link to="/privacy">Privacy Policy</Link>.</li>
        <li>We may suspend or end your account if you break these Terms or the law.</li>
      </ul>

      <h2>10. Our responsibility to you</h2>
      <ul>
        <li>Nothing in these Terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else the law does not allow us to limit.</li>
        <li>Otherwise, as Kitho is free, we are not liable for loss or damage from using the Service, including the behaviour of other users, content posted by users, or interruptions to the Service, to the extent the law permits.</li>
        <li>You are responsible for losses we suffer because you break these Terms.</li>
      </ul>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may change these Terms. We will give you at least <strong>30 days’</strong> notice of important changes in
        the app or by email. If you keep using Kitho after the change starts, you accept the new Terms. If you do not
        agree, you can delete your account.
      </p>

      <h2>12. Complaints</h2>
      <p>
        Email <strong>admin@kitho.co.uk</strong> or use our <Link to="/contact">Contact page</Link>. We aim to reply
        within a reasonable time.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms, and any dispute about them, are governed by the law of England and Wales, and the courts of
        England and Wales have jurisdiction. Consumers living elsewhere in the UK keep any rights to bring claims in
        their local courts. These Terms are in English only.
      </p>
    </div>
  )
}
