'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { nowPST } from '@/lib/date-utils'

export default function WeeklyReflection() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [isUser1, setIsUser1] = useState(true)
  const [userName, setUserName] = useState('You')
  const [partnerName, setPartnerName] = useState('Partner')
  const [weekCheckins, setWeekCheckins] = useState([])
  const [weeklyReflection, setWeeklyReflection] = useState(null)
  const [weekStartStr, setWeekStartStr] = useState('')

  // Form state
  const [selectedCheckinId, setSelectedCheckinId] = useState(null)
  const [reasonText, setReasonText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Celebration state
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // Enhancement state (Parts 2, 3, 4)
  const [healthDelta, setHealthDelta] = useState(null)
  const [nudgeSent, setNudgeSent] = useState(false)
  const [nudgeError, setNudgeError] = useState(null)
  const [aiInsight, setAiInsight] = useState(null)

  // Check if within reflection window (Friday-Sunday)
  const isReflectionWindow = () => {
    const dayOfWeek = nowPST().getDay()
    return dayOfWeek >= 5 || dayOfWeek === 0
  }

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)
      const userIsUser1 = coupleData.user1_id === user.id
      setIsUser1(userIsUser1)

      const partnerId = userIsUser1 ? coupleData.user2_id : coupleData.user1_id

      // Fetch current user's display name
      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle()
      setUserName(myProfile?.display_name || 'You')

      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'Partner')

      // Calculate week start (Monday) in PST
      const pstNow = nowPST()
      const dayOfWeek = pstNow.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(pstNow)
      weekStart.setDate(pstNow.getDate() + mondayOffset)
      const weekStartString = weekStart.toISOString().split('T')[0]
      setWeekStartStr(weekStartString)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekEndString = weekEnd.toISOString().split('T')[0]

      // Fetch week's check-ins
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('couple_id', coupleData.id)
        .gte('check_date', weekStartString)
        .lte('check_date', weekEndString)
        .order('check_date', { ascending: true })

      // Filter to only completed check-ins (answered)
      const completedCheckins = (checkins || []).filter(
        c => c.question_response
      )
      setWeekCheckins(completedCheckins)

      // Fetch existing reflection
      const { data: reflection } = await supabase
        .from('weekly_reflections')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('week_start', weekStartString)
        .maybeSingle()

      setWeeklyReflection(reflection)

      // Check if both just completed and show celebration
      if (reflection?.user1_completed_at && reflection?.user2_completed_at) {
        const myCompletedAt = userIsUser1 ? reflection.user1_completed_at : reflection.user2_completed_at
        const completedTime = new Date(myCompletedAt).getTime()
        const now = Date.now()
        if (now - completedTime < 30000) {
          setShowCelebration(true)
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 5000)
        }
      }

      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Part 4 — AI insight generator
  const generateInsight = async (reflection, checkins) => {
    try {
      const user1Pick = checkins.find(
        c => c.id === reflection.user1_favorite_checkin_id
      )?.question_response
      const user2Pick = checkins.find(
        c => c.id === reflection.user2_favorite_checkin_id
      )?.question_response

      const res = await fetch('/api/weekly-reflection/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflectionId: reflection.id,
          coupleId: couple.id,
          user1Name: isUser1 ? userName : partnerName,
          user2Name: isUser1 ? partnerName : userName,
          user1Pick,
          user2Pick,
          user1Reason: reflection.user1_reason,
          user2Reason: reflection.user2_reason,
        }),
      })
      const data = await res.json()
      if (data.insight) setAiInsight(data.insight)
    } catch (err) {
    }
  }

  // Part 3 — nudge partner via flirt
  const sendNudge = async () => {
    if (nudgeSent) return
    const partnerId = couple ? (isUser1 ? couple.user2_id : couple.user1_id) : null
    if (!couple?.id || !user?.id || !partnerId) {
      setNudgeError('Missing data: ' + JSON.stringify({ couple: !!couple, user: !!user, partnerId }))
      return
    }
    try {
      const { data, error } = await supabase
        .from('flirts')
        .insert({
          couple_id: couple.id,
          sender_id: user.id,
          receiver_id: partnerId,
          message: 'I finished my weekly reflection — your turn! 👀💕',
          type: 'text',
        })
        .select()
      if (error) {
        setNudgeError(error.message)
        return
      }
      setNudgeSent(true)
    } catch (err) {
      setNudgeError(err.message)
    }
  }

  const handleSubmit = async () => {
    if (!selectedCheckinId || submitting) return

    setSubmitting(true)

    try {
      const updateData = isUser1
        ? {
            user1_favorite_checkin_id: selectedCheckinId,
            user1_reason: reasonText.trim() || null,
            user1_completed_at: new Date().toISOString()
          }
        : {
            user2_favorite_checkin_id: selectedCheckinId,
            user2_reason: reasonText.trim() || null,
            user2_completed_at: new Date().toISOString()
          }

      let updatedReflection

      if (weeklyReflection) {
        const { data, error } = await supabase
          .from('weekly_reflections')
          .update(updateData)
          .eq('id', weeklyReflection.id)
          .select()
          .maybeSingle()

        if (error) throw error
        updatedReflection = data
      } else {
        const { data, error } = await supabase
          .from('weekly_reflections')
          .insert({
            couple_id: couple.id,
            week_start: weekStartStr,
            ...updateData
          })
          .select()
          .maybeSingle()

        if (error) throw error
        updatedReflection = data
      }

      setWeeklyReflection(updatedReflection)

      const bothCompleted = updatedReflection.user1_completed_at && updatedReflection.user2_completed_at

      if (bothCompleted) {
        // Award points to both users
        await supabase.from('relationship_points').insert([
          {
            couple_id: couple.id,
            user_id: couple.user1_id,
            points: 50,
            action: 'weekly_reflection_complete',
            reference_id: updatedReflection.id
          },
          {
            couple_id: couple.id,
            user_id: couple.user2_id,
            points: 50,
            action: 'weekly_reflection_complete',
            reference_id: updatedReflection.id
          }
        ])

        // Part 2 — fetch health score before RPC
        const { data: healthBefore } = await supabase
          .from('relationship_health')
          .select('overall_score')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Trigger health recalculation
        await supabase.rpc('calculate_relationship_health', { p_couple_id: couple.id })

        // Part 2 — fetch health score after RPC
        const { data: healthAfter } = await supabase
          .from('relationship_health')
          .select('overall_score')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (healthBefore?.overall_score && healthAfter?.overall_score) {
          setHealthDelta(healthAfter.overall_score - healthBefore.overall_score)
        }

        // Part 4 — generate AI insight if not already present
        if (!updatedReflection.ai_insight) {
          generateInsight(updatedReflection, weekCheckins)
        }

        // Show celebration
        setShowCelebration(true)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Determine state
  const myCompleted = weeklyReflection && (isUser1 ? weeklyReflection.user1_completed_at : weeklyReflection.user2_completed_at)
  const partnerCompleted = weeklyReflection && (isUser1 ? weeklyReflection.user2_completed_at : weeklyReflection.user1_completed_at)
  const bothCompleted = myCompleted && partnerCompleted

  // Get my selection and partner's selection for completed state
  const myFavoriteId = isUser1 ? weeklyReflection?.user1_favorite_checkin_id : weeklyReflection?.user2_favorite_checkin_id
  const myReason = isUser1 ? weeklyReflection?.user1_reason : weeklyReflection?.user2_reason
  const partnerFavoriteId = isUser1 ? weeklyReflection?.user2_favorite_checkin_id : weeklyReflection?.user1_favorite_checkin_id
  const partnerReason = isUser1 ? weeklyReflection?.user2_reason : weeklyReflection?.user1_reason

  const myFavoriteCheckin = weekCheckins.find(c => c.id === myFavoriteId)
  const partnerFavoriteCheckin = weekCheckins.find(c => c.id === partnerFavoriteId)

  // Split checkins by user
  const partnerId = couple ? (isUser1 ? couple.user2_id : couple.user1_id) : null
  const partnerWeekCheckins = weekCheckins.filter(c => c.user_id === partnerId)
  const myCheckinsMap = weekCheckins
    .filter(c => c.user_id === user?.id)
    .reduce((map, c) => { map[c.check_date] = c; return map; }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6EF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-500 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Outside reflection window
  if (!isReflectionWindow()) {
    return (
      <div className="min-h-screen bg-[#FDF6EF] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-coral-600 hover:text-coral-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <img src="/logo-wordmark.png" alt="ABF" className="h-8 w-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reflections Open Every Friday!</h2>
            <p className="text-gray-600 mb-6">
              Come back Friday to reflect on your week together. The reflection window is open Friday through Sunday.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-coral-400 to-coral-500 text-white px-6 py-3 rounded-full font-semibold hover:from-coral-500 hover:to-coral-600 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No check-ins this week
  if (weekCheckins.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF6EF] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-coral-600 hover:text-coral-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <img src="/logo-wordmark.png" alt="ABF" className="h-8 w-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Check-ins Yet This Week</h2>
            <p className="text-gray-600 mb-6">
              Start your daily practice together! Complete check-ins throughout the week, then come back to reflect on your favorites.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-coral-400 to-coral-500 text-white px-6 py-3 rounded-full font-semibold hover:from-coral-500 hover:to-coral-600 transition-all"
            >
              Go to Daily Check-in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EF] p-4 pb-24 relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['💕', '✨', '💗', '🌟', '💖'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-coral-600 hover:text-coral-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <img src="/logo-wordmark.png" alt="ABF" className="h-8 w-auto" />
        </div>

        {/* STATE C: Both Completed */}
        {bothCompleted && (
          <div className="space-y-6 animate-fadeIn">
            {/* Celebration Header */}
            {showCelebration && (
              <div className="bg-gradient-to-r from-coral-500 to-indigo-500 rounded-2xl shadow-xl p-6 text-white text-center">
                <div className="text-5xl mb-3">✨💕✨</div>
                <h2 className="text-2xl font-bold mb-2">You're Seeing Each Other!</h2>
                <p className="text-coral-100">Your reflections bring you closer together</p>
              </div>
            )}

            {/* Part 2 — Health Delta */}
            {healthDelta !== null && healthDelta !== 0 && (
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <p className="text-gray-500 text-sm">Relationship Health</p>
                <p className="text-2xl font-bold text-[#E8614D]">
                  {healthDelta > 0 ? '+' : ''}{healthDelta} points
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  from this week's reflection
                </p>
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 text-center">This Week's Moments 💕</h2>

            {/* What I picked from partner's answers */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-coral-600 mb-4">
                You picked from {partnerName}'s answers:
              </h3>
              {myFavoriteCheckin && (
                <div className="bg-gradient-to-r from-cream-50 to-[#FDF6EF] rounded-xl p-4 border-2 border-coral-100">
                  <p className="text-sm text-gray-500 mb-2">{formatDate(myFavoriteCheckin.check_date)}</p>
                  <p className="text-sm text-gray-600 italic mb-3">"{myFavoriteCheckin.question_text}"</p>
                  <div className="bg-cream-100 rounded-lg p-3 mb-3">
                    <p className="text-gray-800 font-medium">{partnerName}'s answer:</p>
                    <p className="text-gray-700">{myFavoriteCheckin.question_response}</p>
                  </div>
                  {myReason && (
                    <div className="bg-cream-100 rounded-lg p-3">
                      <p className="text-sm text-coral-600 font-medium">Why you picked this:</p>
                      <p className="text-gray-700">{myReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* What partner picked from my answers */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-indigo-500 mb-4">
                {partnerName} picked from your answers:
              </h3>
              {partnerFavoriteCheckin && (
                <div className="bg-gradient-to-r from-[#FDF6EF] to-cream-50 rounded-xl p-4 border-2 border-indigo-400">
                  <p className="text-sm text-gray-500 mb-2">{formatDate(partnerFavoriteCheckin.check_date)}</p>
                  <p className="text-sm text-gray-600 italic mb-3">"{partnerFavoriteCheckin.question_text}"</p>
                  <div className="bg-cream-100 rounded-lg p-3 mb-3">
                    <p className="text-gray-800 font-medium">Your answer:</p>
                    <p className="text-gray-700">{partnerFavoriteCheckin.question_response}</p>
                  </div>
                  {partnerReason && (
                    <div className="bg-cream-100 rounded-lg p-3">
                      <p className="text-sm text-indigo-500 font-medium">Why {partnerName} picked this:</p>
                      <p className="text-gray-700">{partnerReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Part 4 — AI Coach Insight */}
            {(aiInsight || weeklyReflection?.ai_insight) && (
              <div className="bg-gradient-to-r from-[#E8614D] to-[#3D3580] rounded-2xl p-6 text-white">
                <p className="text-xs font-medium opacity-75 mb-2">
                  💡 Coach Insight
                </p>
                <p className="text-white leading-relaxed">
                  {aiInsight || weeklyReflection?.ai_insight}
                </p>
              </div>
            )}

            {/* Back button */}
            <div className="text-center pt-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-coral-400 to-indigo-400 text-white px-8 py-3 rounded-full font-semibold hover:from-coral-500 hover:to-indigo-600 transition-all transform hover:scale-105"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STATE B: I completed, partner hasn't */}
        {myCompleted && !partnerCompleted && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Reflection is Saved!</h2>
              <p className="text-gray-600 mb-4">
                Waiting for {partnerName} to complete their reflection...
              </p>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-coral-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-coral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-coral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>

              {/* Part 3 — Nudge button */}
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm mb-3">
                  Want to give {partnerName} a nudge?
                </p>
                <button
                  onClick={() => alert('button works')}
                  className="bg-[#E8614D] text-white px-6 py-2 rounded-full text-sm font-medium"
                >
                  Test Click
                </button>
                {nudgeError && (
                  <p className="text-red-500 text-xs mt-2">{nudgeError}</p>
                )}
                <p className="text-gray-300 text-xs mt-2">
                  Or tell them in person — even better 💕
                </p>
              </div>
            </div>

            {/* Show what I picked */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-coral-600 mb-4">Your Selection:</h3>
              {myFavoriteCheckin && (
                <div className="bg-gradient-to-r from-cream-50 to-[#FDF6EF] rounded-xl p-4 border-2 border-coral-100">
                  <p className="text-sm text-gray-500 mb-2">{formatDate(myFavoriteCheckin.check_date)}</p>
                  <p className="text-sm text-gray-600 italic mb-3">"{myFavoriteCheckin.question_text}"</p>
                  <div className="bg-cream-100 rounded-lg p-3 mb-3">
                    <p className="text-gray-800 font-medium">{partnerName}'s answer:</p>
                    <p className="text-gray-700">{myFavoriteCheckin.question_response}</p>
                  </div>
                  {myReason && (
                    <div className="bg-cream-100 rounded-lg p-3">
                      <p className="text-sm text-coral-600 font-medium">Why this stood out:</p>
                      <p className="text-gray-700">{myReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* This week's check-ins (read-only) */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">This Week's Moments</h3>
              <div className="space-y-3">
                {partnerWeekCheckins.map(checkin => (
                  <div
                    key={checkin.id}
                    className={`p-4 rounded-xl ${
                      checkin.id === myFavoriteId
                        ? 'bg-cream-100 border-2 border-coral-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-sm text-gray-500 mb-1">{formatDate(checkin.check_date)}</p>
                    <p className="text-sm text-gray-600 italic">"{checkin.question_text}"</p>
                    {checkin.id === myFavoriteId && (
                      <span className="inline-block mt-2 text-xs bg-coral-500 text-white px-2 py-1 rounded-full">
                        Your pick
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-coral-600 hover:text-coral-700 font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STATE A: Haven't completed yet */}
        {!myCompleted && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">This Week's Moments 💕</h2>
              <p className="text-gray-600">
                Which of {partnerName}'s answers stood out this week?
              </p>
            </div>

            {/* Check-in cards */}
            <div className="space-y-4">
              {partnerWeekCheckins.map(checkin => {
                const partnerAnswer = checkin.question_response
                const myAnswer = myCheckinsMap[checkin.check_date]?.question_response
                const isSelected = selectedCheckinId === checkin.id

                return (
                  <div
                    key={checkin.id}
                    onClick={() => setSelectedCheckinId(checkin.id)}
                    className={`bg-white rounded-2xl shadow-lg p-5 cursor-pointer transition-all transform hover:scale-[1.02] ${
                      isSelected
                        ? 'border-3 border-coral-400 ring-2 ring-coral-100'
                        : 'border border-gray-100 hover:border-coral-100'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Radio button */}
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-all ${
                        isSelected ? 'border-coral-500 bg-coral-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">{formatDate(checkin.check_date)}</p>
                        <p className="text-sm text-gray-600 italic mb-3">"{checkin.question_text}"</p>

                        {/* Partner's answer - highlighted */}
                        <div className="rounded-xl p-3 mb-2 bg-cream-100">
                          <p className="text-xs text-indigo-500 font-medium mb-1">{partnerName}'s answer:</p>
                          <p className="text-gray-800">{partnerAnswer}</p>
                        </div>

                        {/* My answer - smaller, gray */}
                        {myAnswer && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                            <p className="text-gray-600 text-sm">{myAnswer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Reason textarea - shows after selection */}
            {selectedCheckinId && (
              <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
                <label className="block text-gray-700 font-medium mb-3">
                  Why did this stand out? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="What made this special?"
                  className="w-full p-4 border-2 border-coral-100 rounded-xl focus:border-coral-400 focus:outline-none resize-none h-24 transition-colors"
                />
              </div>
            )}

            {/* Submit button */}
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={!selectedCheckinId || submitting}
                className="w-full bg-gradient-to-r from-coral-400 to-indigo-400 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-coral-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                  </span>
                ) : (
                  'Share Your Reflection'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-confetti {
          animation: confetti 3s ease-in forwards;
        }
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  )
}
