export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraSignal, noraChat } from '@/lib/nora'
import { getNoraTierContext } from '@/lib/nora-knowledge'
import { getSurfaceableClaims, getPrivateNotes } from '@/lib/nora-memory'
import { getTodayString, getDayOfWeek, getDateDayLabel, getWeekStart } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId    = searchParams.get('coupleId')
    const userName    = searchParams.get('userName') || null
    const partnerName = searchParams.get('partnerName') || 'your partner'
    const lat         = searchParams.get('lat')
    const lon         = searchParams.get('lon')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = user.id

    const todayStr  = getTodayString('America/Los_Angeles')
    const dayOfWeek = getDayOfWeek('America/Los_Angeles')

    // ── Fetch partner id ──────────────────────────────────────────────────────
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const partnerId = couple
      ? (couple.user1_id === userId ? couple.user2_id : couple.user1_id)
      : null

    // ── PART 0: Follow-Through asymmetric-completion nudge — highest priority ──
    // If the partner finished a Follow-Through and this user never engaged with
    // it, surface a quiet, content-free nudge here rather than building any new
    // UI for it — see Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md. Shown once,
    // marked via the per-user notified flag, then falls through to normal
    // messaging on every subsequent call.
    if (couple) {
      const isUser1 = couple.user1_id === userId
      const myPrefix = isUser1 ? 'user1' : 'user2'
      const theirPrefix = isUser1 ? 'user2' : 'user1'

      const { data: ftRow } = await supabase
        .from('follow_throughs')
        .select('id')
        .eq('couple_id', coupleId)
        .eq(`${myPrefix}_status`, 'pending')
        .in(`${theirPrefix}_status`, ['done', 'declined'])
        .eq(`${myPrefix}_partner_notified`, false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ftRow) {
        await supabase
          .from('follow_throughs')
          .update({ [`${myPrefix}_partner_notified`]: true })
          .eq('id', ftRow.id)

        return NextResponse.json({
          message: `Something happened after last night's Bet — worth asking ${partnerName} about it.`,
          cta_label: null,
          cta_href: null,
          pills: null,
          mode: 'follow_through_nudge',
        })
      }
    }

    // ── PART 0b: Ritual partner-loop nudge — second priority ──────────────────
    // Whoever didn't personally tap this week's ritual check-in gets a quiet,
    // one-time nudge next time they open the app. See
    // Sessions/RITUAL_ENRICHMENT_DESIGN.md piece 4. Same reused slot as PART 0
    // above — retargeted at ritual check-ins instead of Follow-Through reports.
    // Only reached if PART 0 didn't already fire, so at most one nudge shows.
    if (couple) {
      const { data: completionRow } = await supabase
        .from('ritual_completions')
        .select('id, ritual_id')
        .eq('couple_id', coupleId)
        .neq('completed_by', userId)
        .eq('completed', true)
        .eq('partner_notified', false)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (completionRow) {
        const { data: ritualRow } = await supabase
          .from('rituals')
          .select('title')
          .eq('id', completionRow.ritual_id)
          .maybeSingle()

        await supabase
          .from('ritual_completions')
          .update({ partner_notified: true })
          .eq('id', completionRow.id)

        return NextResponse.json({
          message: `${partnerName} logged ${ritualRow?.title ? `"${ritualRow.title}"` : 'your ritual'} this week — want to add a line about it?`,
          cta_label: 'Add a note',
          cta_href: `/dashboard?ritualNote=${completionRow.id}`,
          pills: null,
          mode: 'ritual_partner_nudge',
        })
      }
    }

    // ── PART 1: Cache — early exit for post mode ──────────────────────────────
    // Check post cache before feature detection to save DB calls
    const { data: earlyCache } = await supabase
      .from('hero_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('cache_date', todayStr)
      .eq('type', 'hero')
      .maybeSingle()

    if (earlyCache?.mode === 'post') {
      return NextResponse.json({
        message:   earlyCache.message,
        cta_label: earlyCache.cta_label,
        cta_href:  earlyCache.cta_href,
        pills:     earlyCache.pills,
        mode:      earlyCache.mode,
      })
    }

    // ── PART 2: Feature detection ─────────────────────────────────────────────
    let feature = null

    if (dayOfWeek === 3) {
      // Wednesday — Bet
      const { data: bet } = await supabase
        .from('bets')
        .select('id, question')
        .eq('couple_id', coupleId)
        .eq('bet_date', todayStr)
        .maybeSingle()

      if (bet) {
        const [{ data: mine }, { data: theirs }] = await Promise.all([
          supabase.from('bet_responses').select('prediction, actual_answer, nora_reaction, nora_solo_insight').eq('bet_id', bet.id).eq('user_id', userId).maybeSingle(),
          partnerId ? supabase.from('bet_responses').select('prediction, actual_answer').eq('bet_id', bet.id).eq('user_id', partnerId).maybeSingle() : Promise.resolve({ data: null }),
        ])
        feature = { type: 'bet', label: 'Bet', question: bet.question, mine: mine || null, theirs: theirs || null }
      }
    } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Mon / Tue / Thu — Spark
      const { data: spark } = await supabase
        .from('sparks')
        .select('id, prompt')
        .eq('couple_id', coupleId)
        .eq('spark_date', todayStr)
        .maybeSingle()

      if (spark) {
        const [{ data: mine }, { data: theirs }] = await Promise.all([
          supabase.from('spark_responses').select('responded_at, reaction_icon, response_text, nora_reaction, nora_solo_insight').eq('spark_id', spark.id).eq('user_id', userId).maybeSingle(),
          partnerId ? supabase.from('spark_responses').select('responded_at, response_text').eq('spark_id', spark.id).eq('user_id', partnerId).maybeSingle() : Promise.resolve({ data: null }),
        ])
        feature = { type: 'spark', label: 'Spark', prompt: spark.prompt, mine: mine || null, theirs: theirs || null }
      }
    } else if (dayOfWeek === 5) {
      // Friday — Ritual
      const { data: ritual } = await supabase
        .from('rituals')
        .select('id, title, status, streak')
        .eq('couple_id', coupleId)
        .in('status', ['discovering', 'adopted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ritual) {
        const { data: completion } = await supabase
          .from('ritual_completions')
          .select('completed')
          .eq('ritual_id', ritual.id)
          .eq('week_start', getWeekStart('America/Los_Angeles'))
          .limit(1)
          .maybeSingle()

const ritualCompletedThisWeek = !!completion?.completed
        const ritualStreak = ritual.streak || 0
        feature = { type: 'ritual', label: 'Ritual', title: ritual.title, status: ritual.status, completedThisWeek: ritualCompletedThisWeek, streak: ritualStreak, mine: null, theirs: null }
      }
    }

    // ── PART 1 (continued): Pre cache check — now that we know current state ──
    if (earlyCache?.mode === 'pre') {
      const mineActed   = feature?.type === 'bet' ? !!feature.mine?.prediction : !!feature?.mine?.responded_at
      const theirsActed = feature?.type === 'bet' ? !!feature.theirs?.prediction : !!feature?.theirs?.responded_at
      const currentStateIsPost = feature?.type !== 'ritual' && mineActed && theirsActed

      if (!currentStateIsPost) {
        return NextResponse.json({
          message:   earlyCache.message,
          cta_label: earlyCache.cta_label,
          cta_href:  earlyCache.cta_href,
          pills:     earlyCache.pills,
          mode:      earlyCache.mode,
        })
      }
      // State has advanced to post — delete stale pre cache and regenerate
      await supabase.from('hero_cache').delete().eq('user_id', userId).eq('cache_date', todayStr)
    }

    // ── PART 3: Nora memory ───────────────────────────────────────────────────
    const { data: memory } = await supabase
      .from('nora_memory')
      .select('user1_notes, user2_notes, couple_notes, user1_individual_signal_count, user2_individual_signal_count, couple_signal_count')
      .eq('couple_id', coupleId)
      .limit(1)
      .maybeSingle()

    const isUser1 = couple?.user1_id === userId
    const user1Signals = memory?.user1_individual_signal_count || 0
    const user2Signals = memory?.user2_individual_signal_count || 0
    const individualSignals = isUser1 ? user1Signals : user2Signals
    const coupleSignals = memory?.couple_signal_count || 0
    const tierContext = getNoraTierContext(individualSignals, coupleSignals, userName, partnerName)

    const myNotes       = isUser1 ? memory?.user1_notes : memory?.user2_notes
    const coupleNotes   = memory?.couple_notes?.notes || null
    const structuredFacts = memory?.couple_notes?.structured_facts || null
    // myPersonNotes is self-facing only (used to personalize this user's own
    // hero card, never shown to their partner), so it's safe — and per the
    // continuity design — correct to merge in this user's private AI-coach
    // notes (nora_private_notes) alongside their couple-context notes.
    const privateNotes = await getPrivateNotes(userId)
    const myPersonNotes = [myNotes?.notes, privateNotes].filter(Boolean).join('\n\n') || null
    const claimsResult = (couple?.user1_id && couple?.user2_id)
      ? await getSurfaceableClaims(coupleId, couple.user1_id, couple.user2_id, isUser1 ? userName : partnerName, isUser1 ? partnerName : userName, user1Signals, user2Signals)
      : { promptBlock: '' }
    const claimsBlock = claimsResult.promptBlock || null
    const noraReaction  = feature?.mine?.nora_reaction || null

    let assessmentContext = null
    if (!myPersonNotes && !coupleNotes) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('attachment_style, conflict_style, love_language_primary, display_name')
        .eq('user_id', userId)
        .single()

      if (profileData?.attachment_style || profileData?.conflict_style) {
        assessmentContext = [
          profileData.attachment_style ? `Attachment: ${profileData.attachment_style}` : null,
          profileData.conflict_style ? `Conflict style: ${profileData.conflict_style}` : null,
          profileData.love_language_primary ? `Love expression: ${profileData.love_language_primary}` : null,
        ].filter(Boolean).join(', ')
      }
    }

    // ── PART 4: Dates + pills + weather ──────────────────────────────────────
    const nowIso = new Date().toISOString()
    const { data: customDates } = await supabase
      .from('custom_dates')
      .select('id, title, date_time, status')
      .eq('couple_id', coupleId)
      .in('status', ['planned', 'approved'])
      .neq('status', 'pending_delete')
      .gte('date_time', nowIso)
      .order('date_time', { ascending: true })
      .limit(5)
    const nextDate = (customDates || [])[0] || null

    const daysUntilDate = nextDate
      ? Math.round((new Date(nextDate.date_time) - new Date()) / 86400000)
      : null

    const DAY_ABBR      = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const FEATURE_LABEL = { 0: 'Reflection', 1: 'The Spark', 2: 'The Spark', 3: 'The Bet', 4: 'The Spark', 5: 'Ritual' }

    const pills = []
    let scan = (dayOfWeek + 1) % 7
    let scanned = 0
    while (scanned < 3) {
      const label = FEATURE_LABEL[scan]
      if (label) pills.push(`${DAY_ABBR[scan]} · ${label}`)
      scan = (scan + 1) % 7
      scanned++
    }

    if (nextDate && daysUntilDate !== null && daysUntilDate <= 7) {
      const dateDay = getDateDayLabel(nextDate.date_time, 'America/Los_Angeles')
      pills.push(`${dateDay} · ${nextDate.title}`)
    }

    let weather = null
    if (lat && lon) {
      try {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`
        )
        if (wRes.ok) {
          const wData = await wRes.json()
          const temp = wData.current?.temperature_2m
          const code = wData.current?.weathercode
          // WMO codes: 51-67 = rain/drizzle, 71-77 = snow, 80-82 = showers, 95-99 = thunderstorm
          const isRain  = code >= 51 && code <= 67
          const isSnow  = code >= 71 && code <= 77
          const isStorm = code >= 95
          const isHot   = temp >= 95
          const isCold  = temp <= 25
          if (isRain || isSnow || isStorm || isHot || isCold) {
            weather = { temp: Math.round(temp), code, isRain, isSnow, isStorm, isHot, isCold }
          }
        }
      } catch { /* non-blocking */ }
    }

    // ── PART 5: Priority + CTA + mode ────────────────────────────────────────
    let priority  = 5
    let cta_label = 'Tell Nora →'
    let cta_href  = '/ai-coach'

    if (feature && feature.type !== 'ritual') {
      const mineActed   = feature.type === 'bet' ? !!feature.mine?.prediction : !!feature.mine?.responded_at
      const theirsActed = feature.type === 'bet' ? !!feature.theirs?.prediction : !!feature.theirs?.responded_at

      if (!mineActed && !theirsActed) {
        priority  = 1
        cta_label = 'Go to Today'
        cta_href  = '/dashboard'
      } else if (theirsActed && !mineActed) {
        priority  = 2
        cta_label = 'Go to Today'
        cta_href  = '/dashboard'
      } else if (mineActed && theirsActed) {
        priority  = 3
        cta_label = 'Tell Nora →'
        cta_href  = '/ai-coach'
      }
    } else if (feature?.type === 'ritual') {
      if (feature.completedThisWeek) {
        priority  = 3
        cta_label = 'Tell Nora →'
        cta_href  = '/ai-coach'
      } else {
        priority  = 1
        cta_label = null
        cta_href  = null
      }
    }

    if (priority === 5 && nextDate && daysUntilDate <= 3) {
      priority  = 4
      cta_label = 'View the plan'
      cta_href  = `/dates/${nextDate.id}`
    }

    const mode = priority === 3 ? 'post' : 'pre'

    if (mode === 'post') {
      if (structuredFacts) {
        cta_label = 'Tell Nora →'
        cta_href  = '/ai-coach'
      } else {
        cta_label = null
        cta_href  = null
      }
    }

    // ── PART 6: Prompts ───────────────────────────────────────────────────────
    const name = userName || 'there'
    let message

    const ritualContext = feature?.type === 'ritual'
      ? priority === 1
        ? `It's Friday. You two are working on a ritual: "${feature.title}". This is week ${feature.streak + 1} — they haven't completed it yet this week.`
        : priority === 3
        ? `You two just completed your ritual: "${feature.title}". This is completion number ${feature.streak} — ${feature.streak === 1 ? 'first time' : feature.streak === 2 ? 'second week in a row' : feature.streak + ' weeks running'}.`
        : null
      : null

    if (mode === 'pre') {
      const isNewUser = !myPersonNotes && !coupleNotes && !structuredFacts
      const PRE_SYSTEM_PROMPT = isNewUser
        ? `You are Nora — a sharp, warm relationship guide who has just finished a first session with someone. You've read their assessment. You have a real impression of them. This is the dashboard hero card — the first thing they see when they arrive home in the app. Write 2-3 sentences that feel like you've been thinking about them since they left. Reference something true and specific from what you know. Then end with one question or thread you genuinely want to pull on — something that creates an irresistible pull toward conversation. Do not restate their results. Do not explain what you're doing. Just speak. Tone: Esther Perel meets a wise friend — warm, direct, a little provocative. Never start with Hey or Hi. No exclamation points. The final sentence should make them want to tap 'Let's talk about it'. Your final sentence MUST be a direct question ending with a question mark. This question becomes the button the user taps to talk to you — make it specific enough that they feel seen just reading it, and irresistible enough that they have to answer it.`
        : `You are Nora — you have been paying attention to this person and you have something specific to say. Write one sentence (max 18 words) for the dashboard hero card. You are NOT announcing a feature or pointing at an activity. CRITICAL: Write TO this specific person using 'you' singular — never 'you two', 'you both', or any phrase that addresses them as part of a couple. This card is private. Nora is speaking to one person alone. If memory is rich, say something only sayable about THIS person — a pattern, a contradiction, something you've noticed about how they love or how they protect themselves. If memory is sparse, ask one warm specific question that makes them think about themselves. Never start with Hey or Hi. Never mention app features by name. Never be generic. Tone: like a sharp, warm friend who has been quietly paying attention.`
      const systemPrompt = [PRE_SYSTEM_PROMPT, tierContext].filter(Boolean).join('\n\n')

      const userPrompt = [
        `User's name: ${name}`,
        assessmentContext ? `What their assessment revealed: ${assessmentContext}` : null,
        `Partner's name: ${partnerName}`,
        ritualContext ? `Today's context: ${ritualContext}` : null,
        myPersonNotes ? `What I know about ${name}: ${myPersonNotes.slice(0, 300)}` : null,
        coupleNotes   ? `What I know about this couple: ${coupleNotes.slice(0, 400)}` : null,
        structuredFacts ? `Structured observations: ${JSON.stringify(structuredFacts)}` : null,
        claimsBlock,
        `Write one sentence that says something specific about this person or couple. Make it feel like you've been paying attention.`,
      ].filter(Boolean).join('\n')

      let response
      if (isNewUser) {
        response = await noraChat(
          [{ role: 'user', content: userPrompt }],
          { route: 'dashboard/hero', system: systemPrompt, maxTokens: 200 }
        )
        cta_label = "Tell Nora →"
        cta_href = `/ai-coach?seed=${encodeURIComponent(response || '')}`
      } else {
        response = await noraSignal(userPrompt, { route: 'dashboard/hero', system: systemPrompt, maxTokens: 200 })
      }
      message = response || `Good to see you, ${name}.`

    } else {
      const questionOrPrompt = feature?.type === 'bet' ? feature.question : feature?.prompt
      const myAnswer         = feature?.type === 'bet' ? feature.mine?.prediction : feature?.mine?.response_text
      const theirAnswer      = feature?.type === 'bet' ? feature.theirs?.prediction : feature?.theirs?.response_text

      const systemPrompt = `You are Nora — you just watched this couple answer the same question separately. You have their answers and your memory of them. Write 1-2 sentences (max 25 words total) that hand them something real to do with what just happened. Choose exactly one of these three modes based on what will land hardest:
MICRO-ACTION: one tiny specific thing to do today — a text, a touch, a word. Derived directly from their answers.
PATTERN: connect what just happened to something you've seen before in this couple. The holy shit moment. Only use this if you have real memory to draw on.
CONVERSATION SEED: one question to ask each other tonight. Specific to their answers, not generic.
Do not label which mode you chose. Do not explain. Just write it. Never start with Hey or Hi. Never be generic. Tone: warm, direct, occasionally surprising.`

      const userPrompt = [
        `User's name: ${name}`,
        `Partner's name: ${partnerName}`,
        ritualContext ? `Today's context: ${ritualContext}` : null,
        questionOrPrompt ? `Today's question: "${questionOrPrompt}"` : null,
        myAnswer    ? `${name}'s answer: "${myAnswer}"` : null,
        theirAnswer ? `${partnerName}'s answer: "${theirAnswer}"` : null,
        noraReaction ? `Nora's prior observation on ${name}'s answer: "${noraReaction}"` : null,
        feature?.type === 'ritual' ? `Ritual streak: ${feature.streak} completions. ${feature.streak === 1 ? 'First time — still noticing.' : feature.streak === 2 ? 'Two in a row — something is forming.' : 'This one is becoming real.'}` : null,
        myPersonNotes   ? `What I know about ${name}: ${myPersonNotes.slice(0, 300)}` : null,
        coupleNotes     ? `What I know about this couple: ${coupleNotes.slice(0, 400)}` : null,
        structuredFacts ? `Structured observations: ${JSON.stringify(structuredFacts)}` : null,
        claimsBlock,
        `Choose the mode that will land hardest for this specific couple right now. Write it.`,
      ].filter(Boolean).join('\n')

      const response = await noraChat(
        [{ role: 'user', content: userPrompt }],
        { route: 'dashboard/hero', system: systemPrompt, maxTokens: 300 }
      )
      message = response || `Good to see you, ${name}.`
    }

    // ── PART 7: Cache write ───────────────────────────────────────────────────
    await supabase.from('hero_cache').upsert(
      { user_id: userId, couple_id: coupleId, cache_date: todayStr, message, cta_label, cta_href, pills: JSON.stringify(pills), mode, type: 'hero' },
      { onConflict: 'user_id,cache_date,type' }
    )

    // ── PART 8: Return ────────────────────────────────────────────────────────
    return NextResponse.json({ message, cta_label, cta_href, pills, mode })

  } catch (err) {
    console.error('[dashboard/hero] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
