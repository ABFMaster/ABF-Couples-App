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

    // Always upsert — keeps subscription fresh, handles browser key rotation
    const { supabase } = await import('@/lib/supabase')

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
