'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SCREENS = [
  {
    id: 'intro',
    label: 'Nora',
    message: "Hi. I'm Nora — and I'm not a chatbot.",
    sub: "I pay attention to your relationship, ask the right questions, and show up when it matters. I'm here to help you two grow — not just track data.",
    cta: 'Nice to meet you →',
  },
  {
    id: 'how',
    label: 'How it works',
    message: "A little every day goes a long way.",
    sub: "A quick check-in. An occasional reflection. A flirt when you least expect it. Small things, done consistently, are what keep relationships alive.",
    cta: "That makes sense →",
  },
  {
    id: 'features',
    label: "What's inside",
    message: "Everything you need. Nothing you don't.",
    sub: null,
    cta: "Let's get started →",
    features: [
      { title: 'Daily Spark', desc: 'Two minutes. One question. Both of you.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
      { title: 'Game Room', desc: 'How well do you actually know each other?', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
      { title: 'Flirts', desc: 'Send something that makes them smile.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
      { title: 'Date Night', desc: 'Nora plans the whole thing. You just show up.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4714A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    ],
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [screen, setScreen] = useState(0)
  const [exiting, setExiting] = useState(false)

  const current = SCREENS[screen]
  const isLast = screen === SCREENS.length - 1

  const handleNext = () => {
    if (isLast) {
      router.push('/onboarding/privacy')
      return
    }
    setExiting(true)
    setTimeout(() => {
      setScreen(s => s + 1)
      setExiting(false)
    }, 200)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '48px', paddingBottom: '32px' }}>
        {SCREENS.map((_, i) => (
          <div
            key={i}
            style={{
              height: '6px',
              width: i === screen ? '20px' : '6px',
              borderRadius: '3px',
              background: i <= screen ? '#C4714A' : '#E8DDD0',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 32px', opacity: exiting ? 0 : 1, transition: 'opacity 0.2s' }}>

        {/* Nora indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <img src="/nora-avatar.svg" alt="Nora" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1C1208', margin: 0 }}>Nora</p>
            <p style={{ fontSize: '11px', color: '#A09080', margin: 0 }}>{current.label}</p>
          </div>
        </div>

        {/* Hero message */}
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, color: '#1C1208', lineHeight: 1.3, margin: '0 0 20px' }}>
          {current.message}
        </h1>

        {/* Subtext */}
        {current.sub && (
          <p style={{ fontSize: '16px', color: '#7A6A54', lineHeight: 1.65, margin: '0 0 32px' }}>
            {current.sub}
          </p>
        )}

        {/* Feature cards */}
        {current.features && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {current.features.map(f => (
              <div
                key={f.title}
                style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #EDE5D8', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(196, 113, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1C1208', margin: 0 }}>{f.title}</p>
                  <p style={{ fontSize: '12px', color: '#A09080', margin: '2px 0 0' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* CTA */}
      <div style={{ padding: '0 32px 48px' }}>
        <button
          onClick={handleNext}
          style={{ width: '100%', padding: '16px', background: '#C4714A', color: '#FAF6EF', fontSize: '16px', fontWeight: 600, borderRadius: '14px', border: 'none', cursor: 'pointer' }}
        >
          {current.cta}
        </button>

        {screen > 0 && (
          <button
            onClick={() => setScreen(s => s - 1)}
            style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', color: '#A09080', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>
        )}
      </div>

    </div>
  )
}
