'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MODES = [
  {
    id: 'rabbit-hole',
    name: 'The Rabbit Hole',
    tagline: 'Follow a thread together. See where it leads.',
    description: 'Nora sends you both down separate threads of the same topic. You find things, drop them, compare. She brings it to a payoff neither of you saw coming.',
    accent: '#4338CA',
    accentLight: '#EEF2FF',
    icon: '🕳️',
    available: true,
  },
  {
    id: 'challenge',
    name: 'The Challenge',
    tagline: 'A constraint, a timer, a real result.',
    description: 'Nora gives you a creative limitation and a clock. You make something together under pressure.',
    accent: '#D97706',
    accentLight: '#FFFBEB',
    icon: '⚡',
    available: false,
  },
  {
    id: 'remake',
    name: 'The Remake',
    tagline: 'Recreate something from your story.',
    description: 'Nora picks a moment from your relationship history. You stage it again.',
    accent: '#E11D48',
    accentLight: '#FFF1F2',
    icon: '🎬',
    available: false,
  },
  {
    id: 'hot-take',
    name: 'Hot Take',
    tagline: 'Rapid fire. Agree or disagree.',
    description: 'Nora reads the room and fires opinions at both of you. See where you land.',
    accent: '#0D9488',
    accentLight: '#F0FDFA',
    icon: '🔥',
    available: false,
  },
  {
    id: 'the-hunt',
    name: 'The Hunt',
    tagline: 'Nora builds you a scavenger hunt.',
    description: 'A trail of clues built from things Nora knows about you. Follow it together.',
    accent: '#7C3AED',
    accentLight: '#F5F3FF',
    icon: '🗺️',
    available: false,
  },
]

export default function GameRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, game_interests_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.game_interests_completed) {
        router.push('/game-room/onboarding')
        return
      }

      if (profile?.display_name) setUserName(profile.display_name)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '56px 24px 120px' }}>

        {/* Header card — indigo gradient, stays in card not full bleed */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
          borderRadius: '20px',
          padding: '28px 24px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '30px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Saturday</p>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '32px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 8px', lineHeight: 1.2 }}>
              The Game Room
            </h1>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>
              What kind of Saturday is it?
            </p>
          </div>
        </div>

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => mode.available && router.push(`/game-room/lobby?mode=${mode.id}`)}
              style={{
                background: '#FFFFFF',
                border: `0.5px solid #E8DDD0`,
                borderRadius: '20px',
                padding: '20px',
                textAlign: 'left',
                cursor: mode.available ? 'pointer' : 'default',
                opacity: mode.available ? 1 : 0.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                width: '100%',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: mode.accentLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}>
                {mode.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', fontWeight: 400, color: '#1A1A1A', margin: 0 }}>
                    {mode.name}
                  </p>
                  {!mode.available && (
                    <span style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#B8A898', textTransform: 'uppercase', background: '#F5F0EA', borderRadius: '6px', padding: '2px 7px' }}>
                      Soon
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: mode.accent, fontWeight: 500, margin: '0 0 6px' }}>
                  {mode.tagline}
                </p>
                <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.5, margin: 0 }}>
                  {mode.description}
                </p>
              </div>

              {mode.available && (
                <span style={{ color: mode.accent, fontSize: '20px', flexShrink: 0, alignSelf: 'center' }}>›</span>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
