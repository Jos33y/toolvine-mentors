// CSV for admin exports. Both surfaces already hold their data as arrays in
// the browser, so nothing here talks to the database.
//
// Two concessions to Excel, which is what these files get opened in:
// a UTF-8 byte order mark, without which names carrying diacritics arrive
// mangled, and CRLF line endings.

const BOM  = '\uFEFF'
const CRLF = '\r\n'

// Excel and Sheets evaluate a cell that opens with one of these. A Nigerian
// number written +2348012345678 is read as a formula and comes out as a bare
// integer with the plus gone. The apostrophe is the standard neutraliser and
// both applications strip it back off on display.
const FORMULA_LEAD = /^[=+\-@\t\r]/

function cell(value) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (FORMULA_LEAD.test(s)) s = `'${s}`
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function row(columns, item) {
  return columns.map((c) => cell(c.value(item))).join(',')
}

// ============ Builders ============

// One table. columns is [{ label, value: (item) => any }].
export function toCsv(columns, items) {
  const head = columns.map((c) => cell(c.label)).join(',')
  return [head, ...items.map((item) => row(columns, item))].join(CRLF)
}

// Several tables in one file, each with a title line, its own header row, and
// a blank line between. Insights is a summary, a funnel, a device split, a
// source list, a path list and a daily series. One flat table cannot hold
// them, and six separate downloads is six buttons on one page.
export function toCsvSections(sections) {
  return sections
    .filter((s) => s && Array.isArray(s.items) && s.items.length > 0)
    .map((s) => {
      const lines = []
      if (s.title) lines.push(cell(s.title))
      lines.push(s.columns.map((c) => cell(c.label)).join(','))
      for (const item of s.items) lines.push(row(s.columns, item))
      return lines.join(CRLF)
    })
    .join(CRLF + CRLF)
}

// ============ Naming and delivery ============

// toolvine-members-pending-2026-08-21.csv
export function csvFilename(...parts) {
  const slug = parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('-')
  return `${slug}-${isoDate(new Date())}.csv`
}

// YYYY-MM-DD. Dates in an export sort correctly in a spreadsheet and read
// unambiguously anywhere, which the site's human date format does not.
export function isoDate(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')

  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()

  // Revoking in the same tick cancels the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
