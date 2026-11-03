import { Link } from 'react-router-dom'
import { setConsent, useConsent } from '../lib/consent'

export default function CookieBanner() {
  const consent = useConsent()
  if (consent !== null) return null
  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p>
        We use essential storage to keep you signed in. With your consent we also use a visitor ID and basic usage
        data to count visits and keep Kitho safe. See our <Link to="/cookies">Cookie Policy</Link>.
      </p>
      <div className="cookie-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setConsent('rejected')}>Reject</button>
        <button className="btn btn-primary btn-sm" onClick={() => setConsent('accepted')}>Accept</button>
      </div>
    </div>
  )
}
