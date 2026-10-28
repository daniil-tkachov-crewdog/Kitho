import { CONTACT_EMAIL } from '../lib/config'

export default function Contact() {
  return (
    <div className="container narrow legal">
      <h1>Contact Us</h1>
      <p>We’d love to hear from you — questions, feedback, or reports about a profile.</p>
      {CONTACT_EMAIL ? (
        <p>Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We usually reply within a few days.</p>
      ) : (
        <p className="muted">Our support email will be published here shortly.</p>
      )}
    </div>
  )
}
