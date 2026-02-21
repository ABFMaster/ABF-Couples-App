'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import AddItineraryItemModal from '@/components/AddItineraryItemModal'
import AddPackingItemModal from '@/components/AddPackingItemModal'
import ItineraryDay from '@/components/ItineraryDay'
import PackingItem from '@/components/PackingItem'
import TripPhotoGrid from '@/components/TripPhotoGrid'

const tripTypeConfig = {
  adventure: { icon: '🏔️', label: 'Adventure' },
  relaxation: { icon: '🏖️', label: 'Relaxation' },
  cultural: { icon: '🏛️', label: 'Cultural' },
  romantic: { icon: '💕', label: 'Romantic' },
  mixed: { icon: '🌈', label: 'Mixed' },
}

const packingCategories = [
  { id: 'clothes', label: 'Clothes', icon: '👕' },
  { id: 'toiletries', label: 'Toiletries', icon: '🧴' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'electronics', label: 'Electronics', icon: '🔌' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'other', label: 'Other', icon: '📦' },
]

export default function TripDetail() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [partnerId, setPartnerId] = useState(null)

  // Trip data
  const [trip, setTrip] = useState(null)
  const [itinerary, setItinerary] = useState([])
  const [packingList, setPackingList] = useState([])
  const [photos, setPhotos] = useState([])

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [showPackingModal, setShowPackingModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (tripId) {
      checkAuth()
    }
  }, [tripId])

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

      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setPartnerId(partnerUserId)

      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerUserId)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'Partner')

      await fetchTripData()
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const fetchTripData = async () => {
    await Promise.all([
      fetchTrip(),
      fetchItinerary(),
      fetchPackingList(),
      fetchPhotos(),
    ])
  }

  const fetchTrip = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle()

    if (!error && data) {
      setTrip(data)
    }
  }

  const fetchItinerary = async () => {
    const { data, error } = await supabase
      .from('trip_itinerary')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (!error) {
      setItinerary(data || [])
    }
  }

  const fetchPackingList = async () => {
    const { data, error } = await supabase
      .from('trip_packing')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })

    if (!error) {
      setPackingList(data || [])
    }
  }

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (!error) {
      setPhotos(data || [])
    }
  }

  const handleAddItineraryItem = (dayNumber) => {
    setSelectedDay(dayNumber)
    setShowItineraryModal(true)
  }

  const handleItineraryCreated = () => {
    fetchItinerary()
    setShowItineraryModal(false)
    setSelectedDay(null)
  }

  const handlePackingCreated = () => {
    fetchPackingList()
    setShowPackingModal(false)
  }

  const handleTogglePacked = async (itemId, isPacked) => {
    const { error } = await supabase
      .from('trip_packing')
      .update({
        is_packed: !isPacked,
        packed_at: !isPacked ? new Date().toISOString() : null,
      })
      .eq('id', itemId)

    if (!error) {
      fetchPackingList()
    }
  }

  const handleDeletePackingItem = async (itemId) => {
    const { error } = await supabase
      .from('trip_packing')
      .delete()
      .eq('id', itemId)

    if (!error) {
      fetchPackingList()
    }
  }

  const handleDeleteItineraryItem = async (itemId) => {
    const { error } = await supabase
      .from('trip_itinerary')
      .delete()
      .eq('id', itemId)

    if (!error) {
      fetchItinerary()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg font-medium">Loading trip...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-6">😢</div>
          <h2 className="text-3xl font-bold text-[#2D3648] mb-3">Trip not found</h2>
          <button
            onClick={() => router.push('/trips')}
            className="text-[#E8614D] hover:text-[#C44A38] font-medium transition-colors"
          >
            Back to trips
          </button>
        </div>
      </div>
    )
  }

  const typeConfig = tripTypeConfig[trip.trip_type] || tripTypeConfig.mixed
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tripDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
  const isUpcoming = startDate > today
  const isActive = startDate <= today && endDate >= today
  const isPast = endDate < today

  // Group itinerary by day
  const itineraryByDay = {}
  for (let i = 1; i <= tripDays; i++) {
    itineraryByDay[i] = itinerary.filter(item => item.day_number === i)
  }

  // Group packing by category
  const packingByCategory = packingCategories.map(cat => ({
    ...cat,
    items: packingList.filter(item => item.category === cat.id),
  })).filter(cat => cat.items.length > 0)

  const packedCount = packingList.filter(item => item.is_packed).length
  const packingProgress = packingList.length > 0 ? Math.round((packedCount / packingList.length) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">
      {/* ===== HERO HEADER ===== */}
      <div className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => router.push('/trips')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 border border-white/30 text-white rounded-full hover:bg-white/30 transition-colors mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Trips</span>
          </button>

          {/* Trip Info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-5xl">{typeConfig.icon}</span>
                <h1 className="text-5xl font-bold">{trip.destination}</h1>
              </div>
              <p className="text-xl opacity-90 ml-1">
                {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>

              {isUpcoming && daysUntil > 0 && (
                <div className="bg-white/20 rounded-full px-5 py-2.5 inline-flex items-center gap-2 mt-6">
                  <span className="text-2xl">⏳</span>
                  <span className="font-semibold">{daysUntil} days to go!</span>
                </div>
              )}

              {isActive && (
                <div className="bg-white/20 rounded-full px-5 py-2.5 inline-flex items-center gap-2 mt-6 animate-pulse">
                  <span className="text-2xl">🎉</span>
                  <span className="font-semibold">Currently traveling!</span>
                </div>
              )}
            </div>

            <div className="text-right bg-white/10 rounded-2xl px-6 py-4">
              <p className="text-white/70 text-sm mb-1">Budget</p>
              <p className="text-2xl font-bold">{'$'.repeat(trip.budget_level || 2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-[#E5E2DD] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '📋' },
              { id: 'itinerary', label: 'Itinerary', icon: '📅' },
              { id: 'packing', label: 'Packing', icon: '🎒' },
              { id: 'photos', label: 'Photos', icon: '📸' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#E8614D] text-[#E8614D]'
                    : 'border-transparent text-[#6B7280] hover:text-[#2D3648]'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                {tab.id === 'packing' && packingList.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    packingProgress === 100 ? 'bg-green-100 text-green-700' : 'bg-[#F8F6F3] text-[#6B7280]'
                  }`}>
                    {packingProgress}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center border border-[#E5E2DD]">
                <p className="text-3xl font-bold text-[#E8614D]">{tripDays}</p>
                <p className="text-[#6B7280] text-sm mt-1">days</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center border border-[#E5E2DD]">
                <p className="text-3xl font-bold text-[#E8614D]">{itinerary.length}</p>
                <p className="text-[#6B7280] text-sm mt-1">activities planned</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center border border-[#E5E2DD]">
                <p className="text-3xl font-bold text-[#E8614D]">{packingList.length}</p>
                <p className="text-[#6B7280] text-sm mt-1">items to pack</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center border border-[#E5E2DD]">
                <p className="text-3xl font-bold text-[#E8614D]">{photos.length}</p>
                <p className="text-[#6B7280] text-sm mt-1">photos</p>
              </div>
            </div>

            {/* Description / Notes Section */}
            {trip.description && (
              <div className="bg-[#FDF6EF] border-l-4 border-[#E8614D] rounded-2xl p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-[#2D3648] mb-3">About This Trip</h3>
                <p className="text-[#6B7280] leading-relaxed">{trip.description}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-[#E5E2DD]">
              <h3 className="text-2xl font-bold text-[#2D3648] mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => { setActiveTab('itinerary'); setSelectedDay(1); setShowItineraryModal(true) }}
                  className="bg-[#F8F6F3] rounded-xl p-6 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#2D3648] group-hover:text-[#E8614D] transition-colors">Add Activity</h4>
                      <p className="text-[#6B7280] text-sm">Plan your days</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('packing'); setShowPackingModal(true) }}
                  className="bg-[#F8F6F3] rounded-xl p-6 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-2xl">🎒</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#2D3648] group-hover:text-[#E8614D] transition-colors">Add Packing Item</h4>
                      <p className="text-[#6B7280] text-sm">Don't forget anything</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('photos')}
                  className="bg-[#F8F6F3] rounded-xl p-6 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-2xl">📸</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#2D3648] group-hover:text-[#E8614D] transition-colors">Add Photos</h4>
                      <p className="text-[#6B7280] text-sm">Capture memories</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ITINERARY TAB ===== */}
        {activeTab === 'itinerary' && (
          <div className="flex flex-col gap-6">
            {Array.from({ length: tripDays }, (_, i) => i + 1).map((dayNum, index) => {
              const dayDate = new Date(startDate)
              dayDate.setDate(startDate.getDate() + dayNum - 1)
              const dayItems = itineraryByDay[dayNum] || []

              return (
                <div
                  key={dayNum}
                  className="bg-white rounded-2xl shadow-sm p-8 border border-[#E5E2DD] animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#2D3648]">Day {dayNum}</h3>
                      <p className="text-[#6B7280]">
                        {dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddItineraryItem(dayNum)}
                      className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      + Add
                    </button>
                  </div>

                  {dayItems.length > 0 ? (
                    <div className="space-y-4">
                      {dayItems.map((item) => (
                        <div key={item.id} className="bg-[#F8F6F3] rounded-xl p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {item.time && (
                                <p className="text-sm font-semibold text-[#E8614D] mb-1">{item.time}</p>
                              )}
                              <h4 className="text-lg font-semibold text-[#2D3648]">{item.activity}</h4>
                              {item.description && (
                                <p className="text-[#6B7280] mt-2">{item.description}</p>
                              )}
                              {item.location && (
                                <p className="text-[#9CA3AF] text-sm mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {item.location}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteItineraryItem(item.id)}
                              className="text-[#9CA3AF] hover:text-red-500 transition-colors p-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#9CA3AF]">No activities planned yet</p>
                      <button
                        onClick={() => handleAddItineraryItem(dayNum)}
                        className="text-[#E8614D] hover:text-[#C44A38] font-medium mt-2 transition-colors"
                      >
                        Add your first activity
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ===== PACKING TAB ===== */}
        {activeTab === 'packing' && (
          <div className="flex flex-col gap-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E2DD]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-[#2D3648]">Packing Progress</h3>
                <span className={`text-sm font-medium ${packingProgress === 100 ? 'text-green-600' : 'text-[#6B7280]'}`}>
                  {packedCount} / {packingList.length} packed
                </span>
              </div>
              <div className="h-3 bg-[#F8F6F3] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    packingProgress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-[#E8614D] to-[#C44A38]'
                  }`}
                  style={{ width: `${packingProgress}%` }}
                />
              </div>
              {packingProgress === 100 && (
                <p className="text-green-600 text-sm mt-3 flex items-center gap-2">
                  <span>✅</span> All packed and ready to go!
                </p>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowPackingModal(true)}
              className="w-full bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-2 border-dashed border-[#E5E2DD] hover:border-[#E8614D] text-[#6B7280] hover:text-[#E8614D]"
            >
              + Add packing item
            </button>

            {/* Packing List by Category */}
            {packingByCategory.length > 0 ? (
              packingByCategory.map((category) => (
                <div key={category.id} className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E2DD]">
                  <h3 className="text-2xl font-bold text-[#2D3648] mb-6 flex items-center gap-3">
                    <span>{category.icon}</span>
                    {category.label}
                    <span className="text-[#9CA3AF] text-base font-normal">
                      ({category.items.filter(i => i.is_packed).length}/{category.items.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {category.items.map(item => (
                      <div
                        key={item.id}
                        className={`bg-[#F8F6F3] p-4 rounded-xl flex items-center justify-between transition-all ${
                          item.is_packed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTogglePacked(item.id, item.is_packed)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              item.is_packed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-[#E5E2DD] hover:border-[#E8614D]'
                            }`}
                          >
                            {item.is_packed && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-[#2D3648] font-medium ${item.is_packed ? 'line-through' : ''}`}>
                            {item.item_name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeletePackingItem(item.id)}
                          className="text-[#9CA3AF] hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-[#E5E2DD]">
                <div className="text-7xl mb-6">🎒</div>
                <h3 className="text-3xl font-bold text-[#2D3648] mb-3">No packing items yet</h3>
                <p className="text-[#6B7280] mb-8 max-w-md mx-auto">Add items to your packing list to stay organized</p>
                <button
                  onClick={() => setShowPackingModal(true)}
                  className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
                >
                  Add First Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== PHOTOS TAB ===== */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-[#E5E2DD]">
            <TripPhotoGrid
              tripId={tripId}
              coupleId={couple?.id}
              photos={photos}
              onPhotosChange={fetchPhotos}
            />
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      <AddItineraryItemModal
        isOpen={showItineraryModal}
        onClose={() => { setShowItineraryModal(false); setSelectedDay(null) }}
        tripId={tripId}
        dayNumber={selectedDay}
        tripDays={tripDays}
        onItemCreated={handleItineraryCreated}
      />

      <AddPackingItemModal
        isOpen={showPackingModal}
        onClose={() => setShowPackingModal(false)}
        tripId={tripId}
        partnerId={partnerId}
        partnerName={partnerName}
        onItemCreated={handlePackingCreated}
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
