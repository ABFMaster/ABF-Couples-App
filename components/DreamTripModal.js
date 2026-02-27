'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const vibes = [
  { id: 'beaches', label: 'Beaches & Sun', icon: '🏖️' },
  { id: 'mountains', label: 'Mountains', icon: '🏔️' },
  { id: 'city', label: 'City & Culture', icon: '🏙️' },
  { id: 'adventure', label: 'Adventure', icon: '🧗' },
  { id: 'romantic', label: 'Romantic', icon: '💕' },
  { id: 'surprise', label: 'Surprise Me ✨', icon: '🌍' },
]

export default function DreamTripModal({ isOpen, onClose, coupleId, partnerName, onTripCreated }) {
  const router = useRouter()
  const [step, setStep] = useState('intro') // intro | vibe | chat | saving
  const [selectedVibe, setSelectedVibe] = useState(null)
  const [destination, setDestination] = useState('')
  const [freeform, setFreeform] = useState('')
  const [wanderMessage, setWanderMessage] = useState('')
  const [loadingWander, setLoadingWander] = useState(false)
  const [conversation, setConversation] = useState([])
  const [userInput, setUserInput] = useState('')
  const [saving, setSaving] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation, wanderMessage])

  useEffect(() => {
    if (!isOpen) {
      setStep('intro')
      setSelectedVibe(null)
      setDestination('')
      setFreeform('')
      setWanderMessage('')
      setConversation([])
      setUserInput('')
    }
  }, [isOpen])

  const callWander = async (action, extra = {}) => {
    setLoadingWander(true)
    try {
      const res = await fetch('/api/trips/wander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          coupleId,
          destination: destination || extra.destination,
          vibe: selectedVibe || extra.vibe,
          freeform: extra.freeform,
          conversation,
        })
      })
      const data = await res.json()
      return data
    } catch (err) {
      console.error('Wander error:', err)
      return null
    } finally {
      setLoadingWander(false)
    }
  }

  const handleVibeSelect = async (vibe) => {
    setSelectedVibe(vibe.id)

    // If surprise, let Wander pick the destination
    if (vibe.id === 'surprise') {
      const data = await callWander('surprise', { vibe: vibe.id })
      if (data?.text) {
        setWanderMessage(data.text)
        setDestination('Somewhere Special')
      }
      setStep('chat')
      return
    }

    // Get Wander's opening
    const data = await callWander('opening', { vibe: vibe.id, destination })
    if (data?.text) {
      setWanderMessage(data.text)
      setConversation([{ role: 'assistant', content: data.text }])
    }
    setStep('chat')
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || loadingWander) return

    const newConversation = [
      ...conversation,
      { role: 'user', content: userInput }
    ]
    setConversation(newConversation)
    setUserInput('')

    const data = await callWander('chat', { freeform: userInput })
    if (data?.text) {
      setConversation(prev => [...prev, { role: 'assistant', content: data.text }])
    }
  }

  const handleSaveDream = async () => {
    if (saving) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Generate narrative
      const narrativeData = await callWander('narrative')
      const narrative = narrativeData?.text || ''

      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          couple_id: coupleId,
          created_by: user.id,
          destination: destination || 'Dream Destination',
          start_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          trip_type: selectedVibe === 'surprise' ? 'mixed' :
                     selectedVibe === 'beaches' ? 'relaxation' :
                     selectedVibe === 'mountains' || selectedVibe === 'adventure' ? 'adventure' :
                     selectedVibe === 'romantic' ? 'romantic' : 'cultural',
          budget_level: 2,
          description: freeform || null,
          status: 'upcoming',
          is_dream: true,
          dream_vibe: selectedVibe,
          dream_narrative: narrative,
          dream_conversation: conversation,
        })
        .select()
        .single()

      if (error) throw error

      onTripCreated()
      router.push(`/trips/${trip.id}`)
    } catch (err) {
      console.error('Save dream error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end justify-center">
      <div className="bg-[#0F0B2E] w-full max-w-lg max-h-[calc(100vh-80px)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B5CE7] to-[#3D3580] flex items-center justify-center text-xl">
              🌍
            </div>
            <div>
              <p className="text-white font-bold text-base">Wander</p>
              <p className="text-purple-300 text-xs">Your AI travel companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* INTRO STEP */}
        {step === 'intro' && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="text-center mb-8 mt-4">
              <p className="text-purple-200 text-sm leading-relaxed italic">
                &quot;Oh good, you found me. I&apos;ve been waiting to take someone somewhere extraordinary.
                But first — tell me something.&quot;
              </p>
              <p className="text-white/40 text-xs mt-2">— Wander</p>
            </div>

            <div className="mb-6">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                Have a destination in mind?
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Tokyo, Portugal, anywhere... or leave blank"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                What&apos;s the vibe?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {vibes.map(vibe => (
                  <button
                    key={vibe.id}
                    onClick={() => handleVibeSelect(vibe)}
                    disabled={loadingWander}
                    className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400 rounded-2xl text-left transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl">{vibe.icon}</span>
                    <span className="text-white text-sm font-medium">{vibe.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loadingWander && (
              <div className="text-center mt-8">
                <div className="inline-flex items-center gap-2 text-purple-300 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Wander is thinking...
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHAT STEP */}
        {step === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {/* Wander opening / surprise message */}
              {wanderMessage && conversation.length === 0 && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B5CE7] to-[#3D3580] flex items-center justify-center text-sm flex-shrink-0 mt-1">
                    🌍
                  </div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-white text-sm leading-relaxed">{wanderMessage}</p>
                  </div>
                </div>
              )}

              {/* Conversation history */}
              {conversation.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B5CE7] to-[#3D3580] flex items-center justify-center text-sm flex-shrink-0 mt-1">
                      🌍
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-[#E8614D] text-white rounded-tr-sm'
                      : 'bg-white/10 text-white rounded-tl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {loadingWander && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B5CE7] to-[#3D3580] flex items-center justify-center text-sm flex-shrink-0">
                    🌍
                  </div>
                  <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Tell Wander more..."
                  className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || loadingWander}
                  className="w-10 h-10 bg-[#E8614D] rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                >
                  ↑
                </button>
              </div>
              <button
                onClick={handleSaveDream}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-[#6B5CE7] to-[#3D3580] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving your dream...
                  </>
                ) : (
                  '✨ Save This Dream Trip'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
