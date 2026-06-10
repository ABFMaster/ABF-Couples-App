'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Denver',      label: 'Mountain Time' },
  { value: 'America/Chicago',     label: 'Central Time' },
  { value: 'America/New_York',    label: 'Eastern Time' },
  { value: 'Europe/London',       label: 'London' },
  { value: 'Europe/Paris',        label: 'Paris / Berlin' },
  { value: 'Asia/Tokyo',          label: 'Tokyo' },
  { value: 'Australia/Sydney',    label: 'Sydney' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function nextStatus(s) {
  if (s === 'active') return 'paused'
  if (s === 'paused') return 'done'
  return 'active'
}

const TYPE_LABELS = { noticed: 'Noticed', working_on: 'Working on', reflection: 'Reflection' }
const STATUS_STYLE = {
  active:  { background: '#F0F7F0', color: '#4A8A5A', border: '1px solid #C5DEC5' },
  paused:  { background: '#FFF7E8', color: '#A07840', border: '1px solid #E8D4A0' },
  done:    { background: '#F0F0F0', color: '#8A8A8A', border: '1px solid #D0D0D0' },
}
const TYPE_PILL_BASE = { fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MePage() {
  const router = useRouter()

  const [user, setUser]               = useState(null)
  const [session, setSession]         = useState(null)
  const [coupleId, setCoupleId]       = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [birthday, setBirthday]       = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [timezone, setTimezone]       = useState('America/Los_Angeles')
  const [notifications, setNotifications] = useState({ checkin_reminder: true, flirt_received: true, date_planned: true, weekly_reflection: true })
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const [settingsOpen, setSettingsOpen]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [showNoraWorks, setShowNoraWorks]     = useState(false)

  // Synthesis
  const [synthesis, setSynthesis]         = useState(null)
  const [synthesisLoading, setSynthesisLoading] = useState(true)

  // Notebook
  const [entries, setEntries]             = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entryExpanded, setEntryExpanded] = useState(false)
  const [entryType, setEntryType]         = useState(null)
  const [entryContent, setEntryContent]   = useState('')
  const [savingEntry, setSavingEntry]     = useState(false)
  const textareaRef = useRef(null)
  const profilePhotoInputRef = useRef(null)

  // Practices
  const [practices, setPractices]         = useState([])
  const [practicesLoading, setPracticesLoading] = useState(true)
  const [newPracticeTitle, setNewPracticeTitle] = useState('')
  const [savingPractice, setSavingPractice] = useState(false)
  const [showDone, setShowDone]           = useState(false)

  const [relationshipPhotos, setRelationshipPhotos]       = useState([])
  const [uploadingProfilePhotos, setUploadingProfilePhotos] = useState(false)
  const [photosSaved, setPhotosSaved]                       = useState(false)

  const [importantDates, setImportantDates]   = useState({ met: '', firstDate: '', firstKiss: '', anniversary: '', customDates: [] })
  const [newCustomLabel, setNewCustomLabel]   = useState('')
  const [newCustomDate, setNewCustomDate]     = useState('')
  const [datesSubmitted, setDatesSubmitted]   = useState(false)
  const [submittingDates, setSubmittingDates] = useState(false)
  const [showDatesForm, setShowDatesForm]     = useState(false)

  // ── Auth + initial load ─────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setSession(session)
      setUser(session.user)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, birthday, anniversary, timezone, notification_preferences, couple_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        setDisplayName(profile.display_name || '')
        setBirthday(profile.birthday || '')
        setAnniversary(profile.anniversary || '')
        setTimezone(profile.timezone || 'America/Los_Angeles')
        if (profile.notification_preferences) setNotifications(profile.notification_preferences)
        if (profile.couple_id) setCoupleId(profile.couple_id)
      }

      loadExistingDates(session.user.id)
    }
    init()
  }, [router])

  // ── Fetch synthesis ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    setSynthesisLoading(true)
    fetch('/api/me/synthesis', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setSynthesis(d.synthesis || null))
      .catch(() => setSynthesis(null))
      .finally(() => setSynthesisLoading(false))
  }, [session])

  // ── Fetch entries ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    setEntriesLoading(true)
    fetch('/api/notebook/entries', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setEntriesLoading(false))
  }, [session])

  // ── Fetch practices ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    setPracticesLoading(true)
    fetch('/api/practices', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setPractices(d.practices || []))
      .catch(() => setPractices([]))
      .finally(() => setPracticesLoading(false))
  }, [session])

  // ── Dates ────────────────────────────────────────────────────────────────────

  const loadExistingDates = async (userId) => {
    try {
      const { data: profileData } = await supabase.from('user_profiles').select('couple_id').eq('user_id', userId).single()
      const coupleId = profileData?.couple_id
      if (!coupleId) return
      const { data } = await supabase
        .from('timeline_events')
        .select('id')
        .eq('couple_id', coupleId)
        .in('event_type', ['first_date', 'first_kiss', 'anniversary', 'milestone'])
        .limit(1)
        .maybeSingle()
      if (data) setDatesSubmitted(true)

      const { data: existingPhotoEvents } = await supabase
        .from('timeline_events')
        .select('photo_urls')
        .eq('couple_id', coupleId)
        .eq('event_type', 'custom')
        .not('photo_urls', 'eq', '{}')
        .order('created_at', { ascending: false })
        .limit(20)

      if (existingPhotoEvents?.length) {
        const urls = existingPhotoEvents.flatMap(e => e.photo_urls || []).filter(Boolean)
        setRelationshipPhotos(urls)
      }
    } catch {}
  }

  const submitImportantDates = async () => {
    setSubmittingDates(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const token = s?.access_token
      const dateEntries = [
        importantDates.met         ? { title: 'When we met',    eventType: 'milestone',   date: importantDates.met }         : null,
        importantDates.firstDate   ? { title: 'Our first date', eventType: 'first_date',  date: importantDates.firstDate }   : null,
        importantDates.firstKiss   ? { title: 'Our first kiss', eventType: 'first_kiss',  date: importantDates.firstKiss }   : null,
        importantDates.anniversary ? { title: 'Our anniversary',eventType: 'anniversary', date: importantDates.anniversary } : null,
        ...importantDates.customDates.map(e => ({ title: e.label, eventType: 'milestone', date: e.date })),
      ].filter(Boolean)
      await Promise.allSettled(dateEntries.map(entry =>
        fetch('/api/timeline/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ coupleId, userId: user?.id, title: entry.title, eventType: entry.eventType, eventDate: entry.date + 'T12:00:00', description: null }),
        })
      ))
      setDatesSubmitted(true)
      setShowDatesForm(false)
    } catch (err) {
      console.error('[Profile] submitImportantDates error:', err)
      setDatesSubmitted(true)
      setShowDatesForm(false)
    } finally {
      setSubmittingDates(false)
    }
  }

  const uploadProfilePhoto = async (file) => {
    if (!file || !user?.id) return
    console.log('[profile-photo] starting upload:', file.name)
    try {
      const path = `relationship/${coupleId || user.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { data } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
      console.log('[profile-photo] upload result:', data)
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      console.log('[profile-photo] public url:', publicUrl)
      if (session?.access_token) {
        fetch('/api/timeline/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            coupleId: coupleId || null,
            userId: user.id,
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
            eventType: 'custom',
            eventDate: new Date().toISOString().split('T')[0] + 'T12:00:00',
            photoUrls: [publicUrl],
          })
        }).catch(() => {})
      }
      setRelationshipPhotos(prev => [...prev, publicUrl])
      console.log('[profile-photo] photos state updated')
    } catch(e) {
      console.error('Profile photo upload error:', e)
    }
  }

  const handleProfilePhotoFiles = async (files) => {
    if (!files?.length) return
    setUploadingProfilePhotos(true)
    await Promise.allSettled(Array.from(files).map(f => uploadProfilePhoto(f)))
    setUploadingProfilePhotos(false)
    setPhotosSaved(true)
    setTimeout(() => setPhotosSaved(false), 3000)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('user_profiles').update({
        display_name: displayName,
        birthday: birthday || null,
        anniversary: anniversary || null,
        timezone,
        notification_preferences: notifications,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[profile] save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed')
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      alert('Failed to delete account. Please try again.')
      setDeleting(false)
    }
  }

  const handleExpandEntry = () => {
    setEntryExpanded(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleSaveEntry = async () => {
    if (!entryType || !entryContent.trim() || savingEntry || !session) return
    setSavingEntry(true)
    const optimistic = { id: `tmp-${Date.now()}`, entry_type: entryType, content: entryContent.trim(), created_at: new Date().toISOString() }
    setEntries(prev => [optimistic, ...prev])
    setEntryExpanded(false)
    setEntryType(null)
    setEntryContent('')
    try {
      const res = await fetch('/api/notebook/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ entryType, content: optimistic.content }),
      })
      const data = await res.json()
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === optimistic.id ? data.entry : e))
      }
    } catch (err) {
      console.error('[notebook] save error:', err)
      setEntries(prev => prev.filter(e => e.id !== optimistic.id))
    } finally {
      setSavingEntry(false)
    }
  }

  const handleDeleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/notebook/entry/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch (err) {
      console.error('[notebook] delete error:', err)
    }
  }

  const handleCycleStatus = async (practice) => {
    const newStatus = nextStatus(practice.status)
    setPractices(prev => prev.map(p => p.id === practice.id ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p))
    try {
      await fetch(`/api/practices/${practice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (err) {
      console.error('[practices] update error:', err)
      setPractices(prev => prev.map(p => p.id === practice.id ? { ...p, status: practice.status } : p))
    }
  }

  const handleAddPractice = async (e) => {
    if (e.key !== 'Enter' || !newPracticeTitle.trim() || savingPractice || !session) return
    setSavingPractice(true)
    const title = newPracticeTitle.trim()
    setNewPracticeTitle('')
    const optimistic = { id: `tmp-${Date.now()}`, title, status: 'active', created_at: new Date().toISOString() }
    setPractices(prev => [optimistic, ...prev])
    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title }),
      })
      const data = await res.json()
      if (data.practice) {
        setPractices(prev => prev.map(p => p.id === optimistic.id ? data.practice : p))
      }
    } catch (err) {
      console.error('[practices] add error:', err)
      setPractices(prev => prev.filter(p => p.id !== optimistic.id))
    } finally {
      setSavingPractice(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const _now = Date.now()
  const recentlyDone     = practices.filter(p => p.status === 'done' && (_now - new Date(p.updated_at).getTime()) < 86400000)
  const oldDone          = practices.filter(p => p.status === 'done' && (_now - new Date(p.updated_at).getTime()) >= 86400000)
  const visiblePractices = [...practices.filter(p => p.status !== 'done'), ...recentlyDone]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F4', paddingBottom: 100 }}>

      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '56px 20px 20px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 400, color: '#1C1208', margin: 0, lineHeight: 1 }}>
          Me
        </h1>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#C4714A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {getInitials(displayName)}
          </span>
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── SECTION 1: NORA WEEKLY SYNTHESIS ──────────────────────────────── */}
        <div style={{ background: 'linear-gradient(145deg, #1C1410 0%, #2D3561 100%)', borderRadius: 18, padding: '18px 20px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: '#C9A84C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Nora · This Week</span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 300, fontStyle: 'italic', color: '#fff', lineHeight: 1.6, margin: '0 0 12px', position: 'relative' }}>
            {synthesisLoading
              ? <span style={{ display: 'inline-block', width: 200, height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
              : synthesis?.message || 'Nora is watching. Check back Sunday.'}
          </p>
          <button
            onClick={() => router.push('/ai-coach')}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'block', position: 'relative' }}
          >
            Tell Nora →
          </button>
        </div>

        {/* ── SECTION 2: MY NOTEBOOK ────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#8B7A60', margin: '0 4px 12px' }}>
            My Notebook
          </p>

          {/* New entry input */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE4D8', marginBottom: 12, overflow: 'hidden' }}>
            {!entryExpanded ? (
              <button
                onClick={handleExpandEntry}
                style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#C4AA87' }}
              >
                Something worth capturing…
              </button>
            ) : (
              <div style={{ padding: '14px 16px' }}>
                {/* Type pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => {
                    const selected = entryType === val
                    return (
                      <button
                        key={val}
                        onClick={() => setEntryType(val)}
                        style={{
                          ...TYPE_PILL_BASE,
                          background: selected ? '#FFF0E8' : '#F5F0EB',
                          color: selected ? '#C4714A' : '#8B7A60',
                          border: selected ? '1.5px solid #C4714A' : '1.5px solid transparent',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <textarea
                  ref={textareaRef}
                  value={entryContent}
                  onChange={e => setEntryContent(e.target.value)}
                  placeholder="What are you noticing?"
                  rows={3}
                  style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1C1208', background: 'transparent', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <button
                    onClick={() => { setEntryExpanded(false); setEntryType(null); setEntryContent('') }}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#C4AA87', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    disabled={!entryType || !entryContent.trim() || savingEntry}
                    style={{ background: !entryType || !entryContent.trim() ? '#EDE4D8' : '#C4714A', color: !entryType || !entryContent.trim() ? '#C4AA87' : '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: !entryType || !entryContent.trim() ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                  >
                    {savingEntry ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Entry list */}
          {entriesLoading ? (
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE4D8', padding: '14px 16px', height: 72 }} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p style={{ fontSize: 13, color: '#C4AA87', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '12px 0' }}>Nothing captured yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE4D8', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C4714A', background: '#FFF0E8', padding: '3px 9px', borderRadius: 20 }}>
                      {TYPE_LABELS[entry.entry_type] || entry.entry_type}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: '#C4AA87' }}>{relativeDate(entry.created_at)}</span>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, color: '#C4AA87', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2C1810', lineHeight: 1.5 }}>
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION 3: MY PRACTICES ───────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#8B7A60', margin: '0 4px 12px' }}>
            My Practices
          </p>

          {practicesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE4D8', height: 52 }} />)}
            </div>
          ) : (
            <>
              {visiblePractices.length === 0 && oldDone.length === 0 && (
                <p style={{ fontSize: 13, color: '#C4AA87', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '8px 0 4px' }}>
                  No active practices yet.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visiblePractices.map(practice => {
                  const isDone = practice.status === 'done'
                  return (
                    <div key={practice.id} style={{ background: isDone ? '#F8F5F1' : '#fff', borderRadius: 12, border: '1px solid #EDE4D8', padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isDone ? 0.7 : 1 }}>
                      <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: isDone ? '#8B7A60' : '#1C1208', flex: 1, marginRight: 10, textDecoration: isDone ? 'line-through' : 'none' }}>{practice.title}</span>
                      <button
                        onClick={() => handleCycleStatus(practice)}
                        style={{ ...STATUS_STYLE[practice.status], fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}
                      >
                        {practice.status.charAt(0).toUpperCase() + practice.status.slice(1)}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Practices done for >24h */}
              {oldDone.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setShowDone(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#8B7A60', padding: '4px 4px', letterSpacing: '0.02em' }}
                  >
                    {showDone ? `Hide completed` : `Show completed (${oldDone.length})`}
                  </button>
                  {showDone && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {oldDone.map(practice => (
                        <div key={practice.id} style={{ background: '#F8F5F1', borderRadius: 12, border: '1px solid #EDE4D8', padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 }}>
                          <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#8B7A60', flex: 1, marginRight: 10, textDecoration: 'line-through' }}>{practice.title}</span>
                          <button
                            onClick={() => handleCycleStatus(practice)}
                            style={{ ...STATUS_STYLE.done, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer' }}
                          >
                            Done
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add practice input */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE4D8', marginTop: 10, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 16, color: '#C4AA87', marginRight: 8, userSelect: 'none' }}>+</span>
                <input
                  type="text"
                  value={newPracticeTitle}
                  onChange={e => setNewPracticeTitle(e.target.value)}
                  onKeyDown={handleAddPractice}
                  placeholder="Add a practice…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1C1208', background: 'transparent', padding: '14px 0' }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── SECTION 4: YOUR STORY ─────────────────────────────────────────── */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#1C1410', margin: 0 }}>Your Story</h2>
            <button
              onClick={() => setShowDatesForm(!showDatesForm)}
              style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#C4714A', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showDatesForm ? 'Done' : '+ Add dates'}
            </button>
          </div>

          {showDatesForm && (
            <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #E8DDD0', marginBottom: 16 }}>
              {[
                { key: 'met', label: 'When you met' },
                { key: 'firstDate', label: 'First date' },
                { key: 'firstKiss', label: 'First kiss' },
                { key: 'anniversary', label: 'Anniversary' },
              ].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input
                    type="date"
                    value={importantDates[key]}
                    onChange={e => setImportantDates(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8DDD0', borderRadius: 8, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Add your own</div>
                <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', fontStyle: 'italic', margin: '0 0 10px' }}>First trip, moved in together, got a pet — anything that matters.</p>
                {importantDates.customDates.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: '#FAF6F0', borderRadius: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410' }}>{entry.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#8B7355' }}>{entry.date}</span>
                    <button onClick={() => setImportantDates(prev => ({ ...prev, customDates: prev.customDates.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#8B7355', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input type="text" placeholder="e.g. First trip together" value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} style={{ flex: 2, padding: '10px 12px', border: '1.5px solid #E8DDD0', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', background: '#FFFFFF' }} />
                  <input type="date" value={newCustomDate} onChange={e => setNewCustomDate(e.target.value)} style={{ flex: 1, padding: '10px 8px', border: '1.5px solid #E8DDD0', borderRadius: 8, fontSize: 13, color: '#1C1410', background: '#FFFFFF' }} />
                  <button onClick={() => { if (newCustomLabel.trim() && newCustomDate) { setImportantDates(prev => ({ ...prev, customDates: [...prev.customDates, { label: newCustomLabel.trim(), date: newCustomDate }] })); setNewCustomLabel(''); setNewCustomDate('') } }} style={{ padding: '10px 14px', background: '#C4714A', color: '#FAF6F0', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Add</button>
                </div>
              </div>

              <button onClick={submitImportantDates} disabled={submittingDates} style={{ width: '100%', background: '#1C1410', color: '#FAF6F0', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', opacity: submittingDates ? 0.6 : 1 }}>
                {submittingDates ? 'Saving...' : 'Save these dates →'}
              </button>
            </div>
          )}

          <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', lineHeight: 1.5, margin: 0 }}>
            Important dates live in your Timeline and help Nora know your story.
          </p>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase' }}>PHOTOS</div>
              <button
                onClick={() => profilePhotoInputRef.current?.click()}
                disabled={uploadingProfilePhotos}
                style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#C4714A', background: 'none', border: 'none', cursor: 'pointer' }}>
                {uploadingProfilePhotos ? 'Uploading...' : '+ Add photos'}
              </button>
            </div>
            {photosSaved && (
              <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#7A8C6E', margin: '4px 0 0', textAlign: 'right' }}>Photos saved to your Timeline.</p>
            )}
            <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', lineHeight: 1.5, margin: '0 0 12px', fontStyle: 'italic' }}>Places you've been, moments you loved, things that remind you of them. Nora will use them throughout the app.</p>
            {relationshipPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {relationshipPhotos.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#F5F0E8' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleProfilePhotoFiles(e.target.files)}
            />
          </div>
        </div>

      </div>

      {/* ── SETTINGS SHEET ────────────────────────────────────────────────────── */}
      {settingsOpen && (
        <>
          <div onClick={() => setSettingsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,18,8,0.4)', zIndex: 50 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, background: '#FAF6EF', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  color: '#B0A8A0',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: 4
                }}
              >×</button>
            <div style={{ width: 40, height: 4, background: '#EDE5D8', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 400, color: '#1C1208', margin: '0 0 20px 4px' }}>Settings</h2>

            {/* Profile fields */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE4D8', padding: '0 16px', marginBottom: 12 }}>
              {[
                { label: 'Name', value: displayName, onChange: setDisplayName, type: 'text' },
                { label: 'Birthday', value: birthday, onChange: setBirthday, type: 'date' },
                { label: 'Anniversary', value: anniversary, onChange: setAnniversary, type: 'date' },
              ].map(({ label, value, onChange, type }, i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #F0EBE3' : 'none' }}>
                  <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#6B5A48', fontWeight: 500 }}>{label}</span>
                  <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1C1208', background: 'transparent', border: 'none', outline: 'none', textAlign: 'right', width: 160 }}
                  />
                </div>
              ))}
            </div>

            {/* Timezone */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE4D8', padding: '0 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
                <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#6B5A48', fontWeight: 500 }}>Timezone</span>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1C1208', background: 'transparent', border: 'none', outline: 'none', textAlign: 'right' }}
                >
                  {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EDE4D8', padding: '0 16px', marginBottom: 12 }}>
              {[
                { key: 'checkin_reminder', label: 'Check-in reminder' },
                { key: 'flirt_received',   label: 'Flirt received' },
                { key: 'date_planned',     label: 'Date planned' },
                { key: 'weekly_reflection',label: 'Weekly reflection' },
              ].map(({ key, label }, i, arr) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #F0EBE3' : 'none' }}>
                  <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#6B5A48', fontWeight: 500 }}>{label}</span>
                  <button
                    onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: notifications[key] ? '#C4714A' : '#D5C9BE', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: 2, left: notifications[key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={async () => { await handleSaveProfile(); setSettingsOpen(false) }}
              disabled={saving}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#C4714A', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, border: 'none', cursor: 'pointer', marginBottom: 10, opacity: saving ? 0.7 : 1 }}
            >
              {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={() => setShowNoraWorks(true)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'white',
                border: '0.5px solid #E8E0D8',
                borderRadius: 12,
                fontSize: 15,
                cursor: 'pointer',
                color: '#1A1A1A',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <span>How Nora works</span>
              <span style={{ color: '#B0A8A0', fontSize: 18 }}>›</span>
            </button>

            <button
              onClick={() => { setSettingsOpen(false); router.push('/connect') }}
              style={{ width: '100%', padding: '14px 0', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid #F0EBE3', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#C4714A', cursor: 'pointer', marginBottom: 10 }}
            >
              Connect with your partner →
            </button>

            <button
              onClick={() => { setSettingsOpen(false); handleSignOut() }}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#F0EBE3', color: '#6B5A48', fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer', marginBottom: 10 }}
            >
              Sign out
            </button>

            <button
              onClick={() => { setSettingsOpen(false); setTimeout(() => setShowDeleteConfirm(true), 200) }}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'transparent', color: '#C47A6A', fontSize: 13, fontFamily: "'DM Sans', sans-serif", border: '1px solid #E8C4BC', cursor: 'pointer' }}
            >
              Delete my account
            </button>
            </div>
          </div>
        </>
      )}

      {/* ── HOW NORA WORKS SHEET ─────────────────────────────────────────────── */}
      {showNoraWorks && (
        <div
          onClick={e => e.target === e.currentTarget && setShowNoraWorks(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        >
          <div style={{ background: '#FFF8F4', borderRadius: '24px 24px 0 0', padding: '24px 24px 48px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8E0D8', margin: '0 auto 24px' }} />

            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A96E', margin: '0 auto 12px' }} />
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, margin: '0 0 24px', textAlign: 'center', fontWeight: 'normal' }}>How Nora works</h2>

            <div style={{ background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, padding: '24px 20px', marginBottom: 12 }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.8, margin: '0 0 20px' }}>
                I built ABF because I believe the most important relationship in your life deserves more than advice columns and generic apps. Nora works because she knows you — and that means you have to trust her with real things.
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.8, margin: '0 0 20px' }}>
                I want to be direct about what that means. My name is Matt, and as the person who built this, I have technical access to the database. I could read your conversations and notebook. I won't. Not because a legal document says I can't — because I genuinely believe that what you share here is sacred. Reading it would betray the entire reason I built this.
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.8, margin: '0 0 20px' }}>
                Nora remembers what you share so she can show up better for you. That memory stays between you and her. Your partner will never see what you've told Nora privately. I will never read it either.
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.8, margin: '0 0 24px' }}>
                This is my personal commitment to you, not a policy. ABF only works if you trust it with the real stuff. I take that seriously.
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#6B6560', fontStyle: 'italic', margin: 0 }}>— Matt</p>
            </div>

            <div style={{ background: '#F5F0EB', border: '0.5px solid #E8E0D8', borderRadius: 12, padding: '16px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: '#1A1A1A' }}>What stays private:</strong> Your Nora conversations, your notebook, your individual sessions.<br /><br />
                <strong style={{ color: '#1A1A1A' }}>What&apos;s shared with your partner:</strong> Spark and Bet answers (after both submit), Game Room activity, Ritual checkins.<br /><br />
                <strong style={{ color: '#1A1A1A' }}>What Nora does:</strong> She knows things about your partner from their private sessions. She uses that to show up better for your relationship. She will never tell you what they shared.
              </p>
            </div>

            <button
              onClick={() => setShowNoraWorks(false)}
              style={{ width: '100%', padding: '14px', background: '#C4694F', color: 'white', border: 'none', borderRadius: 100, fontSize: 15, cursor: 'pointer', fontWeight: 500 }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM SHEET ──────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,18,8,0.4)', zIndex: 50 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, background: '#FAF6EF', borderRadius: '24px 24px 0 0', padding: '24px 20px 48px' }}>
            <div style={{ width: 40, height: 4, background: '#EDE5D8', borderRadius: 2, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: '#1C1208', textAlign: 'center', margin: '0 0 10px' }}>Delete your account?</p>
            <p style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#7A6A54', textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>
              This permanently deletes your profile, relationship history, and all of Nora's memory. This cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#C47A6A', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, marginBottom: 10 }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#F0EBE3', color: '#7A6A54', fontSize: 14, fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

    </div>
  )
}
