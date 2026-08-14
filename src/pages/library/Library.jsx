import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { useCategories } from '@/hooks/useCategories'
import { chapterOf } from '@/lib/chapters'
import { ResourceDetail } from '@/components/library/ResourceDetail/ResourceDetail'
import {
  fetchResources,
  chaptersOf,
  extraCountOf,
  matchesSearch,
  resourceFileUrl,
  friendlyResourceError,
  youTubeThumbnailUrl,
  fileExtension,
  linkDomain,
  fetchMyFocusCategoryIds
} from '@/lib/resources'
import './library.css'

const TYPE_FILTERS = [
  { key: 'all',     label: 'Everything' },
  { key: 'file',    label: 'Files' },
  { key: 'link',    label: 'Links' },
  { key: 'youtube', label: 'Videos' }
]

const TYPE_ICON  = { file: 'resources', link: 'link', youtube: 'video' }
const TYPE_LABEL = { file: 'File', link: 'Link', youtube: 'Video' }

export function Library() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('all')
  const [type,     setType]     = useState('all')
  const [focusIds, setFocusIds] = useState([])

  const { resourceCategories: categories } = useCategories()

  // The open resource lives in the query string rather than in state, so a link
  // to one is shareable and the back button closes the panel.
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('resource')
  const openRow = rows.find((r) => r.id === openId) ?? null

  function openResource(id) {
    const params = new URLSearchParams(searchParams)
    params.set('resource', id)
    setSearchParams(params)
  }

  function closeResource() {
    const params = new URLSearchParams(searchParams)
    params.delete('resource')
    setSearchParams(params, { replace: true })
  }

  const labelFor = useCallback(
    (slug) => categories.find((c) => c.slug === slug)?.label ?? slug,
    [categories]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchResources())
    } catch (e) {
      setError(friendlyResourceError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // What this person told us they are working on at onboarding. Best effort:
  // a failure here costs one chip, and should not take the shelf with it.
  useEffect(() => {
    let cancelled = false
    fetchMyFocusCategoryIds()
      .then((ids) => { if (!cancelled) setFocusIds(ids) })
      .catch(() => { if (!cancelled) setFocusIds([]) })
    return () => { cancelled = true }
  }, [])

  // Ids to slugs, using the categories already in hand. user_focus can point at
  // a chapter that is no longer a resource chapter, so anything unmatched drops.
  const myChapters = useMemo(
    () => categories.filter((c) => focusIds.includes(c.id)).map((c) => c.slug),
    [categories, focusIds]
  )

  const inMine = useCallback(
    (row) => chaptersOf(row).some((slug) => myChapters.includes(slug)),
    [myChapters]
  )

  const visible = useMemo(() => rows.filter((r) =>
    (category === 'all' || (category === 'mine' ? inMine(r) : chaptersOf(r).includes(category))) &&
    (type === 'all' || r.type === type) &&
    matchesSearch(r, search)
  ), [rows, category, type, search, inMine])

  const mineCount = useMemo(() => rows.filter(inMine).length, [rows, inMine])

  // Absent rather than empty. Somebody who set no focus areas, or whose areas
  // hold nothing yet, gets one fewer chip instead of a chip that goes nowhere.
  const showMine = myChapters.length > 0 && mineCount > 0

  const myChapterLabels = useMemo(
    () => categories.filter((c) => myChapters.includes(c.slug)).map((c) => c.label),
    [categories, myChapters]
  )

  // Counts every appearance, lead or additional, so a chip agrees with what
  // clicking it returns.
  const countFor = useCallback(
    (slug) => rows.filter((r) => chaptersOf(r).includes(slug)).length,
    [rows]
  )

  const bare = !loading && rows.length === 0

  function clearFilters() {
    setCategory('all'); setType('all'); setSearch('')
  }

  return (
    <section className="library">
      <header className="page-head">
        <h1 className="page-title">Library</h1>
        <p className="page-sub">
          Reading, listening, and watching gathered by our team. Browse everything, or
          narrow it to what you are working on.
        </p>
      </header>

      {error && <div className="library__alert" role="alert">{error}</div>}

      {/* Nothing to filter when the shelf is empty, so the rails do not render.
          Six controls that all lead to zero is six dead ends. */}
      {!bare && (
        <div className="library__filters">
          <div className="library__row">
            <div className="library__search">
              <Icon name="search" size={16} className="library__search-icon" />
              <input
                type="search"
                className="library__search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or description"
                aria-label="Search the library"
              />
            </div>

            <div className="library__kinds" role="group" aria-label="Filter by kind">
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={'library__kind' + (type === t.key ? ' library__kind--active' : '')}
                  onClick={() => setType(t.key)}
                  aria-pressed={type === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="library__row library__row--chapters">
            <span className="library__rail-label" id="library-chapters">Chapters</span>
            <div className="library__chips" role="group" aria-labelledby="library-chapters">
              {showMine && (
                <button
                  type="button"
                  className={'library__chip library__chip--mine' + (category === 'mine' ? ' library__chip--active' : '')}
                  onClick={() => setCategory('mine')}
                  aria-pressed={category === 'mine'}
                  title={`What you are working on: ${myChapterLabels.join(', ')}`}
                >
                  <Icon name="user" size={14} className="library__chip-icon" />
                  For you
                  <span className="library__chip-count">{mineCount}</span>
                </button>
              )}

              <button
                type="button"
                className={'library__chip' + (category === 'all' ? ' library__chip--active' : '')}
                onClick={() => setCategory('all')}
                aria-pressed={category === 'all'}
              >
                All
                <span className="library__chip-count">{rows.length}</span>
              </button>

              {categories.map((c) => {
                const n = countFor(c.slug)
                const { icon, tone } = chapterOf(c.slug)
                return (
                  <button
                    key={c.slug}
                    type="button"
                    className={
                      `library__chip library__chip--${tone}`
                      + (category === c.slug ? ' library__chip--active' : '')
                      + (n === 0 ? ' library__chip--empty' : '')
                    }
                    onClick={() => setCategory(c.slug)}
                    aria-pressed={category === c.slug}
                    disabled={n === 0}
                    title={n === 0 ? 'Nothing here yet' : c.description ?? undefined}
                  >
                    <Icon name={icon} size={14} className="library__chip-icon" />
                    {c.label}
                    <span className="library__chip-count">{n}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <ul className="library__grid" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => <li key={i} className="card library__card--skel" />)}
        </ul>
      ) : bare ? (
        <Chapters categories={categories} />
      ) : visible.length === 0 ? (
        <NoMatch onClear={clearFilters} />
      ) : (
        <ul className="library__grid">
          {visible.map((row) => (
            <ResourceCard
              key={row.id}
              row={row}
              categoryLabel={labelFor(row.category)}
              extraLabels={(row.extra_categories ?? []).map(labelFor)}
              onOpen={() => openResource(row.id)}
            />
          ))}
        </ul>
      )}
      {openRow && (
        <ResourceDetail
          resource={openRow}
          categoryLabel={labelFor(openRow.category)}
          extraLabels={(openRow.extra_categories ?? []).map(labelFor)}
          onClose={closeResource}
        />
      )}
    </section>
  )
}

/* ============ Card ============ */

function ResourceCard({ row, categoryLabel, extraLabels, onOpen }) {
  const { icon: chapterIcon, tone } = chapterOf(row.category)
  const extra = extraCountOf(row)

  // Only a link carries its own button, because a link is the one kind whose
  // action differs from opening the panel. On the other two the button would
  // have done exactly what the card already does.
  const isLink = row.type === 'link'

  return (
    <li className="card library__card" onClick={onOpen}>
      <div className="library__card-top">
        <span className="library__kind-mark">
          <Icon name={TYPE_ICON[row.type] ?? 'resources'} size={14} />
          {TYPE_LABEL[row.type] ?? row.type}
        </span>
        <span className={`library__category library__category--${tone}`}>
          <Icon name={chapterIcon} size={13} />
          {categoryLabel}
          {extra > 0 && (
            <span className="library__category-more" title={`Also in ${extraLabels.join(', ')}`}>
              +{extra}
            </span>
          )}
        </span>
      </div>

      {/* Above the summary, because a picture is what people scan a shelf by.
          A still, not a player: the panel holds the one that plays. */}
      {row.type === 'youtube' && row.youtube_id && (
        <div className="library__thumb">
          <img
            className="library__thumb-img"
            src={youTubeThumbnailUrl(row.youtube_id)}
            alt=""
            loading="lazy"
          />
          <span className="library__thumb-play" aria-hidden="true">
            <Icon name="video" size={18} />
          </span>
        </div>
      )}

      <h2 className="card-title library__card-title">
        <button type="button" className="library__card-button" onClick={onOpen}>
          {row.title}
        </button>
      </h2>

      {row.description && <p className="library__card-desc">{row.description}</p>}

      {/* A file and a link have no thumbnail, so each says what it actually is.
          Both come off data already stored, nothing invented. */}
      {row.type === 'file' && (
        <p className="library__source">
          <span className="library__source-tag">{fileExtension(row.file_path)}</span>
          Opens in a new tab
        </p>
      )}

      {isLink && linkDomain(row.external_url) && (
        <p className="library__source">
          <Icon name="externalLink" size={12} />
          {linkDomain(row.external_url)}
        </p>
      )}

      {isLink && (
        <div className="library__card-actions" onClick={(e) => e.stopPropagation()}>
          <a
            className="library__open"
            href={row.external_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open link
            <Icon name="externalLink" size={14} />
          </a>
        </div>
      )}
    </li>
  )
}

/* ============ Empty shelf ============ */

// An empty library is a shelf being built, not a failed search. Six tiles, each
// carrying its own mark and ground, so the page has a composition rather than a
// paragraph. The same mark and ground follow the chapter onto every card once
// resources exist, so this is the taxonomy being introduced, not decoration.
function Chapters({ categories }) {
  return (
    <div className="library__opening">
      <div className="library__opening-head">
        <h2 className="library__opening-title">Six chapters, filling up</h2>
        <p className="library__opening-sub">
          Our team adds files, links, and videos worth keeping, each one filed under one of
          these. When the first arrives it appears on this page.
        </p>
      </div>

      <ul className="library__chapters">
        {categories.map((c, i) => {
          const { icon, tone } = chapterOf(c.slug)
          return (
            <li key={c.slug} className={`library__chapter library__chapter--${tone}`}>
              <span className="library__chapter-mark" aria-hidden="true">
                <Icon name={icon} size={28} />
              </span>
              <span className="library__chapter-num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="library__chapter-title">{c.label}</h3>
              {c.description && <p className="library__chapter-desc">{c.description}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ============ No match ============ */

function NoMatch({ onClear }) {
  return (
    <div className="library__nomatch">
      <p className="library__nomatch-title">Nothing matches that</p>
      <p className="library__nomatch-body">
        Try fewer words, or widen the chapter and kind you have set.
      </p>
      <button type="button" className="library__open" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
