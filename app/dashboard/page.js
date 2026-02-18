// Dashboard page
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HealthMeter from '@/components/HealthMeter'
import FlirtComposer from '@/components/FlirtComposer'
import FlirtView from '@/components/FlirtView'
import { MOOD_OPTIONS } from '@/lib/checkin-questions'
import { analyzeUserPatterns, analyzeCouplePatterns } from '@/lib/checkin-patterns'

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

  // Daily Check-in State (legacy - old system)
  const [checkinExpanded, setCheckinExpanded] = useState(false)
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [todayQuestion, setTodayQuestion] = useState(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [isUser1, setIsUser1] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [streak, setStreak] = useState(0)

  // Daily Check-in State (v2 - new mood/connection system)
  const [v2Checkin, setV2Checkin] = useState(null)
  const [v2PartnerCheckin, setV2PartnerCheckin] = useState(null)
  const [v2Streak, setV2Streak] = useState(0)

  // Pattern Detection State
  const [userPatterns, setUserPatterns] = useState(null)
  const [couplePatterns, setCouplePatterns] = useState(null)
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [dismissedConcernBanner, setDismissedConcernBanner] = useState(false)

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
  const [individualProfileStatus, setIndividualProfileStatus] = useState({
    completed: false,
    inProgress: false,
  })

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

  // Fetch v2 daily check-ins (mood/connection system)
  const fetchV2Checkins = useCallback(async (userId, partnerId, coupleId) => {
    const today = new Date().toISOString().split('T')[0]

    // Get user's check-in for today
    const { data: userCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_date', today)
      .single()

    setV2Checkin(userCheckin)

    // Get partner's check-in for today
    if (partnerId) {
      const { data: partnerCheckin } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', partnerId)
        .eq('check_date', today)
        .single()

      setV2PartnerCheckin(partnerCheckin)
    }

    // Calculate v2 streak
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('check_date')
      .eq('user_id', userId)
      .order('check_date', { ascending: false })
      .limit(30)

    if (checkins && checkins.length > 0) {
      let currentStreak = 0
      const todayDate = new Date(today)

      // Check if checked in today
      const checkedInToday = checkins.some(c => c.check_date === today)
      if (checkedInToday) {
        currentStreak = 1
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
      }

      setV2Streak(currentStreak)
    }
  }, [])

  // Fetch check-in patterns for insights
  const fetchPatterns = useCallback(async (userId, coupleId) => {
    setPatternsLoading(true)
    try {
      // Fetch user patterns
      const userPatternsData = await analyzeUserPatterns(userId, 14) // Last 2 weeks
      setUserPatterns(userPatternsData)

      // Fetch couple patterns
      if (coupleId) {
        const couplePatternsData = await analyzeCouplePatterns(coupleId, 14)
        setCouplePatterns(couplePatternsData)
      }
    } catch (err) {
      console.error('Error fetching patterns:', err)
    }
    setPatternsLoading(false)
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

      // Check individual profile status
      const { data: individualProfile } = await supabase
        .from('individual_profiles')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setIndividualProfileStatus({
        completed: !!individualProfile?.completed_at,
        inProgress: !!individualProfile && !individualProfile.completed_at,
      })

      await fetchDailyCheckin(coupleData, user.id)
      await fetchFlirts(coupleData.id, user.id)
      await fetchTimelineEvents(coupleData.id)
      await fetchDatePlans(coupleData.id, user.id)
      await fetchUpcomingTrip(coupleData.id)
      await fetchV2Checkins(user.id, partnerUserId, coupleData.id)

      // Fetch patterns in background (non-blocking)
      fetchPatterns(user.id, coupleData.id)

      setLoading(false)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      {/* Concern Insights Banner */}
      {!dismissedConcernBanner && userPatterns?.concernFlags?.some(c => c.severity === 'high') && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💭</span>
              <div className="flex-1">
                <p className="font-medium text-amber-800">I've noticed something...</p>
                <p className="text-sm text-amber-700">
                  {userPatterns.concernFlags.find(c => c.severity === 'high')?.description || 'You might benefit from some support.'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push('/ai-coach')}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Talk to Coach
                </button>
                <button
                  onClick={() => router.push('/checkin/weekly')}
                  className="bg-white hover:bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-200 transition-colors"
                >
                  View Patterns
                </button>
                <button
                  onClick={() => setDismissedConcernBanner(true)}
                  className="text-amber-400 hover:text-amber-600 p-1 transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
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

        {/* ===== RELATIONSHIP PULSE WIDGET ===== */}
        {hasPartner && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              {userPatterns && userPatterns.totalCheckins >= 3 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💓</span>
                      <h3 className="text-lg font-bold text-[#2D3648]">Relationship Pulse</h3>
                    </div>
                    <button
                      onClick={() => router.push('/checkin/weekly')}
                      className="text-sm text-[#C9184A] hover:text-[#a01038] font-medium transition-colors"
                    >
                      View Weekly Summary →
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#2D3648]">{userPatterns.connectionAverage || '—'}</p>
                      <p className="text-xs text-gray-500">Avg Connection</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#2D3648]">
                        {userPatterns.moodTrend === 'improving' ? '📈' : userPatterns.moodTrend === 'declining' ? '📉' : '➡️'}
                      </p>
                      <p className="text-xs text-gray-500">Mood Trend</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#2D3648]">{userPatterns.streakDays || 0}</p>
                      <p className="text-xs text-gray-500">Day Streak 🔥</p>
                    </div>
                  </div>

                  {/* Positive Patterns */}
                  {userPatterns.positivePatterns?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {userPatterns.positivePatterns.slice(0, 2).map((pattern, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                          <span>✓</span>
                          <span>{pattern.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Couple Alignment */}
                  {couplePatterns && couplePatterns.alignmentScore > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mb-4">
                      <span>💑</span>
                      <span>You and {onboardingStatus.partnerName} are {couplePatterns.alignmentScore}% aligned this week</span>
                    </div>
                  )}

                  {/* Concerns (if any, but not high severity - those show in banner) */}
                  {userPatterns.concernFlags?.filter(c => c.severity === 'medium').length > 0 && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <span>⚠️</span> Worth Noting:
                      </p>
                      <div className="space-y-1">
                        {userPatterns.concernFlags.filter(c => c.severity === 'medium').slice(0, 2).map((concern, i) => (
                          <p key={i} className="text-sm text-amber-700">{concern.description}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {userPatterns.insights?.length > 0 && !userPatterns.concernFlags?.some(c => c.severity === 'medium') && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <p className="text-xs text-gray-500 mb-2">💡 Insight:</p>
                      <p className="text-sm text-[#2D3648]">{userPatterns.insights[0]}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Empty State - Unlock Insights */
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full mb-4">
                    <span className="text-3xl">💓</span>
                  </div>

                  <h3 className="text-xl font-bold text-[#2D3648] mb-2">
                    Unlock Relationship Insights
                  </h3>

                  <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
                    Complete daily check-ins to see patterns, trends, and personalized insights about your relationship.
                  </p>

                  {/* Progress Bar */}
                  <div className="max-w-xs mx-auto mb-6">
                    <div className="flex items-center justify-between text-sm text-[#6B7280] mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">
                        {userPatterns?.totalCheckins || 0}/3 check-ins
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(((userPatterns?.totalCheckins || 0) / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* What you'll unlock */}
                  <div className="grid grid-cols-3 gap-4 mb-6 text-left">
                    <div className="bg-[#F8F6F3] rounded-xl p-4">
                      <span className="text-2xl mb-2 block">📈</span>
                      <p className="text-xs font-medium text-[#2D3648]">Mood & Connection Trends</p>
                    </div>
                    <div className="bg-[#F8F6F3] rounded-xl p-4">
                      <span className="text-2xl mb-2 block">💡</span>
                      <p className="text-xs font-medium text-[#2D3648]">Pattern Detection</p>
                    </div>
                    <div className="bg-[#F8F6F3] rounded-xl p-4">
                      <span className="text-2xl mb-2 block">🎯</span>
                      <p className="text-xs font-medium text-[#2D3648]">Personalized Tips</p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/checkin')}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Complete Today's Check-in
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
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

        {/* ===== ASSESSMENT CARDS - 2 CLEAR OPTIONS ===== */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Know Yourself & Your Relationship</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

            {/* Individual Profile Card - Always Available */}
            <div
              onClick={() => router.push(individualProfileStatus.completed ? '/profile/results' : '/profile')}
              className={`rounded-2xl shadow-lg p-6 cursor-pointer transition-all hover:scale-[1.01] relative overflow-hidden h-full min-h-[160px] ${
                individualProfileStatus.completed
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  : 'bg-white border-2 border-indigo-200 hover:border-indigo-400'
              }`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  individualProfileStatus.completed ? 'bg-white/20' : 'bg-indigo-100'
                }`}>
                  <span className="text-3xl">🪞</span>
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-1 ${
                    individualProfileStatus.completed ? 'text-white' : 'text-gray-800'
                  }`}>
                    Your Profile
                  </h3>
                  <p className={`text-sm mb-3 ${
                    individualProfileStatus.completed ? 'text-indigo-100' : 'text-gray-600'
                  }`}>
                    {individualProfileStatus.completed
                      ? 'Discover insights about who you are'
                      : 'Understand your personality, values & needs'}
                  </p>
                  <span className={`inline-block text-sm px-4 py-1.5 rounded-full font-medium ${
                    individualProfileStatus.completed
                      ? 'bg-white/20 text-white'
                      : individualProfileStatus.inProgress
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-500 text-white'
                  }`}>
                    {individualProfileStatus.completed
                      ? 'View Results'
                      : individualProfileStatus.inProgress
                        ? 'Continue'
                        : 'Start Profile'}
                  </span>
                </div>
              </div>
            </div>

            {/* Relationship Health Card - Requires Partner */}
            <div
              onClick={() => {
                if (!hasPartner) return
                if (onboardingStatus.userCompleted) {
                  // User can view their results even if partner hasn't completed
                  router.push('/assessment/results')
                } else {
                  router.push('/assessment')
                }
              }}
              className={`rounded-2xl shadow-lg p-6 relative overflow-hidden h-full min-h-[160px] ${
                !hasPartner
                  ? 'bg-gray-100 cursor-not-allowed'
                  : onboardingStatus.userCompleted
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white cursor-pointer hover:scale-[1.01]'
                    : 'bg-white border-2 border-pink-200 hover:border-pink-400 cursor-pointer hover:scale-[1.01]'
              } transition-all`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  !hasPartner
                    ? 'bg-gray-200'
                    : onboardingStatus.userCompleted
                      ? 'bg-white/20'
                      : 'bg-pink-100'
                }`}>
                  <span className="text-3xl">{hasPartner ? '❤️' : '🔗'}</span>
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-1 ${
                    !hasPartner
                      ? 'text-gray-400'
                      : onboardingStatus.userCompleted
                        ? 'text-white'
                        : 'text-gray-800'
                  }`}>
                    Relationship Health
                  </h3>
                  <p className={`text-sm mb-3 ${
                    !hasPartner
                      ? 'text-gray-400'
                      : onboardingStatus.userCompleted
                        ? 'text-pink-100'
                        : 'text-gray-600'
                  }`}>
                    {!hasPartner
                      ? 'Connect with your partner first'
                      : onboardingStatus.userCompleted && onboardingStatus.partnerCompleted
                        ? `Your insights with ${onboardingStatus.partnerName}`
                        : onboardingStatus.userCompleted
                          ? `View your insights (waiting for ${onboardingStatus.partnerName})`
                          : `Understand your dynamic with ${onboardingStatus.partnerName}`}
                  </p>
                  <span className={`inline-block text-sm px-4 py-1.5 rounded-full font-medium ${
                    !hasPartner
                      ? 'bg-gray-200 text-gray-500'
                      : onboardingStatus.userCompleted
                        ? 'bg-white/20 text-white'
                        : 'bg-pink-500 text-white'
                  }`}>
                    {!hasPartner
                      ? 'Partner Required'
                      : onboardingStatus.userCompleted
                        ? 'View Results'
                        : 'Start Assessment'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DAILY CHECK-IN CARD (V2) ===== */}
        {hasPartner && (
          <section className="mb-8">
            {(() => {
              const userMood = v2Checkin ? MOOD_OPTIONS.find(m => m.value === v2Checkin.mood) : null
              const partnerMood = v2PartnerCheckin ? MOOD_OPTIONS.find(m => m.value === v2PartnerCheckin.mood) : null

              // STATE 1: Not checked in today
              if (!v2Checkin) {
                return (
                  <div
                    onClick={() => router.push('/checkin')}
                    className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">☀️</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">Daily Check-in</h3>
                        <p className="text-white/90">How are you feeling today?</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="bg-white text-orange-600 px-4 py-2 rounded-full font-bold text-sm shadow-sm">
                          Check In Now
                        </span>
                        {v2Streak > 0 && (
                          <span className="text-white/90 text-sm flex items-center gap-1">
                            <span>🔥</span> {v2Streak} day{v2Streak !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // STATE 2: Checked in, waiting for partner
              if (v2Checkin && !v2PartnerCheckin) {
                return (
                  <div
                    onClick={() => router.push('/checkin/complete')}
                    className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-green-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">✓</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Daily Check-in</h3>

                        {/* Your check-in summary */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm text-gray-600">You:</span>
                          <span className="text-2xl">{userMood?.emoji}</span>
                          <span className="text-sm text-gray-700">{userMood?.label}</span>
                          <span className="text-sm text-[#C9184A]">
                            {'❤️'.repeat(v2Checkin.connection_score || 0)}
                          </span>
                        </div>

                        {/* Waiting for partner */}
                        <div className="flex items-center gap-2 text-amber-600">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm">Waiting for {onboardingStatus.partnerName}...</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          View Details
                        </span>
                        {v2Streak > 0 && (
                          <span className="text-gray-500 text-sm flex items-center gap-1">
                            <span>🔥</span> {v2Streak} day{v2Streak !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // STATE 3: Both checked in
              // Calculate connection trend for display
              const connectionTrendText = userPatterns?.connectionTrend === 'improving'
                ? `📈 Connection is stronger than last week`
                : userPatterns?.connectionTrend === 'declining'
                  ? `📉 Connection dipped this week`
                  : null

              return (
                <div
                  onClick={() => router.push('/checkin/complete')}
                  className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all text-white"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-3">Daily Check-in</h3>

                      {/* Both check-in summaries */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/80 w-20">You:</span>
                          <span className="text-2xl">{userMood?.emoji}</span>
                          <span className="text-sm">{userMood?.label}</span>
                          <span className="text-sm">
                            {'❤️'.repeat(v2Checkin.connection_score || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/80 w-20">{onboardingStatus.partnerName}:</span>
                          <span className="text-2xl">{partnerMood?.emoji}</span>
                          <span className="text-sm">{partnerMood?.label}</span>
                          <span className="text-sm">
                            {'❤️'.repeat(v2PartnerCheckin.connection_score || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Trend indicator */}
                      {connectionTrendText && userPatterns?.totalCheckins >= 5 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-sm text-white/90">{connectionTrendText}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                        See How You're Both Doing
                      </span>
                      {v2Streak > 0 && (
                        <span className="text-white/90 text-sm flex items-center gap-1">
                          <span>🔥</span> {v2Streak} day{v2Streak !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
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

        {/* ===== WEEKLY SUMMARY CARD (Pattern-based) ===== */}
        {hasPartner && userPatterns && userPatterns.totalCheckins >= 3 && !isReflectionWindow && (
          <section className="mb-8">
            <div
              onClick={() => router.push('/checkin/weekly')}
              className="bg-white rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-all border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2D3648]">Your Week</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        {userPatterns.moodTrend === 'improving' ? '📈' : userPatterns.moodTrend === 'declining' ? '📉' : '😌'}
                        {userPatterns.moodTrend === 'improving' ? 'Mood up' : userPatterns.moodTrend === 'declining' ? 'Mood down' : 'Stable'}
                      </span>
                      <span>•</span>
                      <span>{userPatterns.totalCheckins}/7 check-ins</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#C9184A] font-medium">View Summary</span>
                  <svg className="w-4 h-4 text-[#C9184A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Explore</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
