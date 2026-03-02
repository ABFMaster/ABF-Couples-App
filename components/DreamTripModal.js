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
  const [step, setStep] = useState('intro') // intro | chat
  const [selectedVibe, setSelectedVibe] = useState(null)
  const [destination, setDestination] = useState('')
  const [resolvedDestination, setResolvedDestination] = useState('')
  const [freeform, setFreeform] = useState('')
  const [wanderMessage, setWanderMessage] = useState('')
  const [loadingWander, setLoadingWander] = useState(false)
  const [conversation, setConversation] = useState([])
  const [userInput, setUserInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [conversationStage, setConversationStage] = useState(0)
  // 0 = opening, 1 = follow-up, 2 = destination confirmed, 3 = narrative shown, 4 = itinerary shown
  const [inlineNarrative, setInlineNarrative] = useState(null)
  const [inlineItinerary, setInlineItinerary] = useState(null)
  const [generatingNarrative, setGeneratingNarrative] = useState(false)
  const [generatingItinerary, setGeneratingItinerary] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation, wanderMessage, inlineNarrative, inlineItinerary])

  useEffect(() => {
    if (!isOpen) {
      setStep('intro')
      setSelectedVibe(null)
      setDestination('')
      setResolvedDestination('')
      setFreeform('')
      setWanderMessage('')
      setConversation([])
      setUserInput('')
      setConversationStage(0)
      setInlineNarrative(null)
      setInlineItinerary(null)
      setGeneratingNarrative(false)
      setGeneratingItinerary(false)
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
          conversation: extra.conversation || conversation,
          stage: extra.stage !== undefined ? extra.stage : conversationStage,
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
        const openingConvo = [{ role: 'assistant', content: data.text }]
        setConversation(openingConvo)
        setDestination('Somewhere Special')
        setStep('chat')

        // Extract the real destination from Wander's response
        const destData = await callWander('extract_destination', {
          freeform: data.text,
        })
        if (destData?.text) {
          setResolvedDestination(destData.text.trim())
          setDestination(destData.text.trim())
        }

        // Auto follow-up after short pause
        await new Promise(r => setTimeout(r, 1800))
        const followUp = await callWander('chat', {
          freeform: 'Ask ONE excited follow-up question about travel style for this specific destination. Under 25 words. End with a question mark.',
          conversation: openingConvo,
          stage: 1,
        })
        if (followUp?.text) {
          setConversation(prev => [...prev, { role: 'assistant', content: followUp.text }])
        }
      }
      setConversationStage(1)
      return
    }

    // Get Wander's opening
    const data = await callWander('opening', { vibe: vibe.id, destination })
    if (data?.text) {
      const openingConvo = [{ role: 'assistant', content: data.text }]
      setConversation(openingConvo)
      setStep('chat')

      // Extract destination from Wander's opening if not provided
      if (!destination.trim()) {
        const destData = await callWander('extract_destination', {
          freeform: data.text,
        })
        if (destData?.text) {
          const extracted = destData.text.trim()
          setDestination(extracted)
          setResolvedDestination(extracted)
        }
      }

    }
    setConversationStage(1)
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || loadingWander) return

    const newUserMsg = { role: 'user', content: userInput }
    const updatedConversation = [...conversation, newUserMsg]
    setConversation(updatedConversation)
    setUserInput('')
    const nextStage = conversationStage + 1
    setConversationStage(nextStage)

    if (nextStage >= 3 && !inlineNarrative) {
      // Final exchange — Wander wraps up and auto-generates narrative
      const data = await callWander('chat', {
        freeform: `The user said: "${userInput}". React warmly in 1-2 sentences then say "I have everything I need. Let me show you what I'm seeing..." — that's your closing line, word for word.`,
        conversation: updatedConversation,
        stage: nextStage,
      })
      if (data?.text) {
        setConversation(prev => [...prev, { role: 'assistant', content: data.text }])
      }

      // Auto-generate narrative after short pause
      setGeneratingNarrative(true)
      await new Promise(r => setTimeout(r, 1200))
      const narrativeData = await callWander('narrative', {
        conversation: updatedConversation,
      })
      if (narrativeData?.text) {
        setInlineNarrative(narrativeData.text)
        setConversationStage(3)
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: "I can see it perfectly. Here's where I'm taking you two:",
        }])
      }
      setGeneratingNarrative(false)
      return
    }

    // Round 1 reply — Wander asks follow-up question
    const data = await callWander('chat', {
      freeform: `The user said: "${userInput}". React in 1 warm sentence then ask ONE specific follow-up question about their travel style or preferences for this trip. Keep the whole response under 50 words.`,
      conversation: updatedConversation,
      stage: nextStage,
    })
    if (data?.text) {
      setConversation(prev => [...prev, { role: 'assistant', content: data.text }])
    }
  }

  const handleBuildItinerary = async () => {
    if (generatingItinerary) return
    setGeneratingItinerary(true)
    setConversation(prev => [...prev, {
      role: 'assistant',
      content: "Alright. Let me build you the full picture — every day, every moment. Give me a second."
    }])

    const data = await callWander('itinerary', { conversation })
    if (data?.itinerary) {
      setInlineItinerary(data.itinerary)
      setConversationStage(4)
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: data.itinerary.wanderNote || "There it is. Your trip. Now go have it."
      }])
    }
    setGeneratingItinerary(false)
  }

  const handleSaveDream = async () => {
    if (saving) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Use inline narrative if available, otherwise generate one
      let narrative = inlineNarrative
      if (!narrative) {
        const narrativeData = await callWander('narrative')
        narrative = narrativeData?.text || ''
      }

      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          couple_id: coupleId,
          created_by: user.id,
          destination: resolvedDestination || destination || 'Dream Destination',
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
          dream_narrative: inlineNarrative || null,
          dream_itinerary: inlineItinerary || null,
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
      <div className="bg-[#0F0B2E] w-full max-w-lg h-[calc(100vh-80px)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">

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
              {/* Conversation history */}
              {conversation.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B5CE7] to-[#3D3580] flex items-center justify-center text-sm flex-shrink-0 mt-1">
                      🌍
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${msg.role === 'user' ? 'bg-[#E8614D] text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Inline narrative card — appears after stage 3 */}
              {inlineNarrative && (
                <div className="mx-2 bg-gradient-to-br from-[#1a1545] to-[#0F0B2E] border border-purple-500/30 rounded-2xl p-5">
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
                    ✨ Your Dream Trip
                  </p>
                  <p className="text-white text-sm leading-relaxed italic">
                    {inlineNarrative}
                  </p>
                  {!inlineItinerary && !generatingItinerary && (
                    <button
                      onClick={handleBuildItinerary}
                      className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 border border-purple-400/40 text-purple-200 text-sm font-semibold rounded-xl transition-all"
                    >
                      Build the full day-by-day →
                    </button>
                  )}
                  {generatingItinerary && (
                    <div className="mt-4 flex items-center gap-2 text-purple-300 text-sm">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      Wander is crafting every detail...
                    </div>
                  )}
                </div>
              )}

              {/* Inline itinerary — appears after stage 4 */}
              {inlineItinerary && (
                <div className="mx-2 bg-gradient-to-br from-[#1a1545] to-[#0F0B2E] border border-purple-500/30 rounded-2xl p-5">
                  <p className="text-white font-bold text-base mb-4">
                    {inlineItinerary.title}
                  </p>
                  {(inlineItinerary.days || []).map((day, i) => (
                    <div key={i} className="mb-4">
                      <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
                        Day {day.day} — {day.title}
                      </p>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {day.narrative}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Narrative generating indicator */}
              {generatingNarrative && (
                <div className="mx-2 flex items-center gap-2 text-purple-300 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Wander is painting the picture...
                </div>
              )}

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
                disabled={saving || conversationStage < 1}
                className={`w-full py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${conversationStage >= 3 ? 'bg-gradient-to-r from-[#6B5CE7] to-[#3D3580] text-white' : 'bg-white/5 text-white/30 border border-white/10'} disabled:opacity-40`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving your dream...
                  </>
                ) : conversationStage >= 3 ? (
                  '✨ Save This Dream Trip'
                ) : (
                  '✨ Save anytime'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
