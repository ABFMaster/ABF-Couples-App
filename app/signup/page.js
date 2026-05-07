'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (inviteCode.trim().toUpperCase() !== process.env.NEXT_PUBLIC_BETA_INVITE_CODE?.toUpperCase()) {
      setError('Invalid invite code. ABF is currently invite-only.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: name } }
      })
      if (error) throw error
      router.push('/onboarding')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'white',
    border: '0.5px solid #E8DDD0',
    borderRadius: '12px',
    fontSize: '15px',
    color: '#1C1208',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
  }

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#7A6A54',
    letterSpacing: '0.04em',
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAF6EF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '60px 32px 48px',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-block', background: '#C4714A', borderRadius: '16px', padding: '12px 24px', marginBottom: '8px' }}>
            <p style={{ fontSize: '13px', letterSpacing: '0.2em', color: '#FAF6EF', fontWeight: 600, margin: 0 }}>ABF</p>
          </div>
        </Link>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px', textAlign: 'center' }}>
          You were invited.
        </h1>
        <p style={{ fontSize: '14px', color: '#A09080', textAlign: 'center', margin: '0 0 32px' }}>
          ABF is in private beta. Enter your invite code to get started.
        </p>

        {error && (
          <div style={{ background: '#FFF0ED', border: '0.5px solid #E8C8B8', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#C4714A' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Invite code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
              placeholder="Enter your code"
              autoCapitalize="characters"
              disabled={loading}
              style={{ ...inputStyle, letterSpacing: '0.1em', fontWeight: 600 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Your first name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="What should Nora call you?" disabled={loading} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" disabled={loading} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" disabled={loading} style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#E8DDD0' : '#C4714A',
              color: loading ? '#A09080' : '#FAF6EF',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Creating your account…' : 'Create account'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{ fontSize: '14px', color: '#A09080', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#C4714A', fontWeight: 500, textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
