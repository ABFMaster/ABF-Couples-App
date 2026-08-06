export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Account deletion — Aug 5 2026 audit finding.
//
// The UI promises: "This permanently deletes your profile, relationship
// history, and all of Nora's memory. This cannot be undone." The previous
// version of this route only actually deleted 8 tables (feedback,
// push_subscriptions, daily_checkins, spark_responses, bet_responses,
// nora_memory, timeline_events, shared_items, custom_dates, sparks/bets,
// couples, user_profiles) — it silently left ~35 other tables containing
// real user data untouched, including the exact things the app's whole
// privacy pitch is built on: notebook_entries, nora_private_notes,
// nora_signals, relationship_assessments, and ai_conversations/ai_messages.
// Deleting the auth user afterward meant that data became permanently
// orphaned and unrecoverable-by-the-user (they can't log in to ask again),
// while still sitting in the database. This rewrite closes that gap.
//
// Still NOT handled here, flagged rather than guessed at:
//   - Storage objects under paths that aren't flat single-level folders
//     (e.g. `dates/{coupleId}/{dateId}/...`, `timeline/{coupleId}/...` for
//     date-detail and trip-detail photos specifically) — Supabase Storage's
//     list() isn't recursive, so cleaning these needs a small directory walk.
//     The flat ones (`relationship/`, `timeline/` used by /us and /profile,
//     `memories/`) are handled below.
//   - Whether deleting one partner's account should also erase shared couple
//     history (sparks, bets, rituals, trips, game sessions, etc.) for the
//     OTHER partner too. That's the existing, pre-this-fix behavior — this
//     rewrite makes it consistently apply to more tables, but doesn't change
//     the underlying decision. Worth a deliberate product call before launch.
export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Best-effort delete — logs failures instead of the previous fully-silent
    // swallow, without letting one bad table name/RLS block abort the rest.
    const del = async (table, build) => {
      try {
        const { error } = await build(supabase.from(table).delete())
        if (error) console.error(`[account/delete] ${table} error:`, error.message)
      } catch (e) {
        console.error(`[account/delete] ${table} threw:`, e.message)
      }
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle()

    const coupleId = couple?.id || null

    // ── AI Coach conversations (session-id chained) ──────────────────────
    const { data: myConversations } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
    const conversationIds = (myConversations || []).map(c => c.id)
    if (conversationIds.length) {
      await del('ai_messages', q => q.in('conversation_id', conversationIds))
    }
    await del('ai_conversations', q => q.eq('user_id', userId))

    // ── Strictly user-scoped tables ───────────────────────────────────────
    await del('notebook_entries', q => q.eq('user_id', userId))
    await del('nora_private_notes', q => q.eq('user_id', userId))
    await del('user_practices', q => q.eq('user_id', userId))
    await del('relationship_assessments', q => q.eq('user_id', userId))
    await del('ai_usage', q => q.eq('user_id', userId))
    await del('push_log', q => q.eq('user_id', userId))
    await del('onboarding_responses', q => q.eq('user_id', userId))
    await del('user_spotify_connections', q => q.eq('user_id', userId))
    await del('hero_cache', q => q.eq('user_id', userId))
    await del('relationship_points', q => q.eq('user_id', userId))
    await del('flirts', q => q.eq('sender_id', userId))
    await del('feedback', q => q.eq('user_id', userId))
    await del('push_subscriptions', q => q.eq('user_id', userId))
    await del('daily_checkins', q => q.eq('user_id', userId))
    await del('spark_responses', q => q.eq('user_id', userId))
    await del('bet_responses', q => q.eq('user_id', userId))
    await del('custom_dates', q => q.eq('user_id', userId))

    // ── Nora's raw signal/claim log — attributed by user_id where present,
    // couple_id where the signal was couple-level (no single attributable user)
    await del('nora_signals', q => q.eq('user_id', userId))
    await del('nora_claims', q => q.eq('user_id', userId))

    if (coupleId) {
      await del('nora_signals', q => q.eq('couple_id', coupleId))
      await del('nora_claims', q => q.eq('couple_id', coupleId))
      await del('nora_memory', q => q.eq('couple_id', coupleId))

      // Game Room: session-chained children first, then the session rows
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('couple_id', coupleId)
      const sessionIds = (sessions || []).map(s => s.id)
      if (sessionIds.length) {
        await del('game_rounds', q => q.in('session_id', sessionIds))
        await del('game_finds', q => q.in('session_id', sessionIds))
        await del('hot_take_sessions', q => q.in('session_id', sessionIds))
        await del('hot_take_answers', q => q.in('session_id', sessionIds))
      }
      await del('game_sessions', q => q.eq('couple_id', coupleId))
      await del('challenge_rounds', q => q.eq('couple_id', coupleId))
      await del('challenge_sessions', q => q.eq('couple_id', coupleId))
      await del('call_rounds', q => q.eq('couple_id', coupleId))
      await del('call_sessions', q => q.eq('couple_id', coupleId))
      await del('hunt_sessions', q => q.eq('couple_id', coupleId))
      await del('today_responses', q => q.eq('couple_id', coupleId))
      await del('love_map_updates', q => q.eq('couple_id', coupleId))

      // Trips: itinerary/packing/photos are trip_id-chained
      const { data: trips } = await supabase
        .from('trips')
        .select('id')
        .eq('couple_id', coupleId)
      const tripIds = (trips || []).map(t => t.id)
      if (tripIds.length) {
        await del('trip_itinerary', q => q.in('trip_id', tripIds))
        await del('trip_packing', q => q.in('trip_id', tripIds))
        await del('trip_photos', q => q.in('trip_id', tripIds))
      }
      await del('trips', q => q.eq('couple_id', coupleId))

      // Relationship history / rhythm tables
      await del('weekly_reflections', q => q.eq('couple_id', coupleId))
      await del('wednesday_notices', q => q.eq('couple_id', coupleId))
      await del('thursday_entries', q => q.eq('couple_id', coupleId))
      await del('relationship_health', q => q.eq('couple_id', coupleId))
      await del('nora_inline_sessions', q => q.eq('couple_id', coupleId))
      await del('ritual_completions', q => q.eq('couple_id', coupleId))
      await del('rituals', q => q.eq('couple_id', coupleId))
      await del('follow_throughs', q => q.eq('couple_id', coupleId))
      await del('invite_previews', q => q.eq('couple_id', coupleId))
      await del('date_plans', q => q.eq('couple_id', coupleId))
      await del('flirts', q => q.eq('couple_id', coupleId))
      await del('relationship_points', q => q.eq('couple_id', coupleId))

      await del('sparks', q => q.eq('couple_id', coupleId))
      await del('bets', q => q.eq('couple_id', coupleId))
    }

    await del('timeline_events', q => q.eq('created_by', userId))
    await del('shared_items', q => q.eq('created_by', userId))

    // Storage — flat single-level prefixes only (see note above re: nested ones)
    for (const prefix of [`relationship/${coupleId || userId}`, `timeline/${coupleId || userId}`, `memories/${userId}`]) {
      try {
        const { data: files } = await supabase.storage.from('photos').list(prefix)
        if (files?.length) {
          await supabase.storage.from('photos').remove(files.map(f => `${prefix}/${f.name}`))
        }
      } catch (e) {
        console.error(`[account/delete] storage cleanup ${prefix} error:`, e.message)
      }
    }

    if (coupleId) {
      await del('couples', q => q.eq('id', coupleId))
    }

    await del('user_profiles', q => q.eq('user_id', userId))

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      console.error('[account/delete] auth.admin.deleteUser error:', deleteUserError)
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
