'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function InvitePreviewPage() {
  const { token } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data, error } = await supabaseAnon
        .from('invite_previews')
        .select('sender_name, prompt, reaction, note')
        .eq('id', token)
        .maybeSingle()

      if (error || !data) {
        setNotFound(true)
      } else {
        setInvite(data)
      }
      setLoading(false)
    })()
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '280px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#1C1208', marginBottom: '8px', fontWeight: 400 }}>This link has expired.</p>
          <p style={{ fontSize: '14px', color: '#A09080' }}>Ask your partner to send a new one.</p>
        </div>
      </div>
    )
  }

  const senderName = invite.sender_name || 'Someone special'
  const firstName = senderName.split(' ')[0]

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF6EF', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ padding: '48px 32px 48px', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'inline-block', background: '#C4714A', borderRadius: '16px', padding: '10px 20px' }}>
            <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#FAF6EF', fontWeight: 600, margin: 0 }}>ABF</p>
          </div>
        </div>

        {/* Hero — sender's spark moment */}
        {invite.prompt && (
          <div style={{ background: '#1C1208', borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4714A' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: '#C4714A', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>From {firstName}</p>
            </div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F5ECD7', lineHeight: 1.5, margin: '0 0 16px', fontWeight: 400 }}>
              "{invite.prompt}"
            </p>
            {invite.reaction && (
              <div style={{ display: 'inline-block', background: '#C4714A', borderRadius: '20px', padding: '6px 14px' }}>
                <p style={{ fontSize: '13px', color: '#FAF6EF', fontWeight: 500, margin: 0 }}>{invite.reaction}</p>
              </div>
            )}
          </div>
        )}

        {/* Framing */}
        <div style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #EDE5D8', padding: '24px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#1C1208', lineHeight: 1.4, margin: '0 0 10px', fontWeight: 400 }}>
            {firstName} is thinking about you.
          </p>
          <p style={{ fontSize: '14px', color: '#7A6A54', lineHeight: 1.6, margin: '0 0 8px' }}>
            ABF is a relationship app that gets smarter about your specific relationship over time. Daily sparks, games, and an AI guide who knows you both.
          </p>
          <p style={{ fontSize: '13px', color: '#A09080', margin: 0 }}>
            Join {firstName} — your profiles link automatically.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/onboarding')}
          style={{ width: '100%', padding: '16px', background: '#C4714A', color: '#FAF6EF', fontSize: '16px', fontWeight: 600, borderRadius: '14px', border: 'none', cursor: 'pointer' }}
        >
          Join {firstName} on ABF
        </button>

        <button
          onClick={() => router.push('/login')}
          style={{ width: '100%', padding: '12px', background: 'transparent', color: '#A09080', fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          Already have an account? Sign in
        </button>

      </div>
    </div>
  )
}
