import { EmptyState } from '@/components/shared/EmptyState/EmptyState'

export function MentorDashboard() {
  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Mentor</div>
        <h1 className="page-title">Your Mentees</h1>
        <p className="page-sub">
          Mentees you are paired with will appear here. From a mentee, you can schedule meetings,
          write notes, and add action items.
        </p>
      </div>

      <EmptyState icon="users" title="You have not been assigned any mentees yet">
        The admin will pair you when a match is available. You will receive an email when it happens.
      </EmptyState>
    </>
  )
}
