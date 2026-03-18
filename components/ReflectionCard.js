'use client'
import { useState, useEffect, useRef } from 'react'

export default function ReflectionCard({ userId, coupleId, partnerName }) {
  const [reflection, setReflection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Animation states
  const [openingShown, setOpeningShown] = useState(false)
  const [momentsShown, setMomentsShown] = useState([])
  const [patternShown, setPatternShown] = useState(false)
  const [weekAheadShown, setWeekAheadShown] = useState(false)
  const [buttonShown, setButtonShown] = useState(false)

  // Moment reactions: { [index]: 'lands' | 'not_quite' }
  const [momentReactions, setMomentReactions] = useState({})

  // Viewed
  const [viewed, setViewed] = useState(false)
  const viewedFiredRef = useRef(false)
  const viewTimerRef = useRef(null)

  const fetchStatus = async () => {
    const res = await fetch(`/api/reflection/status?userId=${userId}&coupleId=${coupleId}`)
    return res.json()
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      let data = await fetchStatus()

      if (!data.hasReflection) {
        setGenerating(true)
        await fetch('/api/reflection/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, coupleId }),
        })
        setGenerating(false)
        data = await fetchStatus()
      }

      if (data.reflection) {
        setReflection(data.reflection)
        setMomentReactions(data.reflection.moment_reactions || {})
      }
      setLoading(false)
    }
    load()
  }, [userId, coupleId])

  // Staggered reveal after data loads
  useEffect(() => {
    if (!reflection) return
    const moments = reflection.moments || []
    const timers = []

    timers.push(setTimeout(() => setOpeningShown(true), 100))
    moments.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setMomentsShown(prev => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 700 + i * 200)
      )
    })
    const patternDelay = 700 + moments.length * 200 + 300
    timers.push(setTimeout(() => setPatternShown(true), patternDelay))
    timers.push(setTimeout(() => setWeekAheadShown(true), patternDelay + 200))
    timers.push(setTimeout(() => setButtonShown(true), patternDelay + 400))

    return () => timers.forEach(clearTimeout)
  }, [reflection])

  // Fire viewed after 5 seconds on screen
  useEffect(() => {
    if (!reflection || viewedFiredRef.current) return
    viewTimerRef.current = setTimeout(() => {
      if (viewedFiredRef.current) return
      viewedFiredRef.current = true
      setViewed(true)
      fetch('/api/reflection/viewed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, weekStart: reflection.week_start }),
      }).catch(() => {})
    }, 5000)
    return () => clearTimeout(viewTimerRef.current)
  }, [reflection])

  const fadeStyle = (shown) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
  })

  if (loading || generating) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          color: '#7A8C6E',
          fontSize: '17px',
          margin: 0,
        }}>
          Nora is reflecting on your week...
        </p>
      </div>
    )
  }

  if (!reflection) return null

  const moments = reflection.moments || []

  return (
    <div style={{
      background: '#FAF6F0',
      border: '0.5px solid #E8DDD0',
      borderRadius: '20px',
      padding: '28px 20px',
    }}>
      {/* Label */}
      <p style={{
        fontSize: '11px',
        letterSpacing: '0.2em',
        color: '#6B4E8A',
        textAlign: 'center',
        textTransform: 'uppercase',
        margin: '0 0 8px',
      }}>
        Weekly Reflection
      </p>

      {/* Title */}
      <h2 style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '22px',
        color: '#1A2E1A',
        textAlign: 'center',
        fontWeight: 400,
        margin: '0 0 16px',
      }}>
        {getWeekLabel(reflection.week_start)}
      </h2>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#E8DDD0' }} />

      {/* Opening */}
      <div style={{ ...fadeStyle(openingShown), padding: '20px 0' }}>
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '18px',
          color: '#2C1810',
          lineHeight: 1.6,
          textAlign: 'center',
          fontStyle: 'italic',
          margin: 0,
        }}>
          {reflection.opening}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#E8DDD0', marginBottom: '16px' }} />

      {/* Moments label */}
      <p style={{
        fontSize: '10px',
        letterSpacing: '0.14em',
        color: '#6B4E8A',
        textTransform: 'uppercase',
        margin: '0 0 12px',
      }}>
        Moments
      </p>

      {/* Moment cards */}
      {moments.map((moment, i) => (
        <div
          key={i}
          style={{
            ...fadeStyle(momentsShown[i]),
            background: '#FFFFFF',
            border: '0.5px solid #E8DDD0',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '12px',
          }}
        >
          <p style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '15px',
            color: '#2C1810',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {moment.observation}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#7A8C6E',
            fontStyle: 'italic',
            margin: '8px 0 12px',
          }}>
            {moment.prompt}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'That lands', key: 'lands' },
              { label: 'Not quite', key: 'not_quite' },
            ].map(({ label, key }) => {
              const selected = momentReactions[i] === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setMomentReactions(prev => ({ ...prev, [i]: key }))
                    fetch('/api/reflection/react', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ coupleId, momentIndex: i, reaction: key }),
                    }).catch(() => {})
                  }}
                  style={{
                    background: selected ? '#6B4E8A' : 'transparent',
                    border: `0.5px solid ${selected ? '#6B4E8A' : '#E8DDD0'}`,
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    color: selected ? '#FFFFFF' : '#7A8C6E',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Pattern block */}
      <div style={{
        ...fadeStyle(patternShown),
        background: '#F7F3FC',
        border: '0.5px solid #DDD0EE',
        borderRadius: '14px',
        padding: '18px 20px',
        margin: '16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#6B4E8A',
            flexShrink: 0,
          }} />
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: '#6B4E8A',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            Pattern
          </p>
        </div>
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '14px',
          color: '#3D2A52',
          lineHeight: 1.65,
          fontStyle: 'italic',
          margin: 0,
        }}>
          {reflection.pattern}
        </p>
      </div>

      {/* Week ahead block */}
      <div style={{
        ...fadeStyle(weekAheadShown),
        background: '#FFFFFF',
        borderLeft: '3px solid #6B4E8A',
        borderRadius: '0 14px 14px 0',
        padding: '16px 20px',
        marginTop: '16px',
      }}>
        <p style={{
          fontSize: '10px',
          letterSpacing: '0.14em',
          color: '#6B4E8A',
          textTransform: 'uppercase',
          margin: '0 0 6px',
        }}>
          This week
        </p>
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '15px',
          color: '#2C1810',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {reflection.week_ahead}
        </p>
      </div>

      {/* Nora session button + viewed indicator */}
      <div style={fadeStyle(buttonShown)}>
        <button
          style={{
            width: '100%',
            background: '#6B4E8A',
            color: '#FAF6F0',
            border: 'none',
            borderRadius: '30px',
            padding: '14px',
            fontSize: '15px',
            marginTop: '20px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Talk about this with Nora
        </button>
        {viewed && (
          <p style={{
            textAlign: 'center',
            color: '#B8A898',
            fontSize: '12px',
            marginTop: '10px',
            marginBottom: 0,
          }}>
            You've read this one
          </p>
        )}
      </div>
    </div>
  )
}

function getWeekLabel(weekStart) {
  if (!weekStart) return 'This Week'
  const [year, month, day] = weekStart.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
