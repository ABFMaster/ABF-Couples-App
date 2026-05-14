import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function fetchAndStorePlacePhoto(placeId, coupleId) {
  if (!placeId || placeId.startsWith('custom-')) return null

  try {
    // Check if we already have this photo stored
    const storagePath = `${coupleId}/${placeId}.jpg`
    const { data: existing } = await supabase.storage
      .from('date-photos')
      .getPublicUrl(storagePath)

    // Try to fetch the existing file to verify it exists
    const checkRes = await fetch(existing.publicUrl, { method: 'HEAD' })
    if (checkRes.ok) return existing.publicUrl

    // Fetch place details from Google Places API
    const placeRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`,
      {
        headers: {
          'X-Goog-FieldMask': 'photos',
          'Referer': 'https://abf-couples-app.vercel.app'
        }
      }
    )
    if (!placeRes.ok) return null

    const placeData = await placeRes.json()
    const photoName = placeData.photos?.[0]?.name
    if (!photoName) return null

    // Fetch the actual photo bytes
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`,
      {
        headers: {
          'Referer': 'https://abf-couples-app.vercel.app'
        }
      }
    )
    if (!photoRes.ok) return null

    const photoData = await photoRes.json()
    const photoUrl = photoData.photoUri
    if (!photoUrl) return null

    // Fetch the actual image bytes
    const imageRes = await fetch(photoUrl)
    if (!imageRes.ok) return null

    const imageBuffer = await imageRes.arrayBuffer()
    const imageBytes = new Uint8Array(imageBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('date-photos')
      .upload(storagePath, imageBytes, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) return null

    // Return permanent public URL
    const { data: urlData } = await supabase.storage
      .from('date-photos')
      .getPublicUrl(storagePath)

    return urlData.publicUrl

  } catch (err) {
    console.error('[place-photo] Error:', err)
    return null
  }
}
