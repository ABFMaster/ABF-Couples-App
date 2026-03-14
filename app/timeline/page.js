'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AddEventModal from '@/components/AddEventModal'
import EventDetailModal from '@/components/EventDetailModal'

// Event type icons and accent colors
const eventTypeConfig = {
  first_date: { icon: '💕', label: 'First Date', bg: 'bg-cream-50', border: 'border-coral-100', accent: 'text-coral-600' },
  first_kiss: { icon: '💋', label: 'First Kiss', bg: 'bg-cream-50', border: 'border-coral-100', accent: 'text-coral-600' },
  anniversary: { icon: '💍', label: 'Anniversary', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600' },
  milestone: { icon: '🎉', label: 'Milestone', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600' },
  trip: { icon: '✈️', label: 'Trip', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-600' },
  date_night: { icon: '🌙', label: 'Date Night', bg: 'bg-cream-100', border: 'border-indigo-400', accent: 'text-indigo-500' },
  achievement: { icon: '🏆', label: 'Achievement', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600' },
  conversation: { icon: '💬', label: 'Conversation', bg: 'bg-cream-100', border: 'border-indigo-400', accent: 'text-indigo-500' },
  song: { icon: '🎵', label: 'Song', bg: 'bg-green-50', border: 'border-green-200', accent: 'text-green-600' },
  custom: { icon: '✨', label: 'Memory', bg: 'bg-cream-100', border: 'border-indigo-400', accent: 'text-indigo-500' },
}

export default function Timeline() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({
    totalDays: 0,
    years: 0,
    months: 0,
    days: 0,
    totalFlirts: 0,
    totalCheckins: 0,
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    checkAuth()
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
        .maybeSingle()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)
      await Promise.all([
        fetchEvents(coupleData.id),
        fetchStats(coupleData),
      ])

      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const fetchEvents = async (coupleId) => {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('couple_id', coupleId)
      .order('event_date', { ascending: false })

    if (!error && data) {
      setEvents(data)
    }
  }

  const fetchStats = async (coupleData) => {
    const startDate = new Date(coupleData.created_at)
    const now = new Date()
    const diffTime = Math.abs(now - startDate)
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    const years = Math.floor(totalDays / 365)
    const months = Math.floor((totalDays % 365) / 30)
    const days = totalDays % 30

    const flirtCount = coupleData.flirts_sent || 0

    const { count: checkinCount } = await supabase
      .from('daily_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleData.id)
      .not('question_response', 'is', null)

    setStats({
      totalDays,
      years,
      months,
      days,
      totalFlirts: flirtCount || 0,
      totalCheckins: checkinCount || 0,
    })
  }

  const handleEventAdded = () => {
    if (couple) {
      fetchEvents(couple.id)
    }
    setShowAddModal(false)
  }

  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  const handleEventUpdated = () => {
    if (couple) {
      fetchEvents(couple.id)
    }
  }

  const handleEventDeleted = () => {
    if (couple) {
      fetchEvents(couple.id)
    }
    setShowDetailModal(false)
    setSelectedEvent(null)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filterConfig = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'date_night', label: 'Dates', icon: '🌙' },
    { id: 'trip', label: 'Trips', icon: '✈️' },
    { id: 'custom', label: 'Memories', icon: '📸' },
    { id: 'milestone', label: 'Milestones', icon: '🎉' },
    { id: 'anniversary', label: 'Anniversary', icon: '💍' },
  ]

  const filteredEvents = events.filter(event => {
    const matchesFilter = activeFilter === 'all' || event.event_type === activeFilter
    const matchesSearch = !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.event_date)
    const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(event)
    return groups
  }, {})

  const thinTypes = ['song', 'conversation', 'achievement']

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg font-medium">Loading your memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">

      {/* ===== HEADER ===== */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-[#2D3648]">Our Timeline</h1>
              <p className="text-xs text-[#9CA3AF]">{stats.totalDays} days together</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              + Add
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#F8F6F3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8614D]/30 text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filterConfig.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === f.id
                    ? 'bg-[#E8614D] text-white shadow-sm'
                    : 'bg-[#F8F6F3] text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* ===== STATS ROW ===== */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-[#2D3648]">{stats.totalFlirts}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">💕 Flirts</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-[#2D3648]">{stats.totalCheckins}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">☀️ Check-ins</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-[#2D3648]">{events.length}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">📸 Memories</p>
          </div>
        </div>

        {/* ===== EMPTY STATE ===== */}
        {filteredEvents.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">
              {searchQuery || activeFilter !== 'all' ? '🔍' : '📷'}
            </div>
            <h2 className="text-2xl font-bold text-[#2D3648] mb-2">
              {searchQuery || activeFilter !== 'all' ? 'No matches found' : 'Start Your Timeline'}
            </h2>
            <p className="text-[#6B7280] mb-6 text-sm">
              {searchQuery || activeFilter !== 'all'
                ? 'Try a different search or filter'
                : 'Add your first memory. Your relationship story starts here.'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                Add First Memory
              </button>
            )}
          </div>
        )}

        {/* ===== TIMELINE GROUPS ===== */}
        {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
          <div key={monthYear} className="mb-8">

            {/* Month marker */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5E2DD]" />
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest px-2">
                {monthYear}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5E2DD]" />
            </div>

            {/* Events in this month */}
            <div className="space-y-3">
              {(() => {
                const cards = []
                let i = 0
                while (i < monthEvents.length) {
                  const event = monthEvents[i]
                  const config = eventTypeConfig[event.event_type] || eventTypeConfig.custom
                  const isThin = thinTypes.includes(event.event_type)
                  const hasPhoto = event.photo_urls && event.photo_urls.length > 0
                  const nextEvent = monthEvents[i + 1]
                  const nextIsThin = nextEvent && thinTypes.includes(nextEvent.event_type)

                  // Pair thin entries side by side
                  if (isThin && nextIsThin) {
                    const nextConfig = eventTypeConfig[nextEvent.event_type] || eventTypeConfig.custom
                    cards.push(
                      <div key={`pair-${event.id}`} className="grid grid-cols-2 gap-3">
                        {[event, nextEvent].map((e, idx) => {
                          const c = idx === 0 ? config : nextConfig
                          return (
                            <button
                              key={e.id}
                              onClick={() => handleEventClick(e)}
                              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left"
                            >
                              <span className="text-xl">{c.icon}</span>
                              <p className="font-semibold text-gray-800 text-sm mt-2 line-clamp-1">{e.title}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )
                    i += 2
                    continue
                  }

                  // Photo-rich card
                  if (hasPhoto) {
                    cards.push(
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all text-left relative"
                      >
                        <div className="relative h-56">
                          <img
                            src={event.photo_urls[0]}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="flex items-end justify-between">
                              <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${config.bg} ${config.accent}`}>
                                  {config.icon} {config.label}
                                </span>
                                <h3 className="text-white font-bold text-lg leading-tight">{event.title}</h3>
                                <p className="text-white/70 text-xs mt-0.5">
                                  {new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                              {event.photo_urls.length > 1 && (
                                <span className="text-white/70 text-xs bg-black/30 px-2 py-1 rounded-full">
                                  +{event.photo_urls.length - 1} photos
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {event.description && (
                          <div className="bg-white px-4 py-3">
                            <p className="text-gray-500 text-sm line-clamp-2">{event.description}</p>
                          </div>
                        )}
                      </button>
                    )
                    i++
                    continue
                  }

                  // Standard text card
                  cards.push(
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left border-l-4 ${config.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-lg">{config.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-gray-900 text-sm leading-snug">{event.title}</h3>
                            <span className={`text-xs font-semibold flex-shrink-0 ${config.accent}`}>
                              {config.label}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{event.description}</p>
                          )}
                          <p className="text-gray-300 text-xs mt-2">
                            {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                  i++
                }
                return cards
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* ===== FLOATING ADD BUTTON ===== */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-all hover:shadow-xl z-50"
        aria-label="Add memory"
      >
        +
      </button>

      {/* ===== MODALS ===== */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        coupleId={couple?.id}
        onEventAdded={handleEventAdded}
      />

      <EventDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        coupleId={couple?.id}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
