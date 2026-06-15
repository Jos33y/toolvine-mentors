import { useMentorDashboard } from '@/hooks/useMentorDashboard'
import { StatsRow } from '@/components/dashboard/StatsRow/StatsRow'
import { NextSessionsCard } from '@/components/dashboard/NextSessionsCard/NextSessionsCard'
import { MenteesListCard } from '@/components/dashboard/MenteesListCard/MenteesListCard'
import { ActionItemsCard } from '@/components/dashboard/ActionItemsCard/ActionItemsCard'
import { VinethoughtsCard } from '@/components/dashboard/VinethoughtsCard/VinethoughtsCard'
import { ResourcesPreview } from '@/components/dashboard/ResourcesPreview/ResourcesPreview'

// Mentor branch of the dashboard. Lives in its own component so the
// useMentorDashboard hook only fires when a mentor actually mounts. The
// shape from the hook is consumed verbatim by the cards; no transformation
// in between.
//
// Layout reads top-to-bottom as the mentor's three real questions:
//   StatsRow             where am I overall
//   NextSessionsCard     what's next
//   Mentees + Actions    who am I serving, what did I commit to
//   Vinethoughts + Res.  the wider community plus library
export function MentorGroup({ mentorId, multiRole }) {
  const { mentees, upcoming, actionItems, stats, loading, error } = useMentorDashboard(mentorId)

  return (
    <section
      className="dash__group"
      aria-labelledby={multiRole ? 'dash-grp-mentor' : undefined}
    >
      {multiRole && (
        <h2 className="dash__group-label" id="dash-grp-mentor">As a mentor</h2>
      )}

      {error && (
        <p className="dash__error" role="alert">
          We could not load your mentor dashboard. Refresh the page, or contact support if it keeps happening.
        </p>
      )}

      <div className="dash__stack">
        <StatsRow stats={stats} loading={loading} />

        <NextSessionsCard upcoming={upcoming} loading={loading} />

        <div className="dash__pair">
          <MenteesListCard mentees={mentees}    loading={loading} />
          <ActionItemsCard items={actionItems} loading={loading} />
        </div>

        <div className="dash__pair">
          <VinethoughtsCard />
          <ResourcesPreview />
        </div>
      </div>
    </section>
  )
}
