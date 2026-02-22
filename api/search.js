import { generateStoriesWithClaude } from './_claude.js'

const NEWS_API_KEY = process.env.NEWS_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Missing query' })

  // If no NewsAPI key, use Claude to generate starter stories
  if (!NEWS_API_KEY) {
    console.log('No NEWS_API_KEY — using Claude to generate starter stories')
    try {
      const stories = await generateStoriesWithClaude(
        `Generate 5 current news stories about: "${query}". Make them realistic and informative, with full article text.`,
        5
      )
      return res.json({ articles: stories, source: 'claude' })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'ok') {
      // Fall back to Claude if NewsAPI fails
      console.warn('NewsAPI error:', data.message, '— falling back to Claude')
      const stories = await generateStoriesWithClaude(
        `Generate 5 current news stories about: "${query}". Make them realistic and informative, with full article text.`,
        5
      )
      return res.json({ articles: stories, source: 'claude' })
    }

    const articles = data.articles
      .filter(a => a.title && a.title !== '[Removed]')
      .map(a => ({
        title: a.title,
        description: a.description,
        body: a.content || a.description,
        content: a.content,
        url: a.url,
        source: a.source?.name,
        imageUrl: a.urlToImage,
        publishedAt: a.publishedAt,
        isAIGenerated: false,
      }))

    res.json({ articles, source: 'newsapi' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
