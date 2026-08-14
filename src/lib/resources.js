import { z } from 'zod'
import { supabase } from './supabase'
import { logAdminAction } from '@/lib/adminLog'

const BUCKET = 'resources'
const MAX_INPUT_BYTES = 25 * 1024 * 1024
const SIGNED_URL_SECONDS = 120

const SELECT = 'id, title, description, category, type, file_path, external_url, youtube_id, is_archived, published_on, uploaded_by, created_at, updated_at'

// Mirrors allowed_mime_types on the resources bucket. A blocklist here let a
// .txt or .zip reach storage and come back with a message written for an API.
// SVG and HTML stay out because both execute on the storage origin even when
// reached through a signed URL.
const ACCEPTED_FILES = [
  { mime: 'application/pdf', ext: ['pdf'] },
  { mime: 'image/jpeg', ext: ['jpg', 'jpeg'] },
  { mime: 'image/png', ext: ['png'] },
  { mime: 'image/webp', ext: ['webp'] },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: ['docx'] },
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: ['xlsx'] },
  { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: ['pptx'] },
  { mime: 'audio/mpeg', ext: ['mp3'] },
  { mime: 'audio/mp4', ext: ['m4a'] },
  { mime: 'video/mp4', ext: ['mp4'] }
]

const ACCEPTED_TYPE_TEXT =
  'The library takes PDF, Word, Excel, PowerPoint, JPEG, PNG, WebP, MP3, M4A, and MP4.'

// Feeds the file input's accept attribute, so the picker filters before a
// person can choose something that was never going to work.
export const ACCEPTED_FILE_ACCEPT = ACCEPTED_FILES
  .flatMap((entry) => [entry.mime, ...entry.ext.map((e) => '.' + e)])
  .join(',')

/* ============ Chapters ============ */

// resources.category is the lead chapter, resource_categories holds only the
// additional ones. Nothing is stored twice, so the two cannot disagree.
export function chaptersOf(resource) {
  return [resource.category, ...(resource.extra_categories ?? [])]
}

export function extraCountOf(resource) {
  return (resource.extra_categories ?? []).length
}

/* ============ Read ============ */

// The category label is not embedded. category is a foreign key to
// mentoring_categories(slug) rather than to its primary key, and useCategories
// already holds the six rows cached with a realtime subscription, so the label
// is resolved client-side rather than joined on every read.

// includeArchived false is not a duplicate of RLS. RLS hides archived rows from
// members and shows them to an admin; the member library shows the live library
// to everyone, admin included.
//
// The junction is a second query rather than a PostgREST embed. Two round trips
// on a page that loads once, in exchange for no assumption about how the
// planner resolves the embed. Chapter is filtered by the caller, since a
// resource matches on its lead or on any additional chapter and no single
// column holds both.
export async function fetchResources({ type = null, includeArchived = false } = {}) {
  let query = supabase
    .from('resources')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (!includeArchived) query = query.eq('is_archived', false)
  if (type)             query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error

  return byEffectiveDate(await withExtraChapters(data ?? []))
}

// published_on when the author gave one, created_at otherwise.
//
// Not a PostgREST order: it cannot sort on an expression, and ordering by
// published_on with nulls last would push every undated resource permanently
// below every dated one, so eight videos would sit under three newsletters
// forever. Not a generated column either, since coalescing to created_at::date
// needs a timestamptz cast, which is STABLE rather than IMMUTABLE. So the
// shelf is ordered here, once, where every caller gets the same answer.
//
// Both values are ISO, so comparing them as text is chronological. created_at
// is trimmed to its date so a same-day pair does not sort by the hour it was
// typed in, and the full timestamp breaks the tie underneath.
function byEffectiveDate(rows) {
  const on = (r) => r.published_on ?? (r.created_at ?? '').slice(0, 10)

  return [...rows].sort((a, b) => {
    const diff = on(b).localeCompare(on(a))
    return diff !== 0 ? diff : (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

async function withExtraChapters(rows) {
  if (rows.length === 0) return rows

  const { data, error } = await supabase
    .from('resource_categories')
    .select('resource_id, category')
    .in('resource_id', rows.map((r) => r.id))

  if (error) throw error

  const byResource = new Map()
  for (const row of data ?? []) {
    if (!byResource.has(row.resource_id)) byResource.set(row.resource_id, [])
    byResource.get(row.resource_id).push(row.category)
  }

  return rows.map((r) => ({ ...r, extra_categories: byResource.get(r.id) ?? [] }))
}

// The one shelf anonymous visitors can read, per the anon policy on resources.
// Nothing else in the library is reachable without signing in.
export async function fetchPublicNewsletters() {
  const { data, error } = await supabase
    .from('resources')
    .select(SELECT)
    .eq('category', 'newsletter')
    .eq('is_archived', false)
    // published_on first, because created_at records when a row was typed in
    // rather than when the issue came out. Rows without one fall to the bottom.
    .order('published_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchResource(id) {
  const { data, error } = await supabase
    .from('resources')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const [withChapters] = await withExtraChapters([data])
  return withChapters
}

// One matching rule for both surfaces. The library is small enough that
// filtering an already-loaded list beats a round trip per keystroke, and a
// second copy of this rule is how the two lists start disagreeing.
export function matchesSearch(resource, term) {
  const q = (term ?? '').trim().toLowerCase()
  if (!q) return true
  return `${resource.title ?? ''} ${resource.description ?? ''}`.toLowerCase().includes(q)
}

// The category ids this person said they are working on. Both kinds are
// unioned by not filtering on kind at all: a mentee holds `seeking`, a mentor
// holds `offering`, and somebody with both roles is working on all of them.
//
// Ids rather than slugs, and no join, because every caller already holds the
// six categories through useCategories and can map them without a round trip.
//
// This reads user_focus, which src/lib/userFocus.js otherwise owns, but that
// module takes a kind per call and this question has no kind. If the two ever
// need to agree on more than a list of ids, move it there.
//
// RLS returns the caller's own rows only, so no user id is accepted.
export async function fetchMyFocusCategoryIds() {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_focus')
    .select('category_id')
    .eq('user_id', userId)

  if (error) throw error
  return [...new Set((data ?? []).map((row) => row.category_id))]
}

/* ============ Validation ============ */

export const resourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give the resource a title.')
      .max(200, 'Keep the title under 200 characters.'),
    description: z
      .string()
      .trim()
      .max(600, 'Keep the description under 600 characters.')
      .optional()
      .or(z.literal('')),
    category: z
      .string()
      .trim()
      .min(1, 'Pick a category.'),
    // refine rather than z.enum with an errorMap: the errorMap form is zod 3
    // only, and zod 4 silently ignores it and leaks its own wording onto the
    // form. This reads the same under both.
    type: z
      .string()
      .refine((v) => ['file', 'link', 'youtube'].includes(v), 'Pick a file, a link, or a video.'),
    external_url: z
      .string()
      .trim()
      .optional()
      .or(z.literal('')),
    // The form collects a YouTube address. parseYouTubeId turns it into an id.
    youtube_url: z
      .string()
      .trim()
      .optional()
      .or(z.literal('')),
    // Set by the caller after a successful upload, not typed by anyone.
    file_path: z
      .string()
      .trim()
      .optional()
      .or(z.literal('')),
    published_on: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
  })
  .superRefine((values, ctx) => {
    if (values.type === 'link') {
      if (!values.external_url) {
        ctx.addIssue({ code: 'custom', path: ['external_url'], message: 'Paste the address you want to share.' })
      } else if (!/^https?:\/\/\S+$/i.test(values.external_url)) {
        ctx.addIssue({ code: 'custom', path: ['external_url'], message: 'Include the full address, starting with https://' })
      }
    }

    if (values.type === 'youtube') {
      if (!values.youtube_url) {
        ctx.addIssue({ code: 'custom', path: ['youtube_url'], message: 'Paste the YouTube address.' })
      } else if (!parseYouTubeId(values.youtube_url)) {
        ctx.addIssue({ code: 'custom', path: ['youtube_url'], message: 'That does not look like a YouTube video. A channel or playlist address will not work.' })
      }
    }

    if (values.type === 'file' && !values.file_path) {
      ctx.addIssue({ code: 'custom', path: ['file_path'], message: 'Choose a file to upload.' })
    }
  })

// D47. Exactly one of the three columns is set and the other two are explicitly
// null, so a type change clears the old field mechanically rather than by
// somebody remembering to. resources_check rejects any other combination.
function toRow(values) {
  const parsed = resourceSchema.parse(values)

  return {
    title:        parsed.title,
    description:  parsed.description || null,
    category:     parsed.category,
    type:         parsed.type,
    published_on: parsed.published_on || null,
    file_path:    parsed.type === 'file'    ? parsed.file_path            : null,
    external_url: parsed.type === 'link'    ? parsed.external_url         : null,
    youtube_id:   parsed.type === 'youtube' ? parseYouTubeId(parsed.youtube_url) : null
  }
}

/* ============ Write ============ */

export async function createResource(values, { uploadedBy, extraChapters = [] }) {
  const row = { ...toRow(values), uploaded_by: uploadedBy }

  const { data, error } = await supabase
    .from('resources')
    .insert(row)
    .select(SELECT)
    .single()

  if (error) throw error

  await setExtraChapters(data.id, data.category, extraChapters)

  logAdminAction('resource_created', 'resources', data.id, data.title)
  return data
}

// previousFilePath lets the caller clean up the object this row used to point
// at. Passing it is the caller's choice because only they know whether the file
// was replaced or the type changed away from file.
export async function updateResource(resourceId, values, { previousFilePath = null, extraChapters = null } = {}) {
  const row = toRow(values)

  const { data, error } = await supabase
    .from('resources')
    .update(row)
    .eq('id', resourceId)
    .select(SELECT)
    .single()

  if (error) throw error

  // Runs after the row lands, so the new lead is known. A chapter promoted to
  // lead must leave the junction, which the trigger would refuse anyway.
  if (extraChapters) await setExtraChapters(resourceId, data.category, extraChapters)

  // After the row change lands, never before. An orphaned object is cheap; a
  // deleted file behind a failed update is not.
  if (previousFilePath && previousFilePath !== data.file_path) {
    await tryRemoveResourceFile(previousFilePath)
  }

  logAdminAction('resource_updated', 'resources', resourceId, data.title)
  return data
}

// There is no delete policy on resources. Archive is the only removal, and the
// object stays in the bucket so restoring is a single flag.
export async function setResourceArchived(resourceId, isArchived) {
  const { data, error } = await supabase
    .from('resources')
    .update({ is_archived: isArchived })
    .eq('id', resourceId)
    .select(SELECT)
    .single()

  if (error) throw error

  logAdminAction(isArchived ? 'resource_archived' : 'resource_restored', 'resources', resourceId, data.title)
  return data
}

// Delete what is gone, insert what is new. The junction is the one Block E
// table with a delete policy, because dropping a chapter from a resource is an
// edit rather than losing a record.
async function setExtraChapters(resourceId, leadCategory, chapters) {
  const wanted = [...new Set(chapters)].filter((c) => c && c !== leadCategory)

  const { data: existing, error: readError } = await supabase
    .from('resource_categories')
    .select('category')
    .eq('resource_id', resourceId)

  if (readError) throw readError

  const have = (existing ?? []).map((r) => r.category)
  const toRemove = have.filter((c) => !wanted.includes(c))
  const toAdd    = wanted.filter((c) => !have.includes(c))

  if (toRemove.length) {
    const { error } = await supabase
      .from('resource_categories')
      .delete()
      .eq('resource_id', resourceId)
      .in('category', toRemove)
    if (error) throw error
  }

  if (toAdd.length) {
    const { error } = await supabase
      .from('resource_categories')
      .insert(toAdd.map((category) => ({ resource_id: resourceId, category })))
    if (error) throw error
  }
}

/* ============ Storage ============ */

// D53. The path carries nothing that can change. A category in the path would
// lie the first time somebody corrects a miscategorised upload.
// Separated from the upload so the form can refuse a file before it commits to
// sending anything. Returns a message, or null when the file is fine.
export function resourceFileProblem(file) {
  if (!file) return 'Choose a file to upload.'

  const ext = extensionOf(file.name)
  const match = ACCEPTED_FILES.find(
    (entry) => entry.mime === file.type || entry.ext.includes(ext)
  )

  if (!match) return `That file type is not accepted. ${ACCEPTED_TYPE_TEXT}`
  if (file.size > MAX_INPUT_BYTES) {
    return `That file is ${humanBytes(file.size)}. The limit is 25MB.`
  }
  return null
}

export async function uploadResourceFile(title, file) {
  const problem = resourceFileProblem(file)
  if (problem) throw new Error(problem)

  const ext = extensionOf(file.name)
  const match = ACCEPTED_FILES.find(
    (entry) => entry.mime === file.type || entry.ext.includes(ext)
  )

  // A stale token is a known cause of storage rejections, so the session is
  // refreshed before the call rather than after it fails.
  await supabase.auth.getSession()

  const path = `library/${slugify(title)}-${Date.now()}${ext ? '.' + ext : ''}`

  // Never octet-stream. The bucket checks this string against its allowlist,
  // and some browsers hand back an empty file.type for docx and m4a.
  const contentType = ACCEPTED_FILES.some((entry) => entry.mime === file.type)
    ? file.type
    : match.mime

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw new Error(error.message || 'Upload failed.')

  return path
}

// Signed at click time rather than at render time, so a tab left open overnight
// still downloads.
export async function resourceFileUrl(filePath) {
  if (!filePath) return null

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_SECONDS)

  if (error) throw error
  return data?.signedUrl ?? null
}

// Best effort, but not silent. remove() returns an error rather than throwing,
// so a bare try/catch here could never fire and a failed cleanup left an object
// nobody could see or reach. Returns true only when the object is gone.
export async function tryRemoveResourceFile(filePath) {
  if (!filePath) return true

  try {
    const { error } = await supabase.storage.from(BUCKET).remove([filePath])
    if (error) {
      console.warn('[resources] file left in storage:', filePath, error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn('[resources] file left in storage:', filePath, e?.message)
    return false
  }
}

/* ============ Helpers ============ */

// Accepts every shape a person actually pastes. A channel or playlist address
// yields nothing, which is what the form message says.
export function parseYouTubeId(input) {
  const raw = (input ?? '').trim()
  if (!raw) return null

  // Someone pasting a bare id rather than an address.
  if (/^[\w-]{11}$/.test(raw)) return raw

  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
    /\/live\/([\w-]{11})/
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function publishedLabel(resource) {
  if (!resource?.published_on) return null
  const [y, m] = resource.published_on.split('-').map(Number)
  const quarter = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
                   'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'][m - 1]
  return `${quarter} ${y}`
}

// A file card has no thumbnail, so the extension is its anchor. Free from the
// path, no column and nothing invented.
export function fileExtension(filePath) {
  const match = /\.([a-z0-9]+)$/i.exec(filePath ?? '')
  return match ? match[1].toUpperCase() : 'FILE'
}

// Same job for a link. Where it goes is the useful thing about it, and a
// reader deserves to know before a tap opens a new tab.
export function linkDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function youTubeEmbedUrl(youtubeId) {
  return youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null
}

export function youTubeThumbnailUrl(youtubeId) {
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null
}

function extensionOf(filename) {
  const match = /\.([a-z0-9]+)$/i.exec(filename ?? '')
  return match ? match[1].toLowerCase() : ''
}

function humanBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes} bytes`
}

function slugify(value) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'resource'
}

/* ============ Errors ============ */

// Translates what the database says into what the rule actually is. The user
// broke a rule; they did not break row-level security.
export function friendlyResourceError(err) {
  const code = err?.code ?? ''
  const message = err?.message ?? ''

  if (/already the lead chapter/i.test(message)) {
    return 'That chapter is already the main one for this resource.'
  }
  if (code === '23503' || /category_fkey/.test(message)) {
    return 'That chapter no longer exists. Pick another one.'
  }
  if (code === '23514' || /resources_check/.test(message)) {
    return 'A resource carries a file, a link, or a video, and only one of the three.'
  }
  if (code === '23502') {
    return 'Something required is missing. Check the title and the category.'
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Only an administrator can add to the library.'
  }
  if (/exceeded the maximum allowed size|payload too large/i.test(message)) {
    return 'That file is over the 25MB limit.'
  }
  // The bucket rejects on its own allowlist. Reached only when a browser
  // reported a type the client accepted and storage did not.
  if (/mime type|invalid_mime|is not supported/i.test(message)) {
    return `That file type is not accepted. ${ACCEPTED_TYPE_TEXT}`
  }
  if (/object not found|not_found/i.test(message)) {
    return 'That file is no longer in storage. Upload it again.'
  }
  return message || 'Something went wrong. Try again.'
}
