/**
 * Date Suggestions - Smart algorithm + Google Places API helpers
 *
 * Architecture:
 *   selectDateSuggestions()  → ranks categories by assessment + weather
 *   fetchDateSuggestions()   → calls POST /api/dates/suggestions for a category
 *   fetchNearbyPlaces()      → low-level GET wrapper (single category)
 *   formatPlaceForDisplay()  → normalizes a raw Google Place object
 *   categorizeSuggestion()   → maps Google types → our category
 *
 * Google Places Nearby Search API (cheaper than Text Search):
 * https://developers.google.com/maps/documentation/places/web-service/nearby-search
 */

import { supabase } from '@/lib/supabase';

// ============================================
// DATE CATEGORIES
//
// Each category defines:
//   placeTypes   - Google Places types for Nearby Search
//   keywords     - keyword hints passed alongside the type filter
//   emoji        - display emoji
//   matchesAssessment - assessment module keys → minimum score threshold
//     (category is recommended when the user's score for that module is
//      below the threshold, meaning it needs work)
// ============================================
export const DATE_CATEGORIES = {
  romantic_dinner: {
    label: 'Romantic Dinner',
    emoji: '🍷',
    placeTypes: ['restaurant', 'cafe'],
    keywords: ['romantic', 'intimate', 'upscale', 'date night'],
    // Not a ticketed-event genre — leave Ticketmaster results unfiltered.
    ticketmasterKeyword: null,
    // Good for: deepening emotional expression and practiced conversation
    matchesAssessment: {
      love_expressions: 70,   // Prioritize when love expression needs work
      communication: 60,      // Dinner table = natural deep-conversation setting
    },
  },

  adventure: {
    label: 'Adventure',
    emoji: '🎯',
    placeTypes: ['park', 'hiking_area', 'amusement_park', 'tourist_attraction'],
    keywords: ['outdoor', 'active', 'adventure', 'nature'],
    // Catches immersive/novelty events (escape rooms, pop-up experiences,
    // things like "Mind of a Serial Killer: The Experience") that Google
    // Places' fixed types never surface.
    ticketmasterKeyword: 'experience',
    // Good for: building shared experiences and strengthening secure attachment
    matchesAssessment: {
      shared_vision: 70,        // Shared new experiences reinforce common goals
      attachment_security: 60,  // Novelty + teamwork builds trust
    },
  },

  culture: {
    label: 'Arts & Culture',
    emoji: '🎭',
    placeTypes: ['museum', 'art_gallery', 'theater', 'performing_arts_theater'],
    keywords: ['art', 'culture', 'museum', 'theater'],
    ticketmasterKeyword: 'theater',
    // Good for: sparking meaningful conversation and aligning on values
    matchesAssessment: {
      shared_vision: 75,   // Exploring ideas together clarifies shared values
      communication: 65,   // Art prompts reflection and talking
    },
  },

  nightlife: {
    label: 'Nightlife',
    emoji: '🌙',
    placeTypes: ['bar', 'night_club', 'live_music_venue'],
    keywords: ['bar', 'drinks', 'music', 'cocktails'],
    ticketmasterKeyword: 'music',
    // Good for: playfulness and social bonding
    matchesAssessment: {
      love_expressions: 65,  // Fun, lighthearted expression of affection
      communication: 70,     // Relaxed social setting lowers communication barriers
    },
  },

  relaxation: {
    label: 'Relaxation',
    emoji: '✨',
    placeTypes: ['spa', 'wellness_center', 'cafe', 'park'],
    keywords: ['spa', 'relaxing', 'peaceful', 'quiet'],
    // Not a ticketed-event genre — leave Ticketmaster results unfiltered.
    ticketmasterKeyword: null,
    // Good for: calming anxiety and rebuilding secure attachment
    matchesAssessment: {
      attachment_security: 75,  // Low-pressure environment reduces anxiety
      communication: 70,        // Calm settings make difficult conversations easier
    },
  },
};

// ============================================
// CATEGORY DISPLAY CONFIG (all categories incl. fallbacks)
// Derived from DATE_CATEGORIES for smart categories; extras for Google Place
// types that don't fit cleanly into the five.
// ============================================
export const CATEGORY_CONFIG = {
  ...Object.fromEntries(
    Object.entries(DATE_CATEGORIES).map(([key, cat]) => [
      key,
      { label: cat.label, emoji: cat.emoji },
    ])
  ),
  outdoor: { label: 'Outdoors', emoji: '🌿' },
  wellness: { label: 'Wellness', emoji: '💆' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  other: { label: 'Other', emoji: '📍' },
};

// ============================================
// GOOGLE TYPE → CATEGORY MAPPING
// Used by categorizeSuggestion() + formatPlaceForDisplay()
// ============================================
const GOOGLE_TYPE_TO_CATEGORY = {
  // Romantic dinner
  restaurant: 'romantic_dinner',
  food: 'romantic_dinner',
  meal_delivery: 'romantic_dinner',
  meal_takeaway: 'romantic_dinner',
  cafe: 'romantic_dinner',
  bakery: 'romantic_dinner',

  // Nightlife
  bar: 'nightlife',
  night_club: 'nightlife',
  live_music_venue: 'nightlife',

  // Culture
  museum: 'culture',
  art_gallery: 'culture',
  library: 'culture',
  movie_theater: 'culture',
  performing_arts_theater: 'culture',
  theater: 'culture',
  stadium: 'culture',
  zoo: 'culture',
  aquarium: 'culture',
  tourist_attraction: 'culture',

  // Adventure
  amusement_park: 'adventure',
  bowling_alley: 'adventure',
  gym: 'adventure',

  // Outdoor (maps to 'outdoor', not 'adventure', so Google park results
  // stay visually distinct from adrenaline activities)
  park: 'outdoor',
  campground: 'outdoor',
  natural_feature: 'outdoor',
  hiking_area: 'outdoor',

  // Relaxation / Wellness
  spa: 'relaxation',
  wellness_center: 'relaxation',

  // Shopping
  shopping_mall: 'shopping',
  store: 'shopping',
};

// ============================================
// LOW-LEVEL HELPERS
// ============================================

/**
 * Map a Google Places types array to our category.
 * Tries each type in order; falls back to 'other'.
 *
 * @param {string[]} types - Google Places types for a place
 * @returns {string} Category key
 */
export function categorizeSuggestion(types = []) {
  for (const type of types) {
    const category = GOOGLE_TYPE_TO_CATEGORY[type];
    if (category) return category;
  }
  return 'other';
}

/**
 * Normalize a raw Google Places Nearby Search result into our schema shape.
 *
 * Note: website_url is not included in Nearby Search responses — it requires
 * a separate Place Details API call. Leave as null here.
 *
 * @param {object} place - Raw place from Google Places API
 * @returns {object} Formatted place
 */
export function formatPlaceForDisplay(place) {
  const displayName = place.displayName?.text ?? null;
  const category = categorizeSuggestion(place.types || []);

  const mapsUrl = place.id
    ? `https://www.google.com/maps/place/?q=place_id:${place.id}`
    : null;

  let photoUrl = null;
  if (place.photos?.[0]?.name) {
    const key = process.env.GOOGLE_PLACES_SERVER_KEY;
    photoUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=800&key=${key}`;
  }

  const lat = place.location?.latitude ?? null;
  const lng = place.location?.longitude ?? null;
  const address = place.formattedAddress ?? null;

  return {
    place_id: place.id,
    name: displayName,
    title: displayName,
    description: address,
    category,
    location_name: displayName,
    address,
    latitude: lat,
    longitude: lng,
    lat,
    lng,
    price_level: place.priceLevel ?? null,
    rating: place.rating ?? null,
    photo_url: photoUrl,
    website_url: null,
    maps_url: mapsUrl,
    source: 'google_places',
  };
}

// ============================================
// SMART SELECTION ALGORITHM
// ============================================

/**
 * Adjust a ranked category list based on current weather.
 * Rainy/cold → deprioritise outdoor adventure.
 * Sunny/warm → surface adventure first.
 *
 * @param {string[]} categories - Ordered category keys
 * @param {string|null} weather - 'sunny'|'warm'|'rainy'|'cold'|null
 * @returns {string[]} Adjusted category list (deduped)
 */
function adjustForWeather(categories, weather) {
  if (weather === 'rainy' || weather === 'cold') {
    // Move adventure to the back; front-load indoor options
    const withoutAdventure = categories.filter(c => c !== 'adventure');
    const indoor = ['culture', 'romantic_dinner', 'nightlife', 'relaxation'];
    const merged = [
      ...indoor,
      ...withoutAdventure.filter(c => !indoor.includes(c)),
    ];
    // Keep adventure available but last
    if (categories.includes('adventure')) merged.push('adventure');
    return [...new Set(merged)];
  }

  if (weather === 'sunny' || weather === 'warm') {
    // Surface adventure and outdoor first
    return [...new Set(['adventure', ...categories])];
  }

  return [...new Set(categories)];
}

/**
 * Score a single category by how many of its assessment thresholds are
 * triggered (i.e. the couple's score for that module is below the
 * category's threshold — see DATE_CATEGORIES.matchesAssessment). Higher
 * score = more strongly indicated by the assessment. Exported so callers
 * can compare two specific categories directly instead of relying on
 * selectDateSuggestions()'s full ranked list, whose stable-sort tie-break
 * falls back to DATE_CATEGORIES' insertion order — fine for a single
 * "best category" pick, but unsafe for picking between several fixed
 * vibes that must stay distinct when there's no assessment signal at all.
 *
 * @param {string} categoryKey - Key from DATE_CATEGORIES
 * @param {object} assessmentScores - { moduleKey: percentage, … }
 * @returns {number} 0 if untriggered / no data
 */
export function scoreCategory(categoryKey, assessmentScores = {}) {
  const cat = DATE_CATEGORIES[categoryKey];
  if (!cat) return 0;
  let score = 0;
  for (const [module, threshold] of Object.entries(cat.matchesAssessment)) {
    const userScore = assessmentScores[module];
    if (userScore !== undefined && userScore < threshold) {
      score += (threshold - userScore);
    }
  }
  return score;
}

/**
 * Select and rank date categories based on the user's relationship assessment
 * scores, weather, and recent date history.
 *
 * How assessment matching works:
 *   Each DATE_CATEGORY declares matchesAssessment = { moduleKey: threshold }.
 *   A category is recommended when the user's score for that module is BELOW
 *   the threshold (i.e. the module needs attention and this date type helps).
 *   Categories with more matching weak areas are ranked higher.
 *
 * NOTE (found during the Aug 3 Date Night audit): the `categories` field
 * this function returns — the whole point of steps 1 and 2 below — has no
 * consumer. Its one real caller, app/dates/page.js's handleBuildIdea(),
 * only destructures { avoidPlaceIds, radius, maxPrice } and picks the
 * category a different way, via pickCategoryForVibe()/scoreCategory()
 * directly. That's not an oversight — pickCategoryForVibe() was built
 * later specifically to fix a real bug (two different vibes silently
 * collapsing onto the same category when assessment data didn't clearly
 * favor either one; see "Fix Something Slow / Something Just Us returning
 * same events" in the backlog) by locking each vibe to one primary/
 * alternate pair instead of freely re-ranking all 5 categories. This
 * function's full ranking — and therefore weatherCondition/
 * adjustForWeather() below — has been unused ever since, and no caller
 * anywhere passes weatherCondition. Left in place rather than deleted
 * since it's a real, isolated, working feature that could be wired back
 * in (e.g. to break primary/alternate ties by weather) — that's a product
 * call, not something to guess at here.
 *
 * @param {object} options
 * @param {object} options.userLocation         - { lat, lng } (reserved for future geo-ranking)
 * @param {object} [options.assessmentScores]   - { communication: 65, love_expressions: 58, … }
 * @param {object[]} [options.recentDates]      - Completed date objects with optional place_id
 * @param {string|null} [options.weatherCondition] - 'sunny'|'warm'|'rainy'|'cold'|null — currently never passed by any caller
 * @param {object} [options.preferences]        - { maxPrice: 1-4, radius: metres }
 * @returns {{ categories: string[], avoidPlaceIds: string[], radius: number, maxPrice: number }}
 */
export function selectDateSuggestions(options) {
  const {
    userLocation,
    assessmentScores = {},
    recentDates = [],
    weatherCondition = null,
    preferences = {},
  } = options;

  // 1. Score each category by how many of its assessment thresholds are triggered
  const categoryScores = Object.keys(DATE_CATEGORIES).map(key => ({
    key,
    score: scoreCategory(key, assessmentScores),
  }));

  // 2. Sort by score descending; categories with 0 matches go to the end.
  // Object.keys(DATE_CATEGORIES) always has entries, so this is always
  // non-empty — no fallback-to-default-order branch needed.
  const ranked = categoryScores
    .sort((a, b) => b.score - a.score)
    .map(c => c.key);

  // 3. Adjust for weather
  const weatherAdjusted = adjustForWeather(ranked, weatherCondition);

  // 4. Collect place IDs from recent dates to avoid showing the same spots
  const avoidPlaceIds = recentDates
    .map(d => d.place_id)
    .filter(Boolean);

  return {
    categories: weatherAdjusted,
    avoidPlaceIds,
    radius: preferences.radius || 5000,
    maxPrice: preferences.maxPrice || 3,
  };
}

// ============================================
// FETCH HELPERS
// ============================================

/**
 * Fetch place suggestions for a specific category via POST /api/dates/suggestions.
 * Passes the full category config (placeTypes + keywords) to the API route so it
 * can do a richer Nearby Search than the simple GET endpoint.
 *
 * @param {object} params
 * @param {object} params.location       - { lat, lng }
 * @param {string} params.category       - Category key from DATE_CATEGORIES
 * @param {number} [params.maxPrice]     - 1-4
 * @param {number} [params.radius]       - Metres, default 5000
 * @param {string[]} [params.avoidPlaceIds] - Place IDs to exclude from results
 * @returns {Promise<object[]>} Formatted place objects
 */
export async function fetchDateSuggestions(params) {
  const { location, category, maxPrice, radius, avoidPlaceIds = [] } = params;

  const categoryConfig = DATE_CATEGORIES[category];
  if (!categoryConfig) throw new Error(`Unknown category: ${category}`);

  // Route now requires auth (Aug 3 fix — was the one Date Night route with
  // none at all, a free cost-abuse path against the Google Places key).
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/dates/suggestions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      location,
      placeTypes: categoryConfig.placeTypes,
      keywords: categoryConfig.keywords,
      maxPrice,
      radius,
      avoidPlaceIds,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Suggestions API error: ${response.status}`);
  }

  const data = await response.json();
  return data.places || [];
}

/**
 * Low-level GET-based fetch. Sends a single category key and uses the
 * existing query-param API route. Prefer fetchDateSuggestions() for
 * smart-algorithm-driven calls.
 *
 * @param {object} location - { lat, lng }
 * @param {string|null} category - Category key, or null for all
 * @param {object} [options]
 * @param {number} [options.radius=5000]
 * @param {number} [options.priceLevel]
 * @param {number} [options.limit=20]
 * @returns {Promise<object[]>}
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

  // Same auth requirement as fetchDateSuggestions() above.
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`/api/dates/suggestions?${params.toString()}`, {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Places API error: ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions || [];
}
