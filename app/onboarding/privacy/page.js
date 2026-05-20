'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PrivacyCommitment() {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  const handleContinue = () => {
    setExiting(true)
    setTimeout(() => router.push('/onboarding'), 200)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFF8F4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.2s ease'
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>

        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#C9A96E',
          margin: '0 auto 20px'
        }} />

        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 26,
          color: '#1A1A1A',
          textAlign: 'center',
          margin: '0 0 32px',
          lineHeight: 1.3,
          fontWeight: 'normal'
        }}>Before we begin.</h1>

        <div style={{
          background: 'white',
          border: '0.5px solid #E8E0D8',
          borderRadius: 16,
          padding: '28px 24px',
          marginBottom: 12
        }}>
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#1A1A1A',
            lineHeight: 1.8,
            margin: '0 0 20px'
          }}>
            I built ABF because I believe the most important relationship in your life deserves more than advice columns and generic apps. Nora works because she knows you — and that means you have to trust her with real things.
          </p>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#1A1A1A',
            lineHeight: 1.8,
            margin: '0 0 20px'
          }}>
            I want to be direct about what that means. My name is Matt, and as the person who built this, I have technical access to the database. I could read your conversations and notebook. I won't. Not because a legal document says I can't — because I genuinely believe that what you share here is sacred. Reading it would betray the entire reason I built this.
          </p>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#1A1A1A',
            lineHeight: 1.8,
            margin: '0 0 20px'
          }}>
            Nora remembers what you share so she can show up better for you. That memory stays between you and her. Your partner will never see what you've told Nora privately. I will never read it either.
          </p>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#1A1A1A',
            lineHeight: 1.8,
            margin: '0 0 24px'
          }}>
            This is my personal commitment to you, not a policy. ABF only works if you trust it with the real stuff. I take that seriously.
          </p>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#6B6560',
            lineHeight: 1.8,
            margin: 0,
            fontStyle: 'italic'
          }}>— Matt</p>
        </div>

        <div style={{
          background: '#F5F0EB',
          border: '0.5px solid #E8E0D8',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 32
        }}>
          <p style={{
            fontSize: 13,
            color: '#6B6560',
            lineHeight: 1.6,
            margin: 0
          }}>
            <strong style={{ color: '#1A1A1A' }}>What stays private:</strong> Your Nora conversations, your notebook, your individual sessions.<br /><br />
            <strong style={{ color: '#1A1A1A' }}>What's shared with your partner:</strong> Spark and Bet answers (after both submit), Game Room activity, Ritual checkins.<br /><br />
            <strong style={{ color: '#1A1A1A' }}>What Nora does:</strong> She knows things about your partner from their private sessions. She uses that to show up better for your relationship. She will never tell you what they shared.
          </p>
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '16px',
            background: '#C4694F',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'system-ui'
          }}
        >
          I understand — let's begin
        </button>

      </div>
    </div>
  )
}
