import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="Kitho home">
      <span className="logo-mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
      </span>
      Kitho
    </Link>
  )
}
