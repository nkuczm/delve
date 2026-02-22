# Delve — Navigate News at Every Level

A web app that lets you explore news stories spatially — zoom out to bigger trends, zoom in to specific details, or swipe sideways to find alternative stories.

## How It Works

| Gesture | Action |
|---------|--------|
| **Swipe Up** / `↑` | Get 3 broader stories — bigger trends, macro context |
| **Swipe Down** / `↓` | Get 3 specific stories — drill into details, sub-topics |
| **Swipe Right** / `→` | Get an alternative story at the same level |
| **Swipe Left** / `←` | Go back to your previous story |

Start by searching for any topic. After swiping up or down, you'll see 3 story cards — tap one to dive into it.

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd delve
npm install
```

### 2. Configure API keys

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

- **`ANTHROPIC_API_KEY`** — Get from [console.anthropic.com](https://console.anthropic.com/)
- **`NEWS_API_KEY`** — Get from [newsapi.org](https://newsapi.org/register) (free plan works)
  - If you skip this, Claude will generate starter stories instead of real articles

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

```
┌─────────────────────────────────┐
│  React Frontend (Vite + TS)     │
│  - SearchBar                    │
│  - StoryView (swipe detection)  │
│  - ChoiceCards (pick 1 of 3)    │
│  - LoadingOverlay               │
└──────────────┬──────────────────┘
               │ HTTP /api/*
┌──────────────▼──────────────────┐
│  Express Backend (Node.js)      │
│  - POST /api/search             │  → NewsAPI (real articles)
│  - POST /api/navigate           │  → Claude claude-opus-4-6 (AI stories)
└─────────────────────────────────┘
```

### Navigation Logic

- **Initial search**: Fetches real articles from NewsAPI (falls back to Claude if no key)
- **Up/Down swipe**: Claude generates 3 contextually related stories, user picks one
- **Right swipe**: Claude generates 1 alternative, immediately becomes current story
- **Left swipe**: Pops the navigation history stack

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, `react-swipeable`
- **Backend**: Node.js, Express
- **AI**: Claude `claude-opus-4-6` with adaptive thinking
- **News**: NewsAPI.org
