import { supabase } from '@/lib/supabase'

// One user's focus rows for one kind ('seeking' or 'offering'), joined with
// the category record so callers can render without a second fetch. Sorted
// by category sort_order for consistent display.
export async function fetchUserFocus(userId, kind) {
  const { data, error } = await supabase
    .from('user_focus')
    .select('category_id, kind, mentoring_categories ( id, slug, label, sort_order, is_active )')
    .eq('user_id', userId)
    .eq('kind', kind)

  if (error) throw error

  return (data ?? [])
    .filter((r) => r.mentoring_categories)
    .sort((a, b) => (a.mentoring_categories.sort_order ?? 0) - (b.mentoring_categories.sort_order ?? 0))
    .map((r) => ({
      categoryId: r.category_id,
      slug:       r.mentoring_categories.slug,
      label:      r.mentoring_categories.label,
      isActive:   r.mentoring_categories.is_active
    }))
}

// Replaces all focus rows of one kind for the user with the given category ids.
// Delete then insert; pass an empty array to clear. Not transactional across
// the two statements; the surface is low-frequency (onboarding finish, future
// profile edit) and recoverable on retry.
export async function setUserFocus(userId, kind, categoryIds) {
  const { error: delErr } = await supabase
    .from('user_focus')
    .delete()
    .eq('user_id', userId)
    .eq('kind', kind)
  if (delErr) throw delErr

  if (!categoryIds || categoryIds.length === 0) return

  const rows = categoryIds.map((category_id) => ({ user_id: userId, category_id, kind }))
  const { error: insErr } = await supabase.from('user_focus').insert(rows)
  if (insErr) throw insErr
}
