import { useVerseOfTheWeek } from '@/hooks/useVerseOfTheWeek'
import './verseOfWeek.css'

export function VerseOfWeek() {
  const { verse, loading, visible } = useVerseOfTheWeek()

  // Hidden when loading, when no current verse, or when stale.
  if (loading || !visible) return null

  return (
    <section className="verse" aria-label="Verse for the week">
      <div className="verse__meta">
        <p className="verse__eyebrow">Verse for the week</p>
        <p className="verse__ref">{verse.reference}</p>
      </div>

      <blockquote className="verse__body">
        <p className="verse__text">{verse.body}</p>
      </blockquote>
    </section>
  )
}
