'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function TripPhotoGrid({ tripId, coupleId, photos, onPhotosChange }) {
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const file of files) {
        // Generate unique filename
        const ext = file.name.split('.').pop()
        const fileName = `${coupleId}/${tripId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trip-photos')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-photos')
          .getPublicUrl(fileName)

        // Save to database
        const { error: insertError } = await supabase
          .from('trip_photos')
          .insert({
            trip_id: tripId,
            uploaded_by: user.id,
            photo_url: publicUrl,
          })

        if (insertError) {
          console.error('Insert error:', insertError)
        }
      }

      onPhotosChange()
    } catch (err) {
      console.error('Error uploading photos:', err)
    }

    setUploading(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (photoId) => {
    const { error } = await supabase
      .from('trip_photos')
      .delete()
      .eq('id', photoId)

    if (!error) {
      onPhotosChange()
      setSelectedPhoto(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <button
        onClick={handleUploadClick}
        disabled={uploading}
        className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-dashed border-gray-200 hover:border-pink-300"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3 text-pink-500">
            <span className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
            Uploading...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <span className="text-4xl">📸</span>
            <span className="font-medium">Add photos from your trip</span>
            <span className="text-sm text-gray-400">Click to upload</span>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
            >
              <img
                src={photo.photo_url}
                alt="Trip photo"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">📷</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No photos yet</h3>
          <p className="text-gray-500">
            Capture and share your favorite memories from this trip
          </p>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <img
              src={selectedPhoto.photo_url}
              alt="Trip photo"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeletePhoto(selectedPhoto.id)
              }}
              className="absolute bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>

            {/* Caption */}
            {selectedPhoto.caption && (
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg max-w-md">
                {selectedPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
