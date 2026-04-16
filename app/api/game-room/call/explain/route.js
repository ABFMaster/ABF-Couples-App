import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { roundId, explanation } = await request.json()
    if (!roundId || !explanation) {
      return NextResponse.json({ error: 'roundId and explanation required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: round } = await supabase
      .from('call_rounds')
      .update({ hot_seat_explanation: explanation, status: 'answered', explanation_revealed: true })
      .eq('id', roundId)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ round })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
