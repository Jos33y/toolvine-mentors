import { z } from 'zod'
import { supabase } from './supabase'
import { logAdminAction } from '@/lib/adminLog'

const BUCKET = 'partner-logos'
const MAX_DIMENSION = 512
const MAX_INPUT_BYTES = 5 * 1024 * 1024

const SELECT = 'id, name, description, website_url, logo_path, display_order, is_visible, created_at, updated_at'

/* ============ Read ============ */

// Public page. RLS already filters to visible rows; the explicit eq keeps the
// intent readable and lets the partial index do the work.
export async function fetchVisiblePartners() {
  const { data, error } = await supabase
    .from('partners')
    .select(SELECT)
    .eq('is_visible', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

// Admin list. Includes hidden rows.
export async function fetchAllPartners() {
  const { data, error } = await supabase
    .from('partners')
    .select(SELECT)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/* ============ Validation ============ */

export const partnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the partner a name.')
    .max(200, 'Keep the name under 200 characters.'),
  description: z
    .string()
    .trim()
    .max(600, 'Keep the description under 600 characters.')
    .optional()
    .or(z.literal('')),
  website_url: z
    .string()
    .trim()
    .url('Include the full address, starting with https://')
    .refine((v) => /^https?:\/\//i.test(v), 'Address must start with http:// or https://')
    .optional()
    .or(z.literal('')),
  display_order: z.coerce
    .number()
    .int('Order must be a whole number.')
    .min(0, 'Order cannot be negative.')
    .max(9999, 'Order must be under 9999.'),
  is_visible: z.boolean()
})

// Empty strings become null so the column checks do not reject a blank field.
function toRow(values) {
  const parsed = partnerSchema.parse(values)
  return {
    name:          parsed.name,
    description:   parsed.description || null,
    website_url:   parsed.website_url || null,
    display_order: parsed.display_order,
    is_visible:    parsed.is_visible
  }
}

/* ============ Write ============ */

export async function createPartner(values, { logoPath = null } = {}) {
  const row = { ...toRow(values), logo_path: logoPath }

  const { data, error } = await supabase
    .from('partners')
    .insert(row)
    .select(SELECT)
    .single()

  if (error) throw error

  logAdminAction('partner_created', 'partners', data.id, data.name)
  return data
}

export async function updatePartner(partnerId, values, { logoPath } = {}) {
  const row = toRow(values)
  // undefined means "leave the existing logo alone". null means "clear it".
  if (logoPath !== undefined) row.logo_path = logoPath

  const { data, error } = await supabase
    .from('partners')
    .update(row)
    .eq('id', partnerId)
    .select(SELECT)
    .single()

  if (error) throw error

  logAdminAction('partner_updated', 'partners', partnerId, data.name)
  return data
}

export async function setPartnerVisible(partnerId, isVisible) {
  const { data, error } = await supabase
    .from('partners')
    .update({ is_visible: isVisible })
    .eq('id', partnerId)
    .select(SELECT)
    .single()

  if (error) throw error

  logAdminAction(isVisible ? 'partner_shown' : 'partner_hidden', 'partners', partnerId, data.name)
  return data
}

// Partners are reference data, not history. Unlike users and pairings there is
// nothing to preserve, so a real delete is correct here. The logo object goes
// with it on a best-effort basis.
export async function deletePartner(partnerId, { name = null, logoPath = null } = {}) {
  const { error } = await supabase.from('partners').delete().eq('id', partnerId)
  if (error) throw error

  await tryRemovePartnerLogo(logoPath)
  logAdminAction('partner_deleted', 'partners', partnerId, name)
}

/* ============ Logo ============ */

export function partnerLogoUrl(logoPath) {
  if (!logoPath) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(logoPath)
  return data?.publicUrl ?? null
}

// Contain-fit, encoded as PNG. Logos are not photos: they need their
// whitespace and their transparency, so no centre crop and no JPEG.
async function fitAndEncode(file) {
  const img = await loadImage(file)
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not encode the logo')),
      'image/png'
    )
  })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')) }
    img.src = url
  })
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'partner'
}

export async function uploadPartnerLogo(partnerName, file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Pick a PNG, JPEG, or WebP image.')
  }
  // SVG can carry script and this bucket is public-read. Rejected here as well
  // as in the file picker and the bucket's mime list.
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')) {
    throw new Error('SVG is not accepted. Export the logo as a PNG.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That file is over 5MB. Try a smaller one.')
  }

  // Refresh the session before the storage call so the request carries a live
  // JWT. Stale tokens are a known cause of storage RLS rejections.
  await supabase.auth.getSession()

  const blob = await fitAndEncode(file)
  const path = `partners/${slugify(partnerName)}-${Date.now()}.png`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw new Error(error.message || 'Upload failed.')

  return path
}

// Best-effort cleanup. An orphaned object is cheap; a failed delete must not
// roll back the row change that already succeeded.
export async function tryRemovePartnerLogo(logoPath) {
  if (!logoPath) return
  try { await supabase.storage.from(BUCKET).remove([logoPath]) } catch { /* ignore */ }
}
