// Memory Test eligibility check — shared by server-side enforcement
// (game-room/challenge/confirm-type) and the client-side tile UI
// (app/game-room/page.js) so they can never drift out of sync.
//
// Design intent (see Sessions/PRODUCT_BACKLOG.md, July 31 2026): Memory
// Test needs real shared history to draw on — a couple with nothing in
// the app yet would just get generic questions. The gate gives that
// history time to accumulate before the mode unlocks.
//
// Couple-scoped, not per-user: all three signals (timeline, Spark+Bet
// activity, time together in the app) describe the couple as a unit, not
// either partner individually. The original dead route checked a single
// user's account age via user_profiles — this uses couples.created_at
// instead, which is both more correct and fixes a real bug (it queried
// user_profiles.id instead of user_profiles.user_id, so the age check
// could never actually pass).
import { MEMORY_UNLOCK } from './challenge-prompts'

export async function checkMemoryUnlocked(supabase, coupleId) {
  if (!coupleId) return { unlocked: false, timelineCount: 0, sparkBetCount: 0, ageWeeks: 0 }

  const [
    { count: timelineCount },
    { count: sparkCount },
    { count: betCount },
    { data: couple },
  ] = await Promise.all([
    supabase.from('timeline_events').select('*', { count: 'exact', head: true }).eq('couple_id', coupleId),
    supabase.from('spark_responses').select('*', { count: 'exact', head: true }).eq('couple_id', coupleId),
    supabase.from('bet_responses').select('*', { count: 'exact', head: true }).eq('couple_id', coupleId),
    supabase.from('couples').select('created_at').eq('id', coupleId).maybeSingle(),
  ])

  const sparkBetCount = (sparkCount || 0) + (betCount || 0)
  const ageWeeks = couple?.created_at
    ? (Date.now() - new Date(couple.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
    : 0

  const unlocked =
    (timelineCount || 0) >= MEMORY_UNLOCK.minTimelineEvents &&
    sparkBetCount >= MEMORY_UNLOCK.minSparkBetResponses &&
    ageWeeks >= MEMORY_UNLOCK.minAccountAgeWeeks

  return { unlocked, timelineCount: timelineCount || 0, sparkBetCount, ageWeeks }
}
