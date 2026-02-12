'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CreateTripModal from '@/components/CreateTripModal'

// Trip type configuration
const tripTypes = [
  { id: 'all', label: 'All Trips', icon: '✨' },
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'relaxation', label: 'Relaxation', icon: '🏖️' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' },
  { id: 'romantic', label: 'Romantic', icon: '💕' },
  { id: 'mixed', label: 'Mixed', icon: '🌈' },
]

// Default trip images by type
const defaultImages = {
  adventure: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600',
  relaxation: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
  cultural: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600',
  romantic: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600',
  mixed: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
}

export default function Trips() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')

  // Data
  const [trips, setTrips] = useState([])
  const [selectedType, setSelectedType] = useState('all')

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    countriesVisited: 0,
    daysAway: null,
  })

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
        .single()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)

      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id

      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', partnerUserId)
        .single()

      setPartnerName(partnerProfile?.first_name || 'Partner')

      await fetchTrips(coupleData.id)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const fetchTrips = async (coupleId) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('couple_id', coupleId)
      .order('start_date', { ascending: false })

    if (!error && data) {
      setTrips(data)
      calculateStats(data)
    }
  }

  const calculateStats = (tripData) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completed = tripData.filter(t => t.status === 'completed' || new Date(t.end_date) < today)
    const upcoming = tripData.filter(t => new Date(t.start_date) >= today && t.status !== 'cancelled')

    let daysAway = null
    if (upcoming.length > 0) {
      const nextTrip = upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0]
      const diffTime = new Date(nextTrip.start_date) - today
      daysAway = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const uniqueDestinations = new Set(tripData.map(t => t.destination.split(',')[0].trim()))

    setStats({
      totalTrips: completed.length,
      upcomingTrips: upcoming.length,
      countriesVisited: uniqueDestinations.size,
      daysAway,
    })
  }

  const handleTripCreated = () => {
    if (couple) {
      fetchTrips(couple.id)
    }
    setShowCreateModal(false)
  }

  const handleTripClick = (trip) => {
    router.push(`/trips/${trip.id}`)
  }

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options = { month: 'short', day: 'numeric' }

    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
    }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
  }

  const getStatusBadge = (status, startDate, endDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < today || status === 'completed') {
      return { label: 'Completed', className: 'bg-gray-100 text-gray-800' }
    }
    if (start <= today && end >= today) {
      return { label: 'In Progress', className: 'bg-green-100 text-green-800' }
    }
    if (status === 'confirmed') {
      return { label: 'Confirmed', className: 'bg-green-100 text-green-800' }
    }
    return { label: 'Planning', className: 'bg-blue-100 text-blue-800' }
  }

  // Filter trips
  const filteredTrips = trips.filter(t => {
    if (selectedType === 'all') return true
    return t.trip_type === selectedType
  })

  // Separate trips by status
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingTrips = filteredTrips.filter(t =>
    new Date(t.start_date) >= today && t.status !== 'cancelled'
  ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

  const pastTrips = filteredTrips.filter(t =>
    new Date(t.end_date) < today || t.status === 'completed'
  ).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  const activeTrips = filteredTrips.filter(t => {
    const start = new Date(t.start_date)
    const end = new Date(t.end_date)
    return start <= today && end >= today && t.status !== 'cancelled'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg font-medium">Loading trips...</p>
        </div>
      </div>
    )
  }

  // Trip Card Component
  const TripCard = ({ trip, index, isActive }) => {
    const statusBadge = getStatusBadge(trip.status, trip.start_date, trip.end_date)
    const tripImage = trip.cover_image || defaultImages[trip.trip_type] || defaultImages.mixed

    return (
      <button
        onClick={() => handleTripClick(trip)}
        className={`bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all border border-[#E5E2DD] overflow-hidden text-left w-full animate-fadeInUp ${isActive ? 'ring-2 ring-[#FF6B9D] ring-offset-2' : ''}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-64 flex-shrink-0">
            <div className="aspect-video md:aspect-auto md:h-full relative">
              <img
                src={tripImage}
                alt={trip.destination}
                className="w-full h-full object-cover md:rounded-l-2xl"
              />
              {isActive && (
                <div className="absolute top-3 left-3 bg-[#FF6B9D] text-white text-xs font-bold px-3 py-1 rounded-full">
                  NOW TRAVELING
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-2xl font-bold text-[#2D3648] line-clamp-1">
                {trip.title || trip.destination}
              </h3>
              <span className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>

            {/* Destination Tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#F8F6F3] text-[#2D3648] text-sm px-3 py-1 rounded-lg">
                📍 {trip.destination}
              </span>
              {trip.trip_type && (
                <span className="bg-[#F8F6F3] text-[#2D3648] text-sm px-3 py-1 rounded-lg">
                  {tripTypes.find(t => t.id === trip.trip_type)?.icon} {tripTypes.find(t => t.id === trip.trip_type)?.label}
                </span>
              )}
            </div>

            {/* Dates */}
            <p className="text-[#6B7280] mb-4 flex items-center gap-2">
              <span>📅</span>
              {formatDateRange(trip.start_date, trip.end_date)}
            </p>

            {/* Description */}
            {trip.description && (
              <p className="text-[#6B7280] line-clamp-2 mb-4">
                {trip.description}
              </p>
            )}

            {/* View Details Link */}
            <span className="text-[#FF6B9D] hover:text-[#C9184A] font-medium inline-flex items-center gap-1 transition-colors">
              View Details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* ===== HEADER ===== */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E5E2DD] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
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
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
            >
              + Create New Trip
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* ===== PAGE TITLE ===== */}
        <section className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#2D3648] mb-2">Trip Planning</h1>
          <p className="text-[#6B7280]">
            Plan your adventures with {partnerName}
          </p>
        </section>

        {/* ===== STATS ROW ===== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[#E5E2DD]">
            <p className="text-3xl font-bold text-[#2D3648]">{stats.upcomingTrips}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Upcoming</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[#E5E2DD]">
            <p className="text-3xl font-bold text-[#2D3648]">{stats.totalTrips}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Completed</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[#E5E2DD]">
            <p className="text-3xl font-bold text-[#2D3648]">{stats.countriesVisited}</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Destinations</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[#E5E2DD]">
            {stats.daysAway !== null ? (
              <>
                <p className="text-3xl font-bold text-[#FF6B9D]">{stats.daysAway}</p>
                <p className="text-sm text-[#9CA3AF] mt-1">Days to Next Trip</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-[#9CA3AF]">—</p>
                <p className="text-sm text-[#9CA3AF] mt-1">No Upcoming</p>
              </>
            )}
          </div>
        </section>

        {/* ===== TYPE FILTERS ===== */}
        <section className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tripTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                  selectedType === type.id
                    ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white shadow-md'
                    : 'bg-white text-[#6B7280] hover:bg-gray-50 border border-[#E5E2DD]'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== ACTIVE TRIPS ===== */}
        {activeTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[#2D3648] mb-6 flex items-center gap-2">
              <span>🎉</span> Currently Traveling!
            </h2>
            <div className="flex flex-col gap-6">
              {activeTrips.map((trip, index) => (
                <TripCard key={trip.id} trip={trip} index={index} isActive />
              ))}
            </div>
          </section>
        )}

        {/* ===== UPCOMING TRIPS ===== */}
        {upcomingTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[#2D3648] mb-6 flex items-center gap-2">
              <span>✈️</span> Upcoming Adventures
            </h2>
            <div className="flex flex-col gap-6">
              {upcomingTrips.map((trip, index) => (
                <TripCard key={trip.id} trip={trip} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* ===== PAST TRIPS ===== */}
        {pastTrips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[#2D3648] mb-6 flex items-center gap-2">
              <span>📸</span> Past Memories
            </h2>
            <div className="flex flex-col gap-6">
              {pastTrips.map((trip, index) => (
                <TripCard key={trip.id} trip={trip} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* ===== EMPTY STATE ===== */}
        {trips.length === 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E2DD] p-12 text-center">
            <div className="text-7xl mb-6">✈️</div>
            <h2 className="text-3xl font-bold text-[#2D3648] mb-3">No trips yet!</h2>
            <p className="text-[#6B7280] mb-8 max-w-md mx-auto">
              Start planning your next adventure together. Create your first trip to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Plan Your First Trip
            </button>
          </section>
        )}

        {/* ===== NO FILTER RESULTS ===== */}
        {trips.length > 0 && filteredTrips.length === 0 && (
          <section className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-[#6B7280]">No {tripTypes.find(t => t.id === selectedType)?.label.toLowerCase()} trips found.</p>
            <button
              onClick={() => setSelectedType('all')}
              className="mt-4 text-[#FF6B9D] hover:text-[#C9184A] font-medium transition-colors"
            >
              View all trips
            </button>
          </section>
        )}
      </div>

      {/* ===== FLOATING ACTION BUTTON ===== */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-all hover:shadow-xl z-50"
        aria-label="Create new trip"
      >
        +
      </button>

      {/* ===== CREATE TRIP MODAL ===== */}
      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        coupleId={couple?.id}
        partnerName={partnerName}
        onTripCreated={handleTripCreated}
      />

      {/* ===== STYLES ===== */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
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
