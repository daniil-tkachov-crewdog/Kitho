import { Link } from 'react-router-dom'
import { resetConsent } from '../lib/consent'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <small>© {new Date().getFullYear()} Kitho. Free for everyone.</small>
        <nav aria-label="Footer">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/guidelines">Community Guidelines</Link>
          <Link to="/cookies">Cookie Policy</Link>
          <button type="button" className="footer-link-btn" onClick={resetConsent}>Cookie settings</button>
          <Link to="/contact">Contact Us</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
      </div>
    </footer>
  )
}
