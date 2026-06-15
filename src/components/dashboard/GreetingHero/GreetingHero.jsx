import './greetingHero.css'

export function GreetingHero({ profile }) {
  const firstName = firstNameOf(profile.full_name)
  const now = new Date()
  const greeting = greetingFor(now)
  const dateLine = formatDate(now)

  return (
    <header className="dash-hero">
      {dateLine && <p className="dash-hero__eyebrow">{dateLine}</p>}
      <h1 className="dash-hero__title">{greeting}, {firstName}.</h1>
    </header>
  )
}

function firstNameOf(fullName) {
  if (!fullName) return 'there'
  const first = fullName.trim().split(/\s+/)[0]
  return first || 'there'
}

function greetingFor(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(date)
  } catch {
    return ''
  }
}
