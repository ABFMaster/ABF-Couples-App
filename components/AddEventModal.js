'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const eventTypes = [
  { value: 'first_date', label: 'First Date', icon: '💕' },
  { value: 'first_kiss', label: 'First Kiss', icon: '💋' },
  { value: 'anniversary', label: 'Anniversary', icon: '💍' },
  { value: 'milestone', label: 'Milestone', icon: '🎉' },
  { value: 'trip', label: 'Trip', icon: '✈️' },
  { value: 'date_night', label: 'Date Night', icon: '🌙' },
  { value: 'achievement', label: 'Achievement', icon: '🏆' },
  { value: 'custom', label: 'Other Memory', icon: '✨' },
]

export default function AddEventModal({ isOpen, onClose, coupleId, onEventAdded }) {
  const [eventType, setEventType] = useState('milestone')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [photos, setPhotos] = useState([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const resetForm = () => {
    setEventType('milestone')
    setTitle('')
    setDescription('')
    setEventDate('')
    setPhotos([])
    setPhotoPreviewUrls([])
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Limit to 5 photos
    const newPhotos = [...photos, ...files].slice(0, 5)
    setPhotos(newPhotos)

    // Create preview URLs
    const newPreviewUrls = newPhotos.map((file) => URL.createObjectURL(file))
    setPhotoPreviewUrls(newPreviewUrls)
  }

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviewUrls = photoPreviewUrls.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviewUrls(newPreviewUrls)
  }

  const uploadPhotos = async () => {
    if (photos.length === 0) return []

    const uploadedUrls = []
    const { data: { user } } = await supabase.auth.getUser()

    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${coupleId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('timeline-photos')
        .upload(fileName, photo)

      if (error) {
        console.error('Error uploading photo:', error)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('timeline-photos')
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!eventDate) {
      setError('Please select a date')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Upload photos first (if any)
      let photoUrls = []
      if (photos.length > 0) {
        photoUrls = await uploadPhotos()
      }

      // Debug logging before insert
      console.log('=== Timeline Event Insert Debug ===')
      console.log('coupleId:', coupleId)
      console.log('user.id:', user.id)
      console.log('Data being inserted:', {
        couple_id: coupleId,
        created_by: user.id,
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        photo_urls: photoUrls,
      })

      // Create the event
      const { data, error: insertError } = await supabase
        .from('timeline_events')
        .insert({
          couple_id: coupleId,
          created_by: user.id,
          event_type: eventType,
          title: title.trim(),
          description: description.trim() || null,
          event_date: eventDate,
          photo_urls: photoUrls,
        })
        .select()
        .maybeSingle()

      // Debug logging after insert
      console.log('Insert result:', { data, error: insertError })
      if (insertError) {
        console.log('Error details:', JSON.stringify(insertError, null, 2))
      }

      if (insertError) {
        console.error('Error creating event:', insertError)
        setError('Failed to create event. Please try again.')
        setSaving(false)
        return
      }

      // Success!
      resetForm()
      onEventAdded()
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
            <h2 className="text-2xl font-bold">Add Memory</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-coral-100 mt-1">Capture a special moment together</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Event Type */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type of Memory
            </label>
            <div className="grid grid-cols-4 gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    eventType === type.value
                      ? 'border-coral-500 bg-cream-50'
                      : 'border-gray-200 hover:border-coral-200'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-xs text-gray-600 text-center leading-tight">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Our first vacation together"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors"
              maxLength={100}
            />
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made this moment special?"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-coral-500 focus:outline-none transition-colors resize-none"
              maxLength={500}
            />
          </div>

          {/* Photos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos <span className="text-gray-400">(optional, max 5)</span>
            </label>

            {/* Photo Previews */}
            {photoPreviewUrls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Photo Button */}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-coral-400 hover:text-coral-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Photos
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              <>
                <span>✨</span>
                Save Memory
              </>
            )}
          </button>
        </form>
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
