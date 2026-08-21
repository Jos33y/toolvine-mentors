import { useState } from 'react'
import { useSiteInsights } from '@/hooks/useSiteInsights'
import { Icon } from '@/components/shared/Icon/Icon'
import { sourceLabel } from '@/lib/siteInsights'
import { toCsvSections, downloadCsv, csvFilename, isoDate } from '@/lib/csv'
import './insights.css'

// Full visitor analytics for /admin/insights. Range pills drive the hook's
// `days` param. Charts are inline SVG: no library, no bundle cost, full brand
// control. Calm utility voice, flat hairlines, brand fills, no animation.
// Empty states cover the period before a window has accumulated traffic.

const RANGES = [
  { value: 7,  label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' }
]

export function Insights() {
  const [days, setDays] = useState(30)
  const {
    visits, visitors, paths, devices, sources, series, funnel,
    seriesFrom, seriesTrimmed, loading, error
  } = useSiteInsights({ days, pathsLimit: 10 })

  return (
    <section className="ins">
      <header className="ins__head">
        <h1 className="ins__title">Insights</h1>
        <div className="ins__head-actions">
          <div className="ins__range" role="tablist" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="tab"
                aria-selected={days === r.value}
                className={`ins__range-btn ${days === r.value ? 'is-active' : ''}`}
                onClick={() => setDays(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {!loading && !error && (
            <button
              type="button"
              className="ins__export"
              onClick={() => exportInsights({
                days, visits, visitors, paths, devices, sources, series, funnel,
                seriesFrom, seriesTrimmed
              })}
            >
              <Icon name="download" size={16} />
              <span>Download CSV</span>
            </button>
          )}
        </div>
      </header>

      {error ? (
        <ErrorPanel error={error} />
      ) : (
        <>
          <VisitsCard
            total={visits.current}
            previous={visits.previous}
            series={series}
            days={days}
            loading={loading}
            seriesFrom={seriesFrom}
            seriesTrimmed={seriesTrimmed}
          />

          <div className="ins__grid">
            <PathsTable paths={paths} />
            <ArrivalPanel
              devices={devices}
              sources={sources}
              visitors={visitors.current}
            />
          </div>

          <FunnelPanel funnel={funnel} days={days} />
        </>
      )}
    </section>
  )
}

// ============ CSV export ============

// Six blocks in one file rather than six buttons on the page. The first block
// is the range, because a figure reading 1,240 with no window stated is not
// something a board can use, and the range pill does not travel with the file.
function exportInsights({
  days, visits, visitors, paths, devices, sources, series, funnel,
  seriesFrom, seriesTrimmed
}) {
  const pair = [
    { label: 'Metric', value: (r) => r.k },
    { label: 'Value',  value: (r) => r.v }
  ]

  const report = [
    { k: 'Range',        v: `Last ${days} days` },
    { k: 'Generated',    v: isoDate(new Date()) },
    seriesTrimmed && seriesFrom
      ? { k: 'Tracking began', v: isoDate(seriesFrom) }
      : null
  ].filter(Boolean)

  const summary = [
    { k: 'Page views',                 v: visits.current },
    { k: 'Page views, previous window', v: visits.previous },
    { k: 'Visitors',                   v: visitors.current },
    { k: 'Visitors, previous window',  v: visitors.previous }
  ]

  const funnelRows = [
    { k: 'Visitors',        v: funnel.visitors },
    { k: 'Viewed sign-up',  v: funnel.signupViews },
    { k: 'Signed up',       v: funnel.signups },
    { k: 'Verified email',  v: funnel.verified },
    { k: 'Onboarded',       v: funnel.onboarded }
  ]

  const deviceRows = [
    { k: 'Mobile',  v: devices.mobile },
    { k: 'Tablet',  v: devices.tablet },
    { k: 'Desktop', v: devices.desktop },
    { k: 'Unknown', v: devices.unknown },
    { k: 'Total',   v: devices.total }
  ]

  const csv = toCsvSections([
    { title: 'Toolvine insights', columns: pair, items: report },
    { title: 'Summary',           columns: pair, items: summary },
    { title: 'Funnel',            columns: [{ label: 'Stage', value: (r) => r.k }, { label: 'Sessions', value: (r) => r.v }], items: funnelRows },
    { title: 'Devices',           columns: [{ label: 'Device', value: (r) => r.k }, { label: 'Sessions', value: (r) => r.v }], items: deviceRows },
    {
      title: 'Sources',
      columns: [
        { label: 'Source',   value: (r) => r.label || sourceLabel(r.source) },
        { label: 'Raw',      value: (r) => r.source },
        { label: 'Sessions', value: (r) => r.sessions }
      ],
      items: sources
    },
    {
      title: 'Top paths',
      columns: [
        { label: 'Path',     value: (r) => r.path },
        { label: 'Views',    value: (r) => r.count },
        { label: 'Sessions', value: (r) => r.sessions }
      ],
      items: paths
    },
    {
      title: 'Daily page views',
      columns: [
        { label: 'Date',  value: (r) => r.date },
        { label: 'Views', value: (r) => r.visits }
      ],
      items: series
    }
  ])

  downloadCsv(csvFilename('toolvine-insights', `${days} days`), csv)
}

// ============ Visits card with line chart ============

function VisitsCard({ total, previous, series, days, loading, seriesFrom, seriesTrimmed }) {
  const delta     = total - previous
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const absDelta  = Math.abs(delta)
  const hasSeries = series.some((p) => p.visits > 0)

  return (
    <article className="ins__visits">
      <div className="ins__visits-head">
        <div>
          <p className="ins__panel-eyebrow">Page views</p>
          <span className="ins__visits-value">{loading ? '…' : total}</span>
        </div>
        {previous > 0 && (
          <span className={`ins__visits-delta ins__visits-delta--${direction}`}>
            {direction !== 'flat' && <DeltaArrow up={direction === 'up'} />}
            <span>
              {direction === 'flat'
                ? 'No change'
                : `${absDelta} vs previous ${days} days`}
            </span>
          </span>
        )}
      </div>

      {hasSeries ? (
        <>
          <VisitsChart series={series} />
          {seriesTrimmed && (
            <p className="ins__chart-note">
              Tracking began on {formatLongDate(seriesFrom)}. Days before that are
              not shown.
            </p>
          )}
        </>
      ) : (
        <div className="ins__chart-empty">
          <p>No page views recorded in the last {days} days yet.</p>
        </div>
      )}
    </article>
  )
}

function VisitsChart({ series }) {
  const w = 800
  const h = 180
  const pad = { top: 12, right: 0, bottom: 24, left: 0 }

  const values = series.map((p) => p.visits ?? 0)
  const max    = Math.max(...values, 1)
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom

  const stepX = innerW / Math.max(series.length - 1, 1)
  const yOf   = (v) => h - pad.bottom - (v / max) * innerH
  const xOf   = (i) => pad.left + i * stepX

  const linePoints = series.map((p, i) => `${xOf(i)},${yOf(values[i])}`).join(' ')
  const areaPath   = `M ${pad.left},${h - pad.bottom} L ${linePoints} L ${xOf(series.length - 1)},${h - pad.bottom} Z`

  // Three x-axis labels: first, middle, last. Two on short ranges.
  const labels = []
  if (series.length > 0) {
    labels.push({ i: 0, label: formatShortDate(series[0].date), anchor: 'start' })
    if (series.length > 2) {
      const mid = Math.floor(series.length / 2)
      labels.push({ i: mid, label: formatShortDate(series[mid].date), anchor: 'middle' })
    }
    labels.push({
      i: series.length - 1,
      label: formatShortDate(series[series.length - 1].date),
      anchor: 'end'
    })
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="ins__chart"
      preserveAspectRatio="none"
      role="img"
      aria-label="Page views over time"
    >
      <defs>
        <linearGradient id="ins-visits-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tv-primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--tv-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#ins-visits-fill)" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--tv-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {labels.map((l) => (
        <text
          key={l.i}
          x={xOf(l.i)}
          y={h - 6}
          textAnchor={l.anchor}
          className="ins__chart-label"
        >
          {l.label}
        </text>
      ))}
    </svg>
  )
}

// ============ Top paths table ============

// Bars scale to the busiest path, not to total views. Scaled to the total,
// the leading page takes 40 percent and everything under it renders as the
// minimum stub, which is a row of dots rather than a comparison.
function PathsTable({ paths }) {
  const max = paths.reduce((m, p) => Math.max(m, p.count), 0)

  return (
    <article className="ins__panel">
      <header className="ins__panel-head">
        <p className="ins__panel-eyebrow">Top paths, signed out</p>
        <h2 className="ins__panel-title">Where attention is going</h2>
      </header>

      {paths.length > 0 ? (
        <ol className="ins__paths">
          {paths.map((p) => {
            const percent = max > 0 ? Math.round((p.count / max) * 100) : 0
            return (
              <li key={p.path} className="ins__paths-row">
                <code className="ins__paths-path">{p.path}</code>
                <span className="ins__paths-bar" aria-hidden="true">
                  <span
                    className="ins__paths-bar-fill"
                    style={{ width: `${Math.max(percent, 2)}%` }}
                  />
                </span>
                <span className="ins__paths-count">{p.count}</span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="ins__panel-empty">No path data yet.</p>
      )}
    </article>
  )
}

// ============ Devices donut, legend, and sources ============

// Counts sessions, not page views, so one person reading twenty pages counts
// once. Sources sit under the donut: both answer how a visitor got here.
function ArrivalPanel({ devices, sources, visitors }) {
  const segments = [
    { key: 'mobile',  label: 'Mobile',  value: devices.mobile,  color: 'var(--tv-primary)' },
    { key: 'desktop', label: 'Desktop', value: devices.desktop, color: 'var(--tv-accent)' },
    { key: 'tablet',  label: 'Tablet',  value: devices.tablet,  color: 'var(--tv-text-muted)' }
  ].filter((s) => s.value > 0)

  const total    = segments.reduce((sum, s) => sum + s.value, 0)
  const hasDirect = sources.some((s) => s.source === 'direct')

  return (
    <article className="ins__panel">
      <header className="ins__panel-head">
        <p className="ins__panel-eyebrow">Devices</p>
        <h2 className="ins__panel-title">How visitors arrive</h2>
      </header>

      {total > 0 ? (
        <div className="ins__devices">
          <DonutChart segments={segments} total={total} />
          <ul className="ins__devices-legend">
            {segments.map((s) => (
              <li key={s.key} className="ins__devices-row">
                <span
                  className="ins__devices-swatch"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="ins__devices-label">{s.label}</span>
                <span className="ins__devices-count">{s.value}</span>
                <span className="ins__devices-percent">
                  {Math.round((s.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ins__panel-empty">
          {visitors > 0
            ? 'No device data recorded for these visits.'
            : 'No device data yet.'}
        </p>
      )}

      {sources.length > 0 && (
        <div className="ins__sources">
          <p className="ins__sources-head">Where they came from</p>
          <ul className="ins__sources-list">
            {sources.map((s) => (
              <li key={s.source} className="ins__sources-row">
                <span className="ins__sources-label">{s.label}</span>
                <span className="ins__sources-count">{s.sessions}</span>
              </li>
            ))}
          </ul>
          {hasDirect && (
            <p className="ins__sources-note">
              Links opened from WhatsApp and other apps arrive without a source
              and count as direct.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

function DonutChart({ segments, total }) {
  const size   = 120
  const r      = 48
  const stroke = 14
  const c      = 2 * Math.PI * r

  let offset = 0
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="ins__donut"
      role="img"
      aria-label="Device share"
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--tv-border)"
        strokeWidth={stroke}
      />
      {segments.map((s) => {
        const len = (s.value / total) * c
        const arc = (
          <circle
            key={s.key}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        )
        offset += len
        return arc
      })}
    </svg>
  )
}

// ============ Funnel ============

// Every stage is a count within the window rather than a followed cohort, so
// a stage can exceed the one above it. Drop-off is shown only when it is real.
function FunnelPanel({ funnel, days }) {
  const stages = [
    { key: 'visitors',    label: 'Visitors, signed out', value: funnel.visitors },
    { key: 'signupViews', label: 'Reached sign-up',      value: funnel.signupViews },
    { key: 'signups',     label: 'Created an account',   value: funnel.signups },
    { key: 'verified',    label: 'Verified email',       value: funnel.verified },
    { key: 'onboarded',   label: 'Completed onboarding', value: funnel.onboarded }
  ]

  const top     = stages[0].value || 1
  const hasData = stages.some((s) => s.value > 0)

  return (
    <article className="ins__panel">
      <header className="ins__panel-head">
        <p className="ins__panel-eyebrow">Funnel</p>
        <h2 className="ins__panel-title">From visit to onboarded</h2>
      </header>

      {hasData ? (
        <ol className="ins__funnel">
          {stages.map((s, i) => {
            const percent = Math.min((s.value / top) * 100, 100)
            const dropoff = i > 0 ? stages[i - 1].value - s.value : null
            return (
              <li key={s.key} className="ins__funnel-stage">
                <div className="ins__funnel-text">
                  <span className="ins__funnel-label">{s.label}</span>
                  <span className="ins__funnel-value">{s.value}</span>
                </div>
                <div className="ins__funnel-bar" aria-hidden="true">
                  <div
                    className="ins__funnel-fill"
                    style={{ width: `${Math.max(percent, 1)}%` }}
                  />
                </div>
                {dropoff !== null && dropoff > 0 && (
                  <span className="ins__funnel-dropoff">−{dropoff} dropped off</span>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="ins__panel-empty">
          No sign-up activity in the last {days} days yet.
        </p>
      )}
    </article>
  )
}

// ============ Error ============

function ErrorPanel({ error }) {
  return (
    <div className="ins__error">
      <span className="ins__error-icon">
        <Icon name="alert" size={20} />
      </span>
      <p>
        We could not load insights right now. {error?.message ?? 'Try refreshing the page.'}
      </p>
    </div>
  )
}

// ============ Helpers ============

function DeltaArrow({ up }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {up ? <path d="M8 13V3M3 8l5-5 5 5" /> : <path d="M8 3v10M3 8l5 5 5-5" />}
    </svg>
  )
}

function formatShortDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatLongDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}
