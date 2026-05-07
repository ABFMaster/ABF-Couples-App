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

  useEffect(() => {
    checkAuthAndCoupleStatus()
  }, [])

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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signup')
        return
      }

      setUser(user)

      const { data: couples } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (couples && couples.connected_at) {
        router.push('/dashboard')
        return
      }

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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
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

      const { data: existing } = await supabase
        .from('couples')
        .select('connect_code')
        .eq('connect_code', code)
        .maybeSingle()

      if (existing) {
        handleCreateCode()
        return
      }

      const { error } = await supabase
        .from('couples')
        .insert({ user1_id: user.id, connect_code: code })

      if (error) throw error

      setConnectCode(code)
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

      if (code.length !== 6) throw new Error('Code must be 6 characters')

      const { data: couple, error: findError } = await supabase
        .from('couples')
        .select('*')
        .eq('connect_code', code)
        .maybeSingle()

      if (findError || !couple) throw new Error('Invalid connect code')
      if (couple.user2_id) throw new Error('This code has already been used')
      if (couple.user1_id === user.id) throw new Error('You cannot connect to your own code')

      const { error: updateError } = await supabase
        .from('couples')
        .update({ user2_id: user.id, connected_at: new Date().toISOString() })
        .eq('id', couple.id)

      if (updateError) throw updateError

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
    } catch {}
  }

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setInputCode(value)
    setError('')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF6EF', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ padding: '48px 32px 64px', maxWidth: '400px', margin: '0 auto' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', background: '#C4714A', borderRadius: '16px', padding: '10px 20px' }}>
            <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#FAF6EF', fontWeight: 600, margin: 0 }}>ABF</p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FFF0ED', border: '0.5px solid #E8C8B8', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#C4714A' }}>
            {error}
          </div>
        )}

        {/* ── Mode selection ─────────────────────────────────────────────── */}
        {!mode && (
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Connect with your partner.
            </h1>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 32px', lineHeight: 1.5 }}>
              One of you creates a code, the other enters it. Takes ten seconds.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => setMode('create')}
                style={{ width: '100%', padding: '16px', background: '#C4714A', color: '#FAF6EF', fontSize: '16px', fontWeight: 600, borderRadius: '14px', border: 'none', cursor: 'pointer' }}
              >
                Share a code
              </button>
              <button
                onClick={() => setMode('enter')}
                style={{ width: '100%', padding: '16px', background: 'white', border: '0.5px solid #E8DDD0', color: '#5C3D2E', fontSize: '16px', fontWeight: 600, borderRadius: '14px', cursor: 'pointer' }}
              >
                I have a code
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', marginTop: '4px', padding: '12px', background: 'transparent', border: 'none', color: '#A09080', fontSize: '14px', cursor: 'pointer' }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Create mode — generate ─────────────────────────────────────── */}
        {mode === 'create' && !connectCode && (
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Generate a code.
            </h1>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 32px', lineHeight: 1.5 }}>
              Your partner will enter this to link your profiles.
            </p>

            <button
              onClick={handleCreateCode}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting ? '#E8DDD0' : '#C4714A',
                color: submitting ? '#A09080' : '#FAF6EF',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Generating…' : 'Generate code'}
            </button>

            <button
              onClick={() => setMode(null)}
              style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', border: 'none', color: '#A09080', fontSize: '14px', cursor: 'pointer' }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── Create mode — show code ────────────────────────────────────── */}
        {mode === 'create' && connectCode && (
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Here's your code.
            </h1>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 24px', lineHeight: 1.5 }}>
              Send this to your partner. They'll enter it on this page.
            </p>

            <div style={{ background: '#1C1208', borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: '#C4714A', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 600 }}>Connect Code</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '42px', fontWeight: 400, color: '#F5ECD7', letterSpacing: '0.15em', margin: 0 }}>
                {connectCode}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button
                onClick={handleCopyCode}
                style={{ flex: 1, padding: '14px', background: 'white', border: '0.5px solid #E8DDD0', color: '#5C3D2E', fontSize: '14px', fontWeight: 600, borderRadius: '12px', cursor: 'pointer' }}
              >
                {copied ? '✓ Copied' : 'Copy code'}
              </button>
              <button
                onClick={async () => {
                  const shareText = `Join me on ABF! Use code ${connectCode} at abf.app/connect`
                  if (navigator.share) {
                    try { await navigator.share({ title: 'Join me on ABF!', text: shareText }) } catch {}
                  } else {
                    handleCopyCode()
                  }
                }}
                style={{ flex: 1, padding: '14px', background: '#C4714A', color: '#FAF6EF', fontSize: '14px', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Share
              </button>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', color: '#7A6A54', fontSize: '14px', fontWeight: 500, borderRadius: '12px', cursor: 'pointer' }}
            >
              Connect later
            </button>
          </div>
        )}

        {/* ── Enter code mode ────────────────────────────────────────────── */}
        {mode === 'enter' && (
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Enter their code.
            </h1>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 28px', lineHeight: 1.5 }}>
              Ask your partner to share the code they generated.
            </p>

            <form onSubmit={handleEnterCode}>
              <input
                type="text"
                value={inputCode}
                onChange={handleInputChange}
                placeholder="ABC123"
                maxLength={6}
                disabled={submitting}
                autoFocus
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'white',
                  border: '0.5px solid #E8DDD0',
                  borderRadius: '16px',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#1C1208',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: "'DM Sans', -apple-system, sans-serif",
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                }}
              />

              <button
                type="submit"
                disabled={submitting || inputCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (submitting || inputCode.length !== 6) ? '#E8DDD0' : '#C4714A',
                  color: (submitting || inputCode.length !== 6) ? '#A09080' : '#FAF6EF',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '14px',
                  border: 'none',
                  cursor: (submitting || inputCode.length !== 6) ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Connecting…' : 'Connect'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(null)}
              style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', border: 'none', color: '#A09080', fontSize: '14px', cursor: 'pointer' }}
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  )
}
