import { useState } from 'react'
import { useSiteInsights } from '@/hooks/useSiteInsights'
import { Icon } from '@/components/shared/Icon/Icon'
import './insights.css'

// Full visitor analytics for /admin/insights. Date range pills drive the
// hook's `days` param. Charts are inline SVG: no library, no bundle cost,
// full brand control. Calm utility voice — flat hairlines, brand-colored
// fills, no animation. Empty states handle the period before page tracking
// has accumulated meaningful data.

const RANGES = [
  { value: 7,  label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' }
]

export function Insights() {
  const [days, setDays] = useState(30)
  const { visits, topPaths, devices, series, funnel, loading, error } =
    useSiteInsights({ days })

  const totalVisits = visits?.current ?? 0
  const prevVisits  = visits?.previous ?? 0
  const seriesSafe  = series ?? []
  const pathsSafe   = (topPaths ?? []).slice(0, 10)

  return (
    <section className="ins">
      <header className="ins__head">
        <h1 className="ins__title">Insights</h1>
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
      </header>

      {error ? (
        <ErrorPanel error={error} />
      ) : (
        <>
          <VisitsCard
            total={totalVisits}
            previous={prevVisits}
            series={seriesSafe}
            days={days}
            loading={loading}
          />

          <div className="ins__grid">
            <PathsTable paths={pathsSafe} totalVisits={totalVisits} />
            <DevicesPanel devices={devices} />
          </div>

          <FunnelPanel funnel={funnel} />
        </>
      )}
    </section>
  )
}

// ============ Visits card with line chart ============

function VisitsCard({ total, previous, series, days, loading }) {
  const delta     = total - previous
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const absDelta  = Math.abs(delta)

  return (
    <article className="ins__visits">
      <div className="ins__visits-head">
        <div>
          <p className="ins__panel-eyebrow">Visits</p>
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

      {series.length > 0 ? (
        <VisitsChart series={series} />
      ) : (
        <div className="ins__chart-empty">
          <p>No visits recorded in the last {days} days yet.</p>
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
      aria-label="Visits over time"
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

function PathsTable({ paths, totalVisits }) {
  return (
    <article className="ins__panel">
      <header className="ins__panel-head">
        <p className="ins__panel-eyebrow">Top paths</p>
        <h2 className="ins__panel-title">Where attention is going</h2>
      </header>

      {paths.length > 0 ? (
        <ol className="ins__paths">
          {paths.map((p) => {
            const percent =
              totalVisits > 0 ? Math.round((p.count / totalVisits) * 100) : 0
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

// ============ Devices donut + legend ============

function DevicesPanel({ devices }) {
  const d = devices ?? {}
  const segments = [
    { key: 'mobile',  label: 'Mobile',  value: d.mobile  ?? 0, color: 'var(--tv-primary)' },
    { key: 'desktop', label: 'Desktop', value: d.desktop ?? 0, color: 'var(--tv-accent)' },
    { key: 'tablet',  label: 'Tablet',  value: d.tablet  ?? 0, color: 'var(--tv-text-muted)' }
  ].filter((s) => s.value > 0)

  const total = segments.reduce((sum, s) => sum + s.value, 0)

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
                <span className="ins__devices-percent">
                  {Math.round((s.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ins__panel-empty">No device data yet.</p>
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

function FunnelPanel({ funnel }) {
  // Stages render only when the lib exposes their values. Visits and
  // sign-ups are the minimum; signupViews / verified / onboarded slot in
  // when the lib is extended.
  const stages = [
    { key: 'visits',       label: 'Total visits',       value: funnel?.visits        ?? 0    },
    { key: 'signupViews',  label: 'Sign-up page views', value: funnel?.signupViews   ?? null },
    { key: 'signups',      label: 'Sign-ups',           value: funnel?.signups       ?? 0    },
    { key: 'verified',     label: 'Email verified',     value: funnel?.verified      ?? null },
    { key: 'onboarded',    label: 'Onboarded',          value: funnel?.onboarded     ?? null }
  ].filter((s) => s.value !== null)

  const top = stages[0]?.value || 1
  const hasData = (funnel?.visits ?? 0) > 0

  return (
    <article className="ins__panel">
      <header className="ins__panel-head">
        <p className="ins__panel-eyebrow">Funnel</p>
        <h2 className="ins__panel-title">From visit to onboarded</h2>
      </header>

      {hasData ? (
        <ol className="ins__funnel">
          {stages.map((s, i) => {
            const percent = top > 0 ? (s.value / top) * 100 : 0
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
        <p className="ins__panel-empty">No funnel data yet.</p>
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
