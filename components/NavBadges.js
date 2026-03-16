'use client'
import { useEffect, useState } from 'react'
import BottomNav from './BottomNav'
import { supabase } from '@/lib/supabase'

export default function NavBadges() {
  const [todayHasBadge, setTodayHasBadge] = useState(false)

  useEffect(() => {
    async function checkBadge() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) return

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const today = new Date().toISOString().split('T')[0]

      const { data: spark } = await supabase
        .from('sparks')
        .select('id')
        .eq('couple_id', couple.id)
        .eq('spark_date', today)
        .maybeSingle()

      if (!spark) {
        setTodayHasBadge(false)
        return
      }

      const { data: responses } = await supabase
        .from('spark_responses')
        .select('user_id, responded_at, reaction_icon')
        .eq('spark_id', spark.id)

      const mine = responses?.find(r => r.user_id === user.id)
      const theirs = responses?.find(r => r.user_id === partnerId)

      if (theirs?.responded_at && !mine?.responded_at) {
        setTodayHasBadge(true)
      } else if (theirs?.responded_at && mine?.responded_at && !mine?.reaction_icon) {
        setTodayHasBadge(true)
      } else {
        setTodayHasBadge(false)
      }
    }

    checkBadge()

    function handleSet() { setTodayHasBadge(true) }
    function handleClear() { setTodayHasBadge(false) }
    window.addEventListener('setTodayBadge', handleSet)
    window.addEventListener('clearTodayBadge', handleClear)

    function handleVisibility() {
      if (document.visibilityState === 'visible') checkBadge()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(checkBadge, 60000)

    return () => {
      window.removeEventListener('setTodayBadge', handleSet)
      window.removeEventListener('clearTodayBadge', handleClear)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [])

  return <BottomNav badgeTabs={{ today: todayHasBadge }} />
}
