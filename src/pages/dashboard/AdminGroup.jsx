import { AdminStatsRow }       from '@/components/dashboard/AdminStatsRow/AdminStatsRow'
import { PendingActionsCard }  from '@/components/dashboard/PendingActionsCard/PendingActionsCard'
import { ActivityLogCard }     from '@/components/dashboard/ActivityLogCard/ActivityLogCard'
import { EngagementSnapshot }  from '@/components/dashboard/EngagementSnapshot/EngagementSnapshot'
import { SiteInsightsCard }    from '@/components/dashboard/SiteInsightsCard/SiteInsightsCard'
import { VinethoughtsCard }    from '@/components/dashboard/VinethoughtsCard/VinethoughtsCard'
import { ResourcesPreview }    from '@/components/dashboard/ResourcesPreview/ResourcesPreview'

// Admin branch of the dashboard. Mirrors the MentorGroup pattern so the
// admin-only hooks fire only when an admin actually mounts. Layout reads
// top-to-bottom as the admin's five real questions:
//   AdminStatsRow             what shape is the platform in
//   Pending + Activity        what needs me, what just happened
//   EngagementSnapshot        where is momentum sitting
//   SiteInsights              who's at the front door
//   Vinethoughts + Resources  the wider community plus the library
//
// SiteInsights runs full-width on its own row. We dropped the inbox preview
// that originally paired with it because PendingActions already nudges to
// the same destination; a second card was duplicate weight on a low-volume
// inbox.
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

        <SiteInsightsCard />

        <div className="dash__pair">
          <VinethoughtsCard />
          <ResourcesPreview />
        </div>
      </div>
    </section>
  )
}
