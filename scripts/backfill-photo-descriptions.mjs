// One-time backfill — describes every existing photo (custom_dates.photos,
// timeline_events.photo_urls, and custom_dates.stops[].photo_url) that
// doesn't have a description yet. Everything uploaded going forward is
// already covered by the routes wired in app/api/dates/photos/add,
// app/api/timeline/event(/update), and app/api/dates/photos/describe-stops
// — this script only exists to catch what was uploaded before that wiring
// existed. Safe to re-run: describeAndStorePhotos/describeAndStoreStopPhotos
// both skip anything already described.
//
// Run: node scripts/backfill-photo-descriptions.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { describeAndStorePhotos, describeAndStoreStopPhotos } from '../lib/photo-descriptions.js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Sequential, not parallel across rows — this is a one-time run, not a
// latency-sensitive path, and staying sequential keeps vision-call volume
// gentle rather than firing every couple's entire photo history at once.
async function backfillCustomDates() {
  const { data: dates, error } = await supabase
    .from('custom_dates')
    .select('id, photos, photo_descriptions, stops')
  if (error) { console.error('[custom_dates] fetch error:', error); return }

  console.log(`[custom_dates] ${dates.length} rows to check`)
  for (const d of dates) {
    if (Array.isArray(d.photos) && d.photos.length) {
      console.log(`[custom_dates] describing ${d.photos.length} photo(s) for date ${d.id}`)
      await describeAndStorePhotos(supabase, { table: 'custom_dates', id: d.id, photoUrls: d.photos })
    }
    if (Array.isArray(d.stops) && d.stops.some(s => s?.photo_url)) {
      console.log(`[custom_dates] describing stop photos for date ${d.id}`)
      await describeAndStoreStopPhotos(supabase, { dateId: d.id, stops: d.stops })
    }
  }
}

async function backfillTimelineEvents() {
  const { data: events, error } = await supabase
    .from('timeline_events')
    .select('id, photo_urls, photo_descriptions')
  if (error) { console.error('[timeline_events] fetch error:', error); return }

  console.log(`[timeline_events] ${events.length} rows to check`)
  for (const e of events) {
    if (Array.isArray(e.photo_urls) && e.photo_urls.length) {
      console.log(`[timeline_events] describing ${e.photo_urls.length} photo(s) for event ${e.id}`)
      await describeAndStorePhotos(supabase, { table: 'timeline_events', id: e.id, photoUrls: e.photo_urls })
    }
  }
}

async function main() {
  await backfillCustomDates()
  await backfillTimelineEvents()
  console.log('[backfill-photo-descriptions] done')
}

main().catch(err => {
  console.error('[backfill-photo-descriptions] fatal:', err)
  process.exit(1)
})
