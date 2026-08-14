import { supabase } from '@/lib/supabase'

// Active mentoring categories sorted by sort_order. One table, two audiences:
// is_focus_category rows are what a person seeks or offers mentorship in,
// is_resource_category rows are what a resource can be filed under. Newsletter
// is the first row where those diverge. Inactive rows are filtered at RLS for
// non-admins.
export async function fetchActiveCategories() {
  const { data, error } = await supabase
    .from('mentoring_categories')
    .select('id, slug, label, description, sort_order, is_focus_category, is_resource_category')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}
