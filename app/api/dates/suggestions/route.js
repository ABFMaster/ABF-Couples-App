import { NextResponse } from 'next/server';
import { categorizeSuggestion, formatPlaceForDisplay } from '@/lib/date-suggestions';

// Maps our category keys to the Google Places 'type' filter
// (Nearby Search accepts a single type; we pick the most representative one)
const CATEGORY_TO_GOOGLE_TYPE = {
  romantic_dinner: 'restaurant',
  nightlife: 'bar',
  culture: 'museum',
  adventure: 'amusement_park',
  outdoor: 'park',
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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 503 }
      );
    }

    // Build Nearby Search URL
    const googleParams = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radius),
      key: apiKey,
    });

    // Map our category to a Google type filter
    if (category && CATEGORY_TO_GOOGLE_TYPE[category]) {
      googleParams.set('type', CATEGORY_TO_GOOGLE_TYPE[category]);
    }

    if (priceLevel) {
      // Google uses maxprice (0-4 scale; their 0 = free, 1-4 = $ to $$$$)
      // Our price_level is 1-4, so subtract 1 to align
      googleParams.set('maxprice', String(priceLevel - 1));
    }

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${googleParams.toString()}`;

    const googleRes = await fetch(placesUrl);
    if (!googleRes.ok) {
      console.error('Google Places API HTTP error:', googleRes.status);
      return NextResponse.json(
        { error: 'Failed to fetch from Google Places' },
        { status: 502 }
      );
    }

    const googleData = await googleRes.json();

    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error status:', googleData.status, googleData.error_message);
      return NextResponse.json(
        { error: `Google Places error: ${googleData.status}` },
        { status: 502 }
      );
    }

    const places = (googleData.results || []).slice(0, limit);

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
