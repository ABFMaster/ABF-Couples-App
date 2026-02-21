'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Reuse options from profile onboarding
const LOVE_LANGUAGES = [
  { value: 'words', label: 'Words of Affirmation', icon: '💬' },
  { value: 'time', label: 'Quality Time', icon: '⏰' },
  { value: 'acts', label: 'Acts of Service', icon: '🤲' },
  { value: 'gifts', label: 'Receiving Gifts', icon: '🎁' },
  { value: 'touch', label: 'Physical Touch', icon: '🤗' },
]

const COMMUNICATION_STYLES = [
  { value: 'direct', label: 'Direct' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'patient', label: 'Patient' },
  { value: 'passionate', label: 'Passionate' },
  { value: 'gentle', label: 'Gentle' },
]

const CONFLICT_STYLES = [
  { value: 'talk_immediately', label: 'Talk it out right away' },
  { value: 'need_space', label: 'Take some space first' },
  { value: 'write_it_out', label: 'Write it out' },
  { value: 'avoid', label: 'Let it cool down' },
]

const VALUES = [
  'honesty', 'loyalty', 'family', 'adventure', 'creativity', 'stability',
  'growth', 'independence', 'compassion', 'humor', 'faith', 'health',
  'success', 'connection', 'freedom', 'security', 'respect', 'ambition',
  'kindness', 'balance',
]

const HOBBIES = [
  { value: 'reading', label: '📚 Reading' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'cooking', label: '🍳 Cooking' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'music', label: '🎵 Music' },
  { value: 'movies', label: '🎬 Movies/TV' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'outdoors', label: '🏕️ Outdoors' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'art', label: '🎨 Art' },
  { value: 'photography', label: '📷 Photography' },
  { value: 'writing', label: '✍️ Writing' },
  { value: 'dancing', label: '💃 Dancing' },
  { value: 'crafts', label: '🧶 Crafts/DIY' },
  { value: 'gardening', label: '🌱 Gardening' },
  { value: 'pets', label: '🐾 Pets' },
  { value: 'technology', label: '💻 Technology' },
  { value: 'meditation', label: '🧘 Meditation' },
  { value: 'podcasts', label: '🎙️ Podcasts' },
  { value: 'board_games', label: '🎲 Board Games' },
  { value: 'wine', label: '🍷 Wine/Drinks' },
  { value: 'volunteering', label: '🤝 Volunteering' },
]

const DATE_PREFERENCES = [
  { value: 'dinner', label: '🍽️ Nice dinner out' },
  { value: 'home_cooking', label: '🏠 Cooking at home' },
  { value: 'movie_night', label: '🎬 Movie night' },
  { value: 'outdoor_adventure', label: '🥾 Outdoor adventure' },
  { value: 'museum', label: '🏛️ Museums/galleries' },
  { value: 'concert', label: '🎤 Concert/live music' },
  { value: 'coffee', label: '☕ Coffee date' },
  { value: 'picnic', label: '🧺 Picnic' },
  { value: 'spa', label: '💆 Spa day' },
  { value: 'game_night', label: '🎲 Game night' },
  { value: 'dancing', label: '💃 Dancing' },
  { value: 'travel', label: '✈️ Weekend getaway' },
  { value: 'stargazing', label: '⭐ Stargazing' },
  { value: 'beach', label: '🏖️ Beach day' },
  { value: 'workout', label: '🏋️ Working out together' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'sports_event', label: '🏟️ Sports event' },
  { value: 'lazy_day', label: '😴 Lazy day in' },
]

const CHECKIN_TIMES = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'afternoon', label: '☀️ Afternoon' },
  { value: 'evening', label: '🌆 Evening' },
  { value: 'night', label: '🌙 Night' },
]

export default function Settings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    love_language_primary: null,
    love_language_secondary: null,
    communication_style: [],
    conflict_style: null,
    top_values: [],
    hobbies: [],
    date_preferences: [],
    preferred_checkin_time: null,
    stress_response: '',
  })

  // Check if profile is completed
  const profileCompleted = userProfile?.completed_at != null

  // Get display name for header
  const displayName = formData.first_name || userProfile?.display_name || null

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Get user profile
    const { data: userProfileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    setUserProfile(userProfileData)

    // Populate form
    setFormData({
      first_name: userProfileData?.display_name || '',
      love_language_primary: userProfileData?.love_language_primary || null,
      love_language_secondary: userProfileData?.love_language_secondary || null,
      communication_style: userProfileData?.communication_style || [],
      conflict_style: userProfileData?.conflict_style || null,
      top_values: userProfileData?.top_values || [],
      hobbies: userProfileData?.hobbies || [],
      date_preferences: userProfileData?.date_preferences || [],
      preferred_checkin_time: userProfileData?.preferred_checkin_time || null,
      stress_response: userProfileData?.stress_response || '',
    })

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      // Update display name
      if (formData.first_name !== userProfile?.display_name) {
        await supabase
          .from('user_profiles')
          .upsert({ user_id: user.id, display_name: formData.first_name }, { onConflict: 'user_id' })
      }

      // Update user profile
      const userProfileData = {
        user_id: user.id,
        love_language_primary: formData.love_language_primary,
        love_language_secondary: formData.love_language_secondary,
        communication_style: formData.communication_style,
        conflict_style: formData.conflict_style,
        top_values: formData.top_values,
        hobbies: formData.hobbies,
        date_preferences: formData.date_preferences,
        preferred_checkin_time: formData.preferred_checkin_time,
        stress_response: formData.stress_response,
        updated_at: new Date().toISOString(),
      }

      await supabase
        .from('user_profiles')
        .update(userProfileData)
        .eq('user_id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleMultiSelect = (field, value, limit = null) => {
    setFormData(prev => {
      const current = prev[field] || []
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) }
      } else {
        if (limit && current.length >= limit) {
          return prev
        }
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-500 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 ${profileCompleted ? 'pb-24' : 'pb-6'}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-coral-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-coral-600">
            {displayName ? `${displayName}'s Settings` : 'Settings'}
          </h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Profile Avatar Section - Always show */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-coral-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {formData.first_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-gray-800">
                  {formData.first_name || 'Your Name'}
                </p>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONDITIONAL: Profile Not Completed - Show Quiz CTA */}
        {!profileCompleted && (
          <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-coral-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">💕</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Complete Your Profile</h2>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Take our 5-minute quiz to personalize your ABF experience. We'll use your answers to suggest better flirts, date ideas, and conversation topics.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/assessment')}
                  className="w-full py-4 bg-gradient-to-r from-coral-400 to-indigo-400 text-white rounded-2xl font-bold text-lg hover:from-coral-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Start Assessment
                </button>
                <p className="text-sm text-gray-400">
                  You can always update your answers later in settings
                </p>
              </div>
            </div>

            {/* What you'll answer preview */}
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              <p className="text-sm font-medium text-gray-600 mb-3">What you'll tell us about:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: '💕', label: 'Love Languages' },
                  { icon: '💬', label: 'Communication' },
                  { icon: '🤝', label: 'Conflict Style' },
                  { icon: '🎯', label: 'Values' },
                  { icon: '🎨', label: 'Hobbies' },
                  { icon: '🥰', label: 'Date Ideas' },
                  { icon: '🔔', label: 'Check-in Time' },
                  { icon: '💆', label: 'Stress Support' },
                ].map(item => (
                  <span key={item.label} className="px-3 py-1.5 bg-white rounded-full text-sm text-gray-600 shadow-sm">
                    {item.icon} {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONDITIONAL: Profile Completed - Show Edit Profile Section */}
        {profileCompleted && (
          <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Edit Profile</h2>
              <p className="text-sm text-gray-500">Update your preferences to improve suggestions</p>
            </div>

            {/* Name */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('name')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Display Name</p>
                    <p className="text-sm text-gray-500">{formData.first_name || 'Not set'}</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'name' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'name' && (
                <div className="p-4 bg-gray-50">
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full p-3 border-2 border-coral-100 rounded-xl focus:border-coral-400 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
              )}
            </div>

            {/* Love Languages */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('love_languages')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💕</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Love Languages</p>
                    <p className="text-sm text-gray-500">
                      {formData.love_language_primary
                        ? LOVE_LANGUAGES.find(l => l.value === formData.love_language_primary)?.label
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'love_languages' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'love_languages' && (
                <div className="p-4 bg-gray-50 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Primary:</p>
                    <div className="flex flex-wrap gap-2">
                      {LOVE_LANGUAGES.map(lang => (
                        <button
                          key={lang.value}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            love_language_primary: lang.value,
                            love_language_secondary: prev.love_language_secondary === lang.value ? null : prev.love_language_secondary,
                          }))}
                          className={`px-3 py-2 rounded-full text-sm transition-all ${
                            formData.love_language_primary === lang.value
                              ? 'bg-coral-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-cream-100'
                          }`}
                        >
                          {lang.icon} {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Secondary (optional):</p>
                    <div className="flex flex-wrap gap-2">
                      {LOVE_LANGUAGES.filter(l => l.value !== formData.love_language_primary).map(lang => (
                        <button
                          key={lang.value}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            love_language_secondary: prev.love_language_secondary === lang.value ? null : lang.value,
                          }))}
                          className={`px-3 py-2 rounded-full text-sm transition-all ${
                            formData.love_language_secondary === lang.value
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-cream-100'
                          }`}
                        >
                          {lang.icon} {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Communication Style */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('communication')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Communication Style</p>
                    <p className="text-sm text-gray-500">
                      {formData.communication_style.length > 0
                        ? formData.communication_style.map(s => COMMUNICATION_STYLES.find(c => c.value === s)?.label).join(', ')
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'communication' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'communication' && (
                <div className="p-4 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {COMMUNICATION_STYLES.map(style => (
                      <button
                        key={style.value}
                        onClick={() => handleMultiSelect('communication_style', style.value)}
                        className={`px-3 py-2 rounded-full text-sm transition-all ${
                          formData.communication_style.includes(style.value)
                            ? 'bg-coral-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-cream-100'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conflict Style */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('conflict')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Conflict Resolution</p>
                    <p className="text-sm text-gray-500">
                      {formData.conflict_style
                        ? CONFLICT_STYLES.find(c => c.value === formData.conflict_style)?.label
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'conflict' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'conflict' && (
                <div className="p-4 bg-gray-50">
                  <div className="space-y-2">
                    {CONFLICT_STYLES.map(style => (
                      <button
                        key={style.value}
                        onClick={() => setFormData(prev => ({ ...prev, conflict_style: style.value }))}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          formData.conflict_style === style.value
                            ? 'bg-coral-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-cream-100'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top Values */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('values')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Core Values</p>
                    <p className="text-sm text-gray-500">
                      {formData.top_values.length > 0
                        ? formData.top_values.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ')
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'values' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'values' && (
                <div className="p-4 bg-gray-50">
                  <p className="text-sm text-gray-500 mb-3">Select up to 3 ({formData.top_values.length}/3)</p>
                  <div className="flex flex-wrap gap-2">
                    {VALUES.map(value => {
                      const isSelected = formData.top_values.includes(value)
                      const isDisabled = formData.top_values.length >= 3 && !isSelected
                      return (
                        <button
                          key={value}
                          onClick={() => handleMultiSelect('top_values', value, 3)}
                          disabled={isDisabled}
                          className={`px-3 py-2 rounded-full text-sm capitalize transition-all ${
                            isSelected
                              ? 'bg-coral-500 text-white'
                              : isDisabled
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-cream-100'
                          }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hobbies */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('hobbies')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎨</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Interests & Hobbies</p>
                    <p className="text-sm text-gray-500">
                      {formData.hobbies.length > 0
                        ? `${formData.hobbies.length} selected`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'hobbies' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'hobbies' && (
                <div className="p-4 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {HOBBIES.map(hobby => (
                      <button
                        key={hobby.value}
                        onClick={() => handleMultiSelect('hobbies', hobby.value)}
                        className={`px-3 py-2 rounded-full text-sm transition-all ${
                          formData.hobbies.includes(hobby.value)
                            ? 'bg-coral-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-cream-100'
                        }`}
                      >
                        {hobby.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Preferences */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('dates')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🥰</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Date Preferences</p>
                    <p className="text-sm text-gray-500">
                      {formData.date_preferences.length > 0
                        ? `${formData.date_preferences.length} selected`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'dates' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'dates' && (
                <div className="p-4 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {DATE_PREFERENCES.map(pref => (
                      <button
                        key={pref.value}
                        onClick={() => handleMultiSelect('date_preferences', pref.value)}
                        className={`px-3 py-2 rounded-full text-sm transition-all ${
                          formData.date_preferences.includes(pref.value)
                            ? 'bg-coral-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-cream-100'
                        }`}
                      >
                        {pref.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Check-in Time */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('checkin')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Check-in Time</p>
                    <p className="text-sm text-gray-500">
                      {formData.preferred_checkin_time
                        ? CHECKIN_TIMES.find(t => t.value === formData.preferred_checkin_time)?.label
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'checkin' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'checkin' && (
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    {CHECKIN_TIMES.map(time => (
                      <button
                        key={time.value}
                        onClick={() => setFormData(prev => ({ ...prev, preferred_checkin_time: time.value }))}
                        className={`p-3 rounded-xl text-sm transition-all ${
                          formData.preferred_checkin_time === time.value
                            ? 'bg-coral-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-cream-100'
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stress Support */}
            <div>
              <button
                onClick={() => toggleSection('stress')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💆</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Stress Support</p>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {formData.stress_response || 'Not set'}
                    </p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'stress' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSection === 'stress' && (
                <div className="p-4 bg-gray-50">
                  <textarea
                    value={formData.stress_response}
                    onChange={(e) => setFormData(prev => ({ ...prev, stress_response: e.target.value }))}
                    placeholder="What helps you most when stressed? e.g., A hug, space to decompress..."
                    className="w-full p-3 border-2 border-coral-100 rounded-xl focus:border-coral-400 focus:outline-none resize-none h-24"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Section - Always show */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Account</h2>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-red-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Save Button - Only show when profile is completed */}
      {profileCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-coral-400 to-coral-500 text-white hover:from-coral-500 hover:to-coral-600'
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </span>
              ) : saved ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
