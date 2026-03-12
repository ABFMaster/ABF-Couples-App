'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MODE_ICONS = {
  song: '🎵',
  gif: '🎉',
  place: '📍',
  memory: '💭',
  prompt: '💬',
}

export default function FlirtsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [partnerId, setPartnerId] = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [currentFlirt, setCurrentFlirt] = useState(null)
  const [pastFlirts, setPastFlirts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(false)

  const generateFlirt = useCallback(async (pid) => {
    setGenerating(true)
    setGenerateError(false)
    try {
      const res = await fetch('/api/flirts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: pid }),
      })
      const data = await res.json()
      if (data.flirt) {
        setCurrentFlirt(data.flirt)
        setPastFlirts(prev => [data.flirt, ...prev].slice(0, 5))
      } else {
        setGenerateError(true)
      }
    } catch {
      setGenerateError(true)
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }

      // Check flirt profile completion
      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('flirt_profile_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!myProfile?.flirt_profile_completed) {
        router.push('/flirts/onboarding')
        return
      }

      // Fetch couple
      const { data: couple } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!couple) { router.push('/connect'); return }

      const pid = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      setPartnerId(pid)

      // Fetch partner name
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', pid)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'your partner')

      // Fetch past Nora-generated flirts
      const { data: past } = await supabase
        .from('flirts')
        .select('id, mode, suggestion, nora_note, created_at')
        .eq('user_id', user.id)
        .eq('nora_generated', true)
        .order('created_at', { ascending: false })
        .limit(5)

      setPastFlirts(past || [])
      setLoading(false)

      // Auto-generate first suggestion
      await generateFlirt(pid)
    }

    init()
  }, [router, generateFlirt])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  // Past flirts excluding the current one
  const pastList = pastFlirts.filter(f => f.id !== currentFlirt?.id).slice(0, 3)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-24">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#F2A090]" />
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Flirts</span>
          </div>
          <h1
            className="text-[26px] text-neutral-900 leading-snug"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
          >
            For {partnerName}
          </h1>
        </div>

        {/* Current flirt card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-8">
          {generating ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#E8614D] border-t-transparent" />
              <p className="text-[13px] text-neutral-400">Nora is thinking…</p>
            </div>
          ) : generateError ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <p className="text-[14px] text-neutral-500">Something went wrong.</p>
              <button
                onClick={() => generateFlirt(partnerId)}
                className="px-5 py-2 bg-[#E8614D] text-white text-[13px] font-semibold rounded-full"
              >
                Try again
              </button>
            </div>
          ) : currentFlirt ? (
            <>
              {/* Mode badge */}
              <div className="mb-4">
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#E8614D]">
                  {MODE_ICONS[currentFlirt.mode] || ''} {currentFlirt.mode}
                </span>
              </div>

              {/* Suggestion */}
              <p
                className="text-[20px] text-neutral-900 leading-snug mb-4"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
              >
                {currentFlirt.suggestion}
              </p>

              {/* Nora's note */}
              {currentFlirt.nora_note && (
                <p className="text-[13px] text-neutral-400 italic leading-relaxed mb-6">
                  {currentFlirt.nora_note}
                </p>
              )}

              {/* Actions */}
              <button
                onClick={() => generateFlirt(partnerId)}
                disabled={generating}
                className="w-full py-3 bg-[#E8614D] text-white text-[15px] font-semibold rounded-full mb-3 disabled:opacity-50 transition-opacity"
              >
                Send it
              </button>
              <div className="text-center">
                <button
                  onClick={() => generateFlirt(partnerId)}
                  disabled={generating}
                  className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
                >
                  Get another
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Past flirts */}
        {pastList.length > 0 && (
          <div>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Recent ideas
            </div>
            <div className="space-y-2">
              {pastList.map(flirt => (
                <div
                  key={flirt.id}
                  className="bg-neutral-50 rounded-xl px-4 py-3 flex items-start gap-3"
                >
                  <span className="text-[13px] mt-0.5">{MODE_ICONS[flirt.mode] || ''}</span>
                  <div>
                    <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-neutral-400 mr-2">
                      {flirt.mode}
                    </span>
                    <p className="text-[13px] text-neutral-600 leading-snug mt-0.5">{flirt.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
