import { AdminStatsRow }       from '@/components/dashboard/AdminStatsRow/AdminStatsRow'
import { PendingActionsCard }  from '@/components/dashboard/PendingActionsCard/PendingActionsCard'
import { ActivityLogCard }     from '@/components/dashboard/ActivityLogCard/ActivityLogCard'
import { EngagementSnapshot }  from '@/components/dashboard/EngagementSnapshot/EngagementSnapshot'
import { VinethoughtsCard }    from '@/components/dashboard/VinethoughtsCard/VinethoughtsCard'
import { ResourcesPreview }    from '@/components/dashboard/ResourcesPreview/ResourcesPreview'

// Admin branch of the dashboard. Mirrors the MentorGroup pattern so the
// admin-only hooks fire only when an admin actually mounts. Layout reads
// top-to-bottom as the admin's four real questions:
//   AdminStatsRow         what shape is the platform in
//   Pending + Activity    what needs me, what just happened
//   EngagementSnapshot    where is momentum sitting
//   Vinethoughts + Res    the wider community plus the library
//
// Block D batch 1 ships these four bands. SiteInsightsCard and
// ContactSubmissionsCard land in batch 2 as a fifth pair, slotted between
// EngagementSnapshot and the community row.
export function AdminGroup({ multiRole }) {
  return (
    <section
      className="dash__group"
      aria-labelledby={multiRole ? 'dash-grp-admin' : undefined}
    >
      {multiRole && (
        <h2 className="dash__group-label" id="dash-grp-admin">Platform overview</h2>
      )}

      <div className="dash__stack">
        <AdminStatsRow />

        <div className="dash__pair">
          <PendingActionsCard />
          <ActivityLogCard />
        </div>

        <EngagementSnapshot />

        <div className="dash__pair">
          <VinethoughtsCard />
          <ResourcesPreview />
        </div>
      </div>
    </section>
  )
}
