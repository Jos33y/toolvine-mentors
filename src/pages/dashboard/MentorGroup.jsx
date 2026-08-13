import { useState } from 'react'
import { useMentorDashboard } from '@/hooks/useMentorDashboard'
import { completeMeeting, friendlyMeetingError } from '@/lib/meetings'
import { setActionItemStatus, friendlyItemError, ITEM_STATUS } from '@/lib/meetingActionItems'
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
  const { mentees, upcoming, actionItems, stats, loading, error, refresh } = useMentorDashboard(mentorId)

  const [busyId, setBusyId] = useState(null)
  const [itemBusyId, setItemBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  // Closing out a session from the dashboard saves a trip to the detail view,
  // which is the whole point of the card.
  async function onComplete(session) {
    setBusyId(session.id)
    setActionError('')
    try {
      await completeMeeting(session.id)
      await refresh()
    } catch (e) {
      setActionError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  // Same RPC the meeting detail and the mentee card use. One entry point for
  // every mark-done in the product.
  async function onItemDone(item) {
    setItemBusyId(item.id)
    setActionError('')
    try {
      await setActionItemStatus(item.id, ITEM_STATUS.DONE)
      await refresh()
    } catch (e) {
      setActionError(friendlyItemError(e))
    } finally {
      setItemBusyId(null)
    }
  }

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

      {actionError && <p className="dash__error" role="alert">{actionError}</p>}

      <div className="dash__stack">
        <StatsRow stats={stats} loading={loading} />

        <NextSessionsCard
          upcoming={upcoming}
          loading={loading}
          onComplete={onComplete}
          busyId={busyId}
        />

        <div className="dash__pair">
          <MenteesListCard mentees={mentees}    loading={loading} />
          <ActionItemsCard
            items={actionItems}
            loading={loading}
            onDone={onItemDone}
            busyId={itemBusyId}
          />
        </div>

        <div className="dash__pair">
          <VinethoughtsCard />
          <ResourcesPreview />
        </div>
      </div>
    </section>
  )
}
