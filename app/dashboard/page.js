'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const ITEM_TYPES = {
  movie:      { emoji: '🎬', label: 'Movie' },
  show:       { emoji: '📺', label: 'Show' },
  song:       { emoji: '🎵', label: 'Song' },
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  date_idea:  { emoji: '💡', label: 'Date Idea' },
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getCoachInsight({ streak, healthScore, flirtsThisWeek, daysTogether }) {
  if (streak >= 7)          return "Seven days in a row — you two are building something beautiful."
  if (streak >= 3)          return "Consistent check-ins are one of the strongest predictors of relationship health."
  if (flirtsThisWeek >= 3)  return "You've been sending the love lately. That spark matters."
  if (healthScore >= 80)    return "Your relationship health is looking strong. Keep doing what you're doing."
  if (daysTogether < 30)    return "Every early habit you build now will shape the relationship you have."
  if (!flirtsThisWeek)      return "A small flirt can go a long way — even a simple message makes a difference."
  return "Daily connection, no matter how small, adds up to something profound."
}

function buildFeatureCards({ todayCheckinDone, nextDate, lastFlirtDaysAgo, memoryCount, activeTrip }) {
  return [
    {
      emoji: '💬',
      label: 'Daily Check-in',
      status: todayCheckinDone ? 'Done today ✓' : 'Not done yet',
      statusColor: todayCheckinDone ? 'text-green-500' : 'text-[#9CA3AF]',
      href: '/checkin',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '🗓️',
      label: 'Date Night',
      status: nextDate ? nextDate.title : 'Plan something special',
      statusColor: nextDate ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/dates',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '💌',
      label: 'Send a Flirt',
      status: lastFlirtDaysAgo === null
        ? 'Send one now'
        : lastFlirtDaysAgo === 0
          ? 'Sent today ✓'
          : `Sent ${lastFlirtDaysAgo}d ago`,
      statusColor: lastFlirtDaysAgo === 0 ? 'text-green-500' : 'text-[#9CA3AF]',
      href: '/flirts',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '🧠',
      label: 'AI Coach',
      status: 'Chat now',
      statusColor: 'text-[#3D3580]',
      href: '/ai-coach',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '🗺️',
      label: 'Trip Planning',
      status: activeTrip || 'Plan a trip',
      statusColor: activeTrip ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/trips',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '📸',
      label: 'Our Timeline',
      status: memoryCount > 0 ? `${memoryCount} memories` : 'Add your first memory',
      statusColor: memoryCount > 0 ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/timeline',
      accent: 'border-[#E8614D]',
    },
  ]
}

// ── QUICK-ADD MODAL ──────────────────────────────────────────────────────────

function AddItemModal({ isOpen, onClose, coupleId, userId, onAdded }) {
  const [type, setType]     = useState('movie')
  const [title, setTitle]   = useState('')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  // Scroll the focused input into view after the keyboard opens (~300ms delay)
  const handleInputFocus = (e) => {
    const el = e.target
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 320)
  }

  if (!isOpen) return null

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('shared_items').insert({
        couple_id: coupleId,
        user_id:   userId,
        type,
        title: title.trim(),
        note:  note.trim() || null,
      })
      if (!error) {
        setTitle('')
        setNote('')
        setType('movie')
        onAdded()
        onClose()
      }
    } catch (e) {
      console.error('Failed to add item:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 animate-slideUp overflow-y-auto"
        style={{ maxHeight: '60vh', marginBottom: '80px', paddingBottom: '1.5rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 className="text-xl font-bold text-[#2D3648] mb-5">Add to Our Space</h3>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {Object.entries(ITEM_TYPES).map(([key, { emoji, label }]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                type === key ? 'bg-[#E8614D] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span>{emoji}</span><span>{label}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={`${ITEM_TYPES[type].emoji} ${ITEM_TYPES[type].label} title…`}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] mb-3"
          autoFocus
        />
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Add a note (optional)"
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] mb-5"
        />

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Add to Our Space'}
        </button>
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()

  const [loading, setLoading]                   = useState(true)
  const [user, setUser]                         = useState(null)
  const [userName, setUserName]                 = useState('there')
  const [couple, setCouple]                     = useState(null)
  const [partnerName, setPartnerName]           = useState('your partner')
  const [hasPartner, setHasPartner]             = useState(false)
  const [connectCode, setConnectCode]           = useState(null)
  const [inviteDismissed, setInviteDismissed]   = useState(true)
  const [codeCopied, setCodeCopied]             = useState(false)

  const [healthScore, setHealthScore]           = useState(null)
  const [streak, setStreak]                     = useState(0)
  const [flirtsThisWeek, setFlirtsThisWeek]     = useState(0)
  const [daysTogether, setDaysTogether]         = useState(0)
  const [todayCheckinDone, setTodayCheckinDone] = useState(false)
  const [nextDate, setNextDate]                 = useState(null)
  const [lastFlirtDaysAgo, setLastFlirtDaysAgo] = useState(null)
  const [memoryCount, setMemoryCount]           = useState(0)
  const [activeTrip]                            = useState(null)

  const [sharedPreview, setSharedPreview]       = useState([])
  const [showAddModal, setShowAddModal]         = useState(false)

  // Hydrate localStorage on client only
  useEffect(() => {
    setInviteDismissed(localStorage.getItem('abf_invite_dismissed') === 'true')
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUser(user)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!coupleData) { router.push('/connect'); return }
      setCouple(coupleData)

      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setHasPartner(!!partnerId)
      setConnectCode(coupleData.connect_code || null)
      setDaysTogether(Math.floor((Date.now() - new Date(coupleData.created_at).getTime()) / 86400000))

      await Promise.allSettled([

        // User display name
        (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.display_name) setUserName(data.display_name)
        })(),

        // Partner display name
        partnerId ? (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', partnerId)
            .maybeSingle()
          if (data?.display_name) setPartnerName(data.display_name)
        })() : Promise.resolve(),

        // Relationship health score
        (async () => {
          const { data } = await supabase
            .from('relationship_health')
            .select('overall_score')
            .eq('couple_id', coupleData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data) setHealthScore(data.overall_score ?? null)
        })(),

        // Check-in streak + today status
        (async () => {
          const today = new Date().toISOString().split('T')[0]
          const { data } = await supabase
            .from('daily_checkins')
            .select('check_date')
            .eq('user_id', user.id)
            .eq('couple_id', coupleData.id)
            .not('question_response', 'is', null)
            .order('check_date', { ascending: false })
            .limit(60)
          if (!data?.length) return
          setTodayCheckinDone(data[0].check_date === today)
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

        // Flirts this week
        (async () => {
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          weekStart.setHours(0, 0, 0, 0)
          const { data } = await supabase
            .from('flirts')
            .select('sender_id, created_at')
            .eq('couple_id', coupleData.id)
            .gte('created_at', weekStart.toISOString())
            .order('created_at', { ascending: false })
          const mine = (data || []).filter(f => f.sender_id === user.id)
          setFlirtsThisWeek(mine.length)
          if (mine.length > 0) {
            setLastFlirtDaysAgo(Math.floor((Date.now() - new Date(mine[0].created_at).getTime()) / 86400000))
          }
        })(),

        // Next upcoming date
        (async () => {
          const { data } = await supabase
            .from('date_plans')
            .select('title, date_time')
            .eq('couple_id', coupleData.id)
            .in('status', ['planned', 'accepted'])
            .gte('date_time', new Date().toISOString())
            .order('date_time', { ascending: true })
            .limit(1)
          if (data?.[0]) setNextDate(data[0])
        })(),

        // Timeline memory count
        (async () => {
          const { count } = await supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('couple_id', coupleData.id)
          setMemoryCount(count || 0)
        })(),

        // Shared items preview
        (async () => {
          try {
            const { data } = await supabase
              .from('shared_items')
              .select('id, type, title')
              .eq('couple_id', coupleData.id)
              .eq('completed', false)
              .order('created_at', { ascending: false })
              .limit(5)
            setSharedPreview(data || [])
          } catch { /* table may not exist yet */ }
        })(),

      ])

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(connectCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const handleDismissInvite = () => {
    localStorage.setItem('abf_invite_dismissed', 'true')
    setInviteDismissed(true)
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4" />
          <p className="text-[#6B7280] font-medium">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const coachInsight = getCoachInsight({ streak, healthScore, flirtsThisWeek, daysTogether })
  const healthColor  = healthScore === null
    ? 'text-[#9CA3AF]'
    : healthScore >= 70 ? 'text-[#E8614D]'
    : healthScore >= 50 ? 'text-amber-500'
    : 'text-[#9CA3AF]'
  const featureCards = buildFeatureCards({ todayCheckinDone, nextDate, lastFlirtDaysAgo, memoryCount, activeTrip })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F6F3]">

      {/* ===== INVITE BANNER ===== */}
      {!hasPartner && !inviteDismissed && connectCode && (
        <div className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                💌 Invite {partnerName} to unlock shared features
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-white/80 font-mono text-sm tracking-[0.2em]">{connectCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="text-white/90 text-xs border border-white/40 px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissInvite}
              className="text-white/60 hover:text-white text-2xl leading-none flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-7">

        {/* ===== SECTION 1: HERO ===== */}
        <section className="relative bg-gradient-to-br from-[#E8614D] to-[#3D3580] rounded-3xl p-6 text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold mb-3">{getGreeting()}, {userName} 👋</h1>
            <p className="text-white/85 text-sm leading-relaxed mb-5">{coachInsight}</p>
            <Link
              href="/ai-coach"
              className="inline-flex items-center gap-1.5 bg-white text-[#E8614D] font-semibold px-4 py-2 rounded-full text-sm hover:bg-white/90 transition-colors"
            >
              Talk to Coach →
            </Link>
          </div>
        </section>

        {/* ===== SECTION 2: RELATIONSHIP PULSE ===== */}
        <section>
          <h2 className="text-lg font-bold text-[#2D3648] mb-3">Relationship Pulse</h2>
          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={() => router.push('/profile/results')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className={`text-3xl font-bold ${healthColor}`}>
                {healthScore !== null ? healthScore : '—'}
                <span className="text-base font-normal text-gray-200">/100</span>
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Relationship Health</p>
            </button>

            <button
              onClick={() => router.push('/checkin')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#E8614D]">
                {streak}{streak > 3 ? ' 🔥' : ''}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Day Streak</p>
            </button>

            <button
              onClick={() => router.push('/flirts')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#E8614D]">{flirtsThisWeek} 💌</p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Flirts This Week</p>
            </button>

            <button
              onClick={() => router.push('/timeline')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#3D3580]">{daysTogether} ❤️</p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Days Together</p>
            </button>

          </div>
        </section>

        {/* ===== SECTION 3: SHARED SPACE PREVIEW ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#2D3648]">Our Space 💑</h2>
            <Link href="/shared" className="text-sm text-[#E8614D] font-semibold">See All →</Link>
          </div>

          {sharedPreview.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-4xl mb-3">🎬📺🎵</p>
              <p className="text-[#6B7280] text-sm mb-4 max-w-xs mx-auto">
                Start building your shared list — movies, shows, songs, and more
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                + Add Something
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {sharedPreview.map(item => (
                <Link
                  key={item.id}
                  href="/shared"
                  className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm w-36 hover:shadow-md transition-shadow"
                >
                  <span className="text-3xl block mb-2">{ITEM_TYPES[item.type]?.emoji || '✨'}</span>
                  <p className="text-[#2D3648] font-semibold text-sm line-clamp-2 leading-tight mb-1">{item.title}</p>
                  <p className="text-[#9CA3AF] text-xs">{ITEM_TYPES[item.type]?.label}</p>
                </Link>
              ))}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-gray-200 hover:border-[#E8614D] flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <span className="text-2xl text-gray-300 group-hover:text-[#E8614D] transition-colors">+</span>
                <span className="text-xs text-gray-400 group-hover:text-[#E8614D] transition-colors font-medium text-center">
                  Add Something
                </span>
              </button>
            </div>
          )}
        </section>

        {/* ===== SECTION 4: FEATURE NAVIGATION ===== */}
        <section>
          <h2 className="text-lg font-bold text-[#2D3648] mb-3">Explore</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featureCards.map(card => (
              <button
                key={card.href}
                onClick={() => router.push(card.href)}
                className={`bg-[#FDF6EF] border-l-4 ${card.accent} rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow`}
              >
                <span className="text-3xl block mb-2">{card.emoji}</span>
                <p className="text-[#2D3648] font-semibold text-sm mb-0.5">{card.label}</p>
                <p className={`text-xs ${card.statusColor}`}>{card.status}</p>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* ===== QUICK-ADD MODAL ===== */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        coupleId={couple?.id}
        userId={user?.id}
        onAdded={fetchAll}
      />

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  )
}
