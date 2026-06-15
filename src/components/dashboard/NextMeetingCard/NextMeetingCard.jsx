import './nextMeetingCard.css'

// Block E will provide live meetings. Empty state only for now.
export function NextMeetingCard() {
  const meeting = null

  if (!meeting) {
    return (
      <article className="next-meet next-meet--empty">
        <header className="next-meet__head">
          <p className="next-meet__eyebrow">Next meeting</p>
          <h2 className="next-meet__title">Nothing scheduled yet</h2>
        </header>
        <p className="next-meet__copy">
          Once you are paired, your mentor will schedule your first session. The date, time, and join details will appear here.
        </p>
      </article>
    )
  }

  return null
}
