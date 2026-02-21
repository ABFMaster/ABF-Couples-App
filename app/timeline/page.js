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

    const { count: flirtCount } = await supabase
      .from('flirts')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleData.id)

    const { count: checkinCount } = await supabase
      .from('daily_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleData.id)
      .not('user1_answer', 'is', null)
      .not('user2_answer', 'is', null)

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
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* ===== HEADER ===== */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              + Add Memory
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ===== PAGE TITLE ===== */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#2D3648] mb-2">Our Timeline</h1>
          <p className="text-[#6B7280]">
            {stats.totalDays} days of memories together
          </p>
        </section>

        {/* ===== STATS ROW ===== */}
        <section className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-white shadow-md rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💕</span>
            </div>
            <p className="text-2xl font-bold text-[#2D3648]">{stats.totalFlirts}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Flirts Sent</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-white shadow-md rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">☀️</span>
            </div>
            <p className="text-2xl font-bold text-[#2D3648]">{stats.totalCheckins}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Check-ins</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-white shadow-md rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📸</span>
            </div>
            <p className="text-2xl font-bold text-[#2D3648]">{events.length}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Memories</p>
          </div>
        </section>

        {/* ===== TIMELINE EVENTS ===== */}
        {events.length === 0 ? (
          /* ===== EMPTY STATE ===== */
          <section className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-7xl mb-6">📷</div>
            <h2 className="text-3xl font-bold text-[#2D3648] mb-3">Start Your Timeline</h2>
            <p className="text-[#6B7280] mb-8 max-w-md mx-auto">
              Add your first milestone, trip, or special memory. Your relationship story starts here.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Add First Memory
            </button>
          </section>
        ) : (
          /* ===== ACTIVITY CARDS ===== */
          <section className="flex flex-col gap-4">
            {events.map((event, index) => {
              const config = eventTypeConfig[event.event_type] || eventTypeConfig.custom

              return (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-left border-l-4 ${config.border} animate-fadeInUp`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Circle */}
                    <div className={`w-14 h-14 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-semibold text-[#2D3648] line-clamp-1">
                          {event.title}
                        </h3>
                        {/* Activity Type Badge */}
                        <span className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white text-xs font-medium px-3 py-1 rounded-full flex-shrink-0">
                          {config.label}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-[#6B7280] line-clamp-2 mb-3">
                          {event.description}
                        </p>
                      )}

                      {/* Photo Preview */}
                      {event.photo_urls && event.photo_urls.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {event.photo_urls.slice(0, 3).map((url, photoIndex) => (
                            <div
                              key={photoIndex}
                              className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                            >
                              <img
                                src={url}
                                alt={`${event.title} photo ${photoIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {photoIndex === 2 && event.photo_urls.length > 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-sm font-medium">
                                    +{event.photo_urls.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-sm text-[#9CA3AF]">
                        {formatDate(event.event_date)}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-[#9CA3AF] flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}

            {/* Add More Card */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-2 border-dashed border-[#E5E7EB] hover:border-[#E8614D] group"
            >
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-[#E8614D] to-[#C44A38] rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl font-bold">+</span>
                </div>
                <span className="text-[#6B7280] font-medium group-hover:text-[#E8614D] transition-colors">
                  Add Another Memory
                </span>
              </div>
            </button>
          </section>
        )}
      </div>

      {/* ===== FLOATING ADD BUTTON ===== */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-all hover:shadow-xl z-50"
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

      {/* ===== STYLES ===== */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
