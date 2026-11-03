import { Link } from 'react-router-dom'

const GUIDELINES_UPDATED = '3 November 2026'

export default function Guidelines() {
  return (
    <div className="container narrow legal">
      <h1>Community Guidelines and Safety Policy</h1>
      <p className="muted">Last updated: {GUIDELINES_UPDATED}</p>
      <p>
        Kitho is a place to meet real people. These guidelines explain how we expect everyone to behave, how to stay
        safe, and what we do when someone breaks the rules. They sit alongside our <Link to="/terms">Terms of Use</Link>{' '}
        and <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Who this applies to</h2>
      <p>Everyone who uses Kitho. You must be 18 or over and have one account only.</p>

      <h2>2. Our rules</h2>
      <p><strong>Be real</strong></p>
      <ul>
        <li>Use real photos of yourself. We strongly recommend clear photos where your face is visible.</li>
        <li>Do not use photos of other people. Do not make a fake or misleading profile or pretend to be someone else.</li>
        <li>Everyone in your photos must be an adult.</li>
      </ul>
      <p><strong>Be respectful</strong></p>
      <ul>
        <li>No harassment, bullying, stalking, threats or violence.</li>
        <li>No hate speech or discrimination, including based on race, religion, sex, sexual orientation, disability, age or gender identity.</li>
        <li>Respect “no”. Do not keep messaging someone who does not reply or has said they are not interested.</li>
      </ul>
      <p><strong>Keep it appropriate</strong></p>
      <ul>
        <li>No nudity or sexually explicit content, in photos, bios or messages.</li>
        <li>No content that shows or encourages self-harm or suicide.</li>
        <li>No illegal drugs or weapons, or content promoting them.</li>
        <li>No recruiting for political or religious groups.</li>
      </ul>
      <p><strong>Keep it honest and personal</strong></p>
      <ul>
        <li>No scams, no asking for money, gifts or financial details.</li>
        <li>No spam, advertising or business use, including sex work or escort services.</li>
        <li>No scraping, bots or automated tools.</li>
        <li>You may add links, phone numbers or social handles to your profile or messages if you wish. Do this carefully. Never share another person’s personal details, and do not post links to anything illegal, harmful or misleading.</li>
      </ul>
      <p><strong>Keep it legal</strong></p>
      <ul>
        <li>Nothing illegal, including child sexual content, sharing intimate images without consent, fraud, or content that supports terrorism.</li>
      </ul>

      <h2>3. Staying safe</h2>
      <ul>
        <li>Do not send money or share bank details, passwords or codes with anyone you meet on Kitho.</li>
        <li>Be careful sharing your address, workplace or daily routine.</li>
        <li>Be cautious of someone who asks to move to another app straight away, avoids video or calls, or has a sad story that ends in a request for money.</li>
        <li>Meet in a public place, tell someone you trust where you are going, and arrange your own transport.</li>
        <li>Trust your instincts. You can stop talking to anyone at any time.</li>
        <li>If you are in danger, call <strong>999</strong> (UK).</li>
      </ul>

      <h2>4. Reporting</h2>
      <ul>
        <li>You can report any <strong>profile</strong> in the app. Choose a reason: fake profile or catfishing; spam or scam; harassment or bullying; inappropriate or sexual content; hate speech or discrimination; threats or violence; appears to be under 18; or something else. You can add details.</li>
        <li>Reports are <strong>anonymous</strong>. The reported person is never told who reported them.</li>
        <li>Please report honestly. Deliberately false reports break our rules and may lead to action against your account.</li>
      </ul>

      <h2>5. How we enforce these guidelines</h2>
      <p>
        Each report adds points to the reported account. Reasons do not all carry the same weight, and no single report
        leads to an instant ban.
      </p>
      <ol>
        <li><strong>Restriction.</strong> When an account’s points reach a set limit, it is automatically restricted. While restricted, your messages and likes do not reach other users.</li>
        <li><strong>Ban.</strong> If more reports are received after a restriction, the account is automatically banned and can no longer be used.</li>
      </ol>
      <p>
        An administrator reviews every restriction and ban and can undo it if it was a mistake. We may also remove
        content or restrict or ban an account directly where needed to protect users or to deal with illegal content.
        We act on illegal content as soon as we become aware of it.
      </p>

      <h2>6. Appeals</h2>
      <p>
        If you think we got it wrong, send a message to the administrator in the <strong>Inbox</strong> tab. There is no
        time limit to appeal. We aim to reply to every appeal within <strong>7 working days</strong>. Reports are
        reviewed by our administrators within the same time.
      </p>
      <p>You can also email <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a>.</p>

      <h2>7. Serious harm and illegal content</h2>
      <p>
        We may share information with the police or other authorities when the law requires it, or to protect someone
        from serious harm. If you see child sexual abuse or exploitation, report it to the police or to CEOP (
        <a href="https://ceop.police.uk" target="_blank" rel="noreferrer">ceop.police.uk</a>). If someone is in
        immediate danger, call 999.
      </p>

      <h2>8. Support</h2>
      <ul>
        <li>Kitho: <a href="mailto:admin@kitho.co.uk">admin@kitho.co.uk</a></li>
        <li>Samaritans (free, 24 hours): 116 123</li>
        <li>Victim Support: 0808 1689 111</li>
        <li><a href="https://reportharmfulcontent.com" target="_blank" rel="noreferrer">Report Harmful Content</a></li>
        <li><a href="https://www.actionfraud.police.uk" target="_blank" rel="noreferrer">Action Fraud</a> (scams)</li>
      </ul>

      <h2>9. Changes</h2>
      <p>We may update these guidelines. We will post the new version here with a new date.</p>
    </div>
  )
}
