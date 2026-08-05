export async function registerPushSubscription(userId) {
  try {
    // Only run in browser
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return null

    // Check current permission state — never re-prompt if denied
    if (Notification.permission === 'denied') return null

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Request permission only if not already granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return null
    }

    // Get or create push subscription
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
    }

    const { supabase } = await import('@/lib/supabase')

    // Upsert only -- never delete another row here. A user can have more
    // than one live subscription at once (phone + laptop, etc.), and
    // /api/push/send already sends to every subscription on file for a user
    // and prunes a genuinely dead endpoint itself (410/404 response) when
    // delivery actually fails. The old code looked up "the" existing
    // subscription with .maybeSingle() -- assuming one per user -- and
    // deleted every row for this user_id whenever a new device's endpoint
    // differed. That meant opening the app on a second device silently
    // wiped out the first device's registration, so notifications only
    // ever reached whichever device had opened the app most recently. Root
    // cause of a real missed push.
    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' })

    return subscription
  } catch {
    return null
  }
}
