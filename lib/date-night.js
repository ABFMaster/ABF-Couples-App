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
