'use client'

import { useState } from 'react'

const TYPE_CONFIG = {
  movie: { label: 'Film', gradient: 'linear-gradient(160deg, #0a1f2e 0%, #0f3460 100%)', icon: 'film' },
  show: { label: 'Show', gradient: 'linear-gradient(160deg, #0a1f2e 0%, #16213e 100%)', icon: 'film' },
  song: { label: 'Album', gradient: 'linear-gradient(160deg, #0d2137 0%, #1a4a3a 100%)', icon: 'music' },
  place: { label: 'Place', gradient: 'linear-gradient(160deg, #5C2A0E 0%, #A0522D 100%)', icon: 'pin' },
  restaurant: { label: 'Place', gradient: 'linear-gradient(160deg, #5C2A0E 0%, #A0522D 100%)', icon: 'pin' },
  default: { label: 'Idea', gradient: 'linear-gradient(160deg, #5C2A0E 0%, #A0522D 100%)', icon: 'pin' },
}

const GhostIcon = ({ type }) => {
  if (type === 'film') return (
    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
      <rect x="2" y="2" width="44" height="32" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M2 10 L46 10" stroke="white" strokeWidth="2"/>
      <path d="M2 26 L46 26" stroke="white" strokeWidth="2"/>
      <circle cx="10" cy="6" r="2" fill="white"/>
      <circle cx="20" cy="6" r="2" fill="white"/>
      <circle cx="10" cy="30" r="2" fill="white"/>
      <circle cx="20" cy="30" r="2" fill="white"/>
    </svg>
  )
  if (type === 'music') return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="18" stroke="white" strokeWidth="2"/>
      <circle cx="22" cy="22" r="6" stroke="white" strokeWidth="2"/>
      <circle cx="22" cy="22" r="2" fill="white"/>
    </svg>
  )
  return (
    <svg width="36" height="48" viewBox="0 0 36 48" fill="none">
      <circle cx="18" cy="18" r="12" stroke="white" strokeWidth="2"/>
      <path d="M18 30 L10 46 L18 42 L26 46 Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="18" cy="18" r="4" fill="white"/>
    </svg>
  )
}

export default function SharedItemCard({ item, mode = 'ahead', onComplete, cardHeight = 220 }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.default
  const imageUrl = item.completion_photo_url || item.poster_url || item.artwork_url || null
  const isDone = item.completed && mode === 'ahead'

  const metaLine = () => {
    if (item.type === 'movie' || item.type === 'show') {
      return [item.year, item.rating].filter(Boolean).join(' · ')
    }
    if (item.type === 'song') return item.artist || ''
    if (item.type === 'place' || item.type === 'restaurant') return item.note || ''
    if (mode === 'been' && item.event_date) {
      return new Date(item.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    return ''
  }

  return (
    <div
      onClick={mode === 'ahead' && !isDone && onComplete ? () => onComplete(item) : undefined}
      style={{
        width: '100%',
        height: `${cardHeight}px`,
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        cursor: mode === 'ahead' && !isDone ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      {/* Artwork or gradient fallback */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: config.gradient }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <GhostIcon type={config.icon} />
          </div>
        </div>
      )}

      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />

      {/* Type pill — top left */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
        {config.label}
      </div>

      {/* Done pill — top right, ahead mode only */}
      {isDone && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: '#C8952A', color: '#fff' }}>
          Done
        </div>
      )}

      {/* Title + meta — bottom left */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 12px 14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', lineHeight: 1.3, marginBottom: '3px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </div>
        {metaLine() && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{metaLine()}</div>
        )}
        {/* Completion note for been mode */}
        {mode === 'been' && item.description && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: '3px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            "{item.description}"
          </div>
        )}
      </div>
    </div>
  )
}
