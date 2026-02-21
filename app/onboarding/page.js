'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Onboarding flow redirector
 *
 * This page redirects users to the appropriate onboarding step:
 * 1. If not authenticated → /login
 * 2. If individual profile not completed → /profile (Who I Am)
 * 3. If no couple → /dashboard (they can explore, connect later)
 * 4. If partner connected but relationship assessment not done → /assessment
 * 5. If everything completed → /dashboard
 */
export default function OnboardingRedirect() {
  const router = useRouter()
  const [status, setStatus] = useState('Checking your progress...')

  useEffect(() => {
    checkOnboardingStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Check if user has completed their individual profile assessment
      setStatus('Loading your profile...')
      const { data: individualProfile } = await supabase
        .from('relationship_assessments')
        .select('completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!individualProfile) {
        // No completed assessment - go to profile first
        router.push('/profile')
        return
      }

      // Check couple status
      setStatus('Checking connection...')
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleError || !coupleData) {
        // No couple yet - go to dashboard (they can explore and connect later)
        router.push('/dashboard')
        return
      }

      // Check if user has a partner connected
      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      const hasPartner = !!partnerId

      if (!hasPartner) {
        // Couple exists but no partner connected yet
        router.push('/dashboard')
        return
      }

      // Check for completed relationship assessment
      setStatus('Loading your assessment...')
      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!assessment) {
        // Partner connected but no completed relationship assessment
        // Redirect to assessment
        router.push('/assessment')
        return
      }

      // Everything is done - go to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Error checking onboarding status:', err)
      // Default to dashboard
      router.push('/dashboard')
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
