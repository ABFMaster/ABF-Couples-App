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
      { title: 'Daily Check-in', desc: 'Two minutes. One question. Both of you.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8614D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
      { title: 'Wander', desc: 'Dream a trip together — even on a Tuesday.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8614D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
      { title: 'Flirts', desc: 'Send something that makes them smile.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8614D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
      { title: 'Us', desc: 'Movies, restaurants, ideas — your shared wishlist.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8614D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
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
      router.push('/onboarding')
      return
    }
    setExiting(true)
    setTimeout(() => {
      setScreen(s => s + 1)
      setExiting(false)
    }, 200)
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex flex-col">

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-12 pb-8">
        {SCREENS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === screen
                ? 'w-6 h-2 bg-[#E8614D]'
                : i < screen
                ? 'w-2 h-2 bg-[#E8614D] opacity-40'
                : 'w-2 h-2 bg-neutral-300'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col px-8 transition-opacity duration-200 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      >

        {/* Nora indicator */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/nora-avatar.svg" alt="Nora" className="w-10 h-10 rounded-full flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-neutral-900">Nora</p>
            <p className="text-[11px] text-neutral-400">{current.label}</p>
          </div>
        </div>

        {/* Hero message */}
        <h1
          className="text-[32px] text-neutral-900 leading-[1.25] mb-6"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
        >
          {current.message}
        </h1>

        {/* Subtext */}
        {current.sub && (
          <p className="text-[16px] text-neutral-500 leading-[1.65] mb-8">
            {current.sub}
          </p>
        )}

        {/* Feature cards (screen 3 only) */}
        {current.features && (
          <div className="space-y-3 mb-8">
            {current.features.map(f => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(232,97,77,0.08)] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-neutral-900">{f.title}</p>
                  <p className="text-[12px] text-neutral-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* CTA */}
      <div className="px-8 pb-16">
        <button
          onClick={handleNext}
          className="w-full min-h-[54px] bg-[#E8614D] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center active:scale-[0.98] transition-transform shadow-md"
        >
          {current.cta}
        </button>

        {screen > 0 && (
          <button
            onClick={() => setScreen(s => s - 1)}
            className="w-full mt-3 py-3 text-[13px] text-neutral-400 font-medium"
          >
            ← Back
          </button>
        )}
      </div>

    </div>
  )
}
