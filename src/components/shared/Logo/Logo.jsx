import logomark64       from '@/assets/brand/logomark-64.png'
import logomark128      from '@/assets/brand/logomark-128.png'
import logomark256      from '@/assets/brand/logomark-256.png'
import logomarkLight256 from '@/assets/brand/logomark-light-256.png'
import { CLIENT_LOCKUP, CLIENT_MARK } from '@/assets/brand/clientLogo'

// Vesica variants: mark, mark-light (PNG), mark-mono, favicon (SVG,
// currentColor), horizontal, stacked (+ wordmark).
//
// Client variants: client-lockup is their full three-line lockup and already
// carries the name, so nothing sets a wordmark beside it. client-mark is the
// shield on its own, for anywhere the lockup would render its subtitle too
// small to read. Both take their colour from CSS, so one asset serves the dark
// sidebar and the cream marketing header.
//
// Client variants are sized by height, because the lockup is a wide rectangle
// and a square `size` would crop the intent. Width follows the aspect ratio.
export function Logo({
  variant = 'mark',
  size = 40,
  height = null,
  withWordmark = false,
  light = false,
  className = '',
  title = 'Toolvine Mentors and Leaders Initiative'
}) {
  if (variant === 'client-lockup') {
    return <ClientArt art={CLIENT_LOCKUP} height={height ?? size} title={title} className={className} />
  }
  if (variant === 'client-mark') {
    return <ClientArt art={CLIENT_MARK} height={height ?? size} title={title} className={className} />
  }

  if (variant === 'mark-mono' || variant === 'favicon') {
    return <MarkSVG variant={variant} size={size} title={title} />
  }

  const v = withWordmark ? 'horizontal' : variant

  if (v === 'horizontal') return <Horizontal size={size} light={light} title={title} />
  if (v === 'stacked')    return <Stacked    size={size} light={light} title={title} />

  return <MarkPNG size={size} light={light || variant === 'mark-light'} title={title} />
}

/* ============ Client artwork ============ */

// width and height are attributes rather than styles, so the box is reserved
// before CSS loads and nothing shifts. A className lets a layout override the
// height at a breakpoint; the viewBox keeps the ratio.
function ClientArt({ art, height, title, className }) {
  const width = Math.round((art.width / art.height) * height)

  return (
    <svg
      className={className || undefined}
      width={width}
      height={height}
      viewBox={`0 0 ${art.width} ${art.height}`}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <title>{title}</title>
      <path d={art.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

/* ============ PNG mark (default rendering) ============ */

function MarkPNG({ size, light, title }) {
  if (light) {
    return (
      <img
        src={logomarkLight256}
        alt={title}
        width={size}
        height={size}
        decoding="async"
        style={{ display: 'block' }}
      />
    )
  }

  // Pick 1x/2x sources based on the requested display size so retina stays sharp.
  let src1x, src2x
  if (size <= 64)       { src1x = logomark64;  src2x = logomark128 }
  else if (size <= 128) { src1x = logomark128; src2x = logomark256 }
  else                  { src1x = logomark256; src2x = logomark256 }

  return (
    <img
      src={src1x}
      srcSet={`${src1x} 1x, ${src2x} 2x`}
      alt={title}
      width={size}
      height={size}
      decoding="async"
      style={{ display: 'block' }}
    />
  )
}

/* ============ SVG fallback for variants PNG cannot represent ============ */

function MarkSVG({ variant, size, title }) {
  const isMono = variant === 'mark-mono'
  const isFav  = variant === 'favicon'

  const leftFill   = isMono ? 'currentColor' : '#0F766E'
  const rightFill  = isMono ? 'currentColor' : '#14B8A6'
  const stemStroke = isMono ? 'currentColor' : '#0F766E'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path d="M 32 46 A 20 20 0 0 1 46 16 A 20 20 0 0 1 32 46 Z" fill={rightFill}/>
      <path d="M 32 46 A 20 20 0 0 0 18 16 A 20 20 0 0 0 32 46 Z" fill={leftFill}/>
      {!isFav && (
        <path d="M 32 46 L 32 56" stroke={stemStroke} strokeWidth="3.5" strokeLinecap="round"/>
      )}
    </svg>
  )
}

/* ============ Wordmark composites ============ */

function Horizontal({ size, light, title }) {
  const wordColor = light ? '#FFFFFF' : '#0F172A'
  return (
    <span
      role="img"
      aria-label={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', lineHeight: 1 }}
    >
      <MarkPNG size={size} light={light} title={title} />
      <span style={{
        fontFamily: 'Poppins, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: size * 0.55,
        letterSpacing: '-0.01em',
        color: wordColor
      }}>
        Toolvine
      </span>
    </span>
  )
}

function Stacked({ size, light, title }) {
  const wordColor = light ? '#FFFFFF' : '#0F172A'
  const subColor  = light ? '#5EEAD4' : '#475569'
  return (
    <span
      role="img"
      aria-label={title}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', lineHeight: 1 }}
    >
      <MarkPNG size={size} light={light} title={title} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{
          fontFamily: 'Poppins, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: size * 0.45,
          letterSpacing: '-0.01em',
          color: wordColor
        }}>
          Toolvine
        </span>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: size * 0.2,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: subColor
        }}>
          Mentors and Leaders Initiative
        </span>
      </span>
    </span>
  )
}
