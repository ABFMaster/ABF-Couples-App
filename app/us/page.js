'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TABS = {
  all:        { label: 'All' },
  movie:      { label: 'Movies' },
  show:       { label: 'Shows' },
  song:       { label: 'Songs' },
  restaurant: { label: 'Restaurants' },
  date_idea:  { label: 'Ideas' },
}

const TYPE_ICONS = {
  movie:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>,
  show:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>,
  song:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  restaurant: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  date_idea:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 6) return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function ItemCard({ item, userId, userName, onToggleDone, onDelete }) {
  const isOwner = item.user_id === userId
  const icon = TYPE_ICONS[item.type]

  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden transition-opacity ${item.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-4 p-5">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-12 h-16 object-cover rounded-xl flex-shrink-0" />
        ) : item.artwork_url ? (
          <img src={item.artwork_url} alt={item.title} className="w-12 h-12 object-cover rounded-xl flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-400">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-semibold text-neutral-900 leading-snug ${item.completed ? 'line-through text-neutral-400' : ''}`}>
            {item.title}
          </p>
          {item.artist && <p className="text-[12px] text-neutral-400 mt-0.5 truncate">{item.artist}</p>}
          {(item.year || item.rating) && (
            <p className="text-[12px] text-neutral-400 mt-0.5">
              {item.year}{item.year && item.rating ? ' · ' : ''}{item.rating ? `★ ${item.rating}/10` : ''}
            </p>
          )}
          {item.streaming_url && (
            <a href={item.streaming_url} target="_blank" rel="noopener noreferrer"
               className="text-[12px] font-medium flex items-center gap-1 mt-1.5"
               style={{ color: '#1DB954' }}
               onClick={e => e.stopPropagation()}>
              ▶ Spotify
            </a>
          )}
          {item.note ? (
            <p className="text-[12px] text-neutral-400 mt-1.5 italic">"{item.note}"</p>
          ) : item.plot ? (
            <p className="text-[12px] text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">{item.plot}</p>
          ) : null}
          <p className="text-[11px] text-neutral-300 mt-2">{userName} · {relativeTime(item.created_at)}</p>
        </div>
        {isOwner && (
          <button onClick={() => onDelete(item)} className="text-neutral-200 hover:text-red-400 transition-colors flex-shrink-0 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        )}
      </div>
      <div className="border-t border-neutral-100">
        {!item.completed ? (
          <button onClick={() => onToggleDone(item)}
            className="w-full py-3 text-[13px] font-medium text-neutral-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark as done
          </button>
        ) : (
          <button onClick={() => onToggleDone(item)}
            className="w-full py-3 text-[12px] text-neutral-300 hover:text-[#E8614D] transition-colors">
            Undo
          </button>
        )}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, status, action, href, router }) {
  return (
    <button
      onClick={() => router.push(href)}
      className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex items-center gap-4 active:scale-[0.99] transition-transform text-left"
    >
      <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 text-neutral-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-neutral-900 leading-snug">{title}</p>
        <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">{status}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[13px] font-semibold text-[#E8614D]">{action}</span>
        <span className="text-[#E8614D] text-base leading-none">›</span>
      </div>
    </button>
  )
}

export default function UsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [userNames, setUserNames] = useState({})

  // Feature hub state
  const [nextDate, setNextDate] = useState(null)
  const [nextTrip, setNextTrip] = useState(null)
  const [memoryCount, setMemoryCount] = useState(null)
  const [lastReflectionDays, setLastReflectionDays] = useState(undefined) // undefined = not loaded, null = never

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) { router.push('/login'); return }
      setUser(user)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!coupleData) { router.push('/connect'); return }

      const userIds = [coupleData.user1_id, coupleData.user2_id].filter(Boolean)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)
      const nameMap = {}
      for (const p of profiles || []) nameMap[p.user_id] = p.display_name || 'You'
      setUserNames(nameMap)

      const now = new Date().toISOString()
      const cid = coupleData.id

      await Promise.allSettled([

        // Shared items
        (async () => {
          const { data: itemsData } = await supabase
            .from('shared_items')
            .select('*')
            .eq('couple_id', cid)
            .order('created_at', { ascending: false })
          setItems(itemsData || [])
        })(),

        // Next date (date_plans + custom_dates)
        (async () => {
          try {
            const [{ data: planDates }, { data: customDates }] = await Promise.all([
              supabase
                .from('date_plans')
                .select('id, title, date_time')
                .eq('couple_id', cid)
                .in('status', ['planned', 'approved'])
                .gte('date_time', now)
                .order('date_time', { ascending: true })
                .limit(1),
              supabase
                .from('custom_dates')
                .select('id, title, date_time')
                .eq('couple_id', cid)
                .in('status', ['planned', 'approved'])
                .gte('date_time', now)
                .order('date_time', { ascending: true })
                .limit(1),
            ])
            const all = [
              ...(planDates || []),
              ...(customDates || []),
            ].sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
            setNextDate(all[0] || null)
          } catch { /* ignore */ }
        })(),

        // Next trip
        (async () => {
          try {
            const { data } = await supabase
              .from('trips')
              .select('destination, start_date')
              .eq('couple_id', cid)
              .gte('start_date', now)
              .order('start_date', { ascending: true })
              .limit(1)
              .maybeSingle()
            setNextTrip(data || null)
          } catch { /* ignore */ }
        })(),

        // Memory count
        (async () => {
          try {
            const { count } = await supabase
              .from('timeline_events')
              .select('id', { count: 'exact', head: true })
              .eq('couple_id', cid)
            setMemoryCount(count || 0)
          } catch { /* ignore */ }
        })(),

        // Last weekly reflection
        (async () => {
          try {
            const { data } = await supabase
              .from('weekly_reflections')
              .select('created_at')
              .eq('couple_id', cid)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (data?.created_at) {
              const days = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)
              setLastReflectionDays(days)
            } else {
              setLastReflectionDays(null)
            }
          } catch {
            setLastReflectionDays(null)
          }
        })(),

      ])

      setLoading(false)
    } catch (err) {
      console.error('Us page error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleDone = async (item) => {
    const newCompleted = !item.completed
    const { data } = await supabase
      .from('shared_items')
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq('id', item.id)
      .select()
      .maybeSingle()
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  const handleDelete = async (item) => {
    await supabase.from('shared_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const filtered = tab === 'all' ? items : items.filter(i => i.type === tab)
  const active = filtered.filter(i => !i.completed)
  const done = filtered.filter(i => i.completed)

  // Feature hub status lines
  const dateStatus = nextDate
    ? `Next: ${nextDate.title}${nextDate.date_time ? ' on ' + new Date(nextDate.date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
    : 'No date planned yet'

  const tripStatus = nextTrip
    ? `${nextTrip.destination} coming up`
    : 'No trips planned yet'

  const timelineStatus = memoryCount === null
    ? 'Loading…'
    : memoryCount > 0
      ? `${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'} together`
      : 'No memories yet'

  const reflectionStatus = lastReflectionDays === undefined
    ? 'Loading…'
    : lastReflectionDays === null
      ? 'Never reflected together'
      : lastReflectionDays === 0
        ? 'Reflected today'
        : `Last reflected ${lastReflectionDays} ${lastReflectionDays === 1 ? 'day' : 'days'} ago`

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF]">

      {/* Header */}
      <div className="px-6 pt-10 pb-2">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-1">Your shared life</p>
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] text-neutral-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            Us
          </h1>
          <button
            onClick={() => router.push('/shared/add')}
            className="min-h-[44px] px-4 bg-[#E8614D] text-white rounded-xl font-semibold text-[14px] flex items-center gap-2 active:scale-[0.98] transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>
      </div>

      {/* Feature hub — Do together */}
      <div className="px-6 pt-5 pb-2">
        <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
          Do together
        </div>
        <div className="space-y-2">

          <FeatureCard
            router={router}
            href="/dates"
            title="Date Night"
            status={dateStatus}
            action="Plan a date"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          />

          <FeatureCard
            router={router}
            href="/trips"
            title="Trips"
            status={tripStatus}
            action="Plan a trip"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.37 5.37l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            }
          />

          <FeatureCard
            router={router}
            href="/timeline"
            title="Timeline"
            status={timelineStatus}
            action="Add a memory"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            }
          />

          <FeatureCard
            router={router}
            href="/weekly-reflection"
            title="Weekly Reflection"
            status={reflectionStatus}
            action="Reflect together"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            }
          />

        </div>
      </div>

      {/* Your list section label */}
      <div className="px-6 pt-6 pb-1">
        <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 px-1">
          Your list
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sticky top-0 z-30 bg-[#F7F4EF] px-6 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${
                tab === key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-32 space-y-3 mt-2">
        {active.length === 0 && done.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-10 text-center mt-4">
            <p className="text-[18px] text-neutral-900 mb-2"
               style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
              Nothing here yet
            </p>
            <p className="text-[13px] text-neutral-400 mb-6 max-w-xs mx-auto leading-relaxed">
              Add movies, shows, songs, restaurants, and date ideas you both want to try.
            </p>
            <button
              onClick={() => router.push('/shared/add')}
              className="min-h-[44px] px-6 bg-[#E8614D] text-white rounded-xl font-semibold text-[14px] active:scale-[0.98] transition-transform">
              Add something →
            </button>
          </div>
        ) : (
          <>
            {active.map(item => (
              <ItemCard key={item.id} item={item} userId={user?.id}
                userName={userNames[item.user_id] || 'You'}
                onToggleDone={handleToggleDone} onDelete={handleDelete} />
            ))}
            {done.length > 0 && (
              <div className="pt-4">
                <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
                  Done
                </div>
                <div className="space-y-3">
                  {done.map(item => (
                    <ItemCard key={item.id} item={item} userId={user?.id}
                      userName={userNames[item.user_id] || 'You'}
                      onToggleDone={handleToggleDone} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
