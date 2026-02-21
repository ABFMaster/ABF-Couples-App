'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy partner insights page redirect
 *
 * This page previously showed insights based on the 18-question quiz.
 * It now redirects to the new 5-module assessment results page,
 * which includes per-module insights and partner comparisons.
 */
export default function PartnerInsightsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/assessment/results')
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-6"></div>
        <p className="text-[#6B7280] text-lg font-medium">Redirecting to insights...</p>
      </div>
    </div>
  )
}
