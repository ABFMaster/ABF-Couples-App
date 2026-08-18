// ── PHOTO VISION CAPTIONING ──────────────────────────────────────────────────
// Fire-and-forget helpers that turn newly uploaded photos into cached, factual
// text descriptions (via noraDescribePhoto in lib/nora.js) so Memory Test and
// other Nora surfaces can draw on what's actually in a couple's photos, not
// just text fields. See docs/database/photo-descriptions.sql.
//
// Every caller should invoke these WITHOUT awaiting — a vision call failing
// or running slow must never delay or break the actual photo upload response.
// Both functions catch everything internally and never throw.
import { noraDescribePhoto } from './nora'

// Standalone-column case — custom_dates.photo_descriptions and
// timeline_events.photo_descriptions are both JSONB maps of
// { [photoUrl]: description }. Only describes URLs not already present, so
// re-calling on every upload (even with a mix of old + new URLs) is safe and
// cheap — nothing gets re-analyzed.
export async function describeAndStorePhotos(supabase, { table, id, photoUrls }) {
  if (!id || !Array.isArray(photoUrls) || !photoUrls.length) return
  try {
    const { data: existing } = await supabase
      .from(table)
      .select('photo_descriptions')
      .eq('id', id)
      .maybeSingle()
    const current = existing?.photo_descriptions || {}
    const toDescribe = photoUrls.filter(url => url && !current[url])
    if (!toDescribe.length) return

    const results = await Promise.all(toDescribe.map(async (url) => {
      try {
        const description = await noraDescribePhoto(url, { route: `photo-description/${table}` })
        return [url, description]
      } catch (err) {
        console.error(`[photo-descriptions] ${table} ${id} failed for ${url}:`, err?.message || err)
        return null
      }
    }))
    const updates = Object.fromEntries(results.filter(Boolean))
    if (!Object.keys(updates).length) return

    await supabase
      .from(table)
      .update({ photo_descriptions: { ...current, ...updates } })
      .eq('id', id)
  } catch (err) {
    console.error(`[photo-descriptions] ${table} ${id}:`, err?.message || err)
  }
}

// Stops case — stops live inside custom_dates.stops (a JSONB array), each
// object optionally carrying a photo_url. The description is written as a
// photo_description key on that same stop object rather than a separate
// column (no schema change needed — see docs/database/photo-descriptions.sql).
// Pass the full current stops array; only stops with a photo_url and no
// existing photo_description get analyzed.
export async function describeAndStoreStopPhotos(supabase, { dateId, stops }) {
  if (!dateId || !Array.isArray(stops) || !stops.length) return
  const needsDescription = stops.some(s => s?.photo_url && !s?.photo_description)
  if (!needsDescription) return
  try {
    const updatedStops = await Promise.all(stops.map(async (s) => {
      if (!s?.photo_url || s?.photo_description) return s
      try {
        const description = await noraDescribePhoto(s.photo_url, { route: 'photo-description/stops' })
        return { ...s, photo_description: description }
      } catch (err) {
        console.error(`[photo-descriptions] stop photo failed for ${s.photo_url}:`, err?.message || err)
        return s
      }
    }))
    await supabase.from('custom_dates').update({ stops: updatedStops }).eq('id', dateId)
  } catch (err) {
    console.error(`[photo-descriptions] stops ${dateId}:`, err?.message || err)
  }
}
