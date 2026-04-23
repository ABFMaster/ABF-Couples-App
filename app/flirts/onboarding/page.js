'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NoraConversation from '@/components/NoraConversation'

const SYSTEM_PROMPT = `You are Nora, an off-the-clock relationship therapist who genuinely knows this couple. You are having a warm, curious, playful conversation to build a flirt profile for this user so you can suggest personalized flirts for their partner.

Your goal is to learn:
1. What makes their partner laugh (humor style)
2. What makes their partner feel seen or desired (flirt style — playful, romantic, bold, subtle)
3. 2-3 pieces of shared culture: movies, shows, music, places, memories that mean something to both of them
4. One specific memory or inside joke you can reference later

Rules:
- Ask one question at a time. Never list questions.
- Be warm and genuinely curious. React to what they tell you before asking the next thing.
- Keep your messages short — 2-3 sentences max.
- After you have learned all four things above, write a brief warm closing (2 sentences) telling them you have what you need and you are excited to get to work. End that message with the exact token: FLIRT_PROFILE_COMPLETE
- Never include FLIRT_PROFILE_COMPLETE in any message except the final one.`

const INITIAL_MESSAGE = `Okay, before I start sending you flirt ideas — I need to know who I'm working with. Not you. Them. What's one thing your partner does that makes you laugh without even trying?`

export default function FlirtOnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const handleComplete = async (messages) => {
    if (!userId) { console.error('[FlirtOnboarding] no userId at completion'); return }
    try {
      await fetch('/api/flirts/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userId }),
      })
    } catch (err) {
      console.error('[FlirtOnboarding] save-profile error:', err)
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-12 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#F2A090]" />
          <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
        </div>
        <h1
          className="text-[22px] text-neutral-900 leading-snug"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
        >
          Let&apos;s get to know your partner
        </h1>
      </div>

      {/* Conversation */}
      <div className="flex-1 min-h-0">
        <NoraConversation
          conversationKey="flirt-onboarding"
          systemPrompt={SYSTEM_PROMPT}
          initialMessage={INITIAL_MESSAGE}
          completionTrigger="FLIRT_PROFILE_COMPLETE"
          onComplete={handleComplete}
        />
      </div>
    </div>
  )
}
