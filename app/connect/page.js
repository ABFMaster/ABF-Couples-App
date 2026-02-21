'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function ConnectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // null, 'create', or 'enter'
  const [connectCode, setConnectCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Check authentication and couple status on mount
  useEffect(() => {
    checkAuthAndCoupleStatus()
  }, [])

  // Pre-fill code from URL param ?code=XXXXXX
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode) {
      const cleaned = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      if (cleaned.length === 6) {
        setInputCode(cleaned)
        setMode('enter')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndCoupleStatus = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signup')
        return
      }

      setUser(user)

      // Check if user is already in a couple
      const { data: couples, error } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (couples && couples.connected_at) {
        // User is already connected, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // If user created a code but hasn't connected yet, show it
      if (couples && couples.user1_id === user.id && !couples.user2_id) {
        setConnectCode(couples.connect_code)
        setMode('create')
      }

    } catch (err) {
      console.error('Error checking status:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateConnectCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed similar looking chars
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateCode = async () => {
    setSubmitting(true)
    setError('')

    try {
      const code = generateConnectCode()

      // Check if code already exists (unlikely but possible)
      const { data: existing } = await supabase
        .from('couples')
        .select('connect_code')
        .eq('connect_code', code)
        .maybeSingle()

      if (existing) {
        // Try again with a new code
        handleCreateCode()
        return
      }

      // Insert new couple record with connect code
      const { error } = await supabase
        .from('couples')
        .insert({
          user1_id: user.id,
          connect_code: code
        })

      if (error) throw error

      setConnectCode(code)
      setMode('create')
    } catch (err) {
      setError(err.message || 'Failed to create connect code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnterCode = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const code = inputCode.toUpperCase().trim()

      if (code.length !== 6) {
        throw new Error('Code must be 6 characters')
      }

      // Find the couple with this connect code
      const { data: couple, error: findError } = await supabase
        .from('couples')
        .select('*')
        .eq('connect_code', code)
        .maybeSingle()

      if (findError || !couple) {
        throw new Error('Invalid connect code')
      }

      if (couple.user2_id) {
        throw new Error('This code has already been used')
      }

      if (couple.user1_id === user.id) {
        throw new Error('You cannot connect to your own code')
      }

      // Update the couple record with user2_id and connected_at
      const { error: updateError } = await supabase
        .from('couples')
        .update({
          user2_id: user.id,
          connected_at: new Date().toISOString()
        })
        .eq('id', couple.id)

      if (updateError) throw updateError

      // Success! Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to connect')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(connectCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setInputCode(value)
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
        <div className="text-coral-500 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-block bg-gradient-to-r from-coral-400 to-coral-500 text-white rounded-2xl px-8 py-4 shadow-lg mb-4">
          <h1 className="text-4xl font-bold tracking-wider">ABF</h1>
          <p className="text-xs tracking-wide opacity-90">ALWAYS BE FLIRTING</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-coral-600 mb-2 text-center">
          Connect with Your Partner 💕
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Create a code or enter your partner's code to connect
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        {!mode && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105"
            >
              Create Connect Code
            </button>
            <button
              onClick={() => setMode('enter')}
              className="w-full bg-transparent border-2 border-coral-500 text-coral-500 hover:bg-cream-50 font-semibold py-4 px-6 rounded-lg transition-all"
            >
              I Have a Code
            </button>
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full border-2 border-[#E8614D] text-[#E8614D] hover:bg-cream-50 font-semibold py-3 px-6 rounded-lg transition-all"
              >
                Explore First
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                You can connect with your partner later
              </p>
            </div>
          </div>
        )}

        {/* Create Code Mode */}
        {mode === 'create' && !connectCode && (
          <div>
            <button
              onClick={handleCreateCode}
              disabled={submitting}
              className="w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Generating...' : 'Generate Code'}
            </button>
            <button
              onClick={() => setMode(null)}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Show Generated Code */}
        {mode === 'create' && connectCode && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Share this code with your partner:</p>
            <div className="bg-cream-50 border-2 border-coral-100 rounded-xl p-6 mb-4">
              <div className="text-5xl font-bold text-coral-500 tracking-widest mb-4">
                {connectCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-coral-500 hover:bg-coral-600 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Your partner should use the "I Have a Code" option and enter this code
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full border-2 border-[#E8614D] text-[#E8614D] hover:bg-cream-50 font-semibold py-3 px-6 rounded-lg transition-all"
            >
              I'll Connect Later
            </button>
          </div>
        )}

        {/* Enter Code Mode */}
        {mode === 'enter' && (
          <form onSubmit={handleEnterCode}>
            <div className="mb-4">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Connect Code
              </label>
              <input
                type="text"
                id="code"
                value={inputCode}
                onChange={handleInputChange}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent text-center text-2xl font-bold tracking-widest uppercase"
                disabled={submitting}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={submitting || inputCode.length !== 6}
              className="w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Connecting...' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
          <div className="text-coral-500 text-xl">Loading...</div>
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  )
}
