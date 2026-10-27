import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, GiftIcon, InfinityIcon, PinIcon, ShieldIcon } from '../components/Icons'

// Example profiles for the landing page only — not real users.
const SAMPLES = [
  { name: 'Sofia', age: 27, location: 'Lisbon', photo: '1494790108377-be9c29b29330' },
  { name: 'James', age: 31, location: 'London', photo: '1507003211169-0a1dd7228f2d' },
  { name: 'Mia', age: 25, location: 'Berlin', photo: '1438761681033-6461ffad8d80' },
  { name: 'Daniel', age: 29, location: 'Dublin', photo: '1500648767791-00dcc994a43e' },
]
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=480&h=640&fit=crop&crop=faces&q=70`

function SamplePhoto({ name, photo }: { name: string; photo: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="sample-photo">
      {failed ? (
        <div className="initials">{name[0]}</div>
      ) : (
        <img src={img(photo)} alt={`Example profile: ${name}`} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  )
}

function SampleCard({ s, className }: { s: (typeof SAMPLES)[number]; className?: string }) {
  return (
    <div className={className ?? 'sample'}>
      <SamplePhoto name={s.name} photo={s.photo} />
      <div className="sample-info">
        <strong>{s.name}, {s.age}</strong>
        <span><PinIcon /> {s.location}</span>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: ShieldIcon, title: 'Safety', text: 'Your email and phone stay private. Only your name, age, location, bio and photos are shown to others.' },
  { icon: GiftIcon, title: 'Completely Free', text: 'No subscriptions, no premium tiers, no paid boosts. Every feature is free for every person.' },
  { icon: InfinityIcon, title: 'Unlimited Likes', text: 'Like as many people as you want. No daily caps, no timers, no tricks.' },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <span className="eyebrow"><i aria-hidden />Free dating · one profile per person</span>
            <h1>Meet people. <em>No algorithms.</em> No paywalls.</h1>
            <p className="lead">
              One profile per person. Browse everyone, like anyone, send a hello. Kitho is free — for real, for everyone.
            </p>
            <div className="hero-cta">
              <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">Create your free profile <ArrowRightIcon /></Link>
              <p className="hero-note">Takes about two minutes. Just your email.</p>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <SampleCard s={SAMPLES[0]} className="card-float" />
            <SampleCard s={SAMPLES[1]} className="card-float" />
            <SampleCard s={SAMPLES[2]} className="card-float" />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head split">
            <h2 className="section-title">Why Kitho</h2>
            <p className="section-sub">Dating the simple way — the way it should have been from the start.</p>
          </div>
          <div className="features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div className="feature" key={title}>
                <div className="feature-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">See who's here</h2>
            <p className="section-sub">Profiles look like this: photos, name, age, where they are, and a few words about them.</p>
          </div>
          <div className="sample-grid">
            {SAMPLES.map((s) => <SampleCard key={s.name} s={s} />)}
          </div>
          <p className="center muted" style={{ marginTop: 16, fontSize: '0.85rem' }}>Example profiles for illustration.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <h2>Your next hello is free</h2>
            <p>Join Kitho today. No card, no catch.</p>
            <Link to="/auth?mode=signup" className="btn btn-primary btn-lg">Sign up free</Link>
          </div>
        </div>
      </section>
    </>
  )
}
