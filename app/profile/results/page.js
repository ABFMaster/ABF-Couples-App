'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function ProfileResultsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/profile/assessment/results') }, [router])
  return null
}
