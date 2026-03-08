'use client'
import { useEffect, useState } from 'react'
import BottomNav from './BottomNav'

export default function NavBadges() {
  const [todayHasBadge, setTodayHasBadge] = useState(false)

  useEffect(() => {
    function handleSet() { setTodayHasBadge(true) }
    function handleClear() { setTodayHasBadge(false) }
    window.addEventListener('setTodayBadge', handleSet)
    window.addEventListener('clearTodayBadge', handleClear)
    return () => {
      window.removeEventListener('setTodayBadge', handleSet)
      window.removeEventListener('clearTodayBadge', handleClear)
    }
  }, [])

  return <BottomNav badgeTabs={{ today: todayHasBadge }} />
}
