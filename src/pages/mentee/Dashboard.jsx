import { EmptyState } from '@/components/shared/EmptyState/EmptyState'

export function MenteeDashboard() {
  return (
    <>
      <div className="page-head">
        <div className="page-eyebrow">Mentee</div>
        <h1 className="page-title">Your Mentor</h1>
        <p className="page-sub">
          Once an admin pairs you with a mentor, you will see them here, alongside your scheduled
          meetings and the curated resource library.
        </p>
      </div>

      <EmptyState icon="user" title="You have not been paired with a mentor yet">
        The admin will pair you when a match is available. You will receive an email when it happens.
        In the meantime, you can browse the resource library.
      </EmptyState>
    </>
  )
}
