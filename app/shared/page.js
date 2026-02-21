'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const TABS = {
  all:        { emoji: '✨', label: 'All' },
  movie:      { emoji: '🎬', label: 'Movies' },
  show:       { emoji: '📺', label: 'Shows' },
  song:       { emoji: '🎵', label: 'Songs' },
  restaurant: { emoji: '🍽️', label: 'Restaurants' },
  date_idea:  { emoji: '💡', label: 'Ideas' },
}

const TYPE_SINGULAR = {
  movie:      'Movie',
  show:       'Show',
  song:       'Song',
  restaurant: 'Restaurant',
  date_idea:  'Date Idea',
}

function relativeTime(dateStr) {
  const diff    = Date.now() - new Date(dateStr).getTime()
  const days    = Math.floor(diff / 86400000)
  const hours   = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 6)   return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days > 0)   return `${days}d ago`
  if (hours > 0)  return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// ── ADD ITEM MODAL ────────────────────────────────────────────────────────────

function AddItemModal({ isOpen, onClose, coupleId, userId, onAdded, defaultType = 'movie' }) {
  const [type, setType]     = useState(defaultType)
  const [title, setTitle]   = useState('')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (isOpen) { setType(defaultType); setTitle(''); setNote(''); setError(null) }
  }, [isOpen, defaultType])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('shared_items').insert({
        couple_id: coupleId,
        user_id:   userId,
        type,
        title: title.trim(),
        note:  note.trim() || null,
      })
      if (err) { setError(err.message); return }
      onAdded()
      onClose()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const typeOptions = Object.entries(TABS).filter(([k]) => k !== 'all')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-10 animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 className="text-xl font-bold text-[#2D3648] mb-5">Add to Our Space</h3>

        {/* Type selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {typeOptions.map(([key, { emoji, label }]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                type === key ? 'bg-[#E8614D] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span>{emoji}</span><span>{label.replace(/s$/, '')}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={`${TABS[type]?.emoji} ${TYPE_SINGULAR[type]} title…`}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] mb-3"
          autoFocus
        />
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] mb-3"
        />

        {error && (
          <p className="text-red-500 text-sm mb-3 px-1">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-opacity mt-2"
        >
          {saving ? 'Saving…' : 'Add to Our Space'}
        </button>
      </div>
    </div>
  )
}

// ── ITEM CARD ─────────────────────────────────────────────────────────────────

function ItemCard({ item, userId, userName, onToggleDone, onDelete }) {
  const isOwner   = item.user_id === userId
  const typeEmoji = TABS[item.type]?.emoji || '✨'

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm transition-all ${item.completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0 mt-0.5">{typeEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-[#2D3648] font-semibold text-base leading-tight ${item.completed ? 'line-through text-[#9CA3AF]' : ''}`}>
            {item.title}
          </p>
          {item.note && (
            <p className="text-[#6B7280] text-sm mt-0.5 italic">"{item.note}"</p>
          )}
          <p className="text-[#9CA3AF] text-xs mt-1.5">
            {userName} · {relativeTime(item.created_at)}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(item)}
            className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5 p-1"
            aria-label="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {!item.completed ? (
        <button
          onClick={() => onToggleDone(item)}
          className="mt-4 w-full py-2.5 border-2 border-gray-100 hover:border-green-300 rounded-xl text-sm font-medium text-[#9CA3AF] hover:text-green-600 transition-all"
        >
          ✓ Mark as Done
        </button>
      ) : (
        <button
          onClick={() => onToggleDone(item)}
          className="mt-3 text-xs text-[#9CA3AF] hover:text-[#E8614D] transition-colors"
        >
          Undo
        </button>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function SharedPage() {
  const router = useRouter()

  const [loading, setLoading]     = useState(true)
  const [user, setUser]           = useState(null)
  const [couple, setCouple]       = useState(null)
  const [items, setItems]         = useState([])
  const [tab, setTab]             = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [userNames, setUserNames] = useState({}) // userId → displayName

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
      setCouple(coupleData)

      // Fetch display names for both users
      const userIds = [coupleData.user1_id, coupleData.user2_id].filter(Boolean)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)

      const nameMap = {}
      for (const p of profiles || []) nameMap[p.user_id] = p.display_name || 'You'
      setUserNames(nameMap)

      // Fetch all shared items for the couple
      const { data: itemsData, error: itemsError } = await supabase
        .from('shared_items')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })

      if (!itemsError) setItems(itemsData || [])
      setLoading(false)
    } catch (err) {
      console.error('Shared page error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleDone = async (item) => {
    const newCompleted = !item.completed
    const { data } = await supabase
      .from('shared_items')
      .update({
        completed:    newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', item.id)
      .select()
      .maybeSingle()
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  const handleDelete = async (item) => {
    await supabase.from('shared_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = tab === 'all' ? items : items.filter(i => i.type === tab)
  const active   = filtered.filter(i => !i.completed)
  const done     = filtered.filter(i => i.completed)

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  // ── Empty state copy per tab ──────────────────────────────────────────────

  const emptyHeading = tab === 'all'
    ? 'Nothing here yet'
    : `No ${TABS[tab]?.label} yet`

  const emptyBody = tab === 'all'
    ? 'Start adding movies, shows, songs, and date ideas to your shared list.'
    : `Add your first ${TYPE_SINGULAR[tab]?.toLowerCase()} to get started.`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F6F3]">

      {/* ===== HEADER ===== */}
      <header className="bg-gradient-to-r from-[#E8614D] to-[#3D3580] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/70 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Our Space 💑</h1>
          <p className="text-white/70 text-sm mt-1">
            Movies, shows, songs, and ideas — just for you two
          </p>
        </div>
      </header>

      {/* ===== TABS ===== */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1.5 overflow-x-auto py-3 no-scrollbar">
            {Object.entries(TABS).map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  tab === key
                    ? 'bg-[#E8614D] text-white'
                    : 'text-[#6B7280] hover:text-[#2D3648]'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {active.length === 0 && done.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm mt-4">
            <p className="text-5xl mb-4">{TABS[tab]?.emoji}</p>
            <p className="text-[#2D3648] font-semibold text-lg mb-2">{emptyHeading}</p>
            <p className="text-[#9CA3AF] text-sm mb-6 max-w-xs mx-auto">{emptyBody}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              + Add Something
            </button>
          </div>
        ) : (
          <>
            {/* Active items */}
            {active.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                userId={user?.id}
                userName={userNames[item.user_id] || 'You'}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
              />
            ))}

            {/* Completed section */}
            {done.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-[#9CA3AF] font-semibold uppercase tracking-wider mb-3 px-1">
                  Completed
                </p>
                <div className="space-y-3">
                  {done.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      userId={user?.id}
                      userName={userNames[item.user_id] || 'You'}
                      onToggleDone={handleToggleDone}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== FAB ===== */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform z-40"
        aria-label="Add item"
      >
        +
      </button>

      {/* ===== ADD MODAL ===== */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        coupleId={couple?.id}
        userId={user?.id}
        onAdded={fetchData}
        defaultType={tab === 'all' ? 'movie' : tab}
      />

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
