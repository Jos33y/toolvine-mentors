import { useAuth } from '@/stores/useAuth'
import { GreetingHero }       from '@/components/dashboard/GreetingHero/GreetingHero'
import { MentorRelationCard } from '@/components/dashboard/MentorRelationCard/MentorRelationCard'
import { NextMeetingCard }    from '@/components/dashboard/NextMeetingCard/NextMeetingCard'
import { MenteeTasksCard }    from '@/components/dashboard/MenteeTasksCard/MenteeTasksCard'
import { VinethoughtsCard }   from '@/components/dashboard/VinethoughtsCard/VinethoughtsCard'
import { ResourcesPreview }   from '@/components/dashboard/ResourcesPreview/ResourcesPreview'
import { VerseOfWeek }        from '@/components/dashboard/VerseOfWeek/VerseOfWeek'
import { MentorGroup }        from './MentorGroup'
import { AdminGroup }         from './AdminGroup'
import './dashboard.css'

// Role-aware composer. Each group mounts only for users holding that role.
// VerseOfWeek sits as a bridge band right after the greeting, shared across
// all roles. First the person, then the Word, then the work.
//
// Admin owns operations and the surface stays focused on that. The mentee
// row from the signup trigger is implementation detail, not an indicator
// that admin should see mentee content.
export function Dashboard() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const loading = useAuth((s) => s.loading)

  if (loading || !profile) return null

  const isAdmin  = roles.includes('admin')
  const isMentor = roles.includes('mentor')
  const isMentee = roles.includes('mentee')

  const showAdminGroup  = isAdmin
  const showMentorGroup = isMentor && !isAdmin
  const showMenteeGroup = isMentee && !isAdmin && !isMentor

  const multiRole = [showAdminGroup, showMentorGroup, showMenteeGroup].filter(Boolean).length > 1

  const isPending = !isAdmin && profile.onboarded === true && !isMentor && (
    profile.role_intent === 'mentor' || profile.role_undecided === true
  )

  return (
    <section className="dash">
      <GreetingHero profile={profile} />

      <VerseOfWeek />

      {showAdminGroup && <AdminGroup multiRole={multiRole} />}

      {showMentorGroup && (
        <MentorGroup mentorId={profile.id} multiRole={multiRole} />
      )}

      {showMenteeGroup && (
        <section
          className="dash__group"
          aria-labelledby={multiRole ? 'dash-grp-mentee' : undefined}
        >
          {multiRole && (
            <h2 className="dash__group-label" id="dash-grp-mentee">As a mentee</h2>
          )}
          <div className="dash__grid">
            <div className="dash__col dash__col--main">
              <MentorRelationCard profile={profile} roles={roles} />
              {!isPending && <NextMeetingCard />}
              {!isPending && <MenteeTasksCard menteeId={profile.id} />}
            </div>
            <div className="dash__col dash__col--side">
              <VinethoughtsCard />
              <ResourcesPreview />
            </div>
          </div>
        </section>
      )}
    </section>
  )
}
