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

export default function UsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [userNames, setUserNames] = useState({})

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

      const { data: itemsData } = await supabase
        .from('shared_items')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })
      setItems(itemsData || [])
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
