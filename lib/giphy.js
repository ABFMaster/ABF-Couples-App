// Giphy API integration for ABF Flirts feature

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const BASE_URL = 'https://api.giphy.com/v1/gifs';

// Preset search categories for love/relationship GIFs
export const GIPHY_CATEGORIES = [
  { label: 'Love', query: 'love you' },
  { label: 'Miss You', query: 'miss you' },
  { label: 'Thinking of You', query: 'thinking of you' },
  { label: "You're Amazing", query: 'youre amazing' },
  { label: 'Hugs', query: 'hugs' },
  { label: 'Kisses', query: 'kisses' },
  { label: 'Heart', query: 'heart love' },
  { label: 'Cute', query: 'cute couple' },
];

/**
 * Search for GIFs on Giphy
 * @param {string} query - Search term
 * @param {number} limit - Number of results (default 20)
 * @returns {Promise<Array>} Array of GIF objects
 */
export async function searchGifs(query, limit = 20) {
  if (!GIPHY_API_KEY) {
    console.warn('Giphy API key not configured');
    return [];
  }

  try {
    const res = await fetch(
      `${BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
    );

    if (!res.ok) {
      throw new Error('Giphy API request failed');
    }

    const data = await res.json();

    return data.data.map(gif => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small?.url || gif.images.preview_gif?.url,
      webp: gif.images.fixed_height?.webp,
      original: gif.images.original.url,
      width: parseInt(gif.images.fixed_height.width),
      height: parseInt(gif.images.fixed_height.height),
      title: gif.title,
    }));
  } catch (error) {
    console.error('Error searching GIFs:', error);
    return [];
  }
}

/**
 * Get trending GIFs from Giphy
 * @param {number} limit - Number of results (default 20)
 * @returns {Promise<Array>} Array of GIF objects
 */
export async function getTrendingGifs(limit = 20) {
  if (!GIPHY_API_KEY) {
    console.warn('Giphy API key not configured');
    return [];
  }

  try {
    const res = await fetch(
      `${BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`
    );

    if (!res.ok) {
      throw new Error('Giphy API request failed');
    }

    const data = await res.json();

    return data.data.map(gif => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small?.url || gif.images.preview_gif?.url,
      webp: gif.images.fixed_height?.webp,
      original: gif.images.original.url,
      width: parseInt(gif.images.fixed_height.width),
      height: parseInt(gif.images.fixed_height.height),
      title: gif.title,
    }));
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    return [];
  }
}

/**
 * Get a random GIF by search term
 * @param {string} query - Search term
 * @returns {Promise<Object|null>} Single GIF object or null
 */
export async function getRandomGif(query) {
  if (!GIPHY_API_KEY) {
    console.warn('Giphy API key not configured');
    return null;
  }

  try {
    const res = await fetch(
      `${BASE_URL}/random?api_key=${GIPHY_API_KEY}&tag=${encodeURIComponent(query)}&rating=g`
    );

    if (!res.ok) {
      throw new Error('Giphy API request failed');
    }

    const data = await res.json();
    const gif = data.data;

    if (!gif || !gif.images) {
      return null;
    }

    return {
      id: gif.id,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small?.url,
      webp: gif.images.fixed_height?.webp,
      original: gif.images.original.url,
      width: parseInt(gif.images.fixed_height.width),
      height: parseInt(gif.images.fixed_height.height),
      title: gif.title,
    };
  } catch (error) {
    console.error('Error fetching random GIF:', error);
    return null;
  }
}

/**
 * Check if Giphy API is configured
 * @returns {boolean}
 */
export function isGiphyConfigured() {
  return !!GIPHY_API_KEY;
}
