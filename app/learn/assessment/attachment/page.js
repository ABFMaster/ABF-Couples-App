'use client'

/**
 * Standalone Attachment Style Assessment
 *
 * DB migration (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS attachment_assessments (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *     answers jsonb NOT NULL,
 *     primary_style text NOT NULL,
 *     secondary_style text,
 *     counts jsonb,
 *     completed_at timestamptz DEFAULT now() NOT NULL
 *   );
 *   ALTER TABLE attachment_assessments ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users manage own attachment assessments" ON attachment_assessments
 *     FOR ALL USING (auth.uid() = user_id);
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_MODULES, ASSESSMENT_QUESTIONS, scoreAttachmentStyle } from '@/lib/relationship-questions'

const MODULE = ASSESSMENT_MODULES.find(m => m.id === 'attachment_style')
const QUESTIONS = ASSESSMENT_QUESTIONS.attachment_style

export default function AttachmentAssessmentPage() {
  const router = useRouter()
  const [phase, setPhase] = useState('intro') // 'intro' | 'quiz' | 'results'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentQuestion = QUESTIONS[currentIndex]
  const progress = Math.round((currentIndex / QUESTIONS.length) * 100)
  const selectedOption = answers[currentQuestion?.id]

  const handleSelect = useCallback((option) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))
  }, [currentQuestion?.id])

  const handleNext = useCallback(() => {
    if (!selectedOption) return
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      const scored = scoreAttachmentStyle(answers)
      setResult(scored)
      setPhase('results')
    }
  }, [selectedOption, currentIndex, answers])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }, [currentIndex])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await supabase.from('attachment_assessments').insert({
        user_id: user.id,
        answers,
        primary_style: result.primary,
        secondary_style: result.secondary,
        counts: result.counts,
        completed_at: new Date().toISOString(),
      })
      setSaved(true)
    } catch {
      // Table may not exist yet — fail silently, user still sees results
    } finally {
      setSaving(false)
    }
  }

  // ── Intro screen ──────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex flex-col">
        <div className="max-w-2xl mx-auto px-4 py-12 w-full flex-1 flex flex-col">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] mb-8 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span>Back to Learn</span>
          </button>

          <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex-1 flex flex-col">
            <div className={`bg-gradient-to-r ${MODULE.color} p-8 text-white`}>
              <div className="text-6xl mb-4">{MODULE.icon}</div>
              <h1 className="text-3xl font-bold mb-2">{MODULE.title}</h1>
              <p className="text-white/80 text-lg">{MODULE.description}</p>
            </div>

            <div className="p-8 flex flex-col flex-1">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#F8F6F3] rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#2D3648]">{MODULE.questionCount}</div>
                  <div className="text-sm text-[#6B7280]">questions</div>
                </div>
                <div className="bg-[#F8F6F3] rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#2D3648]">{MODULE.estimatedMinutes}</div>
                  <div className="text-sm text-[#6B7280]">minutes</div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="font-semibold text-[#2D3648] mb-3">You'll discover your…</h2>
                <ul className="space-y-2">
                  {['Primary attachment style (Secure, Anxious, Avoidant, or Fearful)', 'How your style shows up in conflict, closeness, and vulnerability', 'Strengths of your style and your personal growth edge', 'A coach insight tailored to your pattern'].map(item => (
                    <li key={item} className="flex items-start gap-2 text-[#6B7280]">
                      <span className="text-violet-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-[#9CA3AF] mb-8">{MODULE.researchBasis}</p>

              <button onClick={() => setPhase('quiz')} className={`w-full bg-gradient-to-r ${MODULE.color} text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg mt-auto`}>
                Start Assessment →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ───────────────────────────────────────────────
  if (phase === 'quiz') {
    return (
      <div className="min-h-screen bg-[#F8F6F3]">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E5E2DD] z-50">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${MODULE.bgColor} flex items-center justify-center`}>
                <span className="text-xl">{MODULE.icon}</span>
              </div>
              <div>
                <p className={`text-sm font-medium ${MODULE.textColor}`}>{MODULE.shortTitle}</p>
                <p className="text-[#9CA3AF] text-sm">Question {currentIndex + 1} of {QUESTIONS.length}</p>
              </div>
            </div>
            <button onClick={() => router.back()} className="text-[#9CA3AF] hover:text-[#6B7280] text-sm transition-colors">Exit</button>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-[#E5E2DD] mb-8">
            <h2 className="text-2xl font-bold text-[#2D3648] mb-8 leading-relaxed">{currentQuestion.question}</h2>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption?.value === option.value
                return (
                  <button key={option.value} onClick={() => handleSelect(option)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-violet-500 bg-violet-50' : 'border-[#E5E2DD] hover:border-violet-300 hover:bg-[#F8F6F3]'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-[#E5E2DD]'}`}>
                        {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-base leading-snug ${isSelected ? 'text-[#2D3648] font-medium' : 'text-[#6B7280]'}`}>{option.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={handlePrevious} disabled={currentIndex === 0} className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span>Previous</span>
            </button>
            <button onClick={handleNext} disabled={!selectedOption} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
              <span>{currentIndex === QUESTIONS.length - 1 ? 'See My Style' : 'Next'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Results screen ────────────────────────────────────────────
  if (phase === 'results' && result) {
    const { profile, secondaryProfile, counts, primary } = result
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    const styleLabels = {
      secure: 'Secure',
      anxious: 'Anxious',
      avoidant: 'Avoidant',
      fearful: 'Fearful-Avoidant',
    }
    const styleColors = {
      secure: 'bg-emerald-100 text-emerald-700',
      anxious: 'bg-amber-100 text-amber-700',
      avoidant: 'bg-blue-100 text-blue-700',
      fearful: 'bg-purple-100 text-purple-700',
    }

    return (
      <div className="min-h-screen bg-[#F8F6F3]">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Result header */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-6">
            <div className="p-8 text-center" style={{ background: `linear-gradient(135deg, ${profile.color}22, ${profile.color}11)`, borderBottom: `4px solid ${profile.color}` }}>
              <div className="text-7xl mb-4">{profile.emoji}</div>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3" style={{ background: `${profile.color}22`, color: profile.color }}>Your Attachment Style</div>
              <h1 className="text-3xl font-bold text-[#2D3648] mb-3">{profile.label}</h1>
              <p className="text-[#6B7280] text-lg italic leading-relaxed">&ldquo;{profile.tagline}&rdquo;</p>
            </div>

            <div className="p-8">
              <p className="text-[#4B5563] leading-relaxed mb-8">{profile.summary}</p>

              {/* Breakdown bar */}
              <div className="mb-8">
                <h3 className="font-semibold text-[#2D3648] mb-3 text-sm uppercase tracking-wide">Your Style Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
                    <div key={style} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-[#6B7280] text-right">{styleLabels[style]}</span>
                      <div className="flex-1 bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round((count / total) * 100)}%`, background: style === primary ? profile.color : '#D1D5DB' }} />
                      </div>
                      <span className="w-10 text-sm font-medium text-[#6B7280]">{Math.round((count / total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="mb-6">
                <h3 className="font-semibold text-[#2D3648] mb-3">Your Strengths</h3>
                <ul className="space-y-2">
                  {profile.strengths.map(s => (
                    <li key={s} className="flex items-start gap-2 text-[#6B7280]">
                      <span className="mt-0.5" style={{ color: profile.color }}>✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth edge */}
              <div className="bg-[#F8F6F3] rounded-2xl p-5 mb-6">
                <h3 className="font-semibold text-[#2D3648] mb-2">Your Growth Edge</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{profile.growth}</p>
              </div>

              {/* Coach insight */}
              <div className="rounded-2xl p-5 mb-6" style={{ background: `${profile.color}11`, border: `1px solid ${profile.color}33` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h3 className="font-semibold text-[#2D3648] mb-1 text-sm">Coach Insight</h3>
                    <p className="text-[#4B5563] text-sm leading-relaxed">{profile.coachInsight}</p>
                  </div>
                </div>
              </div>

              {/* Secondary style note */}
              {secondaryProfile && counts[result.secondary] > 0 && (
                <div className="border border-[#E5E2DD] rounded-2xl p-5 mb-6">
                  <h3 className="font-semibold text-[#2D3648] mb-1 text-sm">Secondary Influence: {secondaryProfile.label}</h3>
                  <p className="text-[#6B7280] text-sm">{secondaryProfile.tagline} You may notice traits of this style surfacing especially under stress.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-8">
                <button onClick={handleSave} disabled={saving || saved} className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${saved ? 'bg-emerald-100 text-emerald-700' : 'text-white hover:opacity-90 shadow-lg'}`} style={saved ? {} : { background: `linear-gradient(135deg, ${profile.color}, ${profile.color}cc)` }}>
                  {saved ? '✓ Saved to My Profile' : saving ? 'Saving…' : 'Save to My Profile →'}
                </button>
                <button onClick={() => router.push('/learn')} className="w-full py-3 rounded-2xl font-semibold text-[#6B7280] hover:text-[#2D3648] border border-[#E5E2DD] hover:border-[#C8C5C0] transition-colors">
                  Back to Learn
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[#9CA3AF] text-xs px-4">{MODULE.researchBasis}. All questions are original.</p>
        </div>
      </div>
    )
  }

  return null
}
