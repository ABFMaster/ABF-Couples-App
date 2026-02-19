'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────
function staticMapUrl(lat, lng) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!lat || !lng || !key) return null
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=14&size=600x300` +
    `&markers=color:0xec4899%7C${lat},${lng}` +
    `&key=${key}` +
    `&style=feature:poi%7Cvisibility:off`
  )
}

function multiStopMapUrl(stops) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key || !stops?.length) return null
  const valid = stops.filter(s => s.lat && s.lng)
  if (!valid.length) return null
  const markers = valid.slice(0, 5)
    .map((s, i) => `markers=color:0xec4899%7Clabel:${i + 1}%7C${s.lat},${s.lng}`)
    .join('&')
  return (
    `https://maps.googleapis.com/maps/api/staticmap?size=600x300&${markers}` +
    `&key=${key}&style=feature:poi%7Cvisibility:off`
  )
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Hardcoded Seattle curated ideas ───────────────────────────────────────────
const CURATED_IDEAS = [
  {
    id: 'golden-hour',
    title: 'Golden Hour Waterfront',
    tag: 'Quality Time',
    tagColor: 'bg-rose-100 text-rose-700',
    emoji: '🌅',
    from: 'from-orange-400',
    to: 'to-rose-500',
    stops: [
      { name: 'Pike Place Market',    address: 'Pike Place Market, Seattle, WA 98101' },
      { name: 'Seattle Great Wheel',  address: '1301 Alaskan Way, Seattle, WA 98101' },
      { name: 'Aqua Verde',           address: '1303 NE Boat St, Seattle, WA 98105' },
    ],
  },
  {
    id: 'capitol-hill',
    title: 'Capitol Hill After Dark',
    tag: 'Adventure',
    tagColor: 'bg-purple-100 text-purple-700',
    emoji: '🌙',
    from: 'from-purple-500',
    to: 'to-indigo-600',
    stops: [
      { name: 'Eltana Bagels', address: '1520 15th Ave, Seattle, WA 98122' },
      { name: 'Oddfellows',    address: '915 E Pine St, Seattle, WA 98122' },
      { name: 'Canon Bar',     address: '928 12th Ave, Seattle, WA 98122' },
    ],
  },
  {
    id: 'sunday-slow-down',
    title: 'Sunday Slow Down',
    tag: 'Connection',
    tagColor: 'bg-teal-100 text-teal-700',
    emoji: '☀️',
    from: 'from-teal-400',
    to: 'to-green-500',
    stops: [
      { name: 'Volunteer Park Conservatory', address: '1400 E Galer St, Seattle, WA 98112' },
      { name: 'Café Presse',                 address: '1117 12th Ave, Seattle, WA 98122' },
      { name: 'Elliott Bay Book Co',         address: '1521 10th Ave, Seattle, WA 98122' },
    ],
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function UpcomingHeroCard({ plan, onClick }) {
  const mapUrl = staticMapUrl(plan.latitude, plan.longitude)
  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-lg cursor-pointer"
      style={{ minHeight: 180 }}
      onClick={onClick}
    >
      {mapUrl
        ? <img src={mapUrl} alt="Map" className="absolute inset-0 w-full h-full object-cover" />
        : <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-500" />
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      <div className="relative px-5 pb-5 pt-24 sm:pt-32 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Next Up</p>
          <h3 className="text-white font-bold text-xl leading-tight truncate">{plan.title}</h3>
          {plan.date_time && (
            <p className="text-white/75 text-sm mt-1">📅 {fmtDate(plan.date_time)} · {fmtTime(plan.date_time)}</p>
          )}
          {plan.address && (
            <p className="text-white/60 text-xs mt-0.5 truncate">📍 {plan.address}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className="flex-shrink-0 bg-white text-gray-900 text-xs font-bold px-4 py-2.5 rounded-full hover:bg-pink-50 transition-colors shadow-sm"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

function PastDateCard({ date, onClick }) {
  const mapUrl = date.source === 'custom'
    ? multiStopMapUrl(date.stops)
    : staticMapUrl(date.lat, date.lng)
  const stopCount = date.stops?.length ?? 0

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-28 bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
        {mapUrl && <img src={mapUrl} alt="Map" className="w-full h-full object-cover" />}
        {date.source === 'custom' && stopCount > 0 && (
          <div className="absolute top-2 left-2 bg-white/90 text-xs font-medium text-purple-700 px-2 py-0.5 rounded-full">
            {stopCount} stops
          </div>
        )}
        {date.status === 'completed' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            ✓
          </div>
        )}
        {date.rating > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {'⭐'.repeat(date.rating)}
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{date.title}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(date.date)}</p>
      </div>
    </div>
  )
}

function IdeaCard({ idea, onBuild }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className={`bg-gradient-to-br ${idea.from} ${idea.to} px-4 pt-4 pb-5 relative`}>
        <span className="absolute top-3 right-4 text-3xl opacity-75">{idea.emoji}</span>
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${idea.tagColor}`}>
          {idea.tag}
        </span>
        <h3 className="font-bold text-white text-base leading-tight">{idea.title}</h3>
      </div>
      <div className="px-4 pt-3 pb-2 flex-1">
        <div className="space-y-2">
          {idea.stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-xs text-gray-700 truncate">{stop.name}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => onBuild(idea)}
          className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold rounded-xl hover:shadow-md hover:from-pink-600 hover:to-purple-600 transition-all active:scale-95"
        >
          Build This Date →
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DatesPage() {
  const router = useRouter()
  const [loading, setLoading]           = useState(true)
  const [upcomingDate, setUpcomingDate] = useState(null)
  const [pastDates, setPastDates]       = useState([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return }

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single()

    const cid = coupleData?.id ?? null

    if (!cid) { setLoading(false); return }

    const now = new Date().toISOString()

    // Upcoming: next planned date
    const { data: upcoming } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', cid)
      .eq('status', 'planned')
      .gt('date_time', now)
      .order('date_time', { ascending: true })
      .limit(1)
      .maybeSingle()

    setUpcomingDate(upcoming ?? null)

    // Past date_plans
    const { data: pastPlans } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', cid)
      .neq('status', 'cancelled')
      .or(`status.eq.completed,date_time.lt.${now}`)
      .order('date_time', { ascending: false })
      .limit(10)

    // Custom dates
    const { data: customDates } = await supabase
      .from('custom_dates')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false })
      .limit(6)

    // Normalize to a common shape
    const normalized = [
      ...(pastPlans ?? []).map(p => ({
        id:     p.id,
        source: 'plan',
        title:  p.title,
        date:   p.date_time,
        lat:    p.latitude,
        lng:    p.longitude,
        stops:  null,
        status: p.status,
        rating: p.rating,
      })),
      ...(customDates ?? []).map(c => ({
        id:     c.id,
        source: 'custom',
        title:  c.title,
        date:   c.created_at,
        lat:    c.stops?.[0]?.lat ?? null,
        lng:    c.stops?.[0]?.lng ?? null,
        stops:  c.stops,
        status: null,
        rating: null,
      })),
    ].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))

    setPastDates(normalized)
    setLoading(false)
  }

  const handleBuildIdea = (idea) => {
    sessionStorage.setItem('customDateItinerary', JSON.stringify(idea.stops))
    router.push('/dates/custom')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💕</div>
          <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 px-5 pt-14 pb-8">
        <button
          onClick={() => router.back()}
          className="text-white/70 text-sm mb-5 flex items-center gap-1 hover:text-white transition-colors"
        >← Back</button>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Date Night</h1>
            <p className="text-pink-200 text-sm mt-1">Plan something special</p>
          </div>
          <button
            onClick={() => router.push('/dates/custom')}
            className="flex-shrink-0 bg-white text-pink-600 font-bold text-sm px-4 py-3 rounded-2xl shadow-lg hover:bg-pink-50 transition-colors flex items-center gap-1.5"
          >
            <span>✨</span><span>Plan a Date</span>
          </button>
        </div>
      </div>

      <div className="px-5 space-y-8 mt-6">

        {/* ── Upcoming Date ────────────────────────────────────── */}
        <section>
          <h2 className="font-bold text-gray-900 text-base mb-3">Next Up</h2>
          {upcomingDate ? (
            <UpcomingHeroCard
              plan={upcomingDate}
              onClick={() => router.push(`/dates/${upcomingDate.id}`)}
            />
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold text-gray-800 mb-1">No dates planned yet</p>
              <p className="text-gray-400 text-sm mb-5">Let's change that — plan something special</p>
              <button
                onClick={() => router.push('/dates/custom')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-shadow"
              >
                Plan Your First Date
              </button>
            </div>
          )}
        </section>

        {/* ── Date History ─────────────────────────────────────── */}
        {pastDates.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-3">Date History</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pastDates.map(date => (
                <PastDateCard
                  key={`${date.source}-${date.id}`}
                  date={date}
                  onClick={() => router.push(`/dates/${date.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Ideas for You Two ─────────────────────────────────── */}
        <section>
          <h2 className="font-bold text-gray-900 text-base mb-0.5">💡 Ideas for You Two</h2>
          <p className="text-gray-400 text-sm mb-4">Based on your relationship</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CURATED_IDEAS.map(idea => (
              <IdeaCard key={idea.id} idea={idea} onBuild={handleBuildIdea} />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
