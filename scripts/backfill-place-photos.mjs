import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fetchAndStorePlacePhoto(placeId, coupleId) {
  if (!placeId || placeId.startsWith('custom-')) return null

  try {
    const storagePath = `${coupleId}/${placeId}.jpg`

    // Check if already stored
    const { data: existing } = supabase.storage
      .from('date-photos')
      .getPublicUrl(storagePath)

    const checkRes = await fetch(existing.publicUrl, { method: 'HEAD' })
    if (checkRes.ok) {
      console.log(`[skip] Already stored: ${placeId}`)
      return existing.publicUrl
    }

    // Fetch place details
    const placeRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`,
      {
        headers: {
          'X-Goog-FieldMask': 'photos',
          'Referer': 'https://abf-couples-app.vercel.app'
        }
      }
    )
    if (!placeRes.ok) { const errText = await placeRes.text(); console.log(`[fail] Places API error for ${placeId}: ${placeRes.status} — ${errText}`); return null }

    const placeData = await placeRes.json()
    const photoName = placeData.photos?.[0]?.name
    if (!photoName) { console.log(`[skip] No photo for ${placeId}`); return null }

    // Fetch photo media
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`,
      {
        headers: {
          'Referer': 'https://abf-couples-app.vercel.app'
        }
      }
    )
    if (!photoRes.ok) { console.log(`[fail] Photo media error for ${placeId}`); return null }

    const photoData = await photoRes.json()
    const photoUrl = photoData.photoUri
    if (!photoUrl) { console.log(`[fail] No photoUri for ${placeId}`); return null }

    // Fetch image bytes
    const imageRes = await fetch(photoUrl)
    if (!imageRes.ok) { console.log(`[fail] Image fetch error for ${placeId}`); return null }

    const imageBuffer = await imageRes.arrayBuffer()
    const imageBytes = new Uint8Array(imageBuffer)

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('date-photos')
      .upload(storagePath, imageBytes, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) { console.log(`[fail] Upload error for ${placeId}:`, uploadError.message); return null }

    console.log(`[ok] Stored: ${placeId}`)
    return existing.publicUrl

  } catch (err) {
    console.error(`[error] ${placeId}:`, err.message)
    return null
  }
}

async function main() {
  console.log('Fetching all custom_dates with stops...')

  const { data: dates, error } = await supabase
    .from('custom_dates')
    .select('id, couple_id, title, stops')
    .not('stops', 'is', null)

  if (error) { console.error('Failed to fetch dates:', error); process.exit(1) }

  console.log(`Found ${dates.length} dates with stops`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const date of dates) {
    if (!date.stops?.length) continue

    const updatedStops = [...date.stops]
    let dateChanged = false

    for (let i = 0; i < updatedStops.length; i++) {
      const stop = updatedStops[i]
      if (!stop.place_id || stop.place_id.startsWith('custom-')) { skipped++; continue }

      const permanentUrl = await fetchAndStorePlacePhoto(stop.place_id, date.couple_id)
      if (permanentUrl) {
        updatedStops[i] = { ...stop, photo_url: permanentUrl }
        dateChanged = true
        updated++
      } else {
        failed++
      }

      // Rate limit — avoid hammering the API
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    if (dateChanged) {
      const { error: updateError } = await supabase
        .from('custom_dates')
        .update({ stops: updatedStops })
        .eq('id', date.id)

      if (updateError) {
        console.error(`Failed to update date ${date.title}:`, updateError.message)
      } else {
        console.log(`Updated date: ${date.title}`)
      }
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`)
}

main()
