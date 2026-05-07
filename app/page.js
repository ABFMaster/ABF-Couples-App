'use client'

import Link from 'next/link'

export default function WelcomePage() {
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

      {/* Top — wordmark */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          background: '#C4714A',
          borderRadius: '16px',
          padding: '12px 24px',
          marginBottom: '8px',
        }}>
          <p style={{ fontSize: '13px', letterSpacing: '0.2em', color: '#FAF6EF', fontWeight: 600, margin: 0 }}>ABF</p>
        </div>
        <p style={{ fontSize: '11px', letterSpacing: '0.16em', color: '#A09080', textTransform: 'uppercase', margin: 0 }}>Always Be Flirting</p>
      </div>

      {/* Middle — headline */}
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '32px',
          fontWeight: 400,
          color: '#1C1208',
          lineHeight: 1.3,
          margin: '0 0 20px',
        }}>
          The relationship that keeps getting better.
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#7A6A54',
          lineHeight: 1.6,
          margin: '0 0 12px',
        }}>
          Daily sparks. Deeper games. An AI that actually knows you both.
        </p>
        <p style={{
          fontSize: '13px',
          color: '#A09080',
          lineHeight: 1.6,
          margin: 0,
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
        }}>
          Invite only — currently in private beta.
        </p>
      </div>

      {/* Bottom — actions */}
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link
          href="/signup"
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            background: '#C4714A',
            color: '#FAF6EF',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '14px',
            textAlign: 'center',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Get started
        </Link>
        <Link
          href="/login"
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            background: 'transparent',
            color: '#C4714A',
            fontSize: '16px',
            fontWeight: 500,
            borderRadius: '14px',
            textAlign: 'center',
            textDecoration: 'none',
            border: '0.5px solid #E8DDD0',
            boxSizing: 'border-box',
          }}
        >
          Sign in
        </Link>
      </div>

    </div>
  )
}
