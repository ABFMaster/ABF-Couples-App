const RSS_FEEDS = [
  {
    url: 'https://www.gottman.com/blog/feed/',
    source: 'The Gottman Institute',
    tags: ['conflict', 'communication', 'intimacy'],
    color: '#E8614D',
  },
  {
    url: 'https://greatergood.berkeley.edu/site/rss/relationships',
    source: 'Greater Good Magazine',
    tags: ['connection', 'wellbeing', 'intimacy'],
    color: '#6B5CE7',
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/the-attraction-doctor/feed',
    source: 'Psychology Today',
    tags: ['intimacy', 'connection', 'attachment'],
    color: '#3D9970',
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/fulfillment-any-age/feed',
    source: 'Psychology Today',
    tags: ['intimacy', 'wellbeing', 'connection'],
    color: '#3D9970',
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/the-mysteries-love/feed',
    source: 'Psychology Today',
    tags: ['attachment', 'intimacy', 'connection'],
    color: '#3D9970',
  },
  {
    url: 'https://practicalintimacy.com/blog/feed/',
    source: 'Practical Intimacy',
    tags: ['intimacy', 'connection', 'communication'],
    color: '#9C27B0',
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

      if (items.length >= 10) break
    }

    const EXCLUDE_KEYWORDS = [
      'parenting', 'children', 'kids', 'school', 'educator',
      'teacher', 'classroom', 'student', 'teen', 'teenager',
      'adolescent', 'parent', 'mother', 'father', 'divorce custody',
      'politics', 'election', 'climate', 'race', 'discrimination',
      'workplace', 'career', 'job', 'boss', 'employee',
      'procrastinat', 'narcissist', 'generation', 'best life',
      'watch out', 'ufo', 'count the', 'nice people',
      'stay nice', 'snub', 'volunteering', 'queer eye',
      'bridging di', 'living your',
    ]

    const filtered = items.filter(item => {
      const text = (item.title + ' ' + item.description).toLowerCase()
      return !EXCLUDE_KEYWORDS.some(kw => text.includes(kw))
    })

    return filtered
  } catch (err) {
    console.error(`Feed error for ${feedConfig.source}:`, err)
    return []
  }
}

export async function GET() {
  const results = await Promise.allSettled(RSS_FEEDS.map(parseFeed))

  // Deduplicate first
  const deduped = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter((article, index, self) => {
      const normalizedTitle = article.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 40)
      return index === self.findIndex(a => {
        const aTitle = a.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 40)
        return aTitle === normalizedTitle
      })
    })

  // Cap each source at 5 articles
  const sourceCounts = {}
  const allArticles = deduped
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter(article => {
      const source = article.source
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
      return sourceCounts[source] <= 5
    })
    .slice(0, 25)

  return Response.json({ articles: allArticles })
}
