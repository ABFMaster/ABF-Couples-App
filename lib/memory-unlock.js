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
import { MEMORY_UNLOCK, MEMORY_UNLOCK_COPY } from './challenge-prompts'

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

// Check-on-write notifier — call this (fire-and-forget, same pattern as
// updateNoraMemory(...).catch(() => {}) elsewhere in the app) from any
// route whose write can move a couple's unlock inputs: timeline/event,
// spark/respond, bet/respond. checkMemoryUnlocked() itself is cheap (3
// count queries + 1 row read) so re-running it on every relevant write is
// fine; the couples.memory_unlock_notified_at column is what keeps this
// from re-notifying on every write after the first unlock.
//
// Known gap, accepted for v1: age-based unlocking with no new write
// (a couple that already had enough timeline/Spark/Bet activity and was
// only waiting on account age) won't get notified until their next
// timeline/Spark/Bet write happens to land after the age threshold passes
// — there's no time-based sweep. Cheap to add later (a daily cron check)
// if that turns out to matter in practice; not worth the complexity for
// v1 given every couple is already generating this activity regularly.
//
// MEMORY_UNLOCK_COPY was drafted (lib/challenge-prompts.js) during the
// original Memory Test build but never wired to anything — flagged during
// the Aug 5 2026 audit, wired in here per Matt's decision the same day.
export async function notifyIfMemoryJustUnlocked(supabase, coupleId) {
  if (!coupleId) return

  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id, memory_unlock_notified_at')
    .eq('id', coupleId)
    .maybeSingle()

  if (!couple || couple.memory_unlock_notified_at) return

  const { unlocked } = await checkMemoryUnlocked(supabase, coupleId)
  if (!unlocked) return

  // Claim the notification first (before sending) so a rare double-write
  // race can't send the push twice — worst case on a race is zero sends
  // instead of two, which is the safer failure direction for a push.
  const { data: claimed } = await supabase
    .from('couples')
    .update({ memory_unlock_notified_at: new Date().toISOString() })
    .eq('id', coupleId)
    .is('memory_unlock_notified_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) return // another concurrent write already claimed it

  const sendOne = async (userId) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({
          userId,
          title: MEMORY_UNLOCK_COPY.title,
          body: MEMORY_UNLOCK_COPY.body,
          url: '/game-room',
          route: 'memory-unlock',
        }),
      })
    } catch (err) {
      console.error('[notifyIfMemoryJustUnlocked] push failed:', userId, err)
    }
  }

  await Promise.all([sendOne(couple.user1_id), sendOne(couple.user2_id)])
}
