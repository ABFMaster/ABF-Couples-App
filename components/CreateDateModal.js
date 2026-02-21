'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const budgetOptions = [
  { value: 1, label: '$', description: 'Free or low cost' },
  { value: 2, label: '$$', description: 'Moderate' },
  { value: 3, label: '$$$', description: 'Splurge' },
  { value: 4, label: '$$$$', description: 'Special occasion' },
]

const categoryConfig = {
  dinner: { icon: '🍽️', label: 'Dinner' },
  museum: { icon: '🎨', label: 'Culture' },
  music: { icon: '🎵', label: 'Music' },
  outdoor: { icon: '🌲', label: 'Outdoor' },
  activity: { icon: '🎯', label: 'Activity' },
  show: { icon: '🎭', label: 'Show' },
  cozy: { icon: '🏠', label: 'Cozy' },
  adventure: { icon: '🎢', label: 'Adventure' },
  creative: { icon: '✨', label: 'Creative' },
}

export default function CreateDateModal({
  isOpen,
  onClose,
  coupleId,
  partnerId,
  partnerName,
  suggestion,
  onDateCreated,
}) {
  const [activeTab, setActiveTab] = useState('details') // 'details' or 'tips'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [location, setLocation] = useState('')
  const [budgetLevel, setBudgetLevel] = useState(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from suggestion when it changes
  useEffect(() => {
    if (suggestion) {
      setTitle(suggestion.title)
      setDescription(suggestion.description || '')
      setBudgetLevel(suggestion.budget_level)
      setLocation('')
      setDateTime('')
    } else {
      resetForm()
    }
  }, [suggestion])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDateTime('')
    setLocation('')
    setBudgetLevel(2)
    setError('')
    setActiveTab('details')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (asSuggestion = false) => {
    setError('')

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const insertData = {
        couple_id: coupleId,
        created_by: user.id,
        date_suggestion_id: suggestion?.id || null,
        title: title.trim(),
        description: description.trim() || null,
        date_time: dateTime || null,
        location: location.trim() || null,
        budget_level: budgetLevel,
        status: asSuggestion ? 'suggested' : 'planned',
        suggested_to: asSuggestion ? partnerId : null,
      }

      console.log('=== Date Plan Insert Debug ===')
      console.log('Data being inserted:', insertData)

      const { data, error: insertError } = await supabase
        .from('date_plans')
        .insert(insertData)
        .select()
        .maybeSingle()

      console.log('Insert result:', { data, error: insertError })

      if (insertError) {
        console.error('Error creating date plan:', insertError)
        setError('Failed to create date. Please try again.')
        setSaving(false)
        return
      }

      // Success
      resetForm()
      onDateCreated()
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
    }

    setSaving(false)
  }

  if (!isOpen) return null

  const config = suggestion ? categoryConfig[suggestion.category] : null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:max-h-[90vh] max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config && <span className="text-3xl">{config.icon}</span>}
              <div>
                <h2 className="text-xl font-bold">
                  {suggestion ? 'Plan This Date' : 'Create a Date'}
                </h2>
                <p className="text-pink-100 text-sm">
                  {suggestion ? config?.label : 'Something special for you two'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs (only show if there's a suggestion with tips) */}
        {suggestion?.tips && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-pink-600 border-b-2 border-pink-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Date Details
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'text-pink-600 border-b-2 border-pink-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tips & Ideas
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === 'details' ? (
            <div className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Suggestion description (read-only) */}
              {suggestion && (
                <div className="bg-purple-50 rounded-xl p-4 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>
                      {'$'.repeat(suggestion.budget_level)}
                    </span>
                    <span>
                      ~{suggestion.estimated_duration >= 60
                        ? `${Math.floor(suggestion.estimated_duration / 60)}h`
                        : `${suggestion.estimated_duration}m`}
                    </span>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you planning?"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When?
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where? <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Restaurant name, address, or 'home'"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Description (only for custom) */}
              {!suggestion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any details or ideas..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
              )}

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {budgetOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBudgetLevel(option.value)}
                      className={`py-3 rounded-xl border-2 transition-all ${
                        budgetLevel === option.value
                          ? 'border-pink-500 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-lg font-bold">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Tips Tab */
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>💡</span> Pro Tips
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {suggestion?.tips}
                </p>
              </div>

              {suggestion?.external_link && (
                <a
                  href={suggestion.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-pink-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <p className="font-medium text-gray-800">Find Places</p>
                        <p className="text-sm text-gray-500">Search for options near you</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 py-3 border-2 border-pink-500 text-pink-500 rounded-xl font-semibold hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>💌</span>
              Suggest to {partnerName}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Plan Date
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
