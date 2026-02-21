'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ITEM_TYPES = {
  movie:      { emoji: '🎬', label: 'Movie' },
  show:       { emoji: '📺', label: 'Show' },
  song:       { emoji: '🎵', label: 'Song' },
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  date_idea:  { emoji: '💡', label: 'Date Idea' },
}

export default function AddSharedItemPage() {
  const router = useRouter()

  const [type, setType]     = useState('movie')
  const [title, setTitle]   = useState('')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const [coupleId, setCoupleId] = useState(null)
  const [userId, setUserId]     = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: couple } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!title.trim() || saving || !coupleId) return
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
      router.push('/shared')
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="text-[#9CA3AF] hover:text-[#2D3648] text-sm mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-[#2D3648]">Add to Our Space</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-32">

        {/* Type selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {Object.entries(ITEM_TYPES).map(([key, { emoji, label }]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                type === key ? 'bg-[#E8614D] text-white' : 'bg-white text-[#6B7280] border border-gray-200'
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
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={`${ITEM_TYPES[type].emoji} ${ITEM_TYPES[type].label} title…`}
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] bg-white mb-3 text-base"
          autoFocus
        />

        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#E8614D] focus:outline-none text-[#2D3648] bg-white mb-4 text-base"
        />

        {error && (
          <p className="text-red-500 text-sm px-1">{error}</p>
        )}

      </div>

      {/* Fixed submit button above safe area */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving || !coupleId}
            className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Add to Our Space'}
          </button>
        </div>
      </div>

    </div>
  )
}
