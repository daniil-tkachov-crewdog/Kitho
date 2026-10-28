import { Link } from 'react-router-dom'

const FAQ = [
  ['Is Kitho really free?', 'Yes. There are no subscriptions, premium tiers or paid boosts. Every feature is free for everyone.'],
  ['Is there a limit on likes?', 'No. Like as many people as you want, whenever you want.'],
  ['How are profiles ordered?', 'Simply in the order people joined. No ranking, no algorithm deciding who you see. When you reach the end, the list starts again from the beginning.'],
  ['What does “Sweep” do?', 'It moves on to the next profile. You can come across that person again on your next lap through the list.'],
  ['How do messages work?', 'You can send one greeting message to each person. They’ll see it in their Inbox along with your profile.'],
  ['Who can see my email or phone?', 'Only you. Other people see just your name, age, location, description and photos.'],
  ['How many photos can I add?', 'Between one and three. Your first photo is your main one.'],
  ['How do I delete my account?', 'Go to Profile → Settings → Delete my account. Everything is permanently deleted.'],
  ['I didn’t get my verification code.', 'Check your spam folder, wait a minute, then use “Resend code” on the verification screen.'],
] as const

export default function Faq() {
  return (
    <div className="container narrow legal">
      <h1>FAQ</h1>
      <p className="muted">Quick answers to common questions.</p>
      {FAQ.map(([q, a]) => (
        <details className="faq-item" key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
      <p style={{ marginTop: 24 }}>Still have a question? <Link to="/contact">Contact us</Link>.</p>
    </div>
  )
}
