export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

// Moved server-side Aug 4 2026 as part of closing a critical account-
// takeover gap in the couples pairing flow (see app/api/couples/join and
// docs/database/couples-rls-fix.sql for the full writeup). This route
// itself isn't the vulnerable half — INSERT was already correctly scoped
// to auth.uid() = user1_id — but centralizing creation here means the
// browser no longer needs any direct SELECT/INSERT access to the couples
// table at all, so the RLS policy can be tightened without breaking this
// flow.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — avoids visual ambiguity
const CODE_LENGTH = 6

function generateConnectCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  }
  return code
}

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    // Resume an existing unpaired code rather than creating a duplicate —
    // matches the client's previous behavior of showing the same code on
    // repeat visits to /connect instead of generating a new one each time.
    const { data: existing } = await supabase
      .from('couples')
      .select('id, connect_code, user2_id, connected_at')
      .eq('user1_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.connected_at) {
        return NextResponse.json({ error: 'You are already connected to a partner' }, { status: 400 })
      }
      if (!existing.user2_id) {
        return NextResponse.json({ connectCode: existing.connect_code })
      }
    }

    // Generate a unique code — service-role client bypasses RLS so this
    // check works regardless of the table's read policy. Collision odds
    // are ~1 in 1.07 billion (32^6); retries are just a safety net.
    let code
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateConnectCode()
      const { data: collision } = await supabase
        .from('couples')
        .select('id')
        .eq('connect_code', candidate)
        .maybeSingle()
      if (!collision) {
        code = candidate
        break
      }
    }
    if (!code) {
      return NextResponse.json({ error: 'Failed to generate a unique code, try again' }, { status: 500 })
    }

    const { data: newCouple, error: insertError } = await supabase
      .from('couples')
      .insert({ user1_id: user.id, connect_code: code })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create connect code' }, { status: 500 })
    }

    // Keep user_profiles.couple_id in sync — lib/api-auth.js's
    // getOwnCoupleId() reads this column (used by practices/notebook-entry
    // POST) and several client pages read it directly (profile, dashboard,
    // assessment/results). Found during this same audit that nothing in
    // the codebase appears to set it for a joining partner either — see
    // the matching upsert in app/api/couples/join/route.js.
    try {
      await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, couple_id: newCouple.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    } catch {}

    return NextResponse.json({ connectCode: code })
  } catch (err) {
    console.error('[couples/create-code] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
