export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { noraReact } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { generateFollowUpPrompt } from '@/lib/nora-followup'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualId, completed, weekStart, note, retire } = await request.json()

    if (!coupleId || !ritualId || weekStart === undefined) {
      return NextResponse.json({ error: 'coupleId, ritualId, and weekStart required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Every reference to userId below is now the verified identity from the
    // session token, never the client-supplied one — no other line in this
    // function needed to change.
    const userId = user.id

    const now = new Date().toISOString()

    // Upsert completion row (unique on ritual_id + week_start)
    const { data: completion, error: completionError } = await supabase
      .from('ritual_completions')
      .upsert(
        {
          ritual_id: ritualId,
          couple_id: coupleId,
          completed_by: userId,
          week_start: weekStart,
          completed: !!completed,
          reflection_note: note || null,
          updated_at: now,
        },
        { onConflict: 'ritual_id,week_start' }
      )
      .select('*')
      .maybeSingle()

    if (completionError) {
      console.error('[ritual/checkin] upsert error:', completionError)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    // Log activity to daily_checkins
    const { getTodayString } = await import('@/lib/dates')
    const todayStr = getTodayString()
    await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        couple_id: coupleId,
        check_date: todayStr,
        question_id: ritualId || null,
        question_text: null,
        question_response: completed ? 'completed' : 'skipped',
      }, { onConflict: 'user_id,check_date' })

    // If completed, increment streak on the ritual row
    if (completed) {
      const { data: current } = await supabase
        .from('rituals')
        .select('streak')
        .eq('id', ritualId)
        .maybeSingle()

      await supabase
        .from('rituals')
        .update({ streak: (current?.streak || 0) + 1, updated_at: now })
        .eq('id', ritualId)

      supabase.from('hero_cache').delete().eq('couple_id', coupleId).then(() => {}).catch(() => {})
    }

    // "Not for us" during the discovering trial — a single person can bail
    // unilaterally, unlike retiring an already-ADOPTED ritual (which needs
    // both partners, see lib/ritual-retire.js). Root-caused separately: this
    // never actually persisted before — the client set status locally only,
    // so a reload silently un-retired it. Guarded to 'discovering' so this
    // can never be used to bypass the two-person confirm an adopted ritual
    // requires.
    if (retire) {
      const { data: currentRitual } = await supabase
        .from('rituals')
        .select('*')
        .eq('id', ritualId)
        .maybeSingle()

      if (currentRitual?.status === 'discovering') {
        const { data: retiredRitual } = await supabase
          .from('rituals')
          .update({ status: 'retired', updated_at: now })
          .eq('id', ritualId)
          .select('*')
          .maybeSingle()
        return NextResponse.json({ ritual: retiredRitual || currentRitual, completion })
      }
      return NextResponse.json({ ritual: currentRitual, completion })
    }

    // Fetch updated ritual row
    const { data: ritual } = await supabase
      .from('rituals')
      .select('*')
      .eq('id', ritualId)
      .maybeSingle()

    updateNoraMemory({
      coupleId,
      signalType: SIGNAL_TYPES.RITUAL_CHECKIN,
      inputData: {
        ritualTitle: ritual.title,
        checkedIn: true,
        streak: ritual.streak,
      },
    }).catch(() => {})

    // Root-cause fix, found while building the Talk-to-Nora CTA (task #261):
    // this prompt hardcoded "speak to them together, as 'you two'" with no
    // solo awareness at all — the earlier Ritual voice-copy fix (task #263)
    // only touched RitualCard.js's static UI strings, never this LLM-
    // generated reaction, which is the actual text a solo user has been
    // seeing every check-in. Derive isSolo the same live-off-partnerId way
    // as every other solo-arc surface.
    const { data: coupleForReaction } = await supabase
      .from('couples')
      .select('user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    const isSoloRitual = !coupleForReaction?.user2_id

    // Live Nora reaction, replacing the old static NORA_WEEK_MESSAGES lookup
    // table. Referencing the actual ritual and streak instead of generic
    // week-number copy. Persisted so a re-render never regenerates it.
    let noraReaction = null
    let noraFollowUp = ''
    try {
      const reactionPrompt = `Ritual: "${ritual.title}"${ritual.description ? ` — ${ritual.description}` : ''}
Streak: ${ritual.streak} week${ritual.streak === 1 ? '' : 's'} in
This week: ${completed ? 'they did it' : "they didn't get to it"}${note ? `\nWhat they said about it: "${note}"` : ''}

You are Nora. React to this ${isSoloRitual ? "person's" : "couple's"} ritual check-in this week${isSoloRitual ? ' — speak directly to them using "you", there is no partner here yet, never say "you two" or imply one' : ' — speak to them together, as "you two"'}. Be specific to what this ritual actually is${note ? ', and to what they said about how it went' : ''}, not a generic streak comment. If they did it, notice something real about keeping this particular ritual going. If they didn't, be light and non-judgmental — missing a week is normal, not a failure. One sentence, maximum 20 words. Never say the word "streak" out loud.`

      noraReaction = await noraReact(reactionPrompt, {
        route: 'ritual/checkin-reaction',
        context: 'daily',
        maxTokens: 60,
      })

      // Talk-to-Nora CTA (task #261) — separate call, never blocks the
      // check-in reaction on failure. See lib/nora-followup.js.
      noraFollowUp = await generateFollowUpPrompt({
        activityLabel: 'the Ritual',
        question: `How did "${ritual.title}" go this week?`,
        answer: note || (completed ? 'Completed it' : "Didn't get to it"),
        reactionText: noraReaction,
        route: 'ritual/followup',
      })

      if (noraReaction && completion?.id) {
        await supabase
          .from('ritual_completions')
          .update({ nora_reaction: noraReaction, nora_follow_up: noraFollowUp })
          .eq('id', completion.id)
      }
    } catch (reactionErr) {
      console.error('[ritual/checkin] Nora reaction error:', reactionErr)
    }

    return NextResponse.json({
      ritual,
      completion: noraReaction ? { ...completion, nora_reaction: noraReaction, nora_follow_up: noraFollowUp } : completion,
    })
  } catch (err) {
    console.error('[ritual/checkin] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
