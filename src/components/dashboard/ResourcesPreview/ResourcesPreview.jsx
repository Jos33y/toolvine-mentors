import './resourcesPreview.css'

const CATEGORIES = [
  'Spiritual & Ministry',
  'Professional & Careers',
  'Relationship & Marriage',
  'Leadership & Mentorship',
  'Health & Fitness',
  'Finance & Others'
]

// Resources library ships in a later block. Until then, preview the categories
// so mentees know what to expect when the library opens.
export function ResourcesPreview() {
  return (
    <article className="res-preview">
      <header className="res-preview__head">
        <p className="res-preview__eyebrow">Resources</p>
        <h2 className="res-preview__title">A curated library opens soon</h2>
      </header>

      <p className="res-preview__copy">
        Files, links, and devotional reading from our community, organised by what you are working on.
      </p>

      <ul className="res-preview__list" aria-label="Coming categories">
        {CATEGORIES.map((label) => (
          <li key={label} className="res-preview__item">{label}</li>
        ))}
      </ul>
    </article>
  )
}
