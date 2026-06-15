import { supabase } from './supabase'

const BUCKET = 'profile-photos'
const MAX_DIMENSION = 1024
const QUALITY = 0.85
const MAX_INPUT_BYTES = 8 * 1024 * 1024

// Center-square crop + downscale + JPEG encode, no external dependency.
async function cropAndCompress(file) {
  const img = await loadImage(file)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth  - side) / 2
  const sy = (img.naturalHeight - side) / 2
  const target = Math.min(side, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not encode image')),
      'image/jpeg',
      QUALITY
    )
  })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

export async function uploadAvatar(userId, file) {
  if (!userId) throw new Error('Not signed in')
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Pick a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image is over 8MB. Try a smaller one.')
  }

  // Force the SDK to refresh-or-load the live session before the storage call
  // so the request carries a fresh JWT. Stale tokens are a known cause of
  // storage RLS rejections.
  await supabase.auth.getSession()

  const blob = await cropAndCompress(file)
  // Timestamped filename eliminates collisions, so pure INSERT is enough; no
  // upsert path needed. Cleaner against the bucket's INSERT-only policies.
  const path = `${userId}/avatar-${Date.now()}.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false
  })
  if (error) {
    // Surface the underlying storage error so the UI shows the real cause
    // (RLS reject, mime-type reject, size cap, etc.) instead of a generic line.
    throw new Error(error.message || 'Upload failed.')
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

// Best-effort cleanup of the previous object. Failures are non-fatal: the new
// photo_url is what the UI reads from; orphans are cheap.
export async function tryRemoveAvatarObject(publicUrl) {
  if (!publicUrl) return
  const marker = `/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx < 0) return
  const path = publicUrl.slice(idx + marker.length).split('?')[0]
  try { await supabase.storage.from(BUCKET).remove([path]) } catch { /* ignore */ }
}
