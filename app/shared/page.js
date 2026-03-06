'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SharedRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/us') }, [router])
  return null
}
