// -- ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_question text;
// -- ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_answer text;
// -- ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_submitted_at timestamptz;
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { notifyPartnerTodayResponse } from '@/lib/notify'
import sparkQuestionsData from '@/lib/spark-questions.json'

const FEATURE_SPOTLIGHTS = [
  {
    id: 'wander',
    title: 'Dream a trip together',
    description: "Planning a dream trip together is one of the best conversations you can have. Where would you two actually go?",
    action: 'Start Wandering →',
    href: '/trips',
  },
  {
    id: 'reflection',
    title: 'Weekly reflection',
    description: "Two minutes, once a week. Couples who reflect together stay connected longer.",
    action: 'Start reflecting →',
    href: '/weekly-reflection',
  },
  {
    id: 'timeline',
    title: 'Your relationship timeline',
    description: "Your relationship has a story. Start telling it.",
    action: 'Add a memory →',
    href: '/timeline',
  },
  {
    id: 'flirts',
    title: 'Send a flirt',
    description: "The smallest things land the hardest. Send one now.",
    action: 'Send one now →',
    href: '/flirts',
  },
  {
    id: 'dates',
    title: 'Plan your next date',
    description: "You don't need a reason. You just need a plan.",
    action: 'Browse ideas →',
    href: '/dates',
  },
]

const NORA_SURPRISES = [
  "What's something small your partner does that still makes you smile?",
  "If you could relive one moment together, which would it be?",
  "What's one thing you've never told your partner that you appreciate about them?",
  "What does a perfect Sunday look like for you two?",
  "What's something you're looking forward to doing together this year?",
  "When did you last laugh together until it hurt?",
  "What's one habit your partner has that you secretly love?",
  "If you could go anywhere together tomorrow, where would it be?",
]

const REACTIONS = ['This is us', 'Made me think', 'Tell Nora']

function getDayIndex() {
  const start = new Date('2026-01-01')
  const today = new Date()
  return Math.floor((today - start) / 86400000)
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function getTodayGameType() {
  const day = new Date().getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  if (day === 3) return 'spark'
  if (day === 5) return 'ritual'
  if (day === 6) return 'bet_live'
  if (day === 0) return 'reflection'
  return 'spark'
}

export default function TodayPage() {
  const router = useRouter()

  const hour = new Date().getHours()
  const timeOfDay = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening'
  const gameType = getTodayGameType()

  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [streak, setStreak] = useState(0)
  const [daysTogether, setDaysTogether] = useState(0)
  const [flirtCount, setFlirtCount] = useState(0)
  const [lastFlirtDaysAgo, setLastFlirtDaysAgo] = useState(null)
  const [checkinDone, setCheckinDone] = useState(false)
  const [memoryCount, setMemoryCount] = useState(0)
  const [neglectedFeature, setNeglectedFeature] = useState(null)
  const [spotlight, setSpotlight] = useState(null)
  const [noraSurprise, setNoraSurprise] = useState('')

  // Section 1 — reaction state
  const [todayReaction, setTodayReaction] = useState(null)
  const [todayNote, setTodayNote] = useState('')
  const [partnerReaction, setPartnerReaction] = useState(null)
  const [partnerNote, setPartnerNote] = useState('')
  const [reactionSaved, setReactionSaved] = useState(false)
  const [reactionInput, setReactionInput] = useState('')
  const autoSaveTimer = useRef(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Section 2 — partner coaching
  const [partnerLoveLanguage, setPartnerLoveLanguage] = useState(null)
  const [whyOpen, setWhyOpen] = useState(false)

  // Section 3 — article insight
  const [articleInsight, setArticleInsight] = useState(null)
  const [noraCommentary, setNoraCommentary] = useState('')

  // User profile for article tag matching
  const [myAttachmentStyle, setMyAttachmentStyle] = useState(null)
  const [myConflictStyle, setMyConflictStyle] = useState(null)
  const [myLoveLanguage, setMyLoveLanguage] = useState(null)

  // IDs needed for today_responses upsert + notifications
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [partnerId, setPartnerId] = useState(null)

  // Spark state
  const [sparkAnswer, setSparkAnswer] = useState('')
  const [sparkSubmitted, setSparkSubmitted] = useState(false)
  const [partnerSparkAnswer, setPartnerSparkAnswer] = useState(null)
  const [partnerHasAnswered, setPartnerHasAnswered] = useState(false)
  const [sparkRevealed, setSparkRevealed] = useState(false)
  const [noraSparkReaction, setNoraSparkReaction] = useState('')
  const [eligibleSparkQuestions, setEligibleSparkQuestions] = useState([])
  const [sparkQuestionIndex, setSparkQuestionIndex] = useState(0)
  const [overrideSparkQuestion, setOverrideSparkQuestion] = useState(null)
  const [sparkSkipCount, setSparkSkipCount] = useState(0)
  const hasGeneratedReaction = useRef(false)

  const todaySparkQuestion = overrideSparkQuestion || eligibleSparkQuestions[sparkQuestionIndex] || null

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Record visit time and clear nav badge (fire-and-forget)
      supabase
        .from('user_profiles')
        .update({ last_today_visit: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => window.dispatchEvent(new CustomEvent('clearTodayBadge')))
        .catch(() => {})

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      setPartnerId(partnerId)
      const days = Math.floor((Date.now() - new Date(couple.created_at).getTime()) / 86400000)
      setDaysTogether(days)

      const today = getTodayString()

      await Promise.allSettled([

        // User profile (name + assessment styles for article matching)
        (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name, attachment_style, conflict_style, love_language_primary')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.display_name) setUserName(data.display_name)
          if (data?.attachment_style) setMyAttachmentStyle(data.attachment_style)
          if (data?.conflict_style) setMyConflictStyle(data.conflict_style)
          if (data?.love_language_primary) setMyLoveLanguage(data.love_language_primary)
        })(),

        // Partner profile (name + love language for coaching)
        partnerId ? (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name, love_language_primary')
            .eq('user_id', partnerId)
            .maybeSingle()
          if (data?.display_name) setPartnerName(data.display_name)
          if (data?.love_language_primary) setPartnerLoveLanguage(data.love_language_primary)
        })() : Promise.resolve(),

        // Streak + checkin
        (async () => {
          const { data } = await supabase
            .from('daily_checkins')
            .select('check_date')
            .eq('user_id', user.id)
            .eq('couple_id', couple.id)
            .not('question_response', 'is', null)
            .order('check_date', { ascending: false })
            .limit(60)
          if (!data?.length) return
          setCheckinDone(data[0].check_date === today)
          let count = 0
          const cursor = new Date(today)
          for (const row of data) {
            if (row.check_date === cursor.toISOString().split('T')[0]) {
              count++
              cursor.setDate(cursor.getDate() - 1)
            } else break
          }
          setStreak(count)
        })(),

        // Flirts
        (async () => {
          const { data } = await supabase
            .from('flirts')
            .select('sender_id, created_at')
            .eq('couple_id', couple.id)
            .order('created_at', { ascending: false })
            .limit(50)
          const mine = (data || []).filter(f => f.sender_id === user.id)
          setFlirtCount(mine.length)
          if (mine.length > 0) {
            setLastFlirtDaysAgo(Math.floor((Date.now() - new Date(mine[0].created_at).getTime()) / 86400000))
          }
        })(),

        // Memory count
        (async () => {
          const { count } = await supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('couple_id', couple.id)
          setMemoryCount(count || 0)
        })(),

        // Today's responses (reactions + spark answers)
        (async () => {
          try {
            const { data } = await supabase
              .from('today_responses')
              .select('user_id, reaction, note, spark_question, spark_answer, spark_submitted_at')
              .eq('couple_id', couple.id)
              .eq('prompt_date', today)
            if (!data) return
            const mine = data.find(r => r.user_id === user.id)
            const theirs = partnerId ? data.find(r => r.user_id === partnerId) : null
            if (mine) {
              setTodayReaction(mine.reaction)
              setTodayNote(mine.note || '')
              setReactionSaved(!!mine.reaction)
              if (mine.spark_answer) {
                setSparkAnswer(mine.spark_answer)
                setSparkSubmitted(true)
              }
            }
            if (theirs) {
              setPartnerReaction(theirs.reaction)
              setPartnerNote(theirs.note || '')
              if (theirs.spark_answer) {
                setPartnerHasAnswered(true)
                setPartnerSparkAnswer(theirs.spark_answer)
                if (mine?.spark_answer) {
                  setSparkRevealed(true)
                }
              }
            }
            if (theirs?.spark_question && !mine?.spark_answer) {
              const eligible = sparkQuestionsData.filter(q => {
                if (days < 30) return q.level === 1
                if (days < 90) return q.level <= 2
                return true
              })
              const found = eligible.find(q => q.question === theirs.spark_question)
                || sparkQuestionsData.find(q => q.question === theirs.spark_question)
              if (found) setOverrideSparkQuestion(found)
            }
          } catch { /* table may not exist yet */ }
        })(),

      ])

      setLoading(false)
    } catch (err) {
      console.error('Today error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime subscription — detect partner spark answer without page reload
  useEffect(() => {
    if (!coupleId || !partnerId) return
    const today = getTodayString()
    const channel = supabase
      .channel(`spark-${coupleId}-${today}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'today_responses',
        filter: `couple_id=eq.${coupleId}`
      }, payload => {
        if (
          payload.new.user_id === partnerId &&
          payload.new.spark_answer &&
          payload.new.prompt_date === today
        ) {
          setPartnerHasAnswered(true)
          setPartnerSparkAnswer(payload.new.spark_answer)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [coupleId, partnerId])

  // Compute derived state after data loads
  useEffect(() => {
    if (loading) return
    const dayIndex = getDayIndex()

    setNoraSurprise(NORA_SURPRISES[dayIndex % NORA_SURPRISES.length])

    // Eligible spark questions based on couple age
    const eligible = sparkQuestionsData.filter(q => {
      if (daysTogether < 30) return q.level === 1
      if (daysTogether < 90) return q.level <= 2
      return true
    })
    setEligibleSparkQuestions(eligible)
    if (eligible.length > 0) setSparkQuestionIndex(dayIndex % eligible.length)

    // Neglected feature fallback (used if no partner love language)
    let computed = null
    if (!checkinDone) {
      computed = {
        verb: 'Check in together',
        hint: "You haven't checked in today yet",
        href: '/checkin',
        urgent: true,
      }
    } else if (lastFlirtDaysAgo === null || lastFlirtDaysAgo >= 3) {
      computed = {
        verb: `Send ${partnerName} a flirt`,
        hint: lastFlirtDaysAgo >= 3 ? `${lastFlirtDaysAgo} days since your last one` : "You haven't sent one yet",
        href: '/flirts',
        urgent: lastFlirtDaysAgo >= 5,
      }
    } else if (memoryCount === 0) {
      computed = {
        verb: 'Add your first memory',
        hint: 'Start your relationship timeline',
        href: '/timeline',
        urgent: false,
      }
    } else {
      computed = {
        verb: 'Start your weekly reflection',
        hint: 'Takes 2 minutes',
        href: '/weekly-reflection',
        urgent: false,
      }
    }
    setNeglectedFeature(computed)

    // Feature spotlight — rotates daily, avoids neglected feature
    const available = FEATURE_SPOTLIGHTS.filter(f =>
      computed ? f.href !== computed.href : true
    )
    setSpotlight(available[dayIndex % available.length])

  }, [loading, checkinDone, lastFlirtDaysAgo, memoryCount, streak, flirtCount, daysTogether, partnerName])

  // Auto-trigger Nora spark reaction when both answers are available
  useEffect(() => {
    if (sparkSubmitted && partnerSparkAnswer && todaySparkQuestion && !hasGeneratedReaction.current) {
      hasGeneratedReaction.current = true
      setSparkRevealed(true)
      generateSparkReaction(todaySparkQuestion.question, sparkAnswer, partnerSparkAnswer)
    }
  }, [sparkSubmitted, partnerSparkAnswer, todaySparkQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Article insight fetch
  useEffect(() => {
    if (loading) return
    const dayIndex = getDayIndex()

    fetch('/api/learn/feed')
      .then(r => r.json())
      .then(d => {
        const articles = d.articles || []
        if (!articles.length) return

        const activeTags = []
        if (myAttachmentStyle) activeTags.push('attachment')
        if (myConflictStyle) activeTags.push('conflict')
        if (myLoveLanguage) { activeTags.push('intimacy'); activeTags.push('communication') }

        let filtered = activeTags.length
          ? articles.filter(a => a.tags && activeTags.some(tag => a.tags.includes(tag)))
          : []
        if (!filtered.length) filtered = articles

        const article = filtered[dayIndex % filtered.length]
        setArticleInsight(article)

        const articleTags = article.tags || []
        if (articleTags.includes('attachment')) {
          setNoraCommentary('Understanding how you each attach changes everything.')
        } else if (articleTags.includes('conflict')) {
          setNoraCommentary('How you fight matters more than how much you fight.')
        } else if (articleTags.includes('intimacy')) {
          setNoraCommentary("Intimacy isn't just physical — it's feeling truly known.")
        } else if (articleTags.includes('communication')) {
          setNoraCommentary('The best couples are just two good listeners.')
        } else {
          setNoraCommentary("Nora thought you'd find this one interesting.")
        }
      })
      .catch(() => {})
  }, [loading, myAttachmentStyle, myConflictStyle, myLoveLanguage])

  const generateSparkReaction = async (question, myAnswer, partnerAnswer) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/spark-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ question, myAnswer, partnerAnswer, userName, partnerName })
      })
      const data = await response.json()
      if (data.reaction) setNoraSparkReaction(data.reaction)
    } catch (e) {
      console.error('Spark reaction error:', e)
    }
  }

  const submitSparkAnswer = async () => {
    if (!userId || !coupleId || !sparkAnswer.trim() || !todaySparkQuestion) return
    try {
      const { error: sparkError } = await supabase
        .from('today_responses')
        .upsert({
          user_id: userId,
          couple_id: coupleId,
          prompt_date: getTodayString(),
          spark_question: todaySparkQuestion.question,
          spark_answer: sparkAnswer.trim(),
          spark_submitted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,prompt_date' })
      if (sparkError) console.error('Spark save error detail:', JSON.stringify(sparkError))
      setSparkSubmitted(true)
    } catch (err) {
      console.error('Submit spark error:', err)
    }
  }

  const handleSparkSkip = async () => {
    if (partnerHasAnswered || sparkSubmitted) return
    const newSkipCount = sparkSkipCount + 1
    setSparkSkipCount(newSkipCount)

    if (newSkipCount >= 3) return

    let newQuestion
    if (newSkipCount === 2) {
      const allLevel1 = sparkQuestionsData.filter(q => q.level === 1)
      newQuestion = allLevel1[(getDayIndex() + 1) % allLevel1.length]
      setOverrideSparkQuestion(newQuestion)
    } else {
      setOverrideSparkQuestion(null)
      const newIndex = (sparkQuestionIndex + 1) % Math.max(eligibleSparkQuestions.length, 1)
      setSparkQuestionIndex(newIndex)
      newQuestion = eligibleSparkQuestions[newIndex]
    }

    setSparkAnswer('')
    setSparkSubmitted(false)
    setPartnerSparkAnswer('')
    setPartnerHasAnswered(false)
    setSparkRevealed(false)
    setNoraSparkReaction('')
    hasGeneratedReaction.current = false

    if (userId && coupleId && newQuestion) {
      await supabase
        .from('today_responses')
        .upsert({
          user_id: userId,
          couple_id: coupleId,
          prompt_date: getTodayString(),
          spark_question: newQuestion.question,
          spark_answer: null,
          spark_submitted_at: null,
        }, { onConflict: 'user_id,prompt_date' })
    }
  }

  const handleReaction = (reaction) => {
    if (reactionSaved) return

    if (reaction === 'Tell Nora') {
      sessionStorage.setItem('nora_opener', noraSurprise)
      router.push('/ai-coach?new=true')
      return
    }

    setTodayReaction(reaction)

    // Auto-save with empty note after 2 seconds (clears if user starts typing)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveReaction(reaction, '')
    }, 2000)
  }

  const saveReaction = async (reaction, note) => {
    if (!userId || !coupleId) return
    try {
      await supabase
        .from('today_responses')
        .upsert({
          user_id: userId,
          couple_id: coupleId,
          prompt: noraSurprise,
          prompt_date: getTodayString(),
          reaction,
          note: note || null,
        }, { onConflict: 'user_id,prompt_date' })
      setTodayNote(note)
      setReactionSaved(true)
      if (partnerId && userName) {
        notifyPartnerTodayResponse(supabase, partnerId, userName, reaction).catch(() => {})
      }
    } catch (err) {
      console.error('Save reaction error:', err)
    }
  }

  const handleSaveReaction = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    saveReaction(todayReaction, reactionInput)
  }

  const getPartnerCoaching = () => {
    if (!partnerLoveLanguage) return null
    const coaching = {
      words_of_affirmation: {
        action: `Send ${partnerName} a note telling them one thing you genuinely appreciate about them today.`,
        why: `${partnerName}'s primary love language is words of affirmation — being told they're loved and valued matters more to them than almost anything else.`,
      },
      quality_time: {
        action: `Put your phone away for the next hour and just be present with ${partnerName}.`,
        why: `${partnerName} feels most loved through quality time — your full attention is the gift they actually want.`,
      },
      acts_of_service: {
        action: `Do one small thing for ${partnerName} without being asked — notice what would help them.`,
        why: `For ${partnerName}, love shows up in action. Doing something helpful before they ask is deeply meaningful.`,
      },
      physical_touch: {
        action: `Reach for ${partnerName}'s hand today. That's it.`,
        why: `Physical touch is how ${partnerName} feels connected. Even small gestures carry a lot of weight for them.`,
      },
      receiving_gifts: {
        action: `Pick up something small for ${partnerName} today — it doesn't need to be expensive, just thoughtful.`,
        why: `${partnerName}'s love language is receiving gifts — not the cost, but the thought behind it shows them you were thinking of them.`,
      },
    }
    return coaching[partnerLoveLanguage] || null
  }

  async function copyInviteLink() {
    if (inviteLoading) return
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ prompt: noraSurprise, reaction: todayReaction, note: todayNote }),
      })
      const json = await res.json()
      if (json.token) {
        const url = `${window.location.origin}/invite/${json.token}`
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          const el = document.createElement('textarea')
          el.value = url
          document.body.appendChild(el)
          el.select()
          document.execCommand('copy')
          document.body.removeChild(el)
        }
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 2000)
      }
    } catch (err) {
      console.error('copyInviteLink error:', err)
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  const partnerCoaching = getPartnerCoaching()

  const headerGradient = {
    morning: 'linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(249,115,22,0.08) 100%)',
    afternoon: 'linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(251,191,36,0.08) 100%)',
    evening: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.07) 100%)',
  }
  const timeIconColor = {
    morning: '#D97706',
    afternoon: '#CA8A04',
    evening: '#7C3AED',
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="px-6 pt-10 pb-32 space-y-8">

        {/* Header — time-of-day gradient */}
        <div
          className="rounded-2xl px-5 py-4 -mx-1"
          style={{ background: headerGradient[timeOfDay] }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {timeOfDay === 'evening' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke={timeIconColor.evening} strokeWidth="1.75"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke={timeOfDay === 'morning' ? timeIconColor.morning : timeIconColor.afternoon}
                   strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </div>
          <h1 className="text-[28px] text-neutral-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            Today
          </h1>
        </div>

        {/* SECTION 1 — DAILY SPARK or NORA PROMPT */}
        {gameType === 'spark' ? (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400">
                Daily Spark
              </span>
              {todaySparkQuestion && sparkSkipCount < 3 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 uppercase tracking-wide">
                  {todaySparkQuestion.tone}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              {sparkSkipCount >= 3 ? (
                /* Third skip — redirect to Nora */
                <div>
                  <p className="text-[17px] text-neutral-700 leading-relaxed mb-5"
                     style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                    Some questions are harder to land on than others — that's okay. Want to talk about what's coming up for you?
                  </p>
                  <button
                    onClick={() => router.push('/ai-coach')}
                    className="px-5 py-2.5 bg-[#E8614D] text-white rounded-full text-[14px] font-semibold"
                  >
                    Talk to Nora
                  </button>
                </div>

              ) : !todaySparkQuestion ? null : sparkRevealed ? (
                /* State C — Both answered, reveal */
                <div>
                  <p className="text-[13px] text-neutral-400 leading-relaxed mb-4">
                    {todaySparkQuestion.question}
                  </p>
                  <div className="space-y-3">
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-neutral-400 mb-1.5">
                        {userName || 'You'}
                      </p>
                      <p className="text-[16px] text-neutral-900 leading-snug"
                         style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                        {sparkAnswer}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-neutral-400 mb-1.5">
                        {partnerName}
                      </p>
                      <p className="text-[16px] text-neutral-900 leading-snug"
                         style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                        {partnerSparkAnswer}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    {noraSparkReaction ? (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse mt-1.5 flex-shrink-0" />
                        <p className="text-[13px] text-neutral-500 italic leading-relaxed">
                          {noraSparkReaction}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-neutral-400">Nora is thinking…</p>
                    )}
                  </div>
                </div>

              ) : sparkSubmitted ? (
                /* State B — User answered, waiting for partner */
                <div>
                  <p className="text-[13px] text-neutral-400 leading-relaxed mb-4">
                    {todaySparkQuestion.question}
                  </p>
                  <div className="bg-neutral-50 rounded-xl p-4 mb-4">
                    <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-neutral-400 mb-1.5">
                      Your answer
                    </p>
                    <p className="text-[16px] text-neutral-900 leading-snug"
                       style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                      {sparkAnswer}
                    </p>
                  </div>
                  <p className="text-[13px] text-neutral-400">
                    {partnerName} hasn't answered yet — check back later
                  </p>
                </div>

              ) : (
                /* State A — Before user answers */
                <div>
                  <p className="text-[22px] text-neutral-900 leading-[1.35] mb-5"
                     style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                    {todaySparkQuestion.question}
                  </p>

                  {partnerHasAnswered && (
                    <p className="text-[12px] font-medium text-[#E8614D] mb-4">
                      {partnerName} has answered — your turn
                    </p>
                  )}

                  <input
                    type="text"
                    value={sparkAnswer}
                    onChange={e => setSparkAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sparkAnswer.trim() && submitSparkAnswer()}
                    placeholder="Your answer…"
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-[15px] text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors mb-3"
                  />

                  <button
                    onClick={submitSparkAnswer}
                    disabled={!sparkAnswer.trim()}
                    className="w-full py-3 bg-[#E8614D] text-white rounded-xl text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    Submit
                  </button>

                  <div className="mt-4 text-center">
                    {partnerHasAnswered ? (
                      <p className="text-[12px] text-neutral-400">
                        {partnerName} already answered — this one's locked in.
                      </p>
                    ) : (
                      <button
                        onClick={handleSparkSkip}
                        className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        Not today →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

        ) : (
          /* Non-spark days — existing Nora prompt unchanged */
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              From Nora
            </div>
            <div className="bg-gradient-to-br from-[#252048] via-[#3E3585] to-[#6B4A72] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#E8614D]/10 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40">Nora</span>
                </div>
                <p className="text-white text-[20px] leading-[1.45] mb-5"
                   style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                  {noraSurprise}
                </p>

                {!reactionSaved ? (
                  <div>
                    <div className="flex gap-2 flex-wrap">
                      {REACTIONS.map(r => (
                        <button
                          key={r}
                          onClick={() => handleReaction(r)}
                          className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                            todayReaction === r
                              ? 'bg-[#E8614D] text-white'
                              : 'bg-white/15 text-white/80 hover:bg-white/25'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {todayReaction && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={reactionInput}
                          onChange={e => {
                            setReactionInput(e.target.value)
                            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
                          }}
                          placeholder="Want to add anything? (optional)"
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-white/40"
                        />
                        <button
                          onClick={handleSaveReaction}
                          className="mt-2 px-5 py-2 bg-white/20 text-white text-[13px] font-semibold rounded-full hover:bg-white/30 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-4 py-2 rounded-full text-[13px] font-semibold bg-[#E8614D] text-white">
                        {todayReaction}
                      </span>
                      {todayNote && (
                        <span className="text-white/60 text-[13px]">— {todayNote}</span>
                      )}
                    </div>
                    {partnerReaction && (
                      <p className="text-white/50 text-[12px]">
                        {partnerName} said: {partnerReaction}{partnerNote ? ` — ${partnerNote}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {reactionSaved && partnerName === 'your partner' && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-white/50 text-[13px]">Share this with your partner</p>
                    <button
                      onClick={copyInviteLink}
                      disabled={inviteLoading}
                      className="text-[13px] font-semibold text-white/80 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {inviteCopied ? 'Link copied!' : inviteLoading ? 'Copying…' : 'Copy invite link →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2 — FOR YOUR PARTNER */}
        <section>
          <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
            For {partnerName}
          </div>
          {partnerCoaching ? (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-[#E8614D] flex-shrink-0" />
                <div className="p-5 flex-1">
                  <p className="text-[16px] text-neutral-900 leading-snug"
                     style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                    {partnerCoaching.action}
                  </p>
                  <button
                    onClick={() => setWhyOpen(w => !w)}
                    className="mt-3 text-[12px] text-neutral-400 underline underline-offset-2"
                  >
                    {whyOpen ? 'Hide' : 'Why this?'}
                  </button>
                  {whyOpen && (
                    <p className="mt-2 text-[12px] text-neutral-500 leading-relaxed">
                      {partnerCoaching.why}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : neglectedFeature ? (
            <button
              onClick={() => router.push(neglectedFeature.href)}
              className={`w-full rounded-2xl p-5 flex items-center gap-4 text-left border active:scale-[0.98] transition-transform shadow-sm ${
                neglectedFeature.urgent
                  ? 'bg-[#FEF3F1] border-[#F5C9C2]'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                neglectedFeature.urgent ? 'bg-[rgba(232,97,77,0.1)]' : 'bg-neutral-100'
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     stroke={neglectedFeature.urgent ? '#E8614D' : '#6B6560'}
                     strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-neutral-900 leading-snug">{neglectedFeature.verb}</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{neglectedFeature.hint}</p>
              </div>
              <span className="text-neutral-300 text-xl flex-shrink-0">›</span>
            </button>
          ) : null}
        </section>

        {/* SECTION 3 — RELATIONSHIP INSIGHT */}
        {articleInsight && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Worth reading
            </div>
            {noraCommentary && (
              <div className="bg-white rounded-xl border-l-4 border-[#E8614D] px-4 py-3 mb-3">
                <p className="text-[13px] text-neutral-500 italic leading-relaxed">{noraCommentary}</p>
              </div>
            )}
            <a href={articleInsight.url} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                        style={{ backgroundColor: articleInsight.sourceColor || '#3D3580' }}
                      >
                        {articleInsight.source}
                      </span>
                      <span className="text-[11px] text-neutral-400">5 min read</span>
                    </div>
                    <p className="text-[18px] text-neutral-900 leading-snug"
                       style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                      {articleInsight.title}
                    </p>
                    {articleInsight.description && (
                      <p className="text-[12px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {articleInsight.description}
                      </p>
                    )}
                    <span className="inline-block mt-3 text-[13px] font-semibold text-[#E8614D]">Read →</span>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 flex-shrink-0 flex items-center justify-center text-2xl">
                    📖
                  </div>
                </div>
              </div>
            </a>
          </section>
        )}

        {/* SECTION 4 — FEATURE SPOTLIGHT */}
        {spotlight && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Try this together
            </div>
            <button
              onClick={() => router.push(spotlight.href)}
              className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-left active:scale-[0.98] transition-transform"
            >
              <p className="text-[18px] text-neutral-900 mb-2 leading-snug"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {spotlight.title}
              </p>
              <p className="text-[13px] text-neutral-400 leading-relaxed mb-4">
                {spotlight.description}
              </p>
              <span className="text-[13px] font-semibold text-[#E8614D]">
                {spotlight.action}
              </span>
            </button>
          </section>
        )}

      </div>
    </div>
  )
}
