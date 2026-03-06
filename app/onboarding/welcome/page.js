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
      { title: 'Daily Check-in', desc: 'Two minutes. One question. Both of you.' },
      { title: 'Wander', desc: 'Dream a trip together — even on a Tuesday.' },
      { title: 'Flirts', desc: 'Send something that makes them smile.' },
      { title: 'Us', desc: 'Movies, restaurants, ideas — your shared wishlist.' },
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
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">
            {current.label}
          </span>
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
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex-shrink-0" />
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
