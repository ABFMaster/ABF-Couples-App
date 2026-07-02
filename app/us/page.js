'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SharedItemCard from '@/components/SharedItemCard'
import { getWeekStart } from '@/lib/dates'
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
  const [ritualCompletedThisWeek, setRitualCompletedThisWeek] = useState(false)
  const [lastReflectionWeek, setLastReflectionWeek] = useState(null)
  const [heroData, setHeroData] = useState(null)

  // Ahead data
  const [nextDate, setNextDate] = useState(null)
  const [nextTrip, setNextTrip] = useState(null)

  // Archive overlay
  const [showBeenArchive, setShowBeenArchive] = useState(false)
  const [sharedItems, setSharedItems] = useState([])
  const [sharedItemsLoading, setSharedItemsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [completingItem, setCompletingItem] = useState(null)
  const [captureSheet, setCaptureSheet] = useState(false)
  const [captureNote, setCaptureNote] = useState('')
  const [capturePhotoFile, setCapturePhotoFile] = useState(null)
  const [capturePhotoPreview, setCapturePhotoPreview] = useState(null)
  const [showBeenDetail, setShowBeenDetail] = useState(false)
  const [beenDetailItem, setBeenDetailItem] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [missingMilestones, setMissingMilestones] = useState([])
  const [foundationIndex, setFoundationIndex] = useState(0)
  const [noraSurfacedEvent, setNoraSurfacedEvent] = useState(null)
  const [editSheet, setEditSheet] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDeleting, setEditDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const editPhotoRef = useRef(null)
  const [milestoneSheet, setMilestoneSheet] = useState(null)
  const [milestoneLocation, setMilestoneLocation] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [milestonePhotoUrl, setMilestonePhotoUrl] = useState(null)
  const [milestonePhotoLoading, setMilestonePhotoLoading] = useState(false)
  const [milestoneSaving, setMilestoneSaving] = useState(false)
  const [milestoneLocationResults, setMilestoneLocationResults] = useState([])
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null)
  const [milestoneLocationName, setMilestoneLocationName] = useState('')
  const milestoneSearchTimeout = useRef(null)

  async function fetchTimelineEvents(coupleId) {
    setTimelineLoading(true)
    const { data: events } = await supabase
      .from('timeline_events')
      .select('id, title, description, event_date, event_type, created_at, created_by, image_url, item_subtype, artist, source_id, photo_urls, nora_observation')
      .eq('couple_id', coupleId)
      .order('event_date', { ascending: false })
    setTimelineEvents(events || [])
    computeMissingMilestones(events || [])
    computeNoraSurfaced(events || [])
    setTimelineLoading(false)
  }

  const computeNoraSurfaced = (events) => {
    const permanent = events.filter(e => e.event_type !== 'game_echo')
    if (permanent.length <= 3) { setNoraSurfacedEvent(null); return }
    const candidates = permanent.slice(3)
    const random = candidates[Math.floor(Math.random() * candidates.length)]
    setNoraSurfacedEvent(random)
  }

  const computeMissingMilestones = (events) => {
    const types = new Set(events.map(e => e.event_type))
    const missing = []
    if (!types.has('first_date') && !events.find(e => e.title === 'When we met')) missing.push({ key: 'met', label: 'When you met', eventType: 'milestone', prompt: 'Add the date that started everything.' })
    if (!types.has('first_date') && !events.find(e => e.title === 'Our first date')) missing.push({ key: 'firstDate', label: 'First date', eventType: 'first_date', prompt: 'When did you go on your first date?' })
    if (!types.has('first_kiss')) missing.push({ key: 'firstKiss', label: 'First kiss', eventType: 'first_kiss', prompt: 'The moment things changed.' })
    if (!types.has('anniversary')) missing.push({ key: 'anniversary', label: 'Anniversary', eventType: 'anniversary', prompt: 'Your official date together.' })
    setMissingMilestones(missing.slice(0, 2))
  }

  useEffect(() => {
    if (!milestoneSheet || mapsLoaded || window.google?.maps) {
      if (window.google?.maps) setMapsLoaded(true)
      return
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) return
    window.__gmapsMilestoneInit = () => setMapsLoaded(true)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__gmapsMilestoneInit`
    script.async = true
    document.head.appendChild(script)
  }, [milestoneSheet])

  const searchMilestoneLocation = async (query) => {
    if (milestoneSearchTimeout.current) clearTimeout(milestoneSearchTimeout.current)
    if (!query || query.length < 3) { setMilestoneLocationResults([]); return }
    milestoneSearchTimeout.current = setTimeout(async () => {
      if (!window.google?.maps) return
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query })
        setMilestoneLocationResults(suggestions.slice(0, 4).map(s => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text.text,
          placeName: s.placePrediction.mainText?.text || s.placePrediction.text.text.split(',')[0],
        })))
      } catch(e) { setMilestoneLocationResults([]) }
    }, 280)
  }

  const selectMilestonePlace = async (prediction) => {
    setMilestoneLocation(prediction.description)
    setMilestoneLocationName(prediction.placeName || prediction.description.split(',')[0])
    setSelectedPlaceId(prediction.place_id)
    setMilestoneLocationResults([])
    setMilestonePhotoLoading(true)
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const place = new Place({ id: prediction.place_id })
      await place.fetchFields({ fields: ['photos'] })
      if (place.photos?.[0]) {
        const photoUri = place.photos[0].getURI({ maxWidth: 800 })
        setMilestonePhotoUrl(photoUri)
      }
    } catch(e) {}
    setMilestonePhotoLoading(false)
  }

  const saveMilestone = async () => {
    if (!milestoneDate || !milestoneSheet) return
    setMilestoneSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      let permanentPhotoUrl = null
      if (milestonePhotoUrl) {
        try {
          const resp = await fetch(milestonePhotoUrl)
          const blob = await resp.blob()
          const path = `relationship/${couple?.id || user.id}/${Date.now()}_milestone.jpg`
          await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
          permanentPhotoUrl = urlData.publicUrl
        } catch(e) {}
      }

      await fetch('/api/timeline/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId: couple?.id || null,
          userId: user.id,
          title: milestoneLocationName || milestoneLocation || milestoneSheet.label,
          eventType: milestoneSheet.eventType,
          eventDate: milestoneDate + 'T12:00:00',
          photoUrls: permanentPhotoUrl ? [permanentPhotoUrl] : [],
        })
      })

      setMilestoneSheet(null)
      setMilestoneLocation('')
      setMilestoneLocationName('')
      setMilestoneDate('')
      setMilestonePhotoUrl(null)
      setSelectedPlaceId(null)
      if (couple?.id) fetchTimelineEvents(couple.id)
    } catch(e) {
      console.error('saveMilestone error:', e)
    }
    setMilestoneSaving(false)
  }

  const saveEdit = async () => {
    if (!selectedEvent || editSaving) return
    setEditSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/timeline/event/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          title: editTitle,
          description: editDescription,
          eventDate: editDate ? editDate + 'T12:00:00' : undefined,
        })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedEvent({ ...selectedEvent, title: editTitle, description: editDescription, event_date: editDate })
        setEditSheet(false)
        if (couple?.id) fetchTimelineEvents(couple.id)
      }
    } catch(e) { console.error('saveEdit error:', e) }
    setEditSaving(false)
  }

  const deleteEvent = async () => {
    if (!selectedEvent || editDeleting) return
    setEditDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/timeline/event/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ eventId: selectedEvent.id })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedEvent(null)
        setEditSheet(false)
        setDeleteConfirm(false)
        if (couple?.id) fetchTimelineEvents(couple.id)
      }
    } catch(e) { console.error('deleteEvent error:', e) }
    setEditDeleting(false)
  }

  const addPhotoToEvent = async (file) => {
    if (!file || !selectedEvent) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `relationship/${couple?.id || user.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      await supabase.storage.from('photos').upload(path, file, { upsert: true })
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const newPhotoUrls = [...(selectedEvent.photo_urls || []), publicUrl]
      const res = await fetch('/api/timeline/event/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ eventId: selectedEvent.id, photoUrls: newPhotoUrls })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedEvent({ ...selectedEvent, photo_urls: newPhotoUrls })
        if (couple?.id) fetchTimelineEvents(couple.id)
      }
    } catch(e) { console.error('addPhotoToEvent error:', e) }
  }

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
      await fetchTimelineEvents(cid)

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

      if (ritualData) {
        const weekStart = getWeekStart()
        const { data: completion } = await supabase
          .from('ritual_completions')
          .select('completed')
          .eq('ritual_id', ritualData.id)
          .eq('week_start', weekStart)
          .eq('completed', true)
          .maybeSingle()
        setRitualCompletedThisWeek(!!completion)
      }

      // Last reflection for Now
      const { data: reflections } = await supabase
        .from('weekly_reflections')
        .select('week_start')
        .eq('couple_id', cid)
        .order('week_start', { ascending: false })
        .limit(1)
      if (reflections?.[0]) {
        setLastReflectionWeek(reflections[0].week_start)
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
        .neq('status', 'pending_delete')
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
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section === 'been' || section === 'now' || section === 'ahead') {
      setActiveSection(section)
    }
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
      let photoUrl = null
      if (capturePhotoFile) {
        const ext = capturePhotoFile.name.split('.').pop()
        const filename = `completions/${item.id}-${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filename, capturePhotoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename)
          photoUrl = urlData?.publicUrl || null
        }
      }
      const res = await fetch('/api/ahead/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, completionNote: note || null, userId: user.id, photoUrl }),
      })
      if (res.ok) {
        setSharedItems(prev => prev.filter(i => i.id !== item.id))
        setCompletingItem(null)
        setCaptureSheet(false)
        setCaptureNote('')
        setCapturePhotoFile(null)
        setCapturePhotoPreview(null)
        fetchTimelineEvents(couple.id)
        fetch('/api/ahead/nora-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, itemTitle: item.title, itemType: item.type, coupleId: couple.id }),
        }).catch(() => {})
      }
    } catch {}
  }

  async function openBeenDetail(event, isSharedItem = false) {
    let detail = { ...event, isSharedItem }
    if (isSharedItem && event.source_id) {
      const { data: sourceItem } = await supabase
        .from('shared_items')
        .select('completion_nora_line, completion_note, completion_photo_url, poster_url, artwork_url, type')
        .eq('id', event.source_id)
        .single()
      if (sourceItem) {
        detail.completion_nora_line = sourceItem.completion_nora_line || null
        detail.description = detail.description || sourceItem.completion_note || null
        detail.completion_photo_url = sourceItem.completion_photo_url || null
        detail.source_type = sourceItem.type || null
        const isMediaType = ['movie', 'show', 'song'].includes(sourceItem.type)
        if (isMediaType) {
          detail.hero_image = detail.image_url || sourceItem.poster_url || sourceItem.artwork_url || null
        } else {
          detail.hero_image = sourceItem.completion_photo_url || null
        }
      }
    }
    setBeenDetailItem(detail)
    setShowBeenDetail(true)
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

  const foundationEvents = permanentStones.filter(e => ['first_date', 'first_kiss', 'anniversary', 'milestone'].includes(e.event_type))
  const nonFoundationEvents = permanentStones.filter(e => !['first_date', 'first_kiss', 'anniversary', 'milestone'].includes(e.event_type))

  const allFoundationSlots = [
    ...foundationEvents,
    ...missingMilestones.map(m => ({ ...m, isEmpty: true }))
  ]

  const photos = nonFoundationEvents.filter(e => e.photo_urls?.length > 0 || e.image_url)
  const others = nonFoundationEvents.filter(e => !e.photo_urls?.length && !e.image_url)
  const curatedEvents = [
    ...photos.slice(0, 2),
    ...others.slice(0, 1)
  ].slice(0, 3)

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

  const GAME_ROTATION = [
    { mode: 'hot-take', label: 'Hot Take', route: '/game-room' },
    { mode: 'rabbit-hole', label: 'Rabbit Hole', route: '/game-room' },
    { mode: 'rank', label: 'Rank It', route: '/game-room' },
    { mode: 'the-call', label: 'The Call', route: '/game-room' },
    { mode: 'memory', label: 'Memory', route: '/game-room' },
    { mode: 'story', label: 'Story', route: '/game-room' },
    { mode: 'pitch', label: 'Pitch', route: '/game-room' },
  ]
  function getSuggestedGame(coupleCreatedAt) {
    const origin = coupleCreatedAt ? new Date(coupleCreatedAt).getTime() : 0
    const weeksSinceStart = Math.floor((Date.now() - origin) / (7 * 24 * 60 * 60 * 1000))
    return GAME_ROTATION[weeksSinceStart % GAME_ROTATION.length]
  }

  const suggestedGame = couple ? getSuggestedGame(couple.created_at) : GAME_ROTATION[0]

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

          {noraSurfacedEvent ? (
            <div onClick={() => setSelectedEvent(noraSurfacedEvent)} style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, border: '1px solid #E8DDD0', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', flexShrink: 0 }} />
                <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#C4AA87', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Nora surfaced this</div>
              </div>
              {(noraSurfacedEvent.photo_urls?.[0] || noraSurfacedEvent.image_url) && (
                <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  <img src={noraSurfacedEvent.photo_urls?.[0] || noraSurfacedEvent.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
                </div>
              )}
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: '#1C1410', marginBottom: 4 }}>{noraSurfacedEvent.title}</div>
              {noraSurfacedEvent.description && <div style={{ fontSize: 12, color: '#8B7355', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>"{noraSurfacedEvent.description}"</div>}
              <div style={{ fontSize: 11, color: '#C4AA87', fontFamily: 'DM Sans, sans-serif' }}>{new Date(noraSurfacedEvent.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, border: '1px solid #E8DDD0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', flexShrink: 0 }} />
                <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#C4AA87', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Nora is watching</div>
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, color: '#1C1410', marginBottom: 4 }}>Your shared life is being written.</div>
              <div style={{ fontSize: 12, color: '#8B7355', fontStyle: 'italic', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>Every answer, every game, every moment you save — Nora is paying attention. This is where it lives.</div>
            </div>
          )}

          {/* BEEN TAB — redesigned */}
          <div>
            {/* Foundation card — cycling milestones + empty slots */}
            {allFoundationSlots.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {(() => {
                  const slot = allFoundationSlots[foundationIndex % allFoundationSlots.length]
                  const hasPhoto = slot.photo_urls?.[0] || slot.image_url
                  const photoUrl = slot.photo_urls?.[0] || slot.image_url

                  if (slot.isEmpty) {
                    return (
                      <div onClick={() => { setMilestoneSheet(slot); setMilestoneLocation(''); setMilestoneDate(''); setMilestonePhotoUrl(null); setSelectedPlaceId(null); }}
                        style={{ background: '#1C1410', borderRadius: 16, minHeight: 160, padding: 20, border: '1.5px dashed rgba(196,170,135,0.25)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(196,170,135,0.5)', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>{slot.label}</div>
                          {allFoundationSlots.length > 1 && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={(e) => { e.stopPropagation(); setFoundationIndex(i => (i - 1 + allFoundationSlots.length) % allFoundationSlots.length) }}
                                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(250,246,240,0.08)', border: 'none', color: 'rgba(250,246,240,0.5)', cursor: 'pointer', fontSize: 12 }}>←</button>
                              <button onClick={(e) => { e.stopPropagation(); setFoundationIndex(i => (i + 1) % allFoundationSlots.length) }}
                                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(250,246,240,0.08)', border: 'none', color: 'rgba(250,246,240,0.5)', cursor: 'pointer', fontSize: 12 }}>→</button>
                            </div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: 'rgba(250,246,240,0.25)', fontStyle: 'italic', margin: '12px 0' }}>{slot.prompt}</div>
                        <div style={{ fontSize: 12, color: '#C4AA87', fontFamily: 'DM Sans, sans-serif' }}>+ Add this date →</div>
                      </div>
                    )
                  }

                  return (
                    <div onClick={() => setSelectedEvent(slot)} style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', cursor: 'pointer', minHeight: 160, background: '#1C1410' }}>
                      {hasPhoto && <img src={photoUrl} alt={slot.title} style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />}
                      {!hasPhoto && <div style={{ width: '100%', height: 200, background: 'linear-gradient(135deg, #1C1410 0%, #2D3561 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: 48, opacity: 0.1 }}>♥</div></div>}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,16,0.9) 0%, rgba(28,20,16,0.1) 60%, transparent 100%)' }} />
                      {allFoundationSlots.length > 1 && (
                        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 2 }}>
                          <button onClick={(e) => { e.stopPropagation(); setFoundationIndex(i => (i - 1 + allFoundationSlots.length) % allFoundationSlots.length) }}
                            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(28,20,16,0.5)', border: 'none', color: 'rgba(250,246,240,0.8)', cursor: 'pointer', fontSize: 12, backdropFilter: 'blur(4px)' }}>←</button>
                          <button onClick={(e) => { e.stopPropagation(); setFoundationIndex(i => (i + 1) % allFoundationSlots.length) }}
                            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(28,20,16,0.5)', border: 'none', color: 'rgba(250,246,240,0.8)', cursor: 'pointer', fontSize: 12, backdropFilter: 'blur(4px)' }}>→</button>
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px', zIndex: 1 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#C4AA87', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
                          {slot.event_type === 'first_kiss' ? 'First kiss' : slot.event_type === 'first_date' ? 'First date' : slot.event_type === 'anniversary' ? 'Anniversary' : 'Milestone'}
                        </div>
                        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, color: '#FAF6F0', fontWeight: 400, lineHeight: 1.2 }}>{slot.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                          <div style={{ fontSize: 12, color: 'rgba(250,246,240,0.55)', fontFamily: 'DM Sans, sans-serif' }}>{new Date(slot.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {allFoundationSlots.map((_, i) => (
                              <div key={i} style={{ width: i === foundationIndex % allFoundationSlots.length ? 14 : 5, height: 5, borderRadius: 3, background: i === foundationIndex % allFoundationSlots.length ? '#C4AA87' : 'rgba(196,170,135,0.3)', transition: 'width 0.2s' }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Curated non-foundation events */}
            {curatedEvents.map(event => {
              const hasPhoto = event.photo_urls?.length > 0 || !!event.image_url
              const primaryPhoto = event.photo_urls?.[0] || event.image_url

              if (hasPhoto) {
                return (
                  <div key={event.id} onClick={() => setSelectedEvent(event)} style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, position: 'relative', cursor: 'pointer', background: '#E8DDD0' }}>
                    <img src={primaryPhoto} alt={event.title} style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(to top, rgba(28,20,16,0.8) 0%, transparent 100%)' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, color: '#FAF6F0', fontWeight: 400 }}>{event.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(250,246,240,0.7)', marginTop: 2, fontFamily: 'DM Sans, sans-serif' }}>{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={event.id} onClick={() => setSelectedEvent(event)} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #E8DDD0', cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', background: '#F5F0E8', padding: '3px 8px', borderRadius: 20, display: 'inline-block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
                    {getMoodLabel(event.event_type)}
                  </div>
                  <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: '#1C1410', fontWeight: 400 }}>{event.title}</div>
                  {event.description && <div style={{ fontSize: 12, color: '#8B7355', marginTop: 4, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>{event.description.slice(0, 100)}{event.description.length > 100 ? '...' : ''}</div>}
                  <div style={{ fontSize: 11, color: '#8B7355', marginTop: 8, fontFamily: 'DM Sans, sans-serif' }}>{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )
            })}

            {permanentStones.length === 0 && missingMilestones.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: '#8B7355', marginBottom: 8 }}>Your story is just beginning.</div>
                <div style={{ fontSize: 13, color: '#8B7355', fontFamily: 'DM Sans, sans-serif' }}>Add your first memory to get started.</div>
              </div>
            )}

            {permanentStones.length > 5 && (
              <div onClick={() => setShowBeenArchive(true)} style={{ textAlign: 'center', padding: 14, fontSize: 12, color: '#8B7355', border: '1px solid #E8DDD0', borderRadius: 10, marginTop: 4, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Everything you've built together →
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOW SECTION */}
      {activeSection === 'now' && (
        <div style={{ padding: '24px 20px' }}>

          {/* Nora weekly read */}
          <div style={{ background: '#1C1208', borderRadius: '20px', padding: '26px 22px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>

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
                The Ritual
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#1C1410' }}>
                {ritual?.title || 'No ritual set yet'}
              </div>
              {ritual?.streak > 0 && (
                <div style={{ fontSize: '11px', color: '#7A8C7E', marginTop: '2px' }}>{ritual.streak} week streak</div>
              )}
            </div>
            {ritualCompletedThisWeek ? (
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#7A9E7E', background: '#F0F7F0', border: '1px solid #C5DEC5', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>✓ Done this week</div>
            ) : (
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#1C1208', border: '1px solid #1C1208', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                {todayName === 'Friday' ? 'Do it →' : 'See ritual'}
              </div>
            )}
          </div>

          {/* Weekly reflection */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(28,20,16,0.05)', cursor: 'pointer' }} onClick={() => router.push('/weekly-reflection')}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '2px' }}>Weekly Reflection</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#1C1410' }}>
                {lastReflectionWeek === null ? 'Not started yet' : `Week of ${new Date(lastReflectionWeek + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#1C1208', border: '1px solid #1C1208', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Reflect →</div>
          </div>

          {/* Game Room suggestion */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(28,20,16,0.05)', cursor: 'pointer' }} onClick={() => router.push('/game-room')}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '2px' }}>Game Room</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#1C1410' }}>This week: {suggestedGame.label}</div>
              <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '2px' }}>Nora will guide the game</div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#1C1208', border: '1px solid #1C1208', padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Let's play</div>
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
              <button onClick={() => router.push('/dates')} style={{ fontSize: '11px', fontWeight: 500, color: '#1C1208', border: '1px solid #1C1208', padding: '8px 16px', borderRadius: '20px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                <SharedItemCard key={item.id} item={item} mode="ahead" onComplete={handleComplete} cardHeight={200} objectPosition={item.type === 'rich' ? 'top center' : 'center'} />
              ))}
            </div>
          )}

          <button onClick={() => router.push('/shared/add')} style={{ width: '100%', padding: '13px', background: 'none', border: '1px dashed #D9CBBA', borderRadius: '14px', fontSize: '12px', color: '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            + Add an idea
          </button>
        </div>
      )}

      {/* EVENT DETAIL OVERLAY */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: '#FAF6F0', zIndex: 150, overflowY: 'auto' }}>
          {/* Header — photo or gradient */}
          <div style={{ position: 'relative', height: 260, background: selectedEvent.photo_urls?.[0] || selectedEvent.image_url ? '#1C1410' : 'linear-gradient(135deg, #1C1410 0%, #2D3561 100%)', overflow: 'hidden', flexShrink: 0 }}>
            {(selectedEvent.photo_urls?.[0] || selectedEvent.image_url) && (
              <img src={selectedEvent.photo_urls?.[0] || selectedEvent.image_url} alt={selectedEvent.title} style={{ width: '100%', height: 260, objectFit: 'contain', objectPosition: 'center center', display: 'block' }} />
            )}
            {!(selectedEvent.photo_urls?.[0] || selectedEvent.image_url) && (
              <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 48, opacity: 0.15 }}>♥</div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 16, left: 16 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(28,20,16,0.5)', border: 'none', color: '#FAF6F0', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#C4AA87', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
              {selectedEvent.event_type === 'first_kiss' ? 'First kiss' : selectedEvent.event_type === 'first_date' ? 'First date' : selectedEvent.event_type === 'anniversary' ? 'Anniversary' : getMoodLabel(selectedEvent.event_type)}
            </div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, color: '#1C1410', fontWeight: 400, marginBottom: 4 }}>{selectedEvent.title}</div>
            <div style={{ fontSize: 12, color: '#8B7355', marginBottom: 20, fontFamily: 'DM Sans, sans-serif' }}>{new Date(selectedEvent.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            {selectedEvent.description && (
              <p style={{ fontSize: 14, color: '#6B5D4F', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>"{selectedEvent.description}"</p>
            )}

            <div style={{ height: 1, background: '#E8DDD0', marginBottom: 20 }} />

            {/* Nora block */}
            <div style={{ background: '#1C1410', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', flexShrink: 0 }} />
                <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#C4AA87', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Nora</div>
              </div>
              {selectedEvent.nora_observation ? (
                <p style={{ fontSize: 13, color: 'rgba(250,246,240,0.8)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>{selectedEvent.nora_observation}</p>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(250,246,240,0.5)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>I haven't heard about this one yet. Tell me what it meant.</p>
              )}
              <button
                onClick={async () => {
                  const seed = `I want to tell you about a memory: "${selectedEvent.title}" on ${new Date(selectedEvent.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${selectedEvent.description ? '. ' + selectedEvent.description : ''}. What do you notice?`
                  const { data: { session } } = await supabase.auth.getSession()
                  if (session) {
                    fetch('/api/timeline/event/signal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({ eventId: selectedEvent.id, title: selectedEvent.title, description: selectedEvent.description, eventDate: selectedEvent.event_date }),
                    }).catch(() => {})
                  }
                  router.push('/ai-coach?seed=' + encodeURIComponent(seed))
                }}
                style={{ fontSize: 12, color: '#C4AA87', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
                Tell Nora about this →
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              {selectedEvent?.created_by === user?.id && (
                <button
                  onClick={() => editPhotoRef.current?.click()}
                  style={{ flex: 1, padding: 11, border: '1px solid #E8DDD0', borderRadius: 10, fontSize: 12, color: '#6B5D4F', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {selectedEvent?.photo_urls?.length > 0 || selectedEvent?.image_url ? 'Change photo' : '+ Add photo'}
                </button>
              )}
              {selectedEvent?.created_by === user?.id && (
                <button
                  onClick={() => {
                    setEditTitle(selectedEvent.title || '')
                    setEditDescription(selectedEvent.description || '')
                    setEditDate(selectedEvent.event_date || '')
                    setDeleteConfirm(false)
                    setEditSheet(true)
                  }}
                  style={{ flex: 1, padding: 11, border: '1px solid #E8DDD0', borderRadius: 10, fontSize: 12, color: '#6B5D4F', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Edit
                </button>
              )}
            </div>
            <input ref={editPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) addPhotoToEvent(f) }} />
          </div>
        </div>
      )}

      {/* ARCHIVE OVERLAY */}
      {showBeenArchive && (
        <div style={{ position: 'fixed', inset: 0, background: '#FAF6F0', zIndex: 100, overflowY: 'auto', maxWidth: '430px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ padding: '52px 20px 16px', borderBottom: '1px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF6F0', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, fontWeight: 400, color: '#1C1410' }}>Your story</div>
            <button onClick={() => setShowBeenArchive(false)} style={{ fontSize: 12, color: '#8B7355', background: 'none', border: '1px solid #E8DDD0', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
          </div>

          {/* Timeline — chronological */}
          <div style={{ padding: '20px 20px 80px' }}>
            {(() => {
              const chronological = [...timelineEvents]
                .filter(e => e.event_type !== 'game_echo')
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

              if (chronological.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: '#8B7355', fontStyle: 'italic' }}>Your story is just beginning.</div>
                  </div>
                )
              }

              const milestoneTypes = ['first_date', 'first_kiss', 'anniversary', 'milestone']
              let currentYear = null
              const elements = []

              chronological.forEach((event, idx) => {
                const eventYear = event.event_date ? new Date(event.event_date + 'T12:00:00').getFullYear() : null
                const isMilestone = milestoneTypes.includes(event.event_type)
                const hasPhoto = event.photo_urls?.[0] || event.image_url
                const photoUrl = event.photo_urls?.[0] || event.image_url

                // Year divider
                if (eventYear && eventYear !== currentYear) {
                  currentYear = eventYear
                  elements.push(
                    <div key={`year-${eventYear}`} style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', margin: '20px 0 12px', paddingLeft: 52 }}>
                      {eventYear}
                    </div>
                  )
                }

                elements.push(
                  <div key={event.id} onClick={() => setSelectedEvent(event)}
                    style={{ display: 'flex', gap: 12, marginBottom: 16, cursor: 'pointer', alignItems: 'flex-start' }}>

                    {/* Left column — dot + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                      <div style={{
                        width: isMilestone ? 12 : 8,
                        height: isMilestone ? 12 : 8,
                        borderRadius: '50%',
                        background: isMilestone ? '#1C1410' : hasPhoto ? '#C4AA87' : '#C4714A',
                        marginTop: 4,
                        flexShrink: 0,
                        boxShadow: isMilestone ? '0 0 0 3px rgba(28,20,16,0.1)' : 'none'
                      }} />
                      {idx < chronological.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 20, background: '#E8DDD0', marginTop: 4 }} />
                      )}
                    </div>

                    {/* Right column — content */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                      {isMilestone ? (
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#C4AA87', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', marginBottom: 3 }}>
                            {event.event_type === 'first_kiss' ? 'First kiss' : event.event_type === 'first_date' ? 'First date' : event.event_type === 'anniversary' ? 'Anniversary' : 'Milestone'}
                          </div>
                          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: '#1C1410', lineHeight: 1.2, marginBottom: 3 }}>{event.title}</div>
                          <div style={{ fontSize: 11, color: '#8B7355', fontFamily: 'DM Sans, sans-serif' }}>{event.event_date ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          {hasPhoto && (
                            <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9, letterSpacing: '0.1em', color: '#8B7355', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>{getMoodLabel(event.event_type)}</div>
                            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 17, color: '#1C1410', lineHeight: 1.3, marginBottom: 2 }}>{event.title}</div>
                            {event.description && <div style={{ fontSize: 11, color: '#8B7355', fontStyle: 'italic', lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif' }}>{event.description.slice(0, 60)}{event.description.length > 60 ? '...' : ''}</div>}
                            <div style={{ fontSize: 10, color: '#C4AA87', marginTop: 3, fontFamily: 'DM Sans, sans-serif' }}>{event.event_date ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })

              return elements
            })()}
          </div>
        </div>
      )}

      {captureSheet && completingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,20,16,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#FAF6F0', borderRadius: '24px 24px 0 0', padding: '28px 24px 48px', width: '100%', maxWidth: '430px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#1C1410', marginBottom: '6px' }}>You did it</div>
            <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '24px' }}>{completingItem.title}</div>
            {completingItem && !['movie', 'show', 'song'].includes(completingItem.type) && (
            <div style={{ width: '100%', marginBottom: '20px' }}>
              {capturePhotoPreview ? (
                <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={capturePhotoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => { setCapturePhotoPreview(null); setCapturePhotoFile(null) }}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', width: '100%', height: '110px', borderRadius: '12px', border: '1px dashed #D9CBBA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(250,246,240,0.7)', cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')
                        if (isHeic) {
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            const img = new Image()
                            img.onload = () => {
                              const canvas = document.createElement('canvas')
                              canvas.width = img.width
                              canvas.height = img.height
                              canvas.getContext('2d').drawImage(img, 0, 0)
                              canvas.toBlob((blob) => {
                                setCapturePhotoFile(blob)
                                setCapturePhotoPreview(URL.createObjectURL(blob))
                              }, 'image/jpeg', 0.9)
                            }
                            img.src = ev.target.result
                          }
                          reader.readAsDataURL(file)
                          return
                        }
                        setCapturePhotoFile(file)
                        setCapturePhotoPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EDE4D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="#C4AA87" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2.5" stroke="#C4AA87" strokeWidth="1.5"/>
                      <path d="M5 3 L5.5 1.5 L10.5 1.5 L11 3" stroke="#C4AA87" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', color: '#C4AA87', fontWeight: 500 }}>Add a photo</div>
                </label>
              )}
            </div>
            )}
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

      {showBeenDetail && beenDetailItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,20,16,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowBeenDetail(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#FAF6F0', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', maxHeight: '88vh', overflowY: 'auto' }}
          >
            {/* Hero — photo-aware */}
            {beenDetailItem.isSharedItem ? (
              <div style={{ height: '260px', position: 'relative', borderRadius: '24px 24px 0 0', overflow: 'hidden', flexShrink: 0 }}>
                {beenDetailItem.hero_image ? (
                  <img
                    src={beenDetailItem.hero_image}
                    alt={beenDetailItem.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: beenDetailItem.source_type === 'movie' || beenDetailItem.source_type === 'show' ? 'linear-gradient(160deg, #0a1f2e 0%, #0f3460 100%)' : beenDetailItem.source_type === 'song' ? 'linear-gradient(160deg, #0d2137 0%, #1a4a3a 100%)' : 'linear-gradient(160deg, #5C2A0E 0%, #A0522D 100%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', top: '14px', left: '14px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}>
                  {(() => {
                    const t = beenDetailItem.item_subtype || beenDetailItem.source_type || ''
                    const labels = { movie: 'Film', show: 'Show', song: 'Album', place: 'Place', restaurant: 'Place', date_idea: 'Date Idea', idea: 'Idea', travel: 'Travel', book: 'Book', MOVIE: 'Film', SHOW: 'Show', SONG: 'Album', PLACE: 'Place', RESTAURANT: 'Place', DATE_IDEA: 'Date Idea', IDEA: 'Idea', TRAVEL: 'Travel', BOOK: 'Book' }
                    return labels[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') || 'Memory'
                  })()}
                </div>
                {beenDetailItem.isSharedItem && !['movie','show','song'].includes(beenDetailItem.source_type) && !beenDetailItem.hero_image && (
                  <div style={{ position: 'absolute', bottom: '14px', right: '14px', fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.04em' }}>
                    + Add photo
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '130px', background: getMoodColor(beenDetailItem.event_type), borderRadius: '24px 24px 0 0', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '14px', left: '14px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}>
                  {getMoodLabel(beenDetailItem.event_type)}
                </div>
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '24px 24px 48px' }}>

              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 400, color: '#1C1410', lineHeight: 1.2, marginBottom: '6px' }}>
                {beenDetailItem.title}
              </div>

              <div style={{ fontSize: '12px', color: '#C4AA87', marginBottom: '20px' }}>
                {beenDetailItem.event_date
                  ? new Date(beenDetailItem.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : ''}
              </div>

              {beenDetailItem.description && (
                <div style={{ fontSize: '15px', fontStyle: 'italic', color: '#8B7355', lineHeight: 1.65, marginBottom: '20px', borderLeft: '2px solid #D9CBBA', paddingLeft: '14px' }}>
                  "{beenDetailItem.description?.trim()}"
                </div>
              )}

              {beenDetailItem.isSharedItem && beenDetailItem.completion_nora_line && (
                <div style={{ background: 'white', borderRadius: '14px', padding: '14px 16px', border: '1px solid #EDE4D8', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
                    <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Nora</div>
                  </div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#1C1410', lineHeight: 1.55, fontStyle: 'italic' }}>
                    {beenDetailItem.completion_nora_line}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowBeenDetail(false)}
                style={{ width: '100%', padding: '13px', background: 'none', border: '1px solid #D9CBBA', borderRadius: '14px', fontSize: '13px', color: '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {milestoneSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(28,20,16,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMilestoneSheet(null) }}>
          <div style={{ background: '#FAF6F0', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, color: '#1C1410' }}>{milestoneSheet.label}</div>
              <button onClick={() => setMilestoneSheet(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8B7355', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Where</div>
            <input type="text" placeholder="Where did this happen?" value={milestoneLocation}
              onChange={e => { setMilestoneLocation(e.target.value); searchMilestoneLocation(e.target.value) }}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: 6 }} />

            {milestoneLocationResults.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E8DDD0', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                {milestoneLocationResults.map((p, i) => (
                  <div key={p.place_id} onClick={() => selectMilestonePlace(p)}
                    style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', cursor: 'pointer', borderTop: i > 0 ? '1px solid #F5F0E8' : 'none' }}>
                    {p.description}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif', marginTop: 8 }}>When</div>
            <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>Photo</div>

            {milestonePhotoLoading && (
              <div style={{ height: 100, background: '#F5F0E8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#8B7355', fontFamily: 'DM Sans, sans-serif' }}>Finding a photo of this place...</div>
              </div>
            )}

            {milestonePhotoUrl && !milestonePhotoLoading && (
              <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                <img src={milestonePhotoUrl} alt="Location" style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(28,20,16,0.6)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(250,246,240,0.7)', fontFamily: 'DM Sans, sans-serif' }}>From Google Maps</div>
                  <button onClick={() => setMilestonePhotoUrl(null)} style={{ fontSize: 11, color: '#C4AA87', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>remove</button>
                </div>
              </div>
            )}
            <input type="file" accept="image/*" style={{ display: 'none' }} id="milestonePhotoUpload"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => setMilestonePhotoUrl(ev.target.result)
                reader.readAsDataURL(file)
              }}
            />
            <button onClick={() => document.getElementById('milestonePhotoUpload').click()}
              style={{ width: '100%', padding: '10px', border: '1px solid #E8DDD0', borderRadius: 10, fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', background: '#FFFFFF', cursor: 'pointer', marginBottom: 12 }}>
              Upload my own photo instead
            </button>

            {!milestonePhotoUrl && !milestonePhotoLoading && (
              <div style={{ height: 80, background: '#F5F0E8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: '1.5px dashed #E8DDD0' }}>
                <div style={{ fontSize: 12, color: '#8B7355', fontFamily: 'DM Sans, sans-serif' }}>
                  {selectedPlaceId ? 'No photo found for this location' : 'Select a location above to get a photo'}
                </div>
              </div>
            )}

            <button onClick={saveMilestone} disabled={milestoneSaving || !milestoneDate}
              style={{ width: '100%', background: milestoneSaving || !milestoneDate ? '#E8DDD0' : '#1C1410', color: milestoneSaving || !milestoneDate ? '#8B7355' : '#FAF6F0', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: milestoneSaving || !milestoneDate ? 'not-allowed' : 'pointer' }}>
              {milestoneSaving ? 'Saving...' : 'Save this moment →'}
            </button>
          </div>
        </div>
      )}

      {editSheet && selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(28,20,16,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditSheet(false) }}>
          <div style={{ background: '#FAF6F0', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, color: '#1C1410' }}>Edit memory</div>
              <button onClick={() => setEditSheet(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8B7355', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Title</div>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Description</div>
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
              placeholder="What made this moment matter?"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: 16, minHeight: 80, resize: 'none' }} />

            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>Date</div>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: 20 }} />

            <button onClick={saveEdit} disabled={editSaving || !editTitle.trim()}
              style={{ width: '100%', background: editSaving || !editTitle.trim() ? '#E8DDD0' : '#1C1410', color: editSaving || !editTitle.trim() ? '#8B7355' : '#FAF6F0', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>
              {editSaving ? 'Saving...' : 'Save changes →'}
            </button>

            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)}
                style={{ width: '100%', background: 'transparent', border: '1px solid #E8DDD0', borderRadius: 12, padding: 14, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', cursor: 'pointer' }}>
                Delete this memory
              </button>
            ) : (
              <div style={{ background: '#FDF0EA', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', marginBottom: 12 }}>Are you sure? This can't be undone.</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleteConfirm(false)}
                    style={{ flex: 1, padding: 12, border: '1px solid #E8DDD0', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', background: '#FFFFFF', cursor: 'pointer' }}>
                    Keep it
                  </button>
                  <button onClick={deleteEvent} disabled={editDeleting}
                    style={{ flex: 1, padding: 12, border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#FAF6F0', background: '#C4714A', cursor: 'pointer' }}>
                    {editDeleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
