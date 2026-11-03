import { Link } from 'react-router-dom'

type Item = readonly [question: string, answer: string]

const SECTIONS: readonly { title: string; items: readonly Item[] }[] = [
  {
    title: 'Getting started',
    items: [
      ['Who can use Kitho?', 'Anyone who is 18 and over. Kitho is for adults only.'],
      ['Is Kitho really free?', 'Yes. There are no subscriptions, premium tiers or paid boosts. Every feature is free for everyone.'],
      ['How do I sign up?', 'Sign up with your email and a password, or with Google. If you use email, we send you a 6-digit code to verify it. Then create your profile with your name, age, location, a short description and at least one photo. Apple sign-in is coming soon.'],
      ['Why do you ask for my age?', 'Kitho is for adults only, and UK law requires us to keep children off dating services. Your age is also shown on your profile.'],
      ['Can I have more than one account?', 'No. Kitho allows one account per person. Extra accounts may be removed.'],
      ['Is there a mobile app?', 'Not yet, but it is coming soon.'],
    ],
  },
  {
    title: 'Your profile',
    items: [
      ['How do I edit my profile?', 'Go to Profile (or Profile → Settings → Edit profile). You can change your name, age, location, description, phone number and photos.'],
      ['What photos can I add?', 'Between one and three JPEG, PNG or WebP photos. Your first photo is your main one. Please use real photos of yourself where your face is clearly visible. Photos of other people, anyone under 18, and nudity or sexual content are not allowed.'],
      ['Can I hide my profile or take a break?', 'A way to hide your profile is coming soon.'],
      ['Who can see my email or phone?', 'Only you. Other people see just your name, age, location, description and photos. We never sell your data.'],
    ],
  },
  {
    title: 'Browsing, likes and messages',
    items: [
      ['How are profiles ordered?', 'Simply in the order people joined. No ranking, no algorithm deciding who you see. When you reach the end, the list starts again from the beginning. “Sweep” moves on to the next profile, and you can come across that person again on your next lap.'],
      ['Is there a limit on likes? What happens when I like someone?', 'No limit. Like as many people as you want. The person sees your like, together with your profile, in their Inbox under “Who liked me”. A like cannot be undone.'],
      ['How do messages work?', 'You can send one greeting message to each person. They’ll see it in their Inbox along with your profile.'],
      ['Can I search for people near me?', 'No. Kitho doesn’t use your device location and doesn’t sort profiles by distance. This is deliberate, to protect your safety and privacy.'],
    ],
  },
  {
    title: 'Safety and reporting',
    items: [
      ['How do I report someone, and what happens next?', 'In a chat with them, press Report and choose a reason. Reports are anonymous: the person never finds out who reported them. Each report adds points to the account. When the points reach a limit the account is restricted, and if more reports come in it is banned. Restricted means that messages and likes from that account no longer reach other users. An administrator reviews every restriction and ban and can undo it.'],
      ['I was restricted or banned. What can I do?', 'Send a message to the administrator in your Inbox and ask for a review. We aim to reply within 7 working days. Read more in our Community Guidelines.'],
      ['How do I stay safe?', 'Never send money or share bank details. Be careful about sharing your address or workplace. Meet in a public place and tell someone you trust. Watch out for fake profiles and people who push you to another app or ask for money. Kitho does not run identity checks on users, so use your own judgement. If you are in danger, call 999.'],
    ],
  },
  {
    title: 'Privacy and your data',
    items: [
      ['What data do you collect and why?', 'Only what we need to run Kitho: your account and profile details, likes, messages and some technical data. Read the full details in our Privacy Policy.'],
      ['Does Kitho use cookies?', 'Essential storage is used to keep you signed in. Optional visit counting only happens if you accept it in the cookie banner. You can change your choice at any time with “Cookie settings” in the footer.'],
      ['How do I delete my account?', 'Go to Profile → Settings → Delete my account. Your profile, photos, likes and messages are deleted straight away and permanently.'],
      ['Can I get a copy of my data?', 'Yes. Email admin@kitho.co.uk and we’ll help.'],
    ],
  },
  {
    title: 'Help',
    items: [
      ['I didn’t get my verification code.', 'Check your spam folder, wait a minute, then use “Resend code” on the verification screen.'],
      ['How do I contact Kitho?', 'Email admin@kitho.co.uk or use the Contact page.'],
    ],
  },
]

export default function Faq() {
  return (
    <div className="container narrow legal">
      <h1>FAQ</h1>
      <p className="muted">Quick answers to common questions.</p>
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.items.map(([q, a]) => (
            <details className="faq-item" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      ))}
      <p style={{ marginTop: 24 }}>
        Read more: <Link to="/guidelines">Community Guidelines</Link>, <Link to="/privacy">Privacy Policy</Link>,{' '}
        <Link to="/terms">Terms of Use</Link>. Still have a question? <Link to="/contact">Contact us</Link>.
      </p>
    </div>
  )
}
