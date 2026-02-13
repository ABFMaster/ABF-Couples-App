'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Onboarding flow redirector
 *
 * This page redirects users to the appropriate onboarding step:
 * 1. If not authenticated → /login
 * 2. If no couple → /connect
 * 3. If assessment not completed → /assessment
 * 4. If assessment completed → /dashboard or /assessment/results
 */
export default function OnboardingRedirect() {
  const router = useRouter()
  const [status, setStatus] = useState('Checking your progress...')

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Check authentication
      setStatus('Verifying your account...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      // Check couple status
      setStatus('Checking connection...')
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      if (coupleError || !coupleData) {
        // No couple - go to connect page
        router.push('/connect')
        return
      }

      // Check if user has a partner connected
      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      const hasPartner = !!partnerId

      // Check for completed assessment
      setStatus('Loading your assessment...')
      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (assessment) {
        // Assessment completed - check if partner has completed too
        if (hasPartner) {
          const { data: partnerAssessment } = await supabase
            .from('relationship_assessments')
            .select('completed_at')
            .eq('user_id', partnerId)
            .eq('couple_id', coupleData.id)
            .not('completed_at', 'is', null)
            .single()

          if (partnerAssessment) {
            // Both completed - go to results
            router.push('/assessment/results')
            return
          }
        }
        // User completed but partner hasn't - go to results with waiting state
        router.push('/assessment/results')
        return
      }

      // No completed assessment - start/continue assessment
      router.push('/assessment')
    } catch (err) {
      console.error('Error checking onboarding status:', err)
      // Default to assessment page
      router.push('/assessment')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mx-auto mb-6"></div>
        <p className="text-[#6B7280] text-lg font-medium">{status}</p>
        <p className="text-[#9CA3AF] text-sm mt-2">Please wait...</p>
      </div>
    </div>
  )
}
