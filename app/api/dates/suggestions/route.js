export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { categorizeSuggestion, formatPlaceForDisplay } from '@/lib/date-suggestions';

// Maps our category keys to the Google Places 'type' filter
// (Nearby Search accepts a single type; we pick the most representative one)
const CATEGORY_TO_GOOGLE_TYPE = {
  romantic_dinner: 'restaurant',
  nightlife: 'bar',
  culture: 'museum',
  adventure: 'amusement_park',
  outdoor: 'park',
  relaxation: 'spa',
  wellness: 'spa',
  shopping: 'shopping_mall',
};

/**
 * GET /api/dates/suggestions
 *
 * Query params:
 *   lat         - Latitude  (required)
 *   lng         - Longitude (required)
 *   radius      - Search radius in metres, default 5000, max 50000
 *   category    - Our category key (optional, omit for all types)
 *   price_level - 1-4 (optional)
 *   limit       - Max results, default 20
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      );
    }

    const radius = Math.min(
      parseInt(searchParams.get('radius') || '5000', 10),
      50000
    );
    const category = searchParams.get('category') || null;
    const priceLevel = searchParams.get('price_level')
      ? parseInt(searchParams.get('price_level'), 10)
      : null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 60);

    const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 503 }
      );
    }

    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types'
      },
      body: JSON.stringify({
        includedTypes: category && CATEGORY_TO_GOOGLE_TYPE[category] ? [CATEGORY_TO_GOOGLE_TYPE[category]] : undefined,
        maxResultCount: limit || 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Number(radius) || 5000
          }
        }
      })
    })
    const googleData = await placesRes.json()
    const rawPlaces = googleData.places || []

    const places = rawPlaces.slice(0, limit);

    // Format and optionally filter by category (when no type filter was sent)
    const suggestions = places
      .map(formatPlaceForDisplay)
      .filter(p => !category || p.category === category);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Date suggestions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/dates/suggestions
 *
 * Used by fetchDateSuggestions() in lib/date-suggestions.js.
 * Accepts the full category config (placeTypes + keywords) so it can run
 * multiple Nearby Search calls and merge results.
 *
 * Body:
 *   location      - { lat, lng }  (required)
 *   placeTypes    - string[]       (required) — Google Place types to search
 *   keywords      - string[]       (optional) — keyword hint for the search
 *   maxPrice      - number 1-4     (optional)
 *   radius        - number metres  (optional, default 5000)
 *   avoidPlaceIds - string[]       (optional) — place_ids to exclude
 */
export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  try {
    const body = await request.json();
    const {
      location,
      placeTypes = [],
      keywords = [],
      maxPrice = null,
      radius: rawRadius = 5000,
      avoidPlaceIds = [],
    } = body;

    if (!location?.lat || !location?.lng) {
      return NextResponse.json(
        { error: 'location.lat and location.lng are required' },
        { status: 400 }
      );
    }

    if (placeTypes.length === 0) {
      return NextResponse.json(
        { error: 'placeTypes array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 503 }
      );
    }

    const radius = Math.min(Number(rawRadius) || 5000, 50000);
    const avoidSet = new Set(avoidPlaceIds);

    // Run one Nearby Search per placeType and merge results.
    // Google Nearby Search only accepts a single `type` per request.
    const allResults = [];
    const seenPlaceIds = new Set();

    for (const placeType of placeTypes) {
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types'
        },
        body: JSON.stringify({
          includedTypes: [placeType],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: location.lat, longitude: location.lng },
              radius: radius
            }
          }
        })
      })
      const data = await res.json()
      const rawPlaces = data.places || []

      if (!res.ok) {
        console.error(`Google Places HTTP error for type ${placeType}:`, res.status);
        continue;
      }

      for (const place of rawPlaces) {
        if (!seenPlaceIds.has(place.id) && !avoidSet.has(place.id)) {
          seenPlaceIds.add(place.id);
          allResults.push(place);
        }
      }
    }

    // Sort by rating descending, then format
    allResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const places = allResults.slice(0, 40).map(formatPlaceForDisplay);

    return NextResponse.json({ places });

  } catch (error) {
    console.error('Date suggestions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
