import { supabase } from '@/lib/supabase'

// Active mentoring categories sorted by sort_order. Read by onboarding chip
// group, the future Manage Categories admin page, and any focus-edit surface.
// Inactive rows are filtered at the RLS layer for non-admins.
export async function fetchActiveCategories() {
  const { data, error } = await supabase
    .from('mentoring_categories')
    .select('id, slug, label, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}
