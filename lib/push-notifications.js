export async function registerPushSubscription(supabase, userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      await saveSubscription(supabase, userId, existingSubscription)
      return existingSubscription
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    })

    await saveSubscription(supabase, userId, subscription)
    return subscription
  } catch (err) {
    console.error('Push registration error:', err)
    return null
  }
}

async function saveSubscription(supabase, userId, subscription) {
  const sub = subscription.toJSON()
  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      subscription: sub,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
