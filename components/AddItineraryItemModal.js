'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const activityTypes = [
  { id: 'flight', label: 'Flight', icon: '✈️' },
  { id: 'hotel', label: 'Hotel', icon: '🏨' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'activity', label: 'Activity', icon: '🎯' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'other', label: 'Other', icon: '📍' },
]

export default function AddItineraryItemModal({
  isOpen,
  onClose,
  tripId,
  dayNumber,
  tripDays,
  onItemCreated,
}) {
  const [selectedDay, setSelectedDay] = useState(dayNumber || 1)
  const [activityType, setActivityType] = useState('activity')
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [confirmationNumber, setConfirmationNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedDay(dayNumber || 1)
      resetForm()
    }
  }, [isOpen, dayNumber])

  const resetForm = () => {
    setActivityType('activity')
    setTitle('')
    setStartTime('')
    setEndTime('')
    setLocation('')
    setConfirmationNumber('')
    setNotes('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError('')

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const insertData = {
        trip_id: tripId,
        created_by: user.id,
        day_number: selectedDay,
        activity_type: activityType,
        title: title.trim(),
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        confirmation_number: confirmationNumber.trim() || null,
        notes: notes.trim() || null,
      }

      console.log('=== Itinerary Item Insert Debug ===')
      console.log('Data being inserted:', insertData)

      const { data, error: insertError } = await supabase
        .from('trip_itinerary')
        .insert(insertData)
        .select()
        .maybeSingle()

      console.log('Insert result:', { data, error: insertError })

      if (insertError) {
        console.error('Error creating itinerary item:', insertError)
        setError('Failed to add item. Please try again.')
        setSaving(false)
        return
      }

      resetForm()
      onItemCreated()
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
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📅</span>
              <div>
                <h2 className="text-xl font-bold">Add Activity</h2>
                <p className="text-purple-100 text-sm">Plan your day</p>
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

            {/* Day Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day
              </label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`w-10 h-10 rounded-full font-medium transition-all ${
                      selectedDay === day
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {activityTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setActivityType(type.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      activityType === type.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <p className={`text-xs mt-1 ${
                      activityType === type.id ? 'text-pink-600' : 'text-gray-600'
                    }`}>
                      {type.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Eiffel Tower Visit"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                maxLength={100}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address or place name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Confirmation Number (for flights, hotels, etc.) */}
            {(activityType === 'flight' || activityType === 'hotel' || activityType === 'restaurant') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation Number <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Adding...
              </>
            ) : (
              <>
                <span>✨</span>
                Add to Day {selectedDay}
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
