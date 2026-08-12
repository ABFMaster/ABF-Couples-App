'use client'
import { useEffect, useState } from 'react'
import BottomNav from './BottomNav'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/dates'

// PWA home-screen badge (navigator.setAppBadge) + in-app per-section dots.
// Added Aug 12 2026 — Matt: "we used to have red dot alerts in app based on
// section, but it seems to have broken over time and I no longer see them"
// plus a request to add the real OS-level home-screen badge. Home tab's
// Spark/Bet logic below is unchanged; Us and Game Room are new.
export default function NavBadges() {
  const [todayHasBadge, setTodayHasBadge] = useState(false)
  const [usHasBadge, setUsHasBadge] = useState(false)
  const [gameRoomHasBadge, setGameRoomHasBadge] = useState(false)

  useEffect(() => {
    // Home (Spark/Bet) — unchanged logic, just extracted to its own function
    // so an early "found it" doesn't short-circuit the Us/Game Room checks
    // that used to share this function via early `return`.
    async function checkHomeBadge(user, couple, partnerId, session) {
      const today = new Date().toISOString().split('T')[0]

      const { data: spark } = await supabase
        .from('sparks')
        .select('id')
        .eq('couple_id', couple.id)
        .eq('spark_date', today)
        .maybeSingle()

      if (spark) {
        const { data: responses } = await supabase
          .from('spark_responses')
          .select('user_id, responded_at, reaction_icon')
          .eq('spark_id', spark.id)

        const mine = responses?.find(r => r.user_id === user.id)
        const theirs = responses?.find(r => r.user_id === partnerId)

        if (theirs?.responded_at && !mine?.responded_at) return true
        if (theirs?.responded_at && mine?.responded_at && !mine?.reaction_icon) return true
      }

      if (!session) return false
      try {
        const res = await fetch(`/api/bet/today?userId=${user.id}&coupleId=${couple.id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        const betData = await res.json()
        if (betData.betDay) {
          const { mine, theirs } = betData
          const neitherAnswered = !mine && !theirs
          const partnerAnsweredIMissed = theirs && !mine
          const bothAnsweredRevealUnseen = mine && theirs && !mine.nora_reaction
          if (neitherAnswered || partnerAnsweredIMissed || bothAnsweredRevealUnseen) return true
        }
      } catch {}

      return false
    }

    // Us — badge when a Weekly Reflection is ready and this user hasn't
    // viewed it yet. Mirrors the "current or last week" staleness window
    // from app/api/reflection/status/route.js so this doesn't badge on a
    // stale reflection the status route would refuse to serve anyway.
    async function checkUsBadge(user, couple) {
      const { data: reflection } = await supabase
        .from('weekly_reflections')
        .select('week_start, viewed_by_user1, viewed_by_user2')
        .eq('couple_id', couple.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!reflection) return false

      const currentWeekStart = getWeekStart()
      const lastWeekStart = (() => {
        const d = new Date(currentWeekStart + 'T12:00:00')
        d.setDate(d.getDate() - 7)
        return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
      })()
      const isCurrentOrLastWeek = reflection.week_start === currentWeekStart || reflection.week_start === lastWeekStart
      if (!isCurrentOrLastWeek) return false

      const viewed = couple.user1_id === user.id ? reflection.viewed_by_user1 : reflection.viewed_by_user2
      return !viewed
    }

    // Game Room — badge when the partner is sitting in a lobby waiting on
    // this user to join. Mirrors app/api/game-room/enter-lobby/route.js's
    // own 30-minute staleness window so this doesn't badge on an
    // abandoned lobby that route would already treat as expired.
    async function checkGameRoomBadge(user, couple) {
      const { data: lobbySessions } = await supabase
        .from('game_sessions')
        .select('user1_in_lobby, user2_in_lobby, updated_at')
        .eq('couple_id', couple.id)
        .eq('status', 'lobby')
        .gt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      if (!lobbySessions?.length) return false

      const isUser1 = couple.user1_id === user.id
      return lobbySessions.some(s => {
        const partnerIn = isUser1 ? s.user2_in_lobby : s.user1_in_lobby
        const mineIn = isUser1 ? s.user1_in_lobby : s.user2_in_lobby
        return partnerIn && !mineIn
      })
    }

    async function checkBadge() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) return

      const isUser1 = couple.user1_id === user.id
      const partnerId = isUser1 ? couple.user2_id : couple.user1_id
      const { data: { session } } = await supabase.auth.getSession()

      const [home, us, gameRoom] = await Promise.all([
        checkHomeBadge(user, couple, partnerId, session),
        checkUsBadge(user, couple),
        checkGameRoomBadge(user, couple),
      ])

      setTodayHasBadge(home)
      setUsHasBadge(us)
      setGameRoomHasBadge(gameRoom)
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

  // Real OS-level home-screen badge (iOS 16.4+/Android PWA, installed to
  // home screen only). Syncs whenever any in-app badge state changes so the
  // icon reflects current state the moment the app is foregrounded, on top
  // of whatever a push notification may have already set while backgrounded.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return
    const total = [todayHasBadge, usHasBadge, gameRoomHasBadge].filter(Boolean).length
    try {
      if (total > 0) navigator.setAppBadge(total).catch(() => {})
      else navigator.clearAppBadge().catch(() => {})
    } catch {}
  }, [todayHasBadge, usHasBadge, gameRoomHasBadge])

  return <BottomNav badgeTabs={{ home: todayHasBadge, us: usHasBadge, 'game room': gameRoomHasBadge }} />
}
