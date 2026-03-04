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
    url: 'https://www.psychologytoday.com/us/blog/together-apart/feed',
    source: 'Psychology Today',
    tags: ['relationships', 'attachment', 'intimacy'],
    color: '#3D9970',
  },
  {
    url: 'https://www.mindbodygreen.com/rss.xml',
    source: 'Mind Body Green',
    tags: ['relationships', 'wellness', 'love'],
    color: '#F39C12',
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
      next: { revalidate: 60 },
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

      if (items.length >= 4) break
    }

    const EXCLUDE_KEYWORDS = [
      'parenting', 'children', 'kids', 'school', 'educator',
      'teacher', 'classroom', 'student', 'teen', 'teenager',
      'adolescent', 'parent', 'mother', 'father', 'divorce custody',
      'politics', 'election', 'climate', 'race', 'discrimination',
      'workplace', 'career', 'job', 'boss', 'employee',
    ]

    const REQUIRE_ONE_OF = [
      'relationship', 'couple', 'partner', 'love', 'intimacy',
      'connection', 'attachment', 'communication', 'marriage',
      'romance', 'trust', 'conflict', 'emotion', 'happiness',
      'wellbeing', 'well-being', 'bond', 'commitment', 'dating',
    ]

    const filtered = items.filter(item => {
      const text = (item.title + ' ' + item.description).toLowerCase()
      const hasExcluded = EXCLUDE_KEYWORDS.some(kw => text.includes(kw))
      const hasRequired = REQUIRE_ONE_OF.some(kw => text.includes(kw))
      return !hasExcluded && hasRequired
    })

    return filtered
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
    .filter((article, index, self) => {
      const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      return index === self.findIndex(a => {
        const aTitle = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
        return aTitle === normalizedTitle
      })
    })
    .slice(0, 20)

  return Response.json({ articles: allArticles })
}
