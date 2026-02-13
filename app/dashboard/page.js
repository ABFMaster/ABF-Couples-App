'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HealthMeter from '@/components/HealthMeter'
import FlirtComposer from '@/components/FlirtComposer'
import FlirtView from '@/components/FlirtView'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [error, setError] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState({
    userCompleted: false,
    partnerCompleted: false,
    partnerName: 'Partner',
  })
  const healthMeterRef = useRef(null)

  // Daily Check-in State
  const [checkinExpanded, setCheckinExpanded] = useState(false)
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [todayQuestion, setTodayQuestion] = useState(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [isUser1, setIsUser1] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [streak, setStreak] = useState(0)

  // Celebration State (organic feedback, not gamified)
  const [celebration, setCelebration] = useState(null)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const [answerSubmitSuccess, setAnswerSubmitSuccess] = useState(false)
  const [commentSubmitSuccess, setCommentSubmitSuccess] = useState(false)

  // Weekly Reflection State
  const [weeklyReflection, setWeeklyReflection] = useState(null)
  const [isReflectionWindow, setIsReflectionWindow] = useState(false)
  const [weekCheckins, setWeekCheckins] = useState([])

  // Flirts State
  const [showFlirtComposer, setShowFlirtComposer] = useState(false)
  const [unreadFlirts, setUnreadFlirts] = useState([])
  const [latestFlirt, setLatestFlirt] = useState(null)
  const [selectedFlirt, setSelectedFlirt] = useState(null)
  const [showFlirtView, setShowFlirtView] = useState(false)
  const [partnerId, setPartnerId] = useState(null)
  const [lastSentFlirtTime, setLastSentFlirtTime] = useState(null)
  const [profileCompleted, setProfileCompleted] = useState(true)
  const [totalFlirtsSent, setTotalFlirtsSent] = useState(0)

  // Timeline State
  const [recentTimelineEvents, setRecentTimelineEvents] = useState([])

  // Date Night State
  const [upcomingDate, setUpcomingDate] = useState(null)
  const [pendingDateSuggestions, setPendingDateSuggestions] = useState(0)

  // Trip Planning State
  const [upcomingTrip, setUpcomingTrip] = useState(null)

  // Partner Connection State
  const [hasPartner, setHasPartner] = useState(true)
  const [connectCode, setConnectCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  // Daily relationship quotes/affirmations
  const dailyQuotes = [
    "The best relationships are built on small moments of connection.",
    "Love grows stronger when you choose each other every day.",
    "Being heard is so close to being loved that they are almost indistinguishable.",
    "The little things are the big things in a relationship.",
    "Love is not just looking at each other, it's looking in the same direction.",
    "A strong relationship requires choosing to love each other, even on those days when you struggle to like each other.",
    "The goal isn't to be the perfect couple—it's to be the perfect team.",
    "Small gestures of love create lasting bonds.",
    "In a relationship, you're each other's safe place to land.",
    "The best thing to hold onto in life is each other.",
    "Love is friendship that has caught fire.",
    "Being deeply loved gives you strength; loving deeply gives you courage.",
    "A successful relationship requires falling in love many times, always with the same person.",
    "The greatest relationships are the ones you never expected to be in.",
    "Love isn't finding the perfect person—it's seeing an imperfect person perfectly.",
    "Every love story is beautiful, but ours is my favorite.",
    "The real power of love is showing up consistently.",
    "Connection happens in the quiet moments between the busy ones.",
    "Your relationship is a garden—tend to it daily.",
    "The best conversations happen when you truly listen.",
    "Love is what you've been through together.",
    "Appreciation is the fuel that keeps love alive.",
    "In the arithmetic of love, one plus one equals everything.",
    "The most important thing in communication is hearing what isn't said.",
    "A gentle word can soften any heart.",
    "Love is an action, never simply a feeling.",
    "The couples who play together, stay together.",
    "Behind every great relationship is a pair of people who chose each other.",
    "Love is not about how many days you've been together—it's about how much you love each other every single day.",
    "The secret to a happy relationship? Never stop dating each other.",
    "Real love stories never have endings.",
    "A loving relationship is one in which you feel free to be yourself.",
    "The best partner is one who makes you want to be a better person.",
    "Love is being stupid together.",
    "What counts in a relationship is not avoiding conflict, but learning to repair.",
    "The greatest gift you can give someone is your undivided attention.",
    "In love, you don't just find the right person—you become the right person.",
    "Laughter is the spark that keeps love alive.",
    "Home is wherever I'm with you.",
    "The art of love is largely the art of persistence.",
    "A relationship is like a house—it needs constant maintenance.",
    "Love is not about possession; it's about appreciation.",
    "The most precious gift is presence.",
    "Every moment together is a memory in the making.",
    "Trust is the foundation of every great love story.",
  ]

  // Get today's quote using date-based seeding
  const getDailyQuote = () => {
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    const index = seed % dailyQuotes.length
    return dailyQuotes[index]
  }

  const dailyQuote = getDailyQuote()

  useEffect(() => {
    checkAuth()
  }, [])

  // Show celebration with auto-dismiss
  const showCelebration = (type, message, duration = 2000) => {
    setCelebration({ type, message })
    setTimeout(() => setCelebration(null), duration)
  }

  const fetchDailyCheckin = useCallback(async (coupleData, userId) => {
    const today = new Date().toISOString().split('T')[0]
    const userIsUser1 = coupleData.user1_id === userId
    setIsUser1(userIsUser1)

    let { data: checkin } = await supabase
      .from('daily_checkins')
      .select('*, checkin_questions(*)')
      .eq('couple_id', coupleData.id)
      .eq('date', today)
      .single()

    if (!checkin) {
      const questionId = await selectQuestion(coupleData.id)
      if (questionId) {
        const { data: newCheckin } = await supabase
          .from('daily_checkins')
          .insert({
            couple_id: coupleData.id,
            question_id: questionId,
            date: today,
          })
          .select('*, checkin_questions(*)')
          .single()
        checkin = newCheckin
      }
    }

    if (checkin) {
      setTodayCheckin(checkin)
      setTodayQuestion(checkin.checkin_questions)

      const existingAnswer = userIsUser1 ? checkin.user1_answer : checkin.user2_answer
      if (existingAnswer) {
        setMyAnswer(existingAnswer)
      }
    }

    await fetchStreak(coupleData.id)

    const dayOfWeek = new Date().getDay()
    if (dayOfWeek >= 5 || dayOfWeek === 0) {
      setIsReflectionWindow(true)
      await fetchWeeklyData(coupleData.id, userId, userIsUser1)
    }
  }, [])

  const selectQuestion = async (coupleId) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentCheckins } = await supabase
      .from('daily_checkins')
      .select('question_id')
      .eq('couple_id', coupleId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    const usedQuestionIds = recentCheckins?.map(c => c.question_id) || []

    const { data: allQuestions } = await supabase
      .from('checkin_questions')
      .select('*')

    if (!allQuestions || allQuestions.length === 0) return null

    let availableQuestions = allQuestions.filter(q => !usedQuestionIds.includes(q.id))

    if (availableQuestions.length === 0) {
      availableQuestions = allQuestions
    }

    const weightedQuestions = []
    availableQuestions.forEach(q => {
      if (q.tone === 'gratitude' || q.tone === 'fun') {
        weightedQuestions.push(q, q)
      } else if (q.tone === 'meaningful') {
        weightedQuestions.push(q, q)
      } else {
        weightedQuestions.push(q)
      }
    })

    const randomIndex = Math.floor(Math.random() * weightedQuestions.length)
    return weightedQuestions[randomIndex]?.id
  }

  const fetchStreak = async (coupleId) => {
    let currentStreak = 0
    let checkDate = new Date()

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_checkins')
        .select('user1_answer, user2_answer')
        .eq('couple_id', coupleId)
        .eq('date', dateStr)
        .single()

      if (data && data.user1_answer && data.user2_answer) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }

      if (currentStreak > 365) break
    }

    setStreak(currentStreak)
  }

  const fetchWeeklyData = async (coupleId, userId, userIsUser1) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() + mondayOffset)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('*, checkin_questions(*)')
      .eq('couple_id', coupleId)
      .gte('date', weekStartStr)
      .lte('date', weekEnd.toISOString().split('T')[0])
      .order('date', { ascending: true })

    setWeekCheckins(checkins || [])

    const { data: reflection } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('week_start', weekStartStr)
      .single()

    setWeeklyReflection(reflection)
  }

  const fetchFlirts = useCallback(async (coupleId, userId) => {
    // Get unread flirts for this user
    const { data: unread } = await supabase
      .from('flirts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    setUnreadFlirts(unread || [])
    if (unread && unread.length > 0) {
      setLatestFlirt(unread[0])
    }

    // Get total sent count
    const { count: sentCount } = await supabase
      .from('flirts')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('sender_id', userId)

    setTotalFlirtsSent(sentCount || 0)

    // Get last sent time
    const { data: lastSent } = await supabase
      .from('flirts')
      .select('created_at')
      .eq('couple_id', coupleId)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastSent) {
      setLastSentFlirtTime(new Date(lastSent.created_at))
    }
  }, [])

  const fetchTimelineEvents = useCallback(async (coupleId) => {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('couple_id', coupleId)
      .order('event_date', { ascending: false })
      .limit(3)

    setRecentTimelineEvents(data || [])
  }, [])

  const fetchDatePlans = useCallback(async (coupleId, userId) => {
    // Get next upcoming date
    const { data: upcoming } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', coupleId)
      .in('status', ['planned', 'accepted'])
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .limit(1)

    setUpcomingDate(upcoming?.[0] || null)

    // Count pending suggestions for this user
    const { count } = await supabase
      .from('date_plans')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('status', 'suggested')
      .eq('suggested_to', userId)

    setPendingDateSuggestions(count || 0)
  }, [])

  const fetchUpcomingTrip = useCallback(async (coupleId) => {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(1)
      .single()

    setUpcomingTrip(data)
  }, [])

  const checkAuth = async () => {
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
        .single()

      // Allow users without a couple to view dashboard with limited features
      if (coupleError || !coupleData) {
        setHasPartner(false)
        setLoading(false)
        return
      }

      setCouple(coupleData)
      setConnectCode(coupleData.connect_code || '')

      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setPartnerId(partnerUserId)

      // Check if partner is actually connected
      if (!partnerUserId) {
        setHasPartner(false)
      }

      const { data: userResponse } = await supabase
        .from('relationship_assessments')
        .select('id')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .not('completed_at', 'is', null)
        .single()

      const { data: partnerResponse } = await supabase
        .from('relationship_assessments')
        .select('id')
        .eq('user_id', partnerUserId)
        .eq('couple_id', coupleData.id)
        .not('completed_at', 'is', null)
        .single()

      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', partnerUserId)
        .single()

      setOnboardingStatus({
        userCompleted: !!userResponse,
        partnerCompleted: !!partnerResponse,
        partnerName: partnerProfile?.first_name || 'Partner',
      })

      // Check if user has completed their relationship assessment
      const { data: userAssessment } = await supabase
        .from('relationship_assessments')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .not('completed_at', 'is', null)
        .single()

      // Profile is completed if they have a completed assessment
      setProfileCompleted(!!userAssessment?.completed_at)

      await fetchDailyCheckin(coupleData, user.id)
      await fetchFlirts(coupleData.id, user.id)
      await fetchTimelineEvents(coupleData.id)
      await fetchDatePlans(coupleData.id, user.id)
      await fetchUpcomingTrip(coupleData.id)

      setLoading(false)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  // Track points silently in the background
  const trackPoints = async (action, points, referenceId) => {
    await supabase.from('relationship_points').insert({
      couple_id: couple.id,
      user_id: user.id,
      points,
      action,
      reference_id: referenceId,
    })
  }

  const handleSubmitAnswer = async () => {
    if (!myAnswer.trim() || !todayCheckin) return

    setSubmittingAnswer(true)

    const updateData = isUser1
      ? { user1_answer: myAnswer.trim(), user1_answered_at: new Date().toISOString() }
      : { user2_answer: myAnswer.trim(), user2_answered_at: new Date().toISOString() }

    const { data: updatedCheckin, error } = await supabase
      .from('daily_checkins')
      .update(updateData)
      .eq('id', todayCheckin.id)
      .select('*, checkin_questions(*)')
      .single()

    if (!error && updatedCheckin) {
      setTodayCheckin(updatedCheckin)

      // Show success checkmark animation
      setAnswerSubmitSuccess(true)
      setTimeout(() => setAnswerSubmitSuccess(false), 1500)

      const bothAnswered = updatedCheckin.user1_answer && updatedCheckin.user2_answer
      if (bothAnswered) {
        // Track points silently
        await trackPoints('checkin_complete', 5, todayCheckin.id)

        // Show warm celebration
        showCelebration('complete', "You're connecting daily", 2500)

        // Check for 7-day streak milestone
        const newStreak = streak + 1
        if (newStreak >= 7 && newStreak % 7 === 0) {
          await trackPoints('streak_bonus', 20, todayCheckin.id)
          setTimeout(() => {
            showCelebration('streak', `${newStreak} days together!`, 3000)
          }, 3000)
        }

        setStreak(newStreak)

        // Refresh health meter after completing check-in
        if (healthMeterRef.current) {
          setTimeout(() => {
            healthMeterRef.current()
          }, 1500)
        }
      }
    }

    setSubmittingAnswer(false)
  }

  const handleHeartPartner = async () => {
    if (!todayCheckin) return

    const currentHearted = isUser1 ? todayCheckin.user1_hearted : todayCheckin.user2_hearted
    const updateData = isUser1
      ? { user1_hearted: !currentHearted }
      : { user2_hearted: !currentHearted }

    // Trigger heart burst animation
    if (!currentHearted) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 600)
    }

    const { data: updatedCheckin } = await supabase
      .from('daily_checkins')
      .update(updateData)
      .eq('id', todayCheckin.id)
      .select('*, checkin_questions(*)')
      .single()

    if (updatedCheckin) {
      setTodayCheckin(updatedCheckin)

      // Track points for partner silently
      if (!currentHearted) {
        const partnerId = isUser1 ? couple.user2_id : couple.user1_id
        await supabase.from('relationship_points').insert({
          couple_id: couple.id,
          user_id: partnerId,
          points: 10,
          action: 'received_heart',
          reference_id: todayCheckin.id,
        })
      }
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !todayCheckin) return

    const updateData = isUser1
      ? { user1_comment: commentText.trim() }
      : { user2_comment: commentText.trim() }

    const { data: updatedCheckin } = await supabase
      .from('daily_checkins')
      .update(updateData)
      .eq('id', todayCheckin.id)
      .select('*, checkin_questions(*)')
      .single()

    if (updatedCheckin) {
      setTodayCheckin(updatedCheckin)
      setShowCommentInput(false)
      setCommentText('')

      // Show success animation
      setCommentSubmitSuccess(true)
      setTimeout(() => setCommentSubmitSuccess(false), 1500)

      // Show warm message
      showCelebration('comment', 'Building connection', 2000)

      // Track points for partner silently
      const partnerId = isUser1 ? couple.user2_id : couple.user1_id
      await supabase.from('relationship_points').insert({
        couple_id: couple.id,
        user_id: partnerId,
        points: 15,
        action: 'received_comment',
        reference_id: todayCheckin.id,
      })
    }
  }

  // Check-in state helpers
  const myAnswerSubmitted = todayCheckin && (isUser1 ? todayCheckin.user1_answer : todayCheckin.user2_answer)
  const partnerAnswerSubmitted = todayCheckin && (isUser1 ? todayCheckin.user2_answer : todayCheckin.user1_answer)
  const bothAnswered = myAnswerSubmitted && partnerAnswerSubmitted
  const partnerAnswer = isUser1 ? todayCheckin?.user2_answer : todayCheckin?.user1_answer
  const partnerHearted = isUser1 ? todayCheckin?.user2_hearted : todayCheckin?.user1_hearted
  const partnerComment = isUser1 ? todayCheckin?.user2_comment : todayCheckin?.user1_comment
  const iHearted = isUser1 ? todayCheckin?.user1_hearted : todayCheckin?.user2_hearted
  const myComment = isUser1 ? todayCheckin?.user1_comment : todayCheckin?.user2_comment

  // Flirt helpers
  const formatTimeAgo = (date) => {
    if (!date) return null
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleViewFlirt = (flirt) => {
    setSelectedFlirt(flirt)
    setShowFlirtView(true)
  }

  const handleFlirtSent = () => {
    if (couple && user) {
      fetchFlirts(couple.id, user.id)
    }
    showCelebration('flirt', 'Sent with love!', 2000)
  }

  const handleFlirtUpdated = () => {
    if (couple && user) {
      fetchFlirts(couple.id, user.id)
    }
  }

  // Calculate days together
  const daysTogether = couple?.created_at
    ? Math.floor((new Date() - new Date(couple.created_at)) / (1000 * 60 * 60 * 24))
    : 0

  // Copy connect code to clipboard
  const handleCopyConnectCode = async () => {
    if (!connectCode) return
    try {
      await navigator.clipboard.writeText(connectCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-pink-600 text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100">
      {/* Celebration Notifications */}
      {celebration && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300
          ${celebration.type === 'streak' ? 'animate-pulse' : 'animate-fadeInDown'}`}
        >
          <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-2
            ${celebration.type === 'complete' ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white' : ''}
            ${celebration.type === 'streak' ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white' : ''}
            ${celebration.type === 'comment' ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white' : ''}
            ${celebration.type === 'flirt' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' : ''}
          `}>
            <span className="text-xl">
              {celebration.type === 'complete' && '🎉'}
              {celebration.type === 'streak' && '🔥'}
              {celebration.type === 'comment' && '🌱'}
              {celebration.type === 'flirt' && '💕'}
            </span>
            <span className="font-medium">{celebration.message}</span>
          </div>
        </div>
      )}

      {/* Heart Burst Animation */}
      {showHeartBurst && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-heartBurst">💕</div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ===== HEADER SECTION ===== */}
        <header className="flex justify-between items-center mb-8">
          <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl px-6 py-3 shadow-lg">
            <h1 className="text-2xl font-bold tracking-wider">ABF</h1>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-600 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                <span className={streak >= 7 ? 'animate-pulse' : ''}>🔥</span>
                <span>{streak} day{streak !== 1 ? 's' : ''}</span>
              </div>
            )}
            <button
              onClick={() => router.push('/settings')}
              className="bg-white text-gray-600 w-10 h-10 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ===== PARTNER CONNECTION BANNER ===== */}
        {!hasPartner && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] rounded-xl py-4 px-6 text-white shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">💕</span>
                  <div>
                    <h3 className="font-bold text-lg">Connect with your partner to unlock all features!</h3>
                    <p className="text-pink-100 text-sm">Share your code or enter theirs to get started together</p>
                  </div>
                </div>
                {connectCode ? (
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg px-4 py-2">
                      <p className="text-xs text-pink-100 mb-1">Your Code</p>
                      <p className="text-2xl font-bold tracking-widest">{connectCode}</p>
                    </div>
                    <button
                      onClick={handleCopyConnectCode}
                      className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all"
                    >
                      {codeCopied ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => router.push('/connect')}
                      className="bg-white text-[#FF6B9D] px-4 py-2 rounded-lg font-bold hover:bg-pink-50 transition-all"
                    >
                      Connect Now
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push('/connect')}
                    className="bg-white text-[#FF6B9D] px-6 py-3 rounded-lg font-bold hover:bg-pink-50 transition-all"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===== GREETING SECTION ===== */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Hey {user?.user_metadata?.first_name || 'there'}! 💕
          </h2>
          <div className="flex items-start gap-2">
            <span className="text-pink-400 flex-shrink-0">✨</span>
            <p className="text-gray-600 italic leading-relaxed">
              "{dailyQuote}"
            </p>
          </div>
        </section>

        {/* ===== HERO CARD: RELATIONSHIP HEALTH ===== */}
        {couple && hasPartner && (
          <section className="mb-8">
            <HealthMeter
              coupleId={couple.id}
              onRefresh={healthMeterRef}
            />
          </section>
        )}

        {/* ===== STATS ROW ===== */}
        <section className="grid grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-pink-600">{streak}</p>
            <p className="text-xs text-gray-500 mt-1">Day Streak</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{totalFlirtsSent}</p>
            <p className="text-xs text-gray-500 mt-1">Flirts Sent</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-rose-500">{unreadFlirts.length}</p>
            <p className="text-xs text-gray-500 mt-1">New Flirts</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{daysTogether}</p>
            <p className="text-xs text-gray-500 mt-1">Days</p>
          </div>
        </section>

        {/* ===== ASSESSMENT BANNER ===== */}
        {!profileCompleted && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative flex flex-col md:flex-row md:items-center gap-4">
                <div className="text-4xl">✨</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Complete Your Relationship Assessment!</h3>
                  <p className="text-pink-100">
                    Take our 5-module assessment to unlock personalized insights and AI coaching.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/assessment')}
                  className="bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-pink-50 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                >
                  Start Assessment
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===== ASSESSMENT STATUS BANNERS ===== */}
        {!onboardingStatus.userCompleted && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-pink-400 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="text-4xl">❤️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Complete Your Relationship Assessment!</h3>
                  <p className="text-pink-100">
                    Answer questions about your relationship to discover your compatibility and strengths.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/assessment')}
                  className="bg-white text-pink-500 px-6 py-3 rounded-full font-bold hover:bg-pink-50 transition-colors shadow-lg"
                >
                  Start Now
                </button>
              </div>
            </div>
          </section>
        )}

        {onboardingStatus.userCompleted && !onboardingStatus.partnerCompleted && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-200">
              <div className="flex items-center gap-4">
                <div className="text-4xl">⏳</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-pink-600 mb-1">
                    Waiting for {onboardingStatus.partnerName}
                  </h3>
                  <p className="text-gray-600">
                    You've completed your assessment! Once {onboardingStatus.partnerName} finishes, you'll see your compatibility results.
                  </p>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {onboardingStatus.userCompleted && onboardingStatus.partnerCompleted && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="text-4xl">🎉</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">You're All Set!</h3>
                  <p className="text-pink-100">
                    Discover how to connect with {onboardingStatus.partnerName} in ways that truly matter.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/assessment/results')}
                  className="bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-pink-50 transition-colors shadow-lg"
                >
                  View Results & Insights
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===== DAILY CHECK-IN CARD ===== */}
        {hasPartner && todayQuestion && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300">
              {/* Card Header */}
              <div
                className="p-6 cursor-pointer hover:bg-pink-50 transition-colors"
                onClick={() => setCheckinExpanded(!checkinExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">☀️</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Daily Check-in</h3>
                      <p className="text-gray-500 text-sm">
                        {!myAnswerSubmitted
                          ? "Answer today's question"
                          : !partnerAnswerSubmitted
                          ? `Waiting for ${onboardingStatus.partnerName}...`
                          : `See ${onboardingStatus.partnerName}'s answer`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {bothAnswered && (
                      <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                        Both Answered
                      </span>
                    )}
                    {myAnswerSubmitted && !partnerAnswerSubmitted && (
                      <span className="bg-amber-100 text-amber-600 text-xs px-3 py-1 rounded-full animate-pulse font-medium">
                        Waiting
                      </span>
                    )}
                    {!myAnswerSubmitted && (
                      <span className="bg-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        New
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${checkinExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {checkinExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {/* Question */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 my-4">
                    <p className="text-lg text-gray-800 font-medium">
                      {todayQuestion.question}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 capitalize">
                      {todayQuestion.category} • {todayQuestion.tone}
                    </p>
                  </div>

                  {/* Answer Input */}
                  {!myAnswerSubmitted && (
                    <div className="space-y-4">
                      <textarea
                        value={myAnswer}
                        onChange={(e) => setMyAnswer(e.target.value.slice(0, 500))}
                        placeholder="Share your thoughts..."
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none resize-none h-32 transition-colors"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{myAnswer.length}/500</span>
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={!myAnswer.trim() || submittingAnswer}
                          className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {submittingAnswer ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Sending...
                            </span>
                          ) : (
                            'Submit'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* My Answer */}
                  {myAnswerSubmitted && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-gray-500">Your answer</p>
                        {answerSubmitSuccess && (
                          <span className="text-green-500 animate-fadeIn">✓</span>
                        )}
                      </div>
                      <div className="bg-pink-50 rounded-xl p-4">
                        <p className="text-gray-800">{isUser1 ? todayCheckin.user1_answer : todayCheckin.user2_answer}</p>
                      </div>
                      {partnerHearted && (
                        <p className="text-sm text-pink-500 mt-2 flex items-center gap-1 animate-fadeIn">
                          <span>❤️</span> {onboardingStatus.partnerName} loved this!
                        </p>
                      )}
                      {partnerComment && (
                        <div className="mt-2 bg-purple-50 rounded-xl p-3 animate-fadeIn">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{onboardingStatus.partnerName}:</span> {partnerComment}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Waiting State */}
                  {myAnswerSubmitted && !partnerAnswerSubmitted && (
                    <div className="text-center py-4">
                      <div className="flex justify-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-gray-500">
                        Waiting for {onboardingStatus.partnerName} to answer...
                      </p>
                    </div>
                  )}

                  {/* Partner's Answer */}
                  {bothAnswered && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-2">{onboardingStatus.partnerName}'s answer</p>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-gray-800">{partnerAnswer}</p>
                      </div>

                      {/* Reaction Buttons */}
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={handleHeartPartner}
                          className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all transform active:scale-95 ${
                            iHearted
                              ? 'bg-pink-500 text-white scale-105'
                              : 'bg-pink-100 text-pink-600 hover:bg-pink-200 hover:scale-105'
                          }`}
                        >
                          <span className={`transition-transform ${iHearted ? 'scale-110' : ''}`}>
                            {iHearted ? '❤️' : '🤍'}
                          </span>
                          <span className="text-sm font-medium">{iHearted ? 'Loved!' : 'Love this'}</span>
                        </button>

                        {!myComment && (
                          <button
                            onClick={() => setShowCommentInput(!showCommentInput)}
                            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all transform active:scale-95
                              ${showCommentInput ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            <span>💬</span>
                            <span className="text-sm font-medium">Comment</span>
                          </button>
                        )}
                      </div>

                      {/* Comment Input */}
                      {showCommentInput && !myComment && (
                        <div className="mt-3 flex gap-2 animate-fadeIn">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:border-pink-400 focus:outline-none transition-colors"
                            autoFocus
                          />
                          <button
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim()}
                            className="bg-pink-500 text-white px-4 py-2 rounded-full font-medium disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
                          >
                            Send
                          </button>
                        </div>
                      )}

                      {/* My Comment */}
                      {myComment && (
                        <div className={`mt-3 bg-pink-50 rounded-xl p-3 ${commentSubmitSuccess ? 'animate-fadeIn' : ''}`}>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">You:</span> {myComment}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== WEEK IN REVIEW CARD ===== */}
        {hasPartner && isReflectionWindow && (
          <section className="mb-8">
            <div
              onClick={() => router.push('/weekly-reflection')}
              className={`rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] ${
                weeklyReflection?.user1_completed_at && weeklyReflection?.user2_completed_at
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">
                      {weeklyReflection?.user1_completed_at && weeklyReflection?.user2_completed_at
                        ? '✨'
                        : '💕'}
                    </div>
                    <div className="text-white">
                      <h3 className="text-lg font-semibold">
                        {weeklyReflection?.user1_completed_at && weeklyReflection?.user2_completed_at
                          ? 'Reflection Complete!'
                          : 'Week in Review'}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {weeklyReflection?.user1_completed_at && weeklyReflection?.user2_completed_at
                          ? 'See what you both picked as favorites'
                          : (isUser1 ? weeklyReflection?.user1_completed_at : weeklyReflection?.user2_completed_at)
                            ? `Waiting for ${onboardingStatus.partnerName}...`
                            : 'Reflect on your connection this week'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {weeklyReflection?.user1_completed_at && weeklyReflection?.user2_completed_at ? (
                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                        View Results
                      </span>
                    ) : (isUser1 ? weeklyReflection?.user1_completed_at : weeklyReflection?.user2_completed_at) ? (
                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full animate-pulse font-medium">
                        Waiting
                      </span>
                    ) : (
                      <span className="bg-white text-purple-600 text-xs px-3 py-1 rounded-full font-semibold">
                        Start Now
                      </span>
                    )}
                    <svg
                      className="w-5 h-5 text-white/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== FLIRTS SECTION ===== */}
        {hasPartner && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">💕 Flirts</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Send a Flirt Card */}
            <div
              onClick={() => setShowFlirtComposer(true)}
              className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] text-white"
            >
              <div className="text-3xl mb-3">💕</div>
              <h3 className="text-lg font-semibold mb-1">Send a Flirt</h3>
              <p className="text-pink-100 text-sm mb-3">
                Brighten {onboardingStatus.partnerName}'s day
              </p>
              {lastSentFlirtTime && (
                <p className="text-pink-200 text-xs">
                  Last sent {formatTimeAgo(lastSentFlirtTime)}
                </p>
              )}
            </div>

            {/* Received Flirts Card */}
            <div
              onClick={() => {
                if (unreadFlirts.length > 0) {
                  handleViewFlirt(unreadFlirts[0])
                } else {
                  router.push('/flirts')
                }
              }}
              className={`rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] ${
                unreadFlirts.length > 0
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  : 'bg-white'
              }`}
            >
              <div className="text-3xl mb-3">{unreadFlirts.length > 0 ? '💌' : '📬'}</div>
              <h3 className={`text-lg font-semibold mb-1 ${unreadFlirts.length > 0 ? 'text-white' : 'text-gray-800'}`}>
                {unreadFlirts.length > 0
                  ? `${unreadFlirts.length} New Flirt${unreadFlirts.length > 1 ? 's' : ''}`
                  : 'Flirt History'}
              </h3>
              {unreadFlirts.length > 0 && latestFlirt ? (
                <p className="text-pink-100 text-sm line-clamp-2">
                  {latestFlirt.message
                    ? latestFlirt.message.substring(0, 40) + (latestFlirt.message.length > 40 ? '...' : '')
                    : latestFlirt.gif_url
                      ? 'Sent you a GIF 🎉'
                      : 'Sent you a photo 📸'}
                </p>
              ) : (
                <p className="text-gray-600 text-sm">
                  View your love notes
                </p>
              )}
            </div>
          </div>
        </section>
        )}

        {/* ===== FEATURE CARDS GRID ===== */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">✨ Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Results & Insights Card */}
            {onboardingStatus.userCompleted && onboardingStatus.partnerCompleted && (
              <div
                onClick={() => router.push('/assessment/results')}
                className="bg-gradient-to-br from-pink-500 to-pink-400 rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] text-white"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-lg font-semibold mb-1">Results & Insights</h3>
                <p className="text-pink-100 text-sm">
                  Your compatibility with {onboardingStatus.partnerName}
                </p>
              </div>
            )}

            {/* Assessment Card - Shows when NOT both completed */}
            {!(onboardingStatus.userCompleted && onboardingStatus.partnerCompleted) && (
              <div
                onClick={() => {
                  if (!onboardingStatus.userCompleted) {
                    router.push('/assessment')
                  }
                }}
                className={`bg-white rounded-xl p-6 shadow-sm transition-all ${
                  !onboardingStatus.userCompleted
                    ? 'hover:shadow-md cursor-pointer hover:scale-[1.01]'
                    : ''
                }`}
              >
                <div className="text-3xl mb-3">❤️</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Assessment</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Get to know each other
                </p>
                {!onboardingStatus.userCompleted ? (
                  <span className="inline-block bg-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                    Start Now
                  </span>
                ) : (
                  <span className="inline-block bg-amber-100 text-amber-600 text-xs px-3 py-1 rounded-full font-medium">
                    Waiting
                  </span>
                )}
              </div>
            )}

            {/* AI Coach Card */}
            <div
              onClick={() => router.push('/ai-coach')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] text-white"
            >
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold mb-1">AI Coach</h3>
              <p className="text-purple-100 text-sm">
                Personalized guidance
              </p>
            </div>

            {/* Our Timeline Card */}
            <div
              onClick={() => router.push('/timeline')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] text-white"
            >
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-lg font-semibold mb-1">Our Timeline</h3>
              <p className="text-purple-100 text-sm">
                {recentTimelineEvents.length > 0
                  ? `${recentTimelineEvents.length} memories`
                  : 'Capture memories'}
              </p>
            </div>

            {/* Date Night Card */}
            <div
              onClick={() => router.push('/date-night')}
              className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01] text-white relative"
            >
              {pendingDateSuggestions > 0 && (
                <div className="absolute top-3 right-3 bg-white text-pink-500 text-xs px-2 py-1 rounded-full font-bold">
                  {pendingDateSuggestions} new
                </div>
              )}
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="text-lg font-semibold mb-1">Date Night</h3>
              <p className="text-pink-100 text-sm">
                {upcomingDate ? upcomingDate.title : 'Plan adventures'}
              </p>
            </div>

            {/* Trip Planning Card */}
            <div
              onClick={() => router.push('/trips')}
              className="bg-white rounded-xl p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:scale-[1.01]"
            >
              <div className="text-3xl mb-3">🧳</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Trip Planning</h3>
              <p className="text-gray-600 text-sm">
                {upcomingTrip ? upcomingTrip.destination : 'Plan your next trip'}
              </p>
            </div>
          </div>
        </section>

        {/* ===== CONNECTION STATUS ===== */}
        {hasPartner && couple && (
          <section className="mb-8">
            <div className="bg-white/70 rounded-xl p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-pink-600 mb-1">
                💕 Connected with {onboardingStatus.partnerName}
              </p>
              <p className="text-gray-500 text-sm">
                Since {new Date(couple?.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </section>
        )}

        {/* ===== FOOTER ===== */}
        <footer className="text-center pb-8">
          {connectCode && (
            <p className="text-gray-500 text-sm">
              Your Connect Code: <span className="font-mono font-bold text-pink-600">{connectCode}</span>
            </p>
          )}
        </footer>
      </div>

      {/* ===== MODALS ===== */}
      <FlirtComposer
        isOpen={showFlirtComposer}
        onClose={() => setShowFlirtComposer(false)}
        coupleId={couple?.id}
        partnerId={partnerId}
        partnerName={onboardingStatus.partnerName}
        onSent={handleFlirtSent}
      />

      <FlirtView
        isOpen={showFlirtView}
        onClose={() => {
          setShowFlirtView(false)
          setSelectedFlirt(null)
        }}
        flirt={selectedFlirt}
        senderName={onboardingStatus.partnerName}
        coupleId={couple?.id}
        onUpdate={handleFlirtUpdated}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes heartBurst {
          0% {
            opacity: 1;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.3s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-heartBurst {
          animation: heartBurst 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
