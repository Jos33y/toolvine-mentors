import { Link } from 'react-router-dom'
import { useCategories } from '@/hooks/useCategories'
import './resourcesPreview.css'

// Labels come from mentoring_categories rather than a local array. The card
// previously hardcoded six with an ampersand while the database uses a slash,
// which is one taxonomy spelled two ways on a live surface.
export function ResourcesPreview() {
  const { resourceCategories: categories, loading } = useCategories()

  return (
    <article className="res-preview">
      <header className="res-preview__head">
        <p className="res-preview__eyebrow">Resources</p>
        <h2 className="res-preview__title">A shelf worth keeping</h2>
      </header>

      <p className="res-preview__copy">
        Files, links, and reading gathered by our team, sorted by what you are working on.
      </p>

      {loading ? (
        <ul className="res-preview__list" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="res-preview__item res-preview__item--skel" />
          ))}
        </ul>
      ) : (
        <ul className="res-preview__list" aria-label="Categories in the library">
          {categories.map((c) => (
            <li key={c.slug} className="res-preview__item" title={c.description ?? undefined}>
              {c.label}
            </li>
          ))}
        </ul>
      )}

      <Link className="res-preview__link" to="/library">
        Open the library
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </article>
  )
}
