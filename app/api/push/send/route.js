import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { userId, title, body, url } = await request.json()
    if (!userId || !title) {
      return Response.json({ error: 'userId and title required' }, { status: 400 })
    }

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subscriptions?.length) {
      return Response.json({ sent: 0 })
    }

    const results = await Promise.allSettled(
      subscriptions.map(row =>
        webpush.sendNotification(
          row.subscription,
          JSON.stringify({ title, body, url })
        )
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return Response.json({ sent })
  } catch (err) {
    console.error('Push send error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
