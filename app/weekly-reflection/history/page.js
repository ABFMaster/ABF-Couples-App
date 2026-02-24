'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

function formatWeekRange(weekStartStr) {
  const start = new Date(weekStartStr + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export default function ReflectionHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isUser1, setIsUser1] = useState(true)
  const [userName, setUserName] = useState('You')
  const [partnerName, setPartnerName] = useState('Partner')
  const [reflections, setReflections] = useState([])
  const [checkinsMap, setCheckinsMap] = useState({}) // id → checkin record

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!coupleData) { router.push('/connect'); return }

      const userIsUser1 = coupleData.user1_id === user.id
      setIsUser1(userIsUser1)
      const partnerId = userIsUser1 ? coupleData.user2_id : coupleData.user1_id

      // Fetch display names
      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      setUserName(myProfile?.display_name || 'You')
      setPartnerName(partnerProfile?.display_name || 'Partner')

      // Fetch all completed reflections (both partners done)
      const { data: refs } = await supabase
        .from('weekly_reflections')
        .select('*')
        .eq('couple_id', coupleData.id)
        .not('user1_completed_at', 'is', null)
        .not('user2_completed_at', 'is', null)
        .order('week_start', { ascending: false })

      setReflections(refs || [])

      // Collect all check-in IDs referenced by these reflections
      const checkinIds = []
      for (const r of refs || []) {
        if (r.user1_favorite_checkin_id) checkinIds.push(r.user1_favorite_checkin_id)
        if (r.user2_favorite_checkin_id) checkinIds.push(r.user2_favorite_checkin_id)
      }

      if (checkinIds.length > 0) {
        const { data: checkins } = await supabase
          .from('daily_checkins')
          .select('id, question_text, question_response, check_date')
          .in('id', checkinIds)

        const map = {}
        for (const c of checkins || []) map[c.id] = c
        setCheckinsMap(map)
      }

      setLoading(false)
    } catch (err) {
      console.error('History fetch error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EF] pb-24">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#9CA3AF] hover:text-[#2D3648] text-sm mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-[#2D3648]">Our Reflections</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">A record of what you've noticed in each other</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {reflections.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm mt-4">
            <p className="text-5xl mb-4">💕</p>
            <p className="text-[#2D3648] font-semibold text-lg mb-2">No reflections yet</p>
            <p className="text-[#9CA3AF] text-sm max-w-xs mx-auto">
              Your reflection history will appear here after you complete your first weekly reflection together 💕
            </p>
          </div>
        ) : (
          reflections.map((reflection, index) => {
            const myPickId     = isUser1 ? reflection.user1_favorite_checkin_id : reflection.user2_favorite_checkin_id
            const partnerPickId = isUser1 ? reflection.user2_favorite_checkin_id : reflection.user1_favorite_checkin_id
            const myReason     = isUser1 ? reflection.user1_reason : reflection.user2_reason
            const partnerReason = isUser1 ? reflection.user2_reason : reflection.user1_reason
            const myPick       = checkinsMap[myPickId]
            const partnerPick  = checkinsMap[partnerPickId]
            const delta = reflection.health_score_before != null && reflection.health_score_after != null
              ? reflection.health_score_after - reflection.health_score_before
              : null

            return (
              <div key={reflection.id}>
                {/* Week heading */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                    Week of {formatWeekRange(reflection.week_start)}
                  </p>
                  {delta !== null && delta !== 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      delta > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-[#9CA3AF]'
                    }`}>
                      {delta > 0 ? '+' : ''}{delta} pts
                    </span>
                  )}
                </div>

                {/* Your pick */}
                {myPick && (
                  <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                    <p className="text-xs font-semibold text-[#E8614D] mb-2 uppercase tracking-wide">
                      You picked from {partnerName}'s answers
                    </p>
                    <p className="text-xs text-[#9CA3AF] italic mb-2">"{myPick.question_text}"</p>
                    <p className="text-[#2D3648] text-sm leading-relaxed">{myPick.question_response}</p>
                    {myReason && (
                      <p className="text-[#9CA3AF] text-xs mt-2 italic">Your reason: "{myReason}"</p>
                    )}
                  </div>
                )}

                {/* Partner's pick */}
                {partnerPick && (
                  <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                    <p className="text-xs font-semibold text-[#3D3580] mb-2 uppercase tracking-wide">
                      {partnerName} picked from your answers
                    </p>
                    <p className="text-xs text-[#9CA3AF] italic mb-2">"{partnerPick.question_text}"</p>
                    <p className="text-[#2D3648] text-sm leading-relaxed">{partnerPick.question_response}</p>
                    {partnerReason && (
                      <p className="text-[#9CA3AF] text-xs mt-2 italic">{partnerName}'s reason: "{partnerReason}"</p>
                    )}
                  </div>
                )}

                {/* AI Coach insight */}
                {reflection.ai_insight && (
                  <div className="bg-gradient-to-r from-[#E8614D] to-[#3D3580] rounded-2xl p-5 mb-3 text-white">
                    <p className="text-xs font-medium opacity-75 mb-2">💡 Coach Insight</p>
                    <p className="text-sm leading-relaxed">{reflection.ai_insight}</p>
                  </div>
                )}

                {/* Divider between weeks */}
                {index < reflections.length - 1 && (
                  <div className="border-t border-gray-100 mt-4" />
                )}
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
