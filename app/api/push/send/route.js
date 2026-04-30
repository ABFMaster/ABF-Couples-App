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

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

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
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message || String(r.reason))
    console.error('Push errors:', errors)

    // Remove expired subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        const reason = results[i].reason
        if (reason?.statusCode === 410 || reason?.statusCode === 404) {
          const endpoint = subscriptions[i].subscription?.endpoint
          if (endpoint) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
          }
        }
      }
    }

    return Response.json({ sent, errors })
  } catch (err) {
    console.error('Push send error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
