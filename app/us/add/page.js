'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddToStoryPage() {
  const router = useRouter()
  const [path, setPath] = useState('memory')
  const [session, setSession] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [partnerName, setPartnerName] = useState('')
  const [partnerId, setPartnerId] = useState(null)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0])
  const [memoryLocation, setMemoryLocation] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [memoryPhotos, setMemoryPhotos] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const photoInputRef = useRef(null)
  const locationTimeout = useRef(null)

  useEffect(() => {
    if (mapsLoaded || window.google?.maps) {
      if (window.google?.maps) setMapsLoaded(true)
      return
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) return
    window.__gmapsAddInit = () => setMapsLoaded(true)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__gmapsAddInit`
    script.async = true
    document.head.appendChild(script)
    return () => { window.__gmapsAddInit = undefined }
  }, [])

  const searchLocation = async (query) => {
    if (!query || query.length < 2) { setLocationResults([]); return }
    if (!window.google?.maps) return
    setLocationSearching(true)
    try {
      const { AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        language: 'en',
      })
      setLocationResults(suggestions?.map(s => ({
        placeId: s.placePrediction?.placeId,
        text: s.placePrediction?.text?.text || '',
      })) || [])
    } catch {}
    setLocationSearching(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setSession(session)
      setUserId(session.user.id)
      const { data: couple } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .maybeSingle()
      if (!couple) return
      setCoupleId(couple.id)
      const pid = couple.user1_id === session.user.id ? couple.user2_id : couple.user1_id
      setPartnerId(pid)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', pid)
        .maybeSingle()
      setPartnerName(profile?.display_name || 'your partner')
    }
    init()
  }, [])

  const handlePhotoUpload = async (files) => {
    if (!files?.length) return
    setUploadingPhotos(true)
    const uploaded = []
    for (const file of Array.from(files)) {
      try {
        const path = `memories/${userId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
        const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
        if (!error) {
          const { data } = supabase.storage.from('photos').getPublicUrl(path)
          uploaded.push(data.publicUrl)
        }
      } catch {}
    }
    setMemoryPhotos(prev => [...prev, ...uploaded])
    setUploadingPhotos(false)
  }

  const handleSaveMemory = async () => {
    if (!memoryTitle.trim()) { setError('Give this memory a name.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/timeline/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId,
          userId,
          eventType: 'custom',
          itemSubtype: 'memory',
          title: memoryTitle.trim(),
          description: memoryLocation.trim() || null,
          eventDate: memoryDate,
          photoUrls: memoryPhotos,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (partnerId) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` },
          body: JSON.stringify({
            userId: partnerId,
            title: 'A memory was added',
            body: `${memoryTitle.trim()} — add your photos`,
            url: '/us',
            route: 'memory/created'
          })
        }).catch(() => {})
      }
      router.push('/us?section=been')
    } catch (err) {
      setError('Something went wrong. Try again.')
      console.error(err)
    }
    setSaving(false)
  }

  const paths = [
    { id: 'memory', label: 'Memory we made' },
    { id: 'want', label: 'Something we want' },
    { id: 'trip', label: 'Dream trip' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', padding: '0 0 80px' }}>
      <div style={{ padding: '56px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 13, color: '#8B7355', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', padding: 0 }}>← back</button>
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, color: '#1C1410', fontWeight: 300 }}>Add to our story</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '0 24px 32px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {paths.map(p => (
          <button key={p.id} onClick={() => setPath(p.id)} style={{ padding: '7px 14px', borderRadius: 100, border: `1px solid ${path === p.id ? '#1C1410' : '#D9CBBA'}`, background: path === p.id ? '#1C1410' : 'transparent', color: path === p.id ? '#FAF6F0' : '#8B7355', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{p.label}</button>
        ))}
      </div>

      {path === 'memory' && (
        <div style={{ padding: '0 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>What do you call this?</div>
            <input value={memoryTitle} onChange={e => setMemoryTitle(e.target.value)} placeholder="Victoria trip · Sunday farmers market · Anniversary dinner" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #D9CBBA', padding: '10px 0', fontSize: 18, fontFamily: 'Cormorant Garamond, Georgia, serif', color: '#1C1410', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>When was it?</div>
            <input type="date" value={memoryDate} onChange={e => setMemoryDate(e.target.value)} style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #D9CBBA', padding: '10px 0', fontSize: 16, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 32, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>Where? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: '#C4AA87' }}>optional</span></div>
            <input
              value={memoryLocation}
              onChange={e => {
                setMemoryLocation(e.target.value)
                clearTimeout(locationTimeout.current)
                locationTimeout.current = setTimeout(() => searchLocation(e.target.value), 300)
              }}
              placeholder="Victoria, BC"
              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #D9CBBA', padding: '10px 0', fontSize: 16, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', outline: 'none', boxSizing: 'border-box' }}
            />
            {locationResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #D9CBBA', borderRadius: 10, zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {locationResults.slice(0, 4).map((r, i) => (
                  <div key={i} onClick={() => { setMemoryLocation(r.text); setLocationResults([]) }} style={{ padding: '12px 16px', fontSize: 14, color: '#1C1410', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderBottom: i < 3 ? '0.5px solid #F0EBE3' : 'none' }}>{r.text}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>Your photos <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: '#C4AA87' }}>optional · {partnerName} can add theirs too</span></div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotoUpload(e.target.files)} />
            {memoryPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {memoryPhotos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setMemoryPhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhotos} style={{ width: '100%', padding: '14px', background: 'none', border: '1px dashed #D9CBBA', borderRadius: 12, fontSize: 13, color: '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {uploadingPhotos ? 'Uploading...' : memoryPhotos.length > 0 ? '+ Add more photos' : '+ Add photos'}
            </button>
          </div>
          {error && <div style={{ color: '#C4694F', fontSize: 13, marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>{error}</div>}
          <button onClick={handleSaveMemory} disabled={saving || !memoryTitle.trim()} style={{ width: '100%', padding: '16px', background: memoryTitle.trim() ? '#1C1410' : '#D9CBBA', color: '#FAF6F0', border: 'none', borderRadius: 14, fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', cursor: memoryTitle.trim() ? 'pointer' : 'default' }}>
            {saving ? 'Adding to your story...' : 'Add to our story →'}
          </button>
        </div>
      )}

      {path === 'want' && (
        <div style={{ padding: '0 24px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#8B7355', fontStyle: 'italic', marginBottom: 24 }}>Things you want to experience together.</div>
          <button onClick={() => router.push('/shared/add')} style={{ width: '100%', padding: '16px', background: '#1C1410', color: '#FAF6F0', border: 'none', borderRadius: 14, fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', cursor: 'pointer' }}>Add something →</button>
        </div>
      )}

      {path === 'trip' && (
        <div style={{ padding: '0 24px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#8B7355', fontStyle: 'italic', marginBottom: 24 }}>A trip you want to take together.</div>
          <button onClick={() => router.push('/shared/add')} style={{ width: '100%', padding: '16px', background: '#1C1410', color: '#FAF6F0', border: 'none', borderRadius: 14, fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', cursor: 'pointer' }}>Plan a trip →</button>
        </div>
      )}
    </div>
  )
}
