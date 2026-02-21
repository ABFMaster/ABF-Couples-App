'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const tripTypes = [
  { id: 'adventure', label: 'Adventure', icon: '🏔️', description: 'Hiking, camping, extreme sports' },
  { id: 'relaxation', label: 'Relaxation', icon: '🏖️', description: 'Beach, spa, unwinding' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️', description: 'Museums, history, local experiences' },
  { id: 'romantic', label: 'Romantic', icon: '💕', description: 'Couples getaway, special occasions' },
  { id: 'mixed', label: 'Mixed', icon: '🌈', description: 'A bit of everything' },
]

const budgetOptions = [
  { value: 1, label: '$', description: 'Budget-friendly' },
  { value: 2, label: '$$', description: 'Moderate' },
  { value: 3, label: '$$$', description: 'Comfortable' },
  { value: 4, label: '$$$$', description: 'Luxury' },
]

export default function CreateTripModal({ isOpen, onClose, coupleId, partnerName, onTripCreated }) {
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tripType, setTripType] = useState('mixed')
  const [budgetLevel, setBudgetLevel] = useState(2)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setDestination('')
    setStartDate('')
    setEndDate('')
    setTripType('mixed')
    setBudgetLevel(2)
    setDescription('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError('')

    if (!destination.trim()) {
      setError('Please enter a destination')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    if (!endDate) {
      setError('Please select an end date')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Determine status based on dates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(startDate)
      const end = new Date(endDate)

      let status = 'planning'
      if (start > today) {
        status = 'upcoming'
      } else if (start <= today && end >= today) {
        status = 'active'
      } else if (end < today) {
        status = 'completed'
      }

      const insertData = {
        couple_id: coupleId,
        created_by: user.id,
        destination: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        trip_type: tripType,
        budget_level: budgetLevel,
        description: description.trim() || null,
        status,
      }

      console.log('=== Trip Insert Debug ===')
      console.log('Data being inserted:', insertData)

      const { data, error: insertError } = await supabase
        .from('trips')
        .insert(insertData)
        .select()
        .maybeSingle()

      console.log('Insert result:', { data, error: insertError })

      if (insertError) {
        console.error('Error creating trip:', insertError)
        setError('Failed to create trip. Please try again.')
        setSaving(false)
        return
      }

      resetForm()
      onTripCreated()
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
    }

    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:max-h-[90vh] max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-coral-500 to-indigo-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✈️</span>
              <div>
                <h2 className="text-xl font-bold">Plan a Trip</h2>
                <p className="text-coral-100 text-sm">Adventure awaits you and {partnerName}</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Where are you going?
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Paris, France"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors"
                maxLength={100}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Trip Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Trip
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tripTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTripType(type.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      tripType === type.id
                        ? 'border-coral-500 bg-cream-50'
                        : 'border-gray-200 hover:border-coral-200'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <p className={`text-sm font-medium mt-1 ${
                      tripType === type.id ? 'text-coral-600' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

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
                        ? 'border-coral-500 bg-cream-50 text-coral-600'
                        : 'border-gray-200 text-gray-600 hover:border-coral-200'
                    }`}
                  >
                    <span className="text-lg font-bold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any special plans or ideas for this trip..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating...
              </>
            ) : (
              <>
                <span>✨</span>
                Create Trip
              </>
            )}
          </button>
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
