'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const eventTypeConfig = {
  first_date: { icon: '💕', label: 'First Date', color: 'from-pink-400 to-rose-500' },
  first_kiss: { icon: '💋', label: 'First Kiss', color: 'from-red-400 to-pink-500' },
  anniversary: { icon: '💍', label: 'Anniversary', color: 'from-purple-400 to-pink-500' },
  milestone: { icon: '🎉', label: 'Milestone', color: 'from-yellow-400 to-orange-500' },
  trip: { icon: '✈️', label: 'Trip', color: 'from-blue-400 to-cyan-500' },
  date_night: { icon: '🌙', label: 'Date Night', color: 'from-indigo-400 to-purple-500' },
  achievement: { icon: '🏆', label: 'Achievement', color: 'from-amber-400 to-yellow-500' },
  custom: { icon: '✨', label: 'Memory', color: 'from-pink-400 to-purple-500' },
}

export default function EventDetailModal({
  isOpen,
  onClose,
  event,
  coupleId,
  onEventUpdated,
  onEventDeleted,
}) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !event) return null

  const config = eventTypeConfig[event.event_type] || eventTypeConfig.custom
  const eventDate = new Date(event.event_date)
  const hasPhotos = event.photo_urls && event.photo_urls.length > 0

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? event.photo_urls.length - 1 : prev - 1
    )
  }

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === event.photo_urls.length - 1 ? 0 : prev + 1
    )
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // Delete photos from storage first
      if (hasPhotos) {
        for (const url of event.photo_urls) {
          // Extract file path from URL
          const urlParts = url.split('/timeline-photos/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            await supabase.storage.from('timeline-photos').remove([filePath])
          }
        }
      }

      // Delete the event
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', event.id)

      if (error) {
        console.error('Error deleting event:', error)
        setDeleting(false)
        return
      }

      onEventDeleted()
    } catch (err) {
      console.error('Error:', err)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Photo Carousel or Icon Header */}
        <div className={`relative aspect-video bg-gradient-to-br ${config.color}`}>
          {hasPhotos ? (
            <>
              <img
                src={event.photo_urls[currentPhotoIndex]}
                alt={event.title}
                className="w-full h-full object-cover"
              />

              {/* Photo Navigation */}
              {event.photo_urls.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Photo Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {event.photo_urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentPhotoIndex
                            ? 'bg-white w-4'
                            : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{config.icon}</span>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Event Type Badge */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
            <span>{config.icon}</span>
            <span className="text-sm font-medium text-gray-700">{config.label}</span>
          </div>
        </div>

        {/* Event Details */}
        <div className="p-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {event.title}
          </h2>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-500 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">About this memory</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Time Ago */}
          <div className="text-sm text-gray-400 mb-6">
            {(() => {
              const now = new Date()
              const diffTime = Math.abs(now - eventDate)
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
              const years = Math.floor(diffDays / 365)
              const months = Math.floor((diffDays % 365) / 30)

              if (years > 0) {
                return `${years} ${years === 1 ? 'year' : 'years'}${months > 0 ? `, ${months} ${months === 1 ? 'month' : 'months'}` : ''} ago`
              } else if (months > 0) {
                return `${months} ${months === 1 ? 'month' : 'months'} ago`
              } else if (diffDays > 0) {
                return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
              } else {
                return 'Today'
              }
            })()}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 py-3 border-2 border-red-200 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scaleIn">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🗑️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Memory?</h3>
                <p className="text-gray-500">
                  This will permanently remove this memory from your timeline. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
