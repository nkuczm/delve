import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateStoriesWithClaude(prompt, expectedCount) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'enabled', budget_tokens: 5000 },
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  const raw = textBlock?.text || '[]'

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
