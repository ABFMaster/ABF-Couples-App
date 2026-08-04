export const dynamic = 'force-dynamic'

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

  if (date.status === 'pending_delete' || date.status === 'completed') {
    return Response.json({ error: 'Cannot request deletion for a date with status: ' + date.status }, { status: 400 })
  }

  // A date that was never shared (shared_with is null — the creator never
  // tapped "Ready to share?") has no second party to confirm a deletion.
  // Found during the Aug 3 audit: the two-party pending_delete flow below
  // is a genuine dead end for this case — /delete/confirm requires someone
  // OTHER than delete_requested_by, but no one else ever passes this
  // route's own ownership check for an unshared date, so the creator could
  // request deletion and then never actually complete it (only cancel back
  // to 'planned'). Skip the pending/confirm dance entirely for a solo date
  // — it's the creator's own, deleting it doesn't need a partner's sign-off.
  if (!date.shared_with) {
    const { error: deleteError } = await supabase
      .from('custom_dates')
      .delete()
      .eq('id', dateId)
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }
    return Response.json({ success: true, deleted: true })
  }

  const { error: updateError } = await supabase
    .from('custom_dates')
    .update({ status: 'pending_delete', delete_requested_by: user.id })
    .eq('id', dateId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  const partnerId = user.id === date.user_id ? date.shared_with : date.user_id

  if (partnerId) {
    const { data: requesterProfile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const requesterName = requesterProfile?.display_name || 'Your partner'

    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        userId: partnerId,
        title: 'Date deletion requested',
        body: `${requesterName} wants to delete "${date.title}". Open the date to confirm or cancel.`,
        url: `/dates/${dateId}`,
        route: 'dates/request',
      }),
    }).catch(() => {})
  }

  return Response.json({ success: true })
}
