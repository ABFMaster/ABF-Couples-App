'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SharedItemCard from '@/components/SharedItemCard'
export default function UsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('now')

  // Been data
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(true)

  // Now data
  const [ritual, setRitual] = useState(null)
  const [lastReflectionDays, setLastReflectionDays] = useState(null)
  const [heroData, setHeroData] = useState(null)

  // Ahead data
  const [nextDate, setNextDate] = useState(null)
  const [nextTrip, setNextTrip] = useState(null)

  // Archive overlay
  const [showArchive, setShowArchive] = useState(false)
  const [sharedItems, setSharedItems] = useState([])
  const [sharedItemsLoading, setSharedItemsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [completingItem, setCompletingItem] = useState(null)
  const [captureSheet, setCaptureSheet] = useState(false)
  const [captureNote, setCaptureNote] = useState('')

  useEffect(() => {
    async function fetchAll() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
        .single()
      if (!coupleData) { router.push('/connect'); return }
      setCouple(coupleData)

      const partnerId = coupleData.user1_id === authUser.id ? coupleData.user2_id : coupleData.user1_id

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', [authUser.id, partnerId])
      if (profiles) {
        const me = profiles.find(p => p.user_id === authUser.id)
        const partner = profiles.find(p => p.user_id === partnerId)
        if (me) setUserName(me.display_name || 'You')
        if (partner) setPartnerName(partner.display_name || 'Your partner')
      }

      const cid = coupleData.id

      // Timeline events for Been
      setTimelineLoading(true)
      const { data: events } = await supabase
        .from('timeline_events')
        .select('id, title, description, event_date, event_type, created_at, created_by, image_url, item_subtype, artist')
        .eq('couple_id', cid)
        .order('event_date', { ascending: false })
        .limit(20)
      setTimelineEvents(events || [])
      setTimelineLoading(false)

      // Ritual for Now
      const { data: ritualData } = await supabase
        .from('rituals')
        .select('id, title, status, streak, proposed_by, partner_confirmed, needs_discussion')
        .eq('couple_id', cid)
        .neq('status', 'retired')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setRitual(ritualData || null)

      // Last reflection for Now
      const { data: reflections } = await supabase
        .from('weekly_reflections')
        .select('created_at')
        .eq('couple_id', cid)
        .order('created_at', { ascending: false })
        .limit(1)
      if (reflections?.[0]) {
        const days = Math.floor((Date.now() - new Date(reflections[0].created_at).getTime()) / 86400000)
        setLastReflectionDays(days)
      }

      // Next date for Ahead
      const { data: datePlans } = await supabase
        .from('date_plans')
        .select('id, title, date_time')
        .eq('couple_id', cid)
        .in('status', ['planned', 'approved'])
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
      const { data: customDates } = await supabase
        .from('custom_dates')
        .select('id, title, date_time')
        .eq('couple_id', cid)
        .in('status', ['planned', 'approved'])
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
      const allDates = [...(datePlans || []), ...(customDates || [])]
        .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
      setNextDate(allDates[0] || null)

      // Next trip for Ahead
      const { data: trips } = await supabase
        .from('trips')
        .select('destination, start_date')
        .eq('couple_id', cid)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(1)
      setNextTrip(trips?.[0] || null)

      // Shared items for Ahead
      const { data: items } = await supabase
        .from('shared_items')
        .select('*')
        .eq('couple_id', cid)
        .eq('completed', false)
        .order('created_at', { ascending: false })
      setSharedItems(items || [])
      setSharedItemsLoading(false)

      // Nora weekly read for Now
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch(`/api/dashboard/hero?userId=${authUser.id}&coupleId=${cid}&userName=${encodeURIComponent(userName || '')}&partnerName=${encodeURIComponent(partnerName || '')}`)
          const data = await res.json()
          if (data.message) setHeroData(data)
        }
      } catch {}

      setLoading(false)
    }
    fetchAll()
  }, [])

  const CATEGORY_MAP = {
    'All': null,
    'Watch': ['movie', 'show'],
    'Listen': ['song'],
    'Places': ['place', 'restaurant'],
    'Ideas': ['idea', 'do', 'travel'],
  }

  const filteredItems = activeCategory === 'All'
    ? sharedItems
    : sharedItems.filter(item => (CATEGORY_MAP[activeCategory] || []).includes(item.type))

  async function handleComplete(item) {
    setCompletingItem(item)
    setCaptureSheet(true)
  }

  async function submitComplete(item, note) {
    try {
      const res = await fetch('/api/ahead/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, completionNote: note || null, userId: user.id }),
      })
      if (res.ok) {
        setSharedItems(prev => prev.filter(i => i.id !== item.id))
        setCompletingItem(null)
        setCaptureSheet(false)
        setCaptureNote('')
        // Fetch Nora line async — fire and forget
        fetch('/api/ahead/nora-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, itemTitle: item.title, itemType: item.type, coupleId: couple.id }),
        }).catch(() => {})
      }
    } catch {}
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C4AA87', fontStyle: 'italic' }}>Loading...</p>
    </div>
  )

  const todayName = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' })

  // Been — separate permanent stones vs echoes
  const permanentStones = timelineEvents.filter(e => e.event_type !== 'game_echo')
  const echoes = timelineEvents.filter(e => e.event_type === 'game_echo')

  // Mood colors per event type
  const moodColors = {
    'rabbit-hole': 'linear-gradient(135deg, #1C1B3A 0%, #2D3561 60%, #3D4878 100%)',
    'hot-take': 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 50%, #D4956A 100%)',
    'game': 'linear-gradient(135deg, #2D3561 0%, #4A3570 60%, #6B5B8A 100%)',
    'custom': 'linear-gradient(135deg, #4A6B5A 0%, #7A8C7E 50%, #9BAA9E 100%)',
    'default': 'linear-gradient(135deg, #6B5020 0%, #C9A84C 50%, #D4BA7A 100%)',
  }

  const getMoodColor = (eventType) => moodColors[eventType] || moodColors.default
  const getMoodLabel = (eventType) => {
    const labels = { 'rabbit-hole': 'Rabbit Hole', 'hot-take': 'Hot Take', 'game': 'Game Room', 'custom': 'Your Timeline' }
    return labels[eventType] || 'Memory'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: '100px', fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ padding: '48px 24px 0' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.18em', color: '#8B7355', textTransform: 'uppercase', marginBottom: '3px' }}>Your Shared Life</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '44px', fontWeight: 300, color: '#1C1410', letterSpacing: '-0.02em', lineHeight: 1 }}>Us</div>
          <button onClick={() => router.push('/shared/add')} style={{ fontSize: '11px', fontWeight: 500, color: '#8B7355', background: 'none', border: '1px solid #D9CBBA', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.06em' }}>+ Add</button>
        </div>
      </div>

      {/* NAV */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px 0', borderBottom: '1px solid #EDE4D8', gap: 0 }}>
        {['been', 'now', 'ahead'].map((section, i) => (
          <div key={section} style={{ flex: 1, paddingBottom: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: activeSection === section ? '#1C1410' : '#C4AA87', cursor: 'pointer', position: 'relative', transition: 'color 0.25s' }}
            onClick={() => setActiveSection(section)}>
            {section === 'been' ? '← Been' : section === 'now' ? 'Now' : 'Ahead →'}
            {activeSection === section && (
              <div style={{ position: 'absolute', bottom: '-1px', left: '15%', right: '15%', height: '2px', background: '#1C1410' }} />
            )}
          </div>
        ))}
      </div>

      {/* BEEN SECTION */}
      {activeSection === 'been' && (
        <div style={{ padding: '24px 20px' }}>

          {/* Nora callback — placeholder for now */}
          <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ height: '72px', background: 'linear-gradient(135deg, #6B5020 0%, #C9A84C 50%, #D4BA7A 100%)', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '12px 16px' }}>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Nora is thinking about you</div>
            </div>
            <div style={{ background: 'white', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
                <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Nora surfaced this</div>
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#1C1410', lineHeight: 1.3, marginBottom: '5px' }}>Your shared life is being written</div>
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#8B7355', lineHeight: 1.55 }}>Every answer, every game, every moment you save — Nora is paying attention. This is where it lives.</div>
            </div>
          </div>

          {/* Permanent stones */}
          {timelineLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#C4AA87', fontSize: '16px' }}>Loading your timeline...</p>
            </div>
          ) : permanentStones.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '18px', padding: '24px 20px', textAlign: 'center', marginBottom: '12px', border: '1px solid #EDE4D8' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#1C1410', marginBottom: '8px' }}>Nothing saved yet</div>
              <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '16px' }}>Your first memories are waiting to be made.</div>
              <button onClick={() => router.push('/timeline')} style={{ fontSize: '12px', color: '#8B7355', background: 'none', border: '1px solid #D9CBBA', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer' }}>Add a memory →</button>
            </div>
          ) : (
            permanentStones.slice(0, 3).map(event => (
              <div key={event.id} style={{ marginBottom: '12px' }}>
                {event.event_type === 'shared_item' ? (
                  <SharedItemCard
                    item={{
                      id: event.id,
                      title: event.title,
                      type: event.item_subtype,
                      poster_url: event.image_url,
                      artwork_url: event.image_url,
                      artist: event.artist,
                      note: event.description,
                      description: event.description,
                      event_date: event.event_date,
                      completed: true,
                    }}
                    mode="been"
                    cardHeight={220}
                  />
                ) : (
                  <div style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(28,20,16,0.08)' }} onClick={() => router.push('/timeline')}>
                    <div style={{ height: '80px', background: getMoodColor(event.event_type), position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '12px 16px', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', padding: '3px 9px', borderRadius: '20px' }}>{getMoodLabel(event.event_type)}</div>
                      <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', padding: '3px 9px', borderRadius: '20px' }}>Saved ✦</div>
                    </div>
                    <div style={{ background: 'white', padding: '16px 18px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#1C1410', lineHeight: 1.2, marginBottom: '6px' }}>{event.title}</div>
                      {event.description && <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#8B7355', lineHeight: 1.55, marginBottom: '6px' }}>{event.description.slice(0, 120)}{event.description.length > 120 ? '...' : ''}</div>}
                      <div style={{ fontSize: '10px', color: '#C4AA87' }}>{event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Divider */}
          {permanentStones.length > 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 16px' }}>
              <div style={{ flex: 1, height: '1px', background: '#EDE4D8' }} />
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87' }}>Still breathing</div>
              <div style={{ flex: 1, height: '1px', background: '#EDE4D8' }} />
            </div>
          )}

          {/* Archive link */}
          <div onClick={() => setShowArchive(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', fontSize: '12px', color: '#8B7355', cursor: 'pointer', border: '1px solid #EDE4D8', borderRadius: '14px', marginTop: '4px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D9CBBA' }} />
            <span>Everything you've built together →</span>
          </div>
        </div>
      )}

      {/* NOW SECTION */}
      {activeSection === 'now' && (
        <div style={{ padding: '24px 20px' }}>

          {/* Nora weekly read */}
          <div style={{ background: 'linear-gradient(145deg, #1C1410 0%, #2D3561 100%)', borderRadius: '20px', padding: '26px 22px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(201,168,76,0.07)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Nora · This week</div>
            </div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, fontStyle: 'italic', color: 'white', lineHeight: 1.5 }}>
              {heroData?.message || 'Nora is thinking about you two. Check back soon.'}
            </div>
          </div>

          {/* Ritual card */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '10px', boxShadow: '0 1px 4px rgba(28,20,16,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => router.push('/ritual')}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '3px' }}>
                {todayName === 'Friday' ? 'Today' : 'Friday'} · The Ritual
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#1C1410' }}>
                {ritual?.title || 'No ritual set yet'}
              </div>
              {ritual?.streak > 0 && (
                <div style={{ fontSize: '11px', color: '#7A8C7E', marginTop: '2px' }}>{ritual.streak} week streak</div>
              )}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#2D3561', border: '1px solid #2D3561', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {todayName === 'Friday' ? 'Do it →' : 'See ritual'}
            </div>
          </div>

          {/* Weekly reflection */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(28,20,16,0.05)', cursor: 'pointer' }} onClick={() => router.push('/weekly-reflection')}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '2px' }}>Sunday · Weekly Reflection</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#1C1410' }}>
                {lastReflectionDays === null ? 'Not started yet' : lastReflectionDays < 7 ? `${lastReflectionDays} days ago` : 'Ready for a new one'}
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#2D3561', border: '1px solid #2D3561', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Reflect →</div>
          </div>

          {/* Game Room suggestion */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(28,20,16,0.05)', cursor: 'pointer' }} onClick={() => router.push('/game-room')}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '2px' }}>Saturday · Game Room</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#1C1410' }}>Nora suggests: Rank It</div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#2D3561', border: '1px solid #2D3561', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Let's play</div>
          </div>
        </div>
      )}

      {/* AHEAD SECTION */}
      {activeSection === 'ahead' && (
        <div style={{ padding: '24px 20px' }}>

          {/* Date Night featured card */}
          <div style={{ background: 'white', borderRadius: '18px', overflow: 'hidden', marginBottom: '14px', boxShadow: '0 2px 10px rgba(28,20,16,0.07)' }}>
            <div style={{ height: '60px', background: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 100%)', display: 'flex', alignItems: 'flex-end', padding: '10px 16px' }}>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Date Night</div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#1C1410', marginBottom: '4px' }}>
                  {nextDate ? nextDate.title : 'Plan your next date'}
                </div>
                <div style={{ fontSize: '12px', color: '#8B7355' }}>
                  {nextDate ? new Date(nextDate.date_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Nothing planned yet'}
                </div>
              </div>
              <button onClick={() => router.push('/dates')} style={{ fontSize: '11px', fontWeight: 500, color: '#2D3561', border: '1px solid #2D3561', padding: '8px 16px', borderRadius: '20px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {nextDate ? 'See plan →' : 'Plan one →'}
              </button>
            </div>
          </div>

          {/* Trip if exists */}
          {nextTrip ? (
            <div style={{ background: 'white', borderRadius: '18px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(28,20,16,0.07)', borderLeft: '3px solid #C4714A' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px', marginBottom: '10px', background: 'rgba(196,113,74,0.08)', color: '#C4714A' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                Building · Travel
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#1C1410', marginBottom: '5px' }}>{nextTrip.destination}</div>
              <div style={{ fontSize: '12px', color: '#8B7355' }}>{new Date(nextTrip.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            </div>
          ) : null}

          {/* Category chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
            {['All', 'Watch', 'Listen', 'Places', 'Ideas'].map(cat => (
              <div key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: '11px', fontWeight: 500, color: activeCategory === cat ? '#1C1410' : '#8B7355', background: activeCategory === cat ? '#EDE4D8' : 'white', border: `1px solid ${activeCategory === cat ? '#C4AA87' : '#D9CBBA'}`, padding: '7px 14px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>
                {cat}
              </div>
            ))}
          </div>

          {/* Ideas divider */}
          <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '12px' }}>Ideas — no commitment yet</div>

          {/* Card grid */}
          {sharedItemsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#C4AA87', fontSize: '16px' }}>Loading...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ background: 'rgba(250,246,240,0.7)', border: '1px dashed #D9CBBA', borderRadius: '14px', padding: '28px 20px', textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C4AA87', marginBottom: '6px' }}>
                {activeCategory === 'All' ? 'No ideas yet' : `No ${activeCategory.toLowerCase()} yet`}
              </div>
              <div style={{ fontSize: '12px', color: '#C4AA87' }}>Add movies, restaurants, trips, and more</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {filteredItems.map(item => (
                <SharedItemCard key={item.id} item={item} mode="ahead" onComplete={handleComplete} cardHeight={200} />
              ))}
            </div>
          )}

          <button onClick={() => router.push('/shared/add')} style={{ width: '100%', padding: '13px', background: 'none', border: '1px dashed #D9CBBA', borderRadius: '14px', fontSize: '12px', color: '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            + Add an idea
          </button>
        </div>
      )}

      {/* ARCHIVE OVERLAY */}
      {showArchive && (
        <div style={{ position: 'fixed', inset: 0, background: '#FAF6F0', zIndex: 100, overflowY: 'auto', maxWidth: '430px', margin: '0 auto' }}>
          <div style={{ padding: '52px 24px 16px', borderBottom: '1px solid #EDE4D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300 }}>Everything</div>
            <button onClick={() => setShowArchive(false)} style={{ fontSize: '12px', color: '#8B7355', background: 'none', border: '1px solid #D9CBBA', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer' }}>← Back</button>
          </div>
          <div style={{ padding: '20px 24px 40px' }}>
            {timelineEvents.map(event => (
              <div key={event.id} style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: '1px solid #EDE4D8', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: getMoodColor(event.event_type), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '2px' }}>{getMoodLabel(event.event_type)}</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#1C1410', marginBottom: '2px', lineHeight: 1.2 }}>{event.title}</div>
                  {event.description && <div style={{ fontSize: '11px', color: '#8B7355', fontStyle: 'italic', lineHeight: 1.5 }}>{event.description.slice(0, 80)}{event.description.length > 80 ? '...' : ''}</div>}
                </div>
                <div style={{ fontSize: '10px', color: '#C4AA87', flexShrink: 0, paddingTop: '2px' }}>
                  {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
            ))}
            {timelineEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#C4AA87', fontSize: '18px' }}>Nothing saved yet. Your story is just beginning.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {captureSheet && completingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,20,16,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#FAF6F0', borderRadius: '24px 24px 0 0', padding: '28px 24px 48px', width: '100%', maxWidth: '430px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#1C1410', marginBottom: '6px' }}>You did it</div>
            <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '24px' }}>{completingItem.title}</div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '8px' }}>One thing about it</div>
            <textarea
              value={captureNote}
              onChange={e => setCaptureNote(e.target.value)}
              placeholder="A line, a memory, anything that brings you back..."
              style={{ width: '100%', minHeight: '80px', border: '1px solid #D9CBBA', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: 'white', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={() => submitComplete(completingItem, captureNote)}
              style={{ width: '100%', marginTop: '16px', padding: '14px', background: '#1C1410', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Save to Been
            </button>
            <button
              onClick={() => { setCaptureSheet(false); setCompletingItem(null); setCaptureNote('') }}
              style={{ width: '100%', marginTop: '10px', padding: '12px', background: 'none', color: '#8B7355', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
