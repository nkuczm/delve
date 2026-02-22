import { generateStoriesWithClaude } from './_claude.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
}
