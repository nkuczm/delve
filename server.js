import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const NEWS_API_KEY = process.env.NEWS_API_KEY

// ─── Search NewsAPI for initial articles ─────────────────────────────────────
app.post('/api/search', async (req, res) => {
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
})

// ─── Navigate: Claude generates contextual stories ───────────────────────────
app.post('/api/navigate', async (req, res) => {
  const { currentStory, direction } = req.body
  if (!currentStory || !direction) {
    return res.status(400).json({ error: 'Missing currentStory or direction' })
  }

  const storyContext = `Title: ${currentStory.title}\nDescription: ${currentStory.description || 'No description'}\n${currentStory.content ? `Content excerpt: ${currentStory.content.slice(0, 600)}` : ''}`

  const bodyInstruction = `"body": "Full article text written as a proper news article. Write 4-6 substantial paragraphs (each 3-5 sentences) covering the story in depth — include specific facts, context, quotes, and analysis. Do not use placeholder text. Write as a real journalist would for a quality newspaper."`

  let prompt
  const count = direction === 'right' ? 1 : 3

  if (direction === 'up') {
    prompt = `You are a news curator helping a reader explore news at different levels of abstraction.

The reader is currently viewing this story:
${storyContext}

Generate exactly 3 news story summaries that provide BROADER context — bigger trends, macro forces, historical background, or systemic issues that explain why this story is happening. Each should zoom further out than the current story.

Think: What larger forces or trends does this story fit into? What's the bigger picture?

Return a JSON array of exactly 3 objects:
[
  {
    "title": "Engaging headline for the broader story",
    "description": "2-3 sentences explaining this broader context or trend",
    ${bodyInstruction},
    "source": "Type of publication that would cover this (e.g. The Economist, Reuters)",
    "topic": "The macro theme"
  }
]

Return ONLY the JSON array, no markdown, no other text.`
  } else if (direction === 'down') {
    prompt = `You are a news curator helping a reader explore news at different levels of abstraction.

The reader is currently viewing this story:
${storyContext}

Generate exactly 3 news story summaries that drill DOWN into SPECIFIC aspects, sub-stories, or granular details of this story. Each should focus on a different specific angle — a particular person, place, organization, or technical detail within the broader story.

Think: What are the specific individual threads, people, or events within this story?

Return a JSON array of exactly 3 objects:
[
  {
    "title": "Specific, detailed headline",
    "description": "2-3 sentences about this specific aspect or sub-story",
    ${bodyInstruction},
    "source": "Type of publication that would cover this",
    "topic": "The specific angle"
  }
]

Return ONLY the JSON array, no markdown, no other text.`
  } else if (direction === 'right') {
    prompt = `You are a news curator helping a reader explore news sideways.

The reader is currently viewing this story:
${storyContext}

Generate exactly 1 ALTERNATIVE news story that is on a related but meaningfully different topic at the same level of specificity. It should be something the reader would also find interesting given what they've been reading, but covering a genuinely different subject.

Think: What nearby topic would interest someone reading this story, but isn't just a variation of it?

Return a JSON array with exactly 1 object:
[
  {
    "title": "Headline for the alternative story",
    "description": "2-3 sentences about this different but related story",
    ${bodyInstruction},
    "source": "Type of publication that would cover this",
    "topic": "The related topic"
  }
]

Return ONLY the JSON array, no markdown, no other text.`
  }

  try {
    const stories = await generateStoriesWithClaude(prompt, count)
    res.json({ stories })
  } catch (err) {
    console.error('Claude navigate error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Shared Claude story generation ─────────────────────────────────────────
async function generateStoriesWithClaude(prompt, expectedCount) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'enabled', budget_tokens: 5000 },
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  const raw = textBlock?.text || '[]'

  // Extract JSON array (handle cases where model adds surrounding text)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) {
    console.error('No JSON array found in response:', raw.slice(0, 200))
    return []
  }

  try {
    const stories = JSON.parse(match[0])
    return stories.slice(0, expectedCount).map(s => ({
      title: s.title || 'Untitled',
      description: s.description || '',
      body: s.body || s.description || '',
      source: s.source || 'AI Generated',
      topic: s.topic || '',
      isAIGenerated: true,
    }))
  } catch (parseErr) {
    console.error('JSON parse error:', parseErr.message, match[0].slice(0, 200))
    return []
  }
}

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🗞  Delve server running at http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY not set — Claude navigation will fail')
  }
  if (!process.env.NEWS_API_KEY) {
    console.warn('⚠  NEWS_API_KEY not set — will use Claude for initial stories')
  }
})
