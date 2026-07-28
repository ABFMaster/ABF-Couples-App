// Deterministically picks a hero photo from a custom date's stops.
// Prefers real-location photos over custom/manual stops.
// Used to compute hero_photo_url once at save time (create + edit),
// and as a fallback for legacy rows saved before that column existed.
export function getHeroPhoto(stops, id) {
  if (!stops?.length) return null
  const locationPhotos = stops.filter(s => s.photo_url && s.place_id && !s.place_id.startsWith('custom-')).map(s => s.photo_url)
  const otherPhotos = stops.filter(s => s.photo_url && (!s.place_id || s.place_id.startsWith('custom-'))).map(s => s.photo_url)
  const allPhotos = [...locationPhotos, ...otherPhotos]
  if (!allPhotos.length) return null
  const seed = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : 0
  return allPhotos[seed % allPhotos.length]
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
