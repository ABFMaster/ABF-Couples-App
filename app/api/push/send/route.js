export const dynamic = 'force-dynamic'

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

async function logPush(supabase, { userId, endpoint, status, statusCode, errorMessage, route, title, body }) {
  try {
    await supabase.from('push_log').insert({
      user_id: userId,
      endpoint: endpoint || null,
      status,
      status_code: statusCode || null,
      error_message: errorMessage || null,
      route: route || null,
      title: title || null,
      body: body || null
    })
  } catch (err) {
    console.error('[push_log] Failed to log push:', err)
  }
}

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

    const { userId, title, body, url, route } = await request.json()
    if (!userId || !title) {
      return Response.json({ error: 'userId and title required' }, { status: 400 })
    }

    // Cron-authenticated calls are system-initiated (Wednesday Notice, weekly
    // reflection, etc.) and legitimately target any user. A regular
    // user-authenticated call previously had no such restriction at all —
    // any logged-in user could push arbitrary title/body/url content to any
    // other userId in the system, not just their own partner. Found during
    // the Aug 5 2026 Profile/Timeline audit while tracing why partner
    // notifications weren't arriving (see FlirtSheet.js and us/add/page.js
    // fixes in the same commit) — this route itself was never swept for the
    // confused-deputy pattern the rest of the app already got fixed for.
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (user.id !== userId) {
        const { data: couple } = await supabase
          .from('couples')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .maybeSingle()
        const partnerId = couple ? (couple.user1_id === user.id ? couple.user2_id : couple.user1_id) : null
        if (partnerId !== userId) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subscriptions?.length) {
      // Previously a silent no-op -- if a user's subscription lapsed or was
      // never registered, this returned {sent: 0} with zero trace anywhere.
      // Log it so a missed push is diagnosable from push_log instead of
      // just... not happening, invisibly.
      await logPush(supabase, { userId, status: 'no_subscription', route, title, body })
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

    let sent = 0
    const errors = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const endpoint = subscriptions[i].subscription?.endpoint

      if (result.status === 'fulfilled') {
        sent++
        await logPush(supabase, { userId, endpoint, status: 'success', statusCode: result.value?.statusCode, route, title, body })
      } else {
        const reason = result.reason
        const statusCode = reason?.statusCode || null
        errors.push(reason?.message || String(reason))

        if (statusCode === 410 || statusCode === 404) {
          await logPush(supabase, { userId, endpoint, status: 'stale', statusCode, route, title, body })
          if (endpoint) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
          }
        } else {
          await logPush(supabase, { userId, endpoint, status: 'failed', statusCode, errorMessage: reason?.message, route, title, body })
        }
      }
    }

    return Response.json({ sent, errors })
  } catch (err) {
    console.error('Push send error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
