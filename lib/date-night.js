// Deterministically picks a hero photo from a custom date's stops.
// Prefers real-location photos over custom/manual/media stops.
// Used to compute hero_photo_url once at save time (create + edit),
// and as a fallback for legacy rows saved before that column existed.
//
// Fixed Aug 3 — two bugs found in the Date Night audit:
// 1. This picked from locationPhotos and otherPhotos concatenated into one
//    array, so "prefer" was really just "proportional to how many photos
//    are in each group" — e.g. 1 location photo + 3 custom-stop photos
//    meant a 75% chance the hero was a custom stop, the opposite of the
//    stated intent. Now picks only from locationPhotos when any exist,
//    falling back to otherPhotos only when there are none.
// 2. Media stops (movies/shows, place_id like "media-tt1234567") were
//    miscategorized as "location" photos, since the old check only
//    excluded ids starting with "custom-". A movie poster is not a real
//    location any more than a manual stop is — now excluded too.
export function getHeroPhoto(stops, id) {
  if (!stops?.length) return null
  const isRealLocation = s => s.place_id && !s.place_id.startsWith('custom-') && !s.place_id.startsWith('media-')
  const locationPhotos = stops.filter(s => s.photo_url && isRealLocation(s)).map(s => s.photo_url)
  const otherPhotos = stops.filter(s => s.photo_url && !isRealLocation(s)).map(s => s.photo_url)
  const preferred = locationPhotos.length ? locationPhotos : otherPhotos
  if (!preferred.length) return null
  const seed = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : 0
  return preferred[seed % preferred.length]
}

// Post-date reflection reactions — replaces the old 5-star rating.
// No emojis (ABF rule). Order matters: rendered left-to-right in this order.
export const REACTION_OPTIONS = [
  { value: 'loved_it', label: 'Loved it' },
  { value: 'really_good', label: 'Really good' },
  { value: 'fine', label: 'It was fine' },
  { value: 'not_for_us', label: 'Not for us' },
]

export const REACTION_LABELS = Object.fromEntries(REACTION_OPTIONS.map(r => [r.value, r.label]))
