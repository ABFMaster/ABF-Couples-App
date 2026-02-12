'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const packingCategories = [
  { id: 'clothes', label: 'Clothes', icon: '👕' },
  { id: 'toiletries', label: 'Toiletries', icon: '🧴' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'electronics', label: 'Electronics', icon: '🔌' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'other', label: 'Other', icon: '📦' },
]

export default function AddPackingItemModal({
  isOpen,
  onClose,
  tripId,
  partnerId,
  partnerName,
  onItemCreated,
}) {
  const [item, setItem] = useState('')
  const [category, setCategory] = useState('clothes')
  const [assignedTo, setAssignedTo] = useState('me')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setItem('')
    setCategory('clothes')
    setAssignedTo('me')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError('')

    if (!item.trim()) {
      setError('Please enter an item')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const insertData = {
        trip_id: tripId,
        added_by: user.id,
        assigned_to: assignedTo === 'me' ? user.id : partnerId,
        item: item.trim(),
        category,
      }

      console.log('=== Packing Item Insert Debug ===')
      console.log('Data being inserted:', insertData)

      const { data, error: insertError } = await supabase
        .from('trip_packing')
        .insert(insertData)
        .select()
        .single()

      console.log('Insert result:', { data, error: insertError })

      if (insertError) {
        console.error('Error creating packing item:', insertError)
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
      <div className="bg-white w-full md:w-[400px] md:max-h-[90vh] max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎒</span>
              <div>
                <h2 className="text-xl font-bold">Add Packing Item</h2>
                <p className="text-blue-100 text-sm">Don't forget the essentials</p>
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

            {/* Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item
              </label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g., Sunscreen, Passport, Camera"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors"
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {packingCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      category === cat.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <p className={`text-xs mt-1 ${
                      category === cat.id ? 'text-pink-600' : 'text-gray-600'
                    }`}>
                      {cat.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who's packing this?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAssignedTo('me')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    assignedTo === 'me'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <span className="text-2xl">🙋</span>
                  <p className={`text-sm font-medium mt-1 ${
                    assignedTo === 'me' ? 'text-pink-600' : 'text-gray-700'
                  }`}>
                    Me
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignedTo('partner')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    assignedTo === 'partner'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <span className="text-2xl">💕</span>
                  <p className={`text-sm font-medium mt-1 ${
                    assignedTo === 'partner' ? 'text-pink-600' : 'text-gray-700'
                  }`}>
                    {partnerName}
                  </p>
                </button>
              </div>
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
                Add Item
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
