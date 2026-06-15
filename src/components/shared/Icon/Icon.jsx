// Lucide-style monoline SVG, inline. Add icons as features need them.
const STROKE_DEFAULT = 1.75

const PATHS = {
  home:        <path d="M3 12 12 3l9 9M5 10v10h14V10"/>,
  dashboard:   <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  users:       <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M21 20c0-2.6-1.7-4.8-4-5.6"/></>,
  user:        <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
  pairings:    <><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4"/></>,
  calendar:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  meetings:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><circle cx="12" cy="15" r="1"/></>,
  resources:   <><path d="M4 5a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1A2 2 0 1 1 4.6 17l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1A2 2 0 1 1 7 4.6l.1.1a1.6 1.6 0 0 0 1.7.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></>,
  logout:      <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
  // menu: tightened to span x=3..21 (was x=4..20) so the glyph fills 75% of the viewBox instead of 67%.
  menu:        <path d="M3 6h18M3 12h18M3 18h18"/>,
  close:       <path d="M18 6 6 18M6 6l12 12"/>,
  // closeBold: bigger X for the hamburger toggle. Spans x=5..19 (14 units) vs close's 6..18 (12 units).
  closeBold:   <path d="M19 5 5 19M5 5l14 14"/>,
  check:       <path d="m5 12 5 5L20 7"/>,
  chevronRight:<path d="m9 6 6 6-6 6"/>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,

  book:        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>,
  bookOpen:    <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M12 6v13"/></>,
  link:        <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1"/></>,
  video:       <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m22 8-6 4 6 4Z"/></>,
  mail:        <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  lock:        <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  shieldCheck: <><path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12Z"/><path d="m9 12 2 2 4-4"/></>,
  phone:       <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .6 3 .7a2 2 0 0 1 1.6 2Z"/>,
  search:      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  plus:        <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  alert:       <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>,
  info:        <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>,
  eye:         <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  edit:        <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></>,

  clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  mic:         <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  mapPin:      <><path d="M12 21s-7-6.6-7-12a7 7 0 1 1 14 0c0 5.4-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></>,
  checkCircle: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,

  // Social platforms
  instagram:   <><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><path d="M17.5 6.5v.01"/></>,
  facebook:    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>,
  youtube:     <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
  tiktok:      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>,
  x:           <path d="M4 4l7 8.5L4 21h2l5.5-6.8L15 21h5l-7.2-8.7L20 4h-2l-5.3 6.5L9 4Z"/>,
  externalLink:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></>
}

export function Icon({ name, size = 20, strokeWidth = STROKE_DEFAULT, color = 'currentColor', className, label }) {
  const inner = PATHS[name]
  if (!inner) {
    if (import.meta.env.DEV) console.warn(`[Icon] unknown name: ${name}`)
    return null
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {inner}
    </svg>
  )
}
