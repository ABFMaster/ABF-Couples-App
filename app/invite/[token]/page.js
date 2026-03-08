'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function InvitePreviewPage() {
  const { token } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data, error } = await supabaseAnon
        .from('invite_previews')
        .select('sender_name, prompt, reaction, note')
        .eq('id', token)
        .maybeSingle()

      if (error || !data) {
        setNotFound(true)
      } else {
        setInvite(data)
      }
      setLoading(false)
    })()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-[18px] text-neutral-700 mb-2"
             style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            This link has expired
          </p>
          <p className="text-[14px] text-neutral-400">Ask your partner to send a new one.</p>
        </div>
      </div>
    )
  }

  const senderName = invite.sender_name || 'Someone special'
  const firstName = senderName.split(' ')[0]

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="px-6 pt-12 pb-16 max-w-md mx-auto space-y-6">

        {/* Hero card — purple gradient */}
        <div className="bg-gradient-to-br from-[#252048] via-[#3E3585] to-[#6B4A72] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#E8614D]/10 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40">From {firstName}</span>
            </div>

            {invite.prompt && (
              <p className="text-white text-[18px] leading-[1.45] mb-4"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {invite.prompt}
              </p>
            )}

            {invite.reaction && (
              <div className="flex items-center gap-3 mt-2">
                <span className="px-4 py-2 rounded-full text-[13px] font-semibold bg-[#E8614D] text-white">
                  {invite.reaction}
                </span>
                {invite.note && (
                  <span className="text-white/60 text-[13px]">— {invite.note}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Framing copy */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-3">
          <p className="text-[20px] text-neutral-900 leading-snug"
             style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            {firstName} is thinking about you
          </p>
          <p className="text-[15px] text-neutral-500 leading-relaxed">
            ABF helps couples stay connected with daily reflections, shared goals, and a relationship coach who knows you both.
          </p>
          <p className="text-[14px] text-neutral-400">
            Join {firstName} — your profiles link automatically.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full py-4 rounded-2xl bg-[#E8614D] text-white text-[16px] font-semibold text-center active:scale-[0.98] transition-transform"
        >
          Join {firstName} on ABF
        </button>

        {/* Already have account */}
        <button
          onClick={() => router.push('/login')}
          className="w-full text-center text-[14px] text-neutral-400 py-2"
        >
          Already have an account? Sign in
        </button>

      </div>
    </div>
  )
}
