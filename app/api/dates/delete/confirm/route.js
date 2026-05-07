import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dateId } = await request.json()
  if (!dateId) {
    return Response.json({ error: 'dateId required' }, { status: 400 })
  }

  const { data: date, error: fetchError } = await supabase
    .from('custom_dates')
    .select('*')
    .eq('id', dateId)
    .maybeSingle()

  if (fetchError || !date) {
    return Response.json({ error: 'Date not found' }, { status: 404 })
  }

  if (date.user_id !== user.id && date.shared_with !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (date.status !== 'pending_delete') {
    return Response.json({ error: 'Date is not pending deletion' }, { status: 400 })
  }

  if (date.delete_requested_by === user.id) {
    return Response.json({ error: 'You cannot confirm your own deletion request' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('custom_dates')
    .delete()
    .eq('id', dateId)

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  if (date.delete_requested_by) {
    const { data: confirmerProfile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const confirmerName = confirmerProfile?.display_name || 'Your partner'

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        userId: date.delete_requested_by,
        title: 'Date deleted',
        body: `${confirmerName} confirmed. "${date.title}" has been deleted.`,
        url: '/dates',
      }),
    }).catch(() => {})
  }

  return Response.json({ success: true })
}
