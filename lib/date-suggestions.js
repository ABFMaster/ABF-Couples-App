/**
 * Date Suggestions - Google Places API helpers
 *
 * Uses the Google Places Nearby Search API (cheaper than Text Search,
 * better for discovery-style browsing).
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/nearby-search
 */

// Maps Google Places types to our app categories
const GOOGLE_TYPE_TO_CATEGORY = {
  // Romantic dinner
  restaurant: 'romantic_dinner',
  food: 'romantic_dinner',
  meal_delivery: 'romantic_dinner',
  meal_takeaway: 'romantic_dinner',
  cafe: 'romantic_dinner',
  bakery: 'romantic_dinner',
  bar: 'nightlife',
  night_club: 'nightlife',

  // Culture
  museum: 'culture',
  art_gallery: 'culture',
  library: 'culture',
  movie_theater: 'culture',
  performing_arts_theater: 'culture',
  stadium: 'culture',
  zoo: 'culture',
  aquarium: 'culture',
  amusement_park: 'adventure',

  // Adventure / Outdoor
  park: 'outdoor',
  campground: 'outdoor',
  natural_feature: 'outdoor',
  rv_park: 'outdoor',
  hiking_area: 'outdoor',
  bowling_alley: 'adventure',
  gym: 'adventure',
  spa: 'wellness',

  // Shopping
  shopping_mall: 'shopping',
  store: 'shopping',
};

// Our category display config
export const CATEGORY_CONFIG = {
  romantic_dinner: { label: 'Romantic Dinner', emoji: '🍷' },
  nightlife: { label: 'Nightlife', emoji: '🌙' },
  culture: { label: 'Arts & Culture', emoji: '🎭' },
  adventure: { label: 'Adventure', emoji: '🎯' },
  outdoor: { label: 'Outdoors', emoji: '🌿' },
  wellness: { label: 'Wellness', emoji: '✨' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  other: { label: 'Other', emoji: '📍' },
};

/**
 * Map a Google Places primary type to our app category.
 * Falls back to 'other' for unrecognized types.
 *
 * @param {string[]} types - Array of Google Places types for a place
 * @returns {string} Our category string
 */
export function categorizeSuggestion(types = []) {
  for (const type of types) {
    const category = GOOGLE_TYPE_TO_CATEGORY[type];
    if (category) return category;
  }
  return 'other';
}

/**
 * Convert a raw Google Places API place object into our display format.
 *
 * @param {object} place - Raw place from Google Places Nearby Search response
 * @returns {object} Formatted place ready for display and storage
 */
export function formatPlaceForDisplay(place) {
  const category = categorizeSuggestion(place.types || []);
  const priceLevel = place.price_level ?? null;

  // Build Google Maps URL from place_id
  const mapsUrl = place.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    : null;

  // Best available photo: use Places photo reference URL if present
  let photoUrl = null;
  if (place.photos?.[0]?.photo_reference) {
    const ref = place.photos[0].photo_reference;
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${key}`;
  }

  return {
    place_id: place.place_id,
    title: place.name,
    description: place.vicinity || place.formatted_address || null,
    category,
    location_name: place.name,
    address: place.vicinity || place.formatted_address || null,
    latitude: place.geometry?.location?.lat ?? null,
    longitude: place.geometry?.location?.lng ?? null,
    price_level: priceLevel,
    rating: place.rating ?? null,
    photo_url: photoUrl,
    website_url: null,  // Requires a Place Details call; not included in Nearby Search
    maps_url: mapsUrl,
    source: 'google_places',
  };
}

/**
 * Fetch nearby places from the Google Places Nearby Search API.
 *
 * Uses the server-side API route (/api/dates/suggestions) to keep the
 * API key out of client bundles.
 *
 * @param {object} location - { lat: number, lng: number }
 * @param {string} category - One of our category keys (or null for all)
 * @param {object} options
 * @param {number} [options.radius=5000] - Search radius in metres (max 50000)
 * @param {number} [options.priceLevel] - Filter by price level 1-4
 * @param {number} [options.limit=20] - Max results to return
 * @returns {Promise<object[]>} Array of formatted place objects
 */
export async function fetchNearbyPlaces(location, category = null, options = {}) {
  const { radius = 5000, priceLevel = null, limit = 20 } = options;

  const params = new URLSearchParams({
    lat: location.lat,
    lng: location.lng,
    radius,
    limit,
  });

  if (category) params.set('category', category);
  if (priceLevel) params.set('price_level', priceLevel);

  const response = await fetch(`/api/dates/suggestions?${params.toString()}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Places API error: ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions || [];
}
