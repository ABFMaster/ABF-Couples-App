'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris / Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const LOVE_LANGUAGE_LABELS = {
  words: 'Words of Affirmation',
  time: 'Quality Time',
  acts: 'Acts of Service',
  gifts: 'Receiving Gifts',
  touch: 'Physical Touch',
}

const CONFLICT_STYLE_LABELS = {
  talk_immediately: 'Talk it out right away',
  need_space: 'Take some space first',
  write_it_out: 'Write it out',
  avoid: 'Let it cool down',
  validator: 'Validator',
  volatile: 'Passionate Fighter',
  avoider: 'Peacekeeper',
  hostile: 'Reactive Fighter',
}

const ATTACHMENT_LABELS = {
  secure: 'Secure',
  anxious: 'Anxious',
  avoidant: 'Avoidant',
  disorganized: 'Disorganized',
}

const HOBBIES = [
  { value: 'reading', label: 'Reading' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'music', label: 'Music' },
  { value: 'movies', label: 'Movies/TV' },
  { value: 'travel', label: 'Travel' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'sports', label: 'Sports' },
  { value: 'art', label: 'Art' },
  { value: 'photography', label: 'Photography' },
  { value: 'writing', label: 'Writing' },
  { value: 'dancing', label: 'Dancing' },
  { value: 'crafts', label: 'Crafts/DIY' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'pets', label: 'Pets' },
  { value: 'technology', label: 'Technology' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'board_games', label: 'Board Games' },
  { value: 'wine', label: 'Wine/Drinks' },
  { value: 'volunteering', label: 'Volunteering' },
]

const DATE_PREFERENCES = [
  { value: 'dinner', label: 'Nice dinner out' },
  { value: 'home_cooking', label: 'Cooking at home' },
  { value: 'movie_night', label: 'Movie night' },
  { value: 'outdoor_adventure', label: 'Outdoor adventure' },
  { value: 'museum', label: 'Museums/galleries' },
  { value: 'concert', label: 'Concert/live music' },
  { value: 'coffee', label: 'Coffee date' },
  { value: 'picnic', label: 'Picnic' },
  { value: 'spa', label: 'Spa day' },
  { value: 'game_night', label: 'Game night' },
  { value: 'dancing', label: 'Dancing' },
  { value: 'travel', label: 'Weekend getaway' },
  { value: 'stargazing', label: 'Stargazing' },
  { value: 'beach', label: 'Beach day' },
  { value: 'workout', label: 'Working out together' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'sports_event', label: 'Sports event' },
  { value: 'lazy_day', label: 'Lazy day in' },
]

const CHECKIN_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
]

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
      {children}
    </p>
  )
}

function InfoRow({ label, value, placeholder, type = 'text', onChange, options }) {
  if (options) return (
    <div className="flex items-center justify-between py-3.5 border-b border-neutral-100 last:border-0">
      <span className="text-[13px] text-neutral-500 font-medium">{label}</span>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="text-[13px] font-semibold text-neutral-900 bg-transparent text-right border-none outline-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-neutral-100 last:border-0">
      <span className="text-[13px] text-neutral-500 font-medium">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-[13px] font-semibold text-neutral-900 bg-transparent text-right border-none outline-none placeholder:text-neutral-300 w-40"
      />
    </div>
  )
}

function StylePill({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-neutral-100 last:border-0">
      <span className="text-[13px] text-neutral-500 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-neutral-900">{value}</span>
    </div>
  )
}

function NotificationRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-neutral-100 last:border-0">
      <span className="text-[13px] text-neutral-500 font-medium">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[#E8614D]' : 'bg-neutral-200'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [notifications, setNotifications] = useState({
    checkin_reminder: true,
    flirt_received: true,
    date_planned: true,
    weekly_reflection: true,
  })

  // Preference fields
  const [hobbies, setHobbies] = useState([])
  const [datePreferences, setDatePreferences] = useState([])
  const [checkinTime, setCheckinTime] = useState(null)

  // Read-only assessment data
  const [attachmentStyle, setAttachmentStyle] = useState(null)
  const [conflictStyle, setConflictStyle] = useState(null)
  const [loveLanguage, setLoveLanguage] = useState(null)

  // Partner data
  const [partnerName, setPartnerName] = useState(null)
  const [partnerAttachment, setPartnerAttachment] = useState(null)
  const [partnerConflict, setPartnerConflict] = useState(null)
  const [partnerLoveLanguage, setPartnerLoveLanguage] = useState(null)
  const [daysTogether, setDaysTogether] = useState(0)

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      const partnerId = couple
        ? couple.user1_id === user.id ? couple.user2_id : couple.user1_id
        : null

      if (couple) {
        setDaysTogether(Math.floor((Date.now() - new Date(couple.created_at).getTime()) / 86400000))
      }

      await Promise.allSettled([

        // My profile
        (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name, birthday, anniversary, timezone, notification_preferences, love_language_primary, conflict_style, hobbies, date_preferences, preferred_checkin_time')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data) {
            setDisplayName(data.display_name || '')
            setBirthday(data.birthday || '')
            setAnniversary(data.anniversary || '')
            setTimezone(data.timezone || 'America/Los_Angeles')
            setNotifications(data.notification_preferences || {
              checkin_reminder: true,
              flirt_received: true,
              date_planned: true,
              weekly_reflection: true,
            })
            setLoveLanguage(data.love_language_primary || null)
            if (data.conflict_style) setConflictStyle(data.conflict_style)
            setHobbies(data.hobbies || [])
            setDatePreferences(data.date_preferences || [])
            setCheckinTime(data.preferred_checkin_time || null)
          }
        })(),

        // My attachment style
        (async () => {
          const { data } = await supabase
            .from('attachment_assessments')
            .select('primary_style')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.primary_style) setAttachmentStyle(data.primary_style)
        })(),

        // My conflict style
        (async () => {
          const { data } = await supabase
            .from('conflict_assessments')
            .select('primary_style')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.primary_style) setConflictStyle(data.primary_style)
        })(),

        // Partner profile
        partnerId ? (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name, love_language_primary, conflict_style')
            .eq('user_id', partnerId)
            .maybeSingle()
          if (data) {
            setPartnerName(data.display_name || null)
            setPartnerLoveLanguage(data.love_language_primary || null)
            setPartnerConflict(data.conflict_style || null)
          }
        })() : Promise.resolve(),

        // Partner attachment
        partnerId ? (async () => {
          const { data } = await supabase
            .from('attachment_assessments')
            .select('primary_style')
            .eq('user_id', partnerId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.primary_style) setPartnerAttachment(data.primary_style)
        })() : Promise.resolve(),

        // Partner conflict
        partnerId ? (async () => {
          const { data } = await supabase
            .from('conflict_assessments')
            .select('primary_style')
            .eq('user_id', partnerId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.primary_style) setPartnerConflict(data.primary_style)
        })() : Promise.resolve(),

      ])

      setLoading(false)
    } catch (err) {
      console.error('Profile error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          birthday: birthday || null,
          anniversary: anniversary || null,
          timezone,
          notification_preferences: notifications,
          hobbies,
          date_preferences: datePreferences,
          preferred_checkin_time: checkinTime,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="px-6 pt-10 pb-32 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-1">Your account</p>
          <h1 className="text-[28px] text-neutral-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            {displayName || 'Profile'}
          </h1>
          {daysTogether > 0 && (
            <p className="text-[13px] text-neutral-400 mt-1">{daysTogether} days together</p>
          )}
        </div>

        {/* SECTION 1 — YOUR INFO */}
        <section>
          <SectionLabel>You</SectionLabel>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5">
            <InfoRow label="Name" value={displayName} placeholder="Your name" onChange={setDisplayName} />
            <InfoRow label="Birthday" value={birthday} type="date" placeholder="mm/dd/yyyy" onChange={setBirthday} />
            <InfoRow label="Anniversary" value={anniversary} type="date" placeholder="mm/dd/yyyy" onChange={setAnniversary} />
            <InfoRow label="Timezone" value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-3 min-h-[48px] bg-[#E8614D] text-white rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </section>

        {/* SECTION 2 — WHO YOU ARE */}
        <section>
          <SectionLabel>Who you are</SectionLabel>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5">
            <StylePill label="Attachment style" value={ATTACHMENT_LABELS[attachmentStyle] || attachmentStyle} />
            <StylePill label="Conflict style" value={CONFLICT_STYLE_LABELS[conflictStyle] || conflictStyle} />
            <StylePill label="Love language" value={LOVE_LANGUAGE_LABELS[loveLanguage] || loveLanguage} />
            {(!attachmentStyle && !conflictStyle && !loveLanguage) ? (
              <div className="py-3.5">
                <button
                  onClick={() => router.push('/profile/assessment')}
                  className="text-[13px] font-semibold text-[#E8614D]"
                >
                  Complete your assessment →
                </button>
              </div>
            ) : (
              <div className="py-3.5">
                <button
                  onClick={() => router.push('/profile/assessment')}
                  className="text-[13px] font-medium text-neutral-400"
                >
                  Retake assessment →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3 — YOUR PARTNER */}
        {partnerName && (
          <section>
            <SectionLabel>{partnerName}</SectionLabel>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5">
              <StylePill label="Attachment style" value={ATTACHMENT_LABELS[partnerAttachment] || partnerAttachment} />
              <StylePill label="Conflict style" value={CONFLICT_STYLE_LABELS[partnerConflict] || partnerConflict} />
              <StylePill label="Love language" value={LOVE_LANGUAGE_LABELS[partnerLoveLanguage] || partnerLoveLanguage} />
              {!partnerAttachment && !partnerConflict && !partnerLoveLanguage && (
                <div className="py-4 text-center">
                  <p className="text-[13px] text-neutral-400">
                    {partnerName} hasn't completed their assessment yet
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 4 — YOUR PREFERENCES */}
        <section>
          <SectionLabel>Your preferences</SectionLabel>

          {/* Check-in time */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 mb-3">
            <div className="py-3.5 border-b border-neutral-100">
              <p className="text-[13px] text-neutral-500 font-medium mb-3">Best time to check in</p>
              <div className="flex gap-2 flex-wrap">
                {CHECKIN_TIMES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setCheckinTime(t.value)}
                    className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                      checkinTime === t.value
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hobbies */}
            <div className="py-3.5 border-b border-neutral-100">
              <p className="text-[13px] text-neutral-500 font-medium mb-3">Hobbies & interests</p>
              <div className="flex gap-2 flex-wrap">
                {HOBBIES.map(h => (
                  <button
                    key={h.value}
                    onClick={() => setHobbies(prev =>
                      prev.includes(h.value)
                        ? prev.filter(v => v !== h.value)
                        : [...prev, h.value]
                    )}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                      hobbies.includes(h.value)
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date preferences */}
            <div className="py-3.5">
              <p className="text-[13px] text-neutral-500 font-medium mb-3">Date ideas you love</p>
              <div className="flex gap-2 flex-wrap">
                {DATE_PREFERENCES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDatePreferences(prev =>
                      prev.includes(d.value)
                        ? prev.filter(v => v !== d.value)
                        : [...prev, d.value]
                    )}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                      datePreferences.includes(d.value)
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-1 min-h-[48px] bg-[#E8614D] text-white rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </section>

        {/* SECTION 5 — NOTIFICATIONS */}
        <section>
          <SectionLabel>Notifications</SectionLabel>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5">
            <NotificationRow
              label="Check-in reminder"
              value={notifications.checkin_reminder}
              onChange={v => setNotifications(n => ({ ...n, checkin_reminder: v }))}
            />
            <NotificationRow
              label="Flirt received"
              value={notifications.flirt_received}
              onChange={v => setNotifications(n => ({ ...n, flirt_received: v }))}
            />
            <NotificationRow
              label="Date planned"
              value={notifications.date_planned}
              onChange={v => setNotifications(n => ({ ...n, date_planned: v }))}
            />
            <NotificationRow
              label="Weekly reflection"
              value={notifications.weekly_reflection}
              onChange={v => setNotifications(n => ({ ...n, weekly_reflection: v }))}
            />
          </div>
        </section>

        {/* Sign out */}
        <section>
          <button
            onClick={handleSignOut}
            className="w-full min-h-[48px] bg-white border border-neutral-200 rounded-xl font-semibold text-[15px] text-neutral-500 active:scale-[0.98] transition-transform shadow-sm"
          >
            Sign out
          </button>
        </section>

      </div>
    </div>
  )
}
