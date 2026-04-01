'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NoraConversation from '@/components/NoraConversation'

const SYSTEM_PROMPT = `You are Nora — warm, curious, a little mischievous. You're having a short conversation to learn what this person is genuinely into so you can personalize their Saturday Game Room experience.

Your goal is to learn:
1. Topics or subjects they geek out on or could talk about for hours (history, science, true crime, food, sports, music, film, whatever)
2. Things that make them laugh — what kind of humor lands for them
3. 2-3 specific obsessions, fandoms, or rabbit holes they've fallen into (podcasts, shows, books, YouTube channels, anything)
4. Places they've been or want to go that stuck with them
5. One thing they and their partner both love or argue about passionately

Rules:
- Ask one question at a time. Never list questions.
- Be warm, playful and genuinely curious. React to what they tell you before moving on.
- Keep your messages short — 2-3 sentences max.
- This should feel like a fun conversation, not a form.
- After you have learned all five things, write a brief warm closing (2 sentences) telling them you have what you need and you're going to make their Saturdays interesting. End that closing message with the exact token: GAME_INTERESTS_COMPLETE
- Never include GAME_INTERESTS_COMPLETE in any message except the final one.`

const INITIAL_MESSAGE = `Before I can send you two somewhere interesting on a Saturday — I need to know what actually interests you. Not what you think sounds good. What you genuinely geek out on. What's something you know way more about than most people?`

export default function GameRoomOnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const handleComplete = async (messages) => {
    if (!userId) return
    try {
      await fetch('/api/game-room/save-interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userId }),
      })
    } catch (err) {
    }
    router.push('/game-room')
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {userId && (
        <NoraConversation
          systemPrompt={SYSTEM_PROMPT}
          initialMessage={INITIAL_MESSAGE}
          completionTrigger="GAME_INTERESTS_COMPLETE"
          onComplete={handleComplete}
          userId={userId}
        />
      )}
    </div>
  )
}
