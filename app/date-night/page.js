'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CreateDateModal from '@/components/CreateDateModal'
import DateSuggestionCard from '@/components/DateSuggestionCard'

// Category configuration
const categories = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'museum', label: 'Culture', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'outdoor', label: 'Outdoor', icon: '🌲' },
  { id: 'activity', label: 'Activity', icon: '🎯' },
  { id: 'show', label: 'Shows', icon: '🎭' },
  { id: 'cozy', label: 'Cozy', icon: '🏠' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
]

const budgetLabels = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
}

export default function DateNight() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerId, setPartnerId] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')

  // Data
  const [suggestions, setSuggestions] = useState([])
  const [datePlans, setDatePlans] = useState([])
  const [pendingSuggestions, setPendingSuggestions] = useState([])

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [maxBudget, setMaxBudget] = useState(4)

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    totalDates: 0,
    userPlanned: 0,
    partnerPlanned: 0,
    thisYear: 0,
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
        .maybeSingle()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)

      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setPartnerId(partnerUserId)

      // Get partner name
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerUserId)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'Partner')

      await Promise.all([
        fetchSuggestions(),
        fetchDatePlans(coupleData.id, user.id),
      ])

      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    // TODO: date_suggestions table dormant pending Maps fix — removed query
  }

  const fetchDatePlans = async (coupleId, userId) => {
    const { data, error } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date_time', { ascending: false })

    if (!error && data) {
      setDatePlans(data)

      // Find pending suggestions for this user
      const pending = data.filter(
        (plan) => plan.status === 'suggested' && plan.suggested_to === userId
      )
      setPendingSuggestions(pending)

      // Calculate stats
      const completed = data.filter((p) => p.status === 'completed')
      const thisYear = completed.filter((p) => {
        const date = new Date(p.date_time || p.created_at)
        return date.getFullYear() === new Date().getFullYear()
      })
      const userPlanned = completed.filter((p) => p.created_by === userId)
      const partnerPlanned = completed.filter((p) => p.created_by !== userId)

      setStats({
        totalDates: completed.length,
        userPlanned: userPlanned.length,
        partnerPlanned: partnerPlanned.length,
        thisYear: thisYear.length,
      })
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setSelectedSuggestion(suggestion)
    setShowCreateModal(true)
  }

  const handleCreateCustom = () => {
    setSelectedSuggestion(null)
    setShowCreateModal(true)
  }

  const handleDateCreated = () => {
    if (couple && user) {
      fetchDatePlans(couple.id, user.id)
    }
    setShowCreateModal(false)
    setSelectedSuggestion(null)
  }

  const handleRespondToSuggestion = async (planId, accept) => {
    const { error } = await supabase
      .from('date_plans')
      .update({
        status: accept ? 'planned' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', planId)

    if (!error && couple && user) {
      fetchDatePlans(couple.id, user.id)
    }
  }

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((s) => {
    const categoryMatch = selectedCategory === 'all' || s.category === selectedCategory
    const budgetMatch = s.budget_level <= maxBudget
    return categoryMatch && budgetMatch
  })

  // Separate plans by status
  const upcomingDates = datePlans.filter(
    (p) => (p.status === 'planned' || p.status === 'accepted') && p.date_time && new Date(p.date_time) >= new Date()
  )
  const pastDates = datePlans.filter(
    (p) => p.status === 'completed' || (p.date_time && new Date(p.date_time) < new Date())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-500 text-lg">Loading date ideas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-coral-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-coral-500 to-indigo-500 bg-clip-text text-transparent">
              Date Night
            </h1>
            <button
              onClick={handleCreateCustom}
              className="bg-gradient-to-r from-coral-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-all"
            >
              + New Date
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Pending Suggestions Alert */}
        {pendingSuggestions.length > 0 && (
          <div className="mb-6">
            {pendingSuggestions.map((plan) => (
              <div
                key={plan.id}
                className="bg-gradient-to-r from-coral-500 to-indigo-500 text-white rounded-2xl p-5 mb-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-coral-100 text-sm mb-1">
                      {partnerName} suggested a date!
                    </p>
                    <h3 className="text-xl font-bold mb-1">{plan.title}</h3>
                    {plan.date_time && (
                      <p className="text-coral-100 text-sm">
                        {new Date(plan.date_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondToSuggestion(plan.id, false)}
                      className="px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 transition-colors"
                    >
                      Not Now
                    </button>
                    <button
                      onClick={() => handleRespondToSuggestion(plan.id, true)}
                      className="px-4 py-2 bg-white text-coral-500 rounded-full text-sm font-bold hover:shadow-lg transition-all"
                    >
                      Let's Do It!
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTION A: Our Dates */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💑</span> Our Dates
          </h2>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-coral-500 to-indigo-500 bg-clip-text text-transparent">
                  {stats.thisYear}
                </p>
                <p className="text-gray-500 text-sm">dates this year</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-coral-500">{stats.totalDates}</p>
                <p className="text-gray-500 text-sm">total dates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-500">{stats.userPlanned}</p>
                <p className="text-gray-500 text-sm">you planned</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{stats.partnerPlanned}</p>
                <p className="text-gray-500 text-sm">{partnerName} planned</p>
              </div>
            </div>
          </div>

          {/* Upcoming Dates */}
          {upcomingDates.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcomingDates.map((date) => (
                  <div
                    key={date.id}
                    className="bg-white rounded-xl p-4 shadow-md border-l-4 border-coral-500"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800">{date.title}</h4>
                        <p className="text-gray-500 text-sm">
                          {date.date_time
                            ? new Date(date.date_time).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Date TBD'}
                        </p>
                      </div>
                      <span className="bg-cream-100 text-coral-600 px-3 py-1 rounded-full text-xs font-medium">
                        Planned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Dates */}
          {pastDates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Past Dates</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pastDates.slice(0, 8).map((date) => (
                  <div
                    key={date.id}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium text-gray-800 text-sm line-clamp-1">{date.title}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(date.date_time || date.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {upcomingDates.length === 0 && pastDates.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="text-5xl mb-3">🌟</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No dates yet!</h3>
              <p className="text-gray-500 mb-4">
                Browse ideas below or create your own date plan.
              </p>
              <button
                onClick={handleCreateCustom}
                className="bg-gradient-to-r from-coral-500 to-indigo-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
              >
                Plan Your First Date
              </button>
            </div>
          )}
        </div>

        {/* SECTION B: Get Inspired */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💡</span> Get Inspired
          </h2>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-coral-500 to-indigo-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Budget Filter */}
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Budget</span>
              <span className="text-sm text-gray-500">
                Up to {budgetLabels[maxBudget]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>$</span>
              <span>$$</span>
              <span>$$$</span>
              <span>$$$$</span>
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuggestions.map((suggestion) => (
              <DateSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </div>

          {filteredSuggestions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-500">No ideas match your filters. Try adjusting them!</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleCreateCustom}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-coral-500 to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition-transform z-50"
      >
        +
      </button>

      {/* Create Date Modal */}
      <CreateDateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedSuggestion(null)
        }}
        coupleId={couple?.id}
        partnerId={partnerId}
        partnerName={partnerName}
        suggestion={selectedSuggestion}
        onDateCreated={handleDateCreated}
      />

      {/* Hide scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #E8614D, #5D55A0);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #E8614D, #5D55A0);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
