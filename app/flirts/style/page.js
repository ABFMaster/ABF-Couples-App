'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Replaces /flirts/onboarding as the pre-Flirt-Mode gate (Aug 18 2026).
// One tap-choice screen instead of a full Nora conversation, since
// flirt_style is the only field Flirt needs that game_interests doesn't
// already cover. Styled to the app's real palette, not FlirtSheet's
// off-brand Fraunces/coral (flagged separately, not fixed here).
const STYLES = [
  { id: 'playful', label: 'Playful', desc: 'Teasing, light, a little silly' },
  { id: 'romantic', label: 'Romantic', desc: 'Warm and sincere' },
  { id: 'bold', label: 'Bold', desc: 'Direct, confident, no games' },
  { id: 'subtle', label: 'Subtle', desc: 'A quiet, understated nudge' },
]

export default function FlirtStylePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handlePick = async (style) => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/flirts/set-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ style }),
      })
    } catch (err) {
      console.error('[flirts/style] error:', err)
    } finally {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '8px' }}>
          Nora
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: '#1C1410', marginBottom: '8px', lineHeight: 1.25 }}>
          One last thing — how do you flirt?
        </h1>
        <p style={{ fontSize: '13px', color: '#8B7355' }}>This tunes what I suggest for you.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {STYLES.map(s => (
          <button
            key={s.id}
            disabled={saving}
            onClick={() => handlePick(s.id)}
            style={{
              background: 'white',
              border: '1px solid #D9CBBA',
              borderRadius: '14px',
              padding: '18px 14px',
              textAlign: 'left',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: '#1C1410', marginBottom: '4px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355' }}>{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
