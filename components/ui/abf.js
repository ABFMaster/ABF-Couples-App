'use client'
import { useRouter } from 'next/navigation'

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }) {
  const base = 'bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden'
  if (onClick) return (
    <button onClick={onClick} className={`${base} w-full text-left active:scale-[0.98] transition-transform ${className}`}>
      {children}
    </button>
  )
  return <div className={`${base} ${className}`}>{children}</div>
}

// ── PrimaryButton ─────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, href, disabled, className = '' }) {
  const router = useRouter()
  const base = 'w-full min-h-[54px] bg-[#E8614D] text-white rounded-xl px-6 py-4 font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50'
  if (href) return (
    <button onClick={() => router.push(href)} className={`${base} ${className}`}>
      {children}
    </button>
  )
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${className}`}>
      {children}
    </button>
  )
}

// ── IconContainer ─────────────────────────────────────────────────────────────
export function IconContainer({ children, className = '' }) {
  return (
    <div className={`w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 ${className}`}>
      {children}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ label, action, actionHref }) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <span className="text-[11px] font-700 tracking-[0.09em] uppercase text-neutral-400 font-bold">
        {label}
      </span>
      {action && actionHref && (
        <button
          onClick={() => router.push(actionHref)}
          className="text-[12px] font-semibold text-[#E8614D]"
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ── ReflectionCard ────────────────────────────────────────────────────────────
export function ReflectionCard({ message, subtext, pill }) {
  return (
    <Card className="p-6">
      {pill && (
        <span className="inline-block text-[10px] font-bold tracking-[0.1em] uppercase text-[#E8614D] bg-[#FEF3F1] border border-[#F5C9C2] rounded-full px-3 py-1 mb-4">
          {pill}
        </span>
      )}
      <p className="font-serif text-[22px] font-normal leading-[1.4] text-neutral-900 mb-2"
         style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {message}
      </p>
      {subtext && (
        <p className="text-[13px] text-neutral-400 font-normal">{subtext}</p>
      )}
    </Card>
  )
}

// ── ActionCard ────────────────────────────────────────────────────────────────
export function ActionCard({ icon, verb, hint, nudge, urgent, onClick, wide }) {
  const base = urgent
    ? 'bg-[#FEF3F1] border-[#F5C9C2]'
    : 'bg-white border-neutral-200'

  if (wide) return (
    <Card onClick={onClick} className={`${base} p-4`}>
      <div className="flex items-center gap-4">
        <IconContainer className={urgent ? 'bg-[#FEF3F1]' : ''}>
          {icon}
        </IconContainer>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{verb}</p>
          {hint && <p className="text-[11px] text-neutral-400 mt-0.5">{hint}</p>}
        </div>
        <span className="text-neutral-300 text-xl flex-shrink-0">›</span>
      </div>
    </Card>
  )

  return (
    <Card onClick={onClick} className={`${base} p-4 min-h-[120px] flex flex-col`}>
      <IconContainer className={`mb-3 ${urgent ? 'bg-[rgba(232,97,77,0.1)]' : ''}`}>
        {icon}
      </IconContainer>
      <p className="text-[13px] font-semibold text-neutral-900 leading-snug mb-1">{verb}</p>
      {hint && <p className="text-[11px] text-neutral-400 leading-snug mt-auto">{hint}</p>}
      {nudge && <p className="text-[11px] font-semibold text-[#E8614D] mt-2">{nudge}</p>}
    </Card>
  )
}

// ── ReadingCard ───────────────────────────────────────────────────────────────
export function ReadingCard({ source, sourceColor, title, description, readTime, url }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                style={{ backgroundColor: sourceColor || '#3D3580' }}
              >
                {source}
              </span>
              {readTime && (
                <span className="text-[11px] text-neutral-400">{readTime}</span>
              )}
            </div>
            <p className="text-[15px] font-semibold text-neutral-900 leading-snug line-clamp-2"
               style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
              {title}
            </p>
            {description && (
              <p className="text-[12px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <div className="w-14 h-14 rounded-xl bg-neutral-100 flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl">📖</span>
          </div>
        </div>
      </Card>
    </a>
  )
}

// ── AppHeader (used on sub-screens, not dashboard) ────────────────────────────
export function AppHeader({ title, back, backHref }) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-lg mx-auto px-6 h-14 flex items-center gap-3">
        {back && (
          <button
            onClick={() => backHref ? router.push(backHref) : router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            ‹
          </button>
        )}
        <h1 className="text-[17px] font-semibold text-neutral-900 flex-1">{title}</h1>
      </div>
    </header>
  )
}
