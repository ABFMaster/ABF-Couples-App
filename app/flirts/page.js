'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FlirtView from '@/components/FlirtView'
import FlirtComposer from '@/components/FlirtComposer'
import SpotifyConnectButton from '@/components/SpotifyConnectButton'
import SendSongModal from '@/components/SendSongModal'
import SongFlirtCard from '@/components/SongFlirtCard'

export default function FlirtsHistory() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerId, setPartnerId] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [flirts, setFlirts] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedFlirt, setSelectedFlirt] = useState(null)
  const [showFlirtView, setShowFlirtView] = useState(false)
  const [showFlirtComposer, setShowFlirtComposer] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [showSendSongModal, setShowSendSongModal] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)
      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setPartnerId(partnerUserId)

      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerUserId)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'Partner')

      // Check Spotify connection
      const { data: spotifyConnection } = await supabase
        .from('user_spotify_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      setSpotifyConnected(!!spotifyConnection)

      // Fetch all flirts
      const { data: allFlirts } = await supabase
        .from('flirts')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false })

      setFlirts(allFlirts || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleViewFlirt = (flirt) => {
    setSelectedFlirt(flirt)
    setShowFlirtView(true)
  }

  const handleFlirtUpdated = () => {
    fetchData()
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  // Filter flirts
  const filteredFlirts = flirts.filter(flirt => {
    if (filter === 'sent') return flirt.sender_id === user?.id
    if (filter === 'received') return flirt.receiver_id === user?.id
    if (filter === 'favorites') return flirt.hearted
    if (filter === 'songs') return flirt.type === 'song'
    return true
  })

  // Group by month
  const groupedFlirts = filteredFlirts.reduce((groups, flirt) => {
    const monthKey = new Date(flirt.created_at).toISOString().slice(0, 7)
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(flirt)
    return groups
  }, {})

  // Stats
  const totalSent = flirts.filter(f => f.sender_id === user?.id).length
  const totalReceived = flirts.filter(f => f.receiver_id === user?.id).length
  const totalHearted = flirts.filter(f => f.hearted).length
  const totalSongs = flirts.filter(f => f.type === 'song').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-coral-600 text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ===== HEADER ===== */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="bg-gradient-to-r from-coral-400 to-coral-500 text-white rounded-2xl px-6 py-3 shadow-lg">
            <span className="text-xl font-bold tracking-wider">ABF</span>
          </div>
          <div className="flex items-center gap-2">
            {spotifyConnected && (
              <button
                onClick={() => setShowSendSongModal(true)}
                className="w-10 h-10 bg-[#1DB954] text-white rounded-full flex items-center justify-center hover:bg-[#1ed760] transition-colors shadow-sm"
                aria-label="Send song"
              >
                <span className="text-lg">🎵</span>
              </button>
            )}
            <button
              onClick={() => setShowFlirtComposer(true)}
              className="bg-gradient-to-r from-coral-400 to-coral-500 text-white px-5 py-2.5 rounded-full font-semibold hover:from-coral-500 hover:to-coral-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              + New
            </button>
          </div>
        </header>

        {/* ===== PAGE TITLE ===== */}
        <section className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">💕 Flirts</h1>
          <p className="text-gray-600">Your love notes with {partnerName}</p>
        </section>

        {/* ===== STATS ROW ===== */}
        <section className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-coral-600">{totalSent}</p>
            <p className="text-xs text-gray-500 mt-1">Sent</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-500">{totalReceived}</p>
            <p className="text-xs text-gray-500 mt-1">Received</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-coral-500">{totalHearted}</p>
            <p className="text-xs text-gray-500 mt-1">Hearted</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#1DB954]">{totalSongs}</p>
            <p className="text-xs text-gray-500 mt-1">Songs</p>
          </div>
        </section>

        {/* ===== SPOTIFY SECTION ===== */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1DB954]/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Share Songs</h3>
                  <p className="text-gray-400 text-sm">
                    {spotifyConnected ? 'Send songs to your partner!' : 'Connect Spotify to share music'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {spotifyConnected && (
                  <button
                    onClick={() => router.push('/mixtape')}
                    className="px-4 py-2 text-white text-sm font-medium hover:text-gray-300 transition-colors"
                  >
                    View Mixtape
                  </button>
                )}
                <SpotifyConnectButton
                  isConnected={spotifyConnected}
                  onConnectionChange={setSpotifyConnected}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== FILTER TABS ===== */}
        <section className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'All' },
              { id: 'sent', label: 'Sent' },
              { id: 'received', label: 'Received' },
              { id: 'songs', label: '🎵 Songs' },
              { id: 'favorites', label: '❤️ Favorites' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === tab.id
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-cream-50 shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* ===== EMPTY STATE ===== */}
        {filteredFlirts.length === 0 && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">{filter === 'songs' ? '🎵' : '💕'}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {filter === 'favorites'
                  ? 'No favorites yet'
                  : filter === 'sent'
                    ? "You haven't sent any flirts"
                    : filter === 'received'
                      ? "No flirts received yet"
                      : filter === 'songs'
                        ? "No songs shared yet"
                        : 'No flirts yet'}
              </h2>
              <p className="text-gray-600 mb-6">
                {filter === 'songs'
                  ? spotifyConnected
                    ? `Share a song with ${partnerName}!`
                    : 'Connect Spotify to share music'
                  : filter === 'all' || filter === 'sent'
                    ? `Send ${partnerName} something special!`
                    : 'Check back later!'}
              </p>
              {filter === 'songs' && spotifyConnected ? (
                <button
                  onClick={() => setShowSendSongModal(true)}
                  className="bg-[#1DB954] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#1ed760] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  Send a Song
                </button>
              ) : (filter === 'all' || filter === 'sent') && (
                <button
                  onClick={() => setShowFlirtComposer(true)}
                  className="bg-gradient-to-r from-coral-400 to-coral-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-coral-500 hover:to-coral-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  Send a Flirt
                </button>
              )}
            </div>
          </section>
        )}

        {/* ===== FLIRTS LIST ===== */}
        {Object.entries(groupedFlirts).map(([monthKey, monthFlirts]) => (
          <section key={monthKey} className="mb-8">
            {/* Month Header */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {formatDate(monthKey + '-01')}
              </h2>
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400 font-medium">{monthFlirts.length} flirts</span>
            </div>

            {/* Flirt Cards */}
            <div className="space-y-4">
              {monthFlirts.map(flirt => {
                const isSent = flirt.sender_id === user?.id
                return (
                  <div
                    key={flirt.id}
                    onClick={() => handleViewFlirt(flirt)}
                    className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${
                      !flirt.is_read && !isSent ? 'ring-2 ring-coral-200 ring-offset-2' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Type Indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        flirt.type === 'song'
                          ? 'bg-[#1DB954]/10'
                          : isSent
                            ? 'bg-cream-100'
                            : 'bg-cream-100'
                      }`}>
                        <span className="text-xl">
                          {flirt.type === 'song' ? '🎵' : flirt.type === 'gif' ? '🎉' : flirt.type === 'photo' ? '📸' : flirt.type === 'combo' ? '💬' : '💬'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Sender & Metadata */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-semibold ${isSent ? 'text-coral-600' : 'text-indigo-500'}`}>
                            {isSent ? 'You' : partnerName}
                          </span>
                          <span className="text-xs text-gray-400">{formatTime(flirt.created_at)}</span>
                          {flirt.hearted && <span className="text-coral-500">❤️</span>}
                          {!flirt.is_read && !isSent && (
                            <span className="bg-coral-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">New</span>
                          )}
                        </div>

                        {/* Preview Content */}
                        <div className="flex items-center gap-3">
                          {/* Media Preview */}
                          {flirt.type === 'song' && flirt.spotify_album_art && (
                            <img
                              src={flirt.spotify_album_art}
                              alt="Album art"
                              className="w-14 h-14 rounded-lg object-cover shadow-sm"
                            />
                          )}
                          {flirt.gif_url && (
                            <img
                              src={flirt.gif_url}
                              alt="GIF"
                              className="w-14 h-14 rounded-lg object-cover shadow-sm"
                            />
                          )}
                          {flirt.photo_url && (
                            <img
                              src={flirt.photo_url}
                              alt="Photo"
                              className="w-14 h-14 rounded-lg object-cover shadow-sm"
                            />
                          )}

                          {/* Text Content */}
                          {flirt.type === 'song' ? (
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 font-medium truncate">{flirt.spotify_track_name}</p>
                              <p className="text-gray-500 text-sm truncate">{flirt.spotify_artist}</p>
                            </div>
                          ) : flirt.message ? (
                            <p className="text-gray-600 line-clamp-2 flex-1">
                              {flirt.message}
                            </p>
                          ) : !flirt.gif_url && !flirt.photo_url ? (
                            <p className="text-gray-400 text-sm italic">No content</p>
                          ) : null}
                        </div>

                        {/* Reply Preview */}
                        {flirt.reply && (
                          <div className="mt-3 bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">{isSent ? partnerName : 'You'}:</span> {flirt.reply}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Arrow Indicator */}
                      <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>

      {/* ===== MODALS ===== */}
      <FlirtComposer
        isOpen={showFlirtComposer}
        onClose={() => setShowFlirtComposer(false)}
        coupleId={couple?.id}
        partnerId={partnerId}
        partnerName={partnerName}
        onSent={() => {
          setShowFlirtComposer(false)
          fetchData()
        }}
        spotifyConnected={spotifyConnected}
        onSendSong={() => setShowSendSongModal(true)}
      />

      <FlirtView
        isOpen={showFlirtView}
        onClose={() => {
          setShowFlirtView(false)
          setSelectedFlirt(null)
        }}
        flirt={selectedFlirt}
        senderName={selectedFlirt?.sender_id === user?.id ? 'You' : partnerName}
        coupleId={couple?.id}
        onUpdate={handleFlirtUpdated}
      />

      <SendSongModal
        isOpen={showSendSongModal}
        onClose={() => setShowSendSongModal(false)}
        coupleId={couple?.id}
        partnerId={partnerId}
        partnerName={partnerName}
        onSent={() => {
          setShowSendSongModal(false)
          fetchData()
        }}
      />
    </div>
  )
}
