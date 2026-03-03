const RSS_FEEDS = [
  {
    url: 'https://www.gottman.com/blog/feed/',
    source: 'The Gottman Institute',
    tags: ['relationships', 'communication', 'conflict'],
    color: '#E8614D',
  },
  {
    url: 'https://greatergood.berkeley.edu/site/rss/relationships',
    source: 'Greater Good Magazine',
    tags: ['wellbeing', 'connection', 'relationships'],
    color: '#6B5CE7',
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/heart-the-matter/feed',
    source: 'Psychology Today',
    tags: ['relationships', 'attachment', 'intimacy'],
    color: '#3D9970',
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/meet-catch-and-keep/feed',
    source: 'Psychology Today',
    tags: ['dating', 'relationships', 'attraction'],
    color: '#3D9970',
  },
  {
    url: 'https://positivepsychology.com/feed',
    source: 'Positive Psychology',
    tags: ['relationships', 'wellbeing', 'growth'],
    color: '#F39C12',
  },
]

async function parseFeed(feedConfig) {
  try {
    const res = await fetch(feedConfig.url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'ABF-App/1.0' },
    })
    const xml = await res.text()

    const items = []
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
      const item = match[1]

      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title>(.*?)<\/title>/)?.[1] ||
        ''
      const link =
        item.match(/<link>(.*?)<\/link>/)?.[1] ||
        item.match(/<link\s[^>]*href="([^"]*)"[^>]*\/>/)?.[1] ||
        ''
      const description =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ||
        ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      const imgMatch =
        item.match(/<media:thumbnail[^>]*url="([^"]*)"/) ||
        item.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image/) ||
        description.match(/<img[^>]*src="([^"]*)"/)
      const image = imgMatch?.[1] || null

      const cleanDesc = description
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, '')
        .trim()
        .replace(/The post .+ appeared first on .+\.?$/i, '')
        .replace(/The post .+$/i, '')
        .trim()
        .slice(0, 200)

      if (title && link) {
        items.push({
          id: Buffer.from(link).toString('base64').slice(0, 16),
          title: title.trim(),
          description: cleanDesc + (cleanDesc.length >= 200 ? '...' : ''),
          url: link.trim(),
          source: feedConfig.source,
          sourceColor: feedConfig.color,
          tags: feedConfig.tags,
          image,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        })
      }

      if (items.length >= 5) break
    }

    return items
  } catch (err) {
    console.error(`Feed error for ${feedConfig.source}:`, err)
    return []
  }
}

export async function GET() {
  const results = await Promise.allSettled(RSS_FEEDS.map(parseFeed))

  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  return Response.json({ articles: allArticles })
}
