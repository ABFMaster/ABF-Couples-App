import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sparkId, responseText } = await request.json()

    const { data: sparkRow } = await supabase
      .from('sparks')
      .select('couple_id')
      .eq('id', sparkId)
      .maybeSingle()

    await supabase
      .from('spark_responses')
      .upsert({
        spark_id: sparkId,
        user_id: user.id,
        couple_id: sparkRow?.couple_id,
        response_text: responseText,
        responded_at: new Date().toISOString(),
      }, { onConflict: 'spark_id,user_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[spark/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
