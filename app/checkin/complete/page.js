'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MOOD_OPTIONS } from '@/lib/checkin-questions'

export default function CheckinCompletePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [checkin, setCheckin] = useState(null)
  const [partnerCheckin, setPartnerCheckin] = useState(null)
  const [userName, setUserName] = useState('You')
  const [partnerName, setPartnerName] = useState('Partner')
  const [streak, setStreak] = useState(0)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    loadCheckinData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animate comparison reveal when partner data loads
  useEffect(() => {
    if (partnerCheckin) {
      setTimeout(() => setShowComparison(true), 300)
    }
  }, [partnerCheckin])

  const loadCheckinData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get user's name
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()

      if (userData?.name) {
        setUserName(userData.name.split(' ')[0])
      }

      // Get today's check-in
      const today = new Date().toISOString().split('T')[0]
      const { data: todayCheckin } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_date', today)
        .single()

      if (!todayCheckin) {
        router.push('/checkin')
        return
      }

      setCheckin(todayCheckin)

      // Get couple and partner info
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      if (coupleData) {
        const partnerId = coupleData.user1_id === user.id
          ? coupleData.user2_id
          : coupleData.user1_id

        if (partnerId) {
          // Get partner name
          const { data: partnerData } = await supabase
            .from('users')
            .select('name')
            .eq('id', partnerId)
            .single()

          if (partnerData?.name) {
            setPartnerName(partnerData.name.split(' ')[0])
          }

          // Check if partner has checked in today
          const { data: partnerCheckinData } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', partnerId)
            .eq('check_date', today)
            .single()

          if (partnerCheckinData) {
            setPartnerCheckin(partnerCheckinData)
          }
        }
      }

      // Calculate streak
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('check_date')
        .eq('user_id', user.id)
        .order('check_date', { ascending: false })
        .limit(30)

      if (checkins) {
        let currentStreak = 1
        const todayDate = new Date(today)
        let checkDate = new Date(todayDate)
        checkDate.setDate(checkDate.getDate() - 1)

        for (let i = 1; i < checkins.length; i++) {
          const checkinDate = new Date(checkins[i].check_date)
          checkinDate.setHours(0, 0, 0, 0)
          checkDate.setHours(0, 0, 0, 0)

          if (checkinDate.getTime() === checkDate.getTime()) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }

        setStreak(currentStreak)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading check-in:', err)
      setLoading(false)
    }
  }

  const getConnectionLabel = (score) => {
    switch (score) {
      case 5: return 'Very close'
      case 4: return 'Close'
      case 3: return 'Okay'
      case 2: return 'A bit off'
      case 1: return 'Distant'
      default: return ''
    }
  }

  const renderHearts = (score, filled = true) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < score ? 'text-[#C9184A]' : 'text-gray-200'}`}
        viewBox="0 0 24 24"
        fill={i < score ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={i < score ? 0 : 1.5}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="animate-pulse text-[#2D3648]">Loading...</div>
      </div>
    )
  }

  const userMood = MOOD_OPTIONS.find(m => m.value === checkin?.mood)
  const partnerMood = partnerCheckin
    ? MOOD_OPTIONS.find(m => m.value === partnerCheckin.mood)
    : null

  // Check if there's a notable difference in connection scores
  const connectionDifference = partnerCheckin
    ? Math.abs((checkin?.connection_score || 0) - (partnerCheckin?.connection_score || 0))
    : 0

  const bothCompleted = !!partnerCheckin

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#FF6B9D] to-[#C9184A] text-white p-6 pb-16 text-center">
        {/* Celebration icon */}
        <div className="text-6xl mb-4 animate-bounce">
          {bothCompleted ? '💕' : '✓'}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2">
          {bothCompleted ? 'You both checked in today!' : 'Check-in complete!'}
        </h1>

        {/* Streak */}
        {streak > 0 && (
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mt-2">
            <span className="text-xl">🔥</span>
            <span className="font-medium">{streak} day streak</span>
          </div>
        )}
        {streak === 0 && (
          <p className="text-white/80 text-sm mt-2">
            Great start! Come back tomorrow to build your streak
          </p>
        )}
      </div>

      <div className="p-6 -mt-10 space-y-4">
        {/* ===== VIEW 2: Both Completed - Side by Side Comparison ===== */}
        {bothCompleted && (
          <>
            {/* Side by Side Cards */}
            <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${
              showComparison ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {/* Your Card */}
              <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-[#FF6B9D]">
                <p className="text-xs text-[#6B7280] mb-3 font-medium">{userName}</p>

                {/* Mood */}
                <div className="text-center mb-4">
                  <span className="text-5xl">{userMood?.emoji}</span>
                  <p className="text-sm text-[#2D3648] mt-1 font-medium">{userMood?.label}</p>
                </div>

                {/* Connection */}
                <div className="mb-4">
                  <p className="text-xs text-[#6B7280] mb-1">Connection</p>
                  <div className="flex gap-0.5">
                    {renderHearts(checkin?.connection_score || 0)}
                  </div>
                  <p className="text-xs text-[#2D3648] mt-1">
                    {getConnectionLabel(checkin?.connection_score)}
                  </p>
                </div>

                {/* Response preview */}
                {checkin?.question_response && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-[#6B7280] line-clamp-2">
                      "{checkin.question_response}"
                    </p>
                  </div>
                )}
              </div>

              {/* Partner Card */}
              <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-[#C9184A]">
                <p className="text-xs text-[#6B7280] mb-3 font-medium">{partnerName}</p>

                {/* Mood */}
                <div className="text-center mb-4">
                  <span className="text-5xl">{partnerMood?.emoji}</span>
                  <p className="text-sm text-[#2D3648] mt-1 font-medium">{partnerMood?.label}</p>
                </div>

                {/* Connection */}
                <div className="mb-4">
                  <p className="text-xs text-[#6B7280] mb-1">Connection</p>
                  <div className="flex gap-0.5">
                    {renderHearts(partnerCheckin?.connection_score || 0)}
                  </div>
                  <p className="text-xs text-[#2D3648] mt-1">
                    {getConnectionLabel(partnerCheckin?.connection_score)}
                  </p>
                </div>

                {/* Response preview */}
                {partnerCheckin?.question_response && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-[#6B7280] line-clamp-2">
                      "{partnerCheckin.question_response}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Difference Alert */}
            {connectionDifference >= 2 && (
              <div className={`bg-amber-50 border border-amber-200 rounded-2xl p-4 transition-all duration-500 delay-200 ${
                showComparison ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💭</span>
                  <div>
                    <p className="font-medium text-amber-800">
                      You're feeling different levels of connection
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      This is a great opportunity to check in with each other about how things are going.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Start a Conversation Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className={`w-full py-4 rounded-2xl bg-[#2D3648] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#3D4658] transition-all duration-500 delay-300 ${
                showComparison ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span>💬</span>
              <span>Start a Conversation</span>
            </button>
          </>
        )}

        {/* ===== VIEW 1: Waiting for Partner ===== */}
        {!bothCompleted && (
          <>
            {/* Your Check-in Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Your Check-in</h2>

              <div className="flex items-center gap-6">
                {/* Mood */}
                <div className="text-center">
                  <span className="text-5xl">{userMood?.emoji}</span>
                  <p className="text-sm text-[#6B7280] mt-2">{userMood?.label}</p>
                </div>

                <div className="flex-1 h-px bg-gradient-to-r from-[#FF6B9D] to-[#C9184A]" />

                {/* Connection */}
                <div className="text-center">
                  <div className="flex gap-1 justify-center mb-2">
                    {renderHearts(checkin?.connection_score || 0)}
                  </div>
                  <p className="text-sm text-[#6B7280]">
                    {getConnectionLabel(checkin?.connection_score)}
                  </p>
                </div>
              </div>

              {/* Question Response */}
              {checkin?.question_text && checkin?.question_response && (
                <div className="bg-gray-50 rounded-xl p-4 mt-6">
                  <p className="text-sm text-[#6B7280] mb-2">{checkin.question_text}</p>
                  <p className="text-[#2D3648]">"{checkin.question_response}"</p>
                </div>
              )}
            </div>

            {/* Waiting for Partner Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-2xl animate-pulse">⏳</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-800 text-lg">
                    Waiting for {partnerName}...
                  </h3>
                  <p className="text-amber-600 text-sm mt-1">
                    You'll see how they're feeling once they check in
                  </p>
                </div>
              </div>

              {/* Nudge option */}
              <button className="w-full mt-4 py-3 rounded-xl border-2 border-amber-300 text-amber-700 font-medium hover:bg-amber-100 transition-colors">
                Send {partnerName} a Gentle Nudge
              </button>
            </div>
          </>
        )}

        {/* Streak Progress Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-[#2D3648] mb-4">Streak Progress</h3>

          {/* Milestone badges */}
          <div className="flex justify-between mb-3">
            {[
              { days: 1, icon: '⭐' },
              { days: 3, icon: '🔥' },
              { days: 7, icon: '🌟' },
              { days: 14, icon: '💪' },
              { days: 30, icon: '🏆' },
            ].map((milestone) => (
              <div
                key={milestone.days}
                className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all ${
                  streak >= milestone.days
                    ? 'bg-gradient-to-br from-[#FF6B9D] to-[#C9184A] text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span className="text-lg">{streak >= milestone.days ? milestone.icon : milestone.days}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, (streak / 30) * 100)}%` }}
            />
          </div>

          {/* Encouragement message */}
          <p className="text-sm text-[#6B7280] mt-3 text-center">
            {streak < 3 && `${3 - streak} more day${3 - streak > 1 ? 's' : ''} to unlock the fire badge!`}
            {streak >= 3 && streak < 7 && `${7 - streak} more days to a week streak!`}
            {streak >= 7 && streak < 14 && `${14 - streak} more days to 2 weeks!`}
            {streak >= 14 && streak < 30 && `${30 - streak} more days to champion status!`}
            {streak >= 30 && "You're a check-in champion! Keep it going!"}
          </p>
        </div>

        {/* Back to Dashboard Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white font-medium hover:shadow-lg transition-all"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
