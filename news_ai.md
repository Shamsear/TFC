# News AI System - Complete Documentation

## Overview

The News AI System is an automated bilingual (English + Malayalam) sports news generation platform built for the Turf Cats eFootball League tournament management system. It uses Google's Gemini AI to generate contextual, engaging news articles in real-time based on tournament events like auctions, matches, transfers, achievements, and administrative actions.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [How It Works](#how-it-works)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Environment Variables](#environment-variables)
6. [Core Components](#core-components)
7. [Event Types](#event-types)
8. [Tone System](#tone-system)
9. [Image Generation](#image-generation)
10. [API Endpoints](#api-endpoints)
11. [Database Schema](#database-schema)
12. [Usage Examples](#usage-examples)
13. [Testing](#testing)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tournament Events                         │
│  (Player Registration, Matches, Auctions, Fantasy, etc.)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Event Trigger (triggerNews)                     │
│  - Determines event category                                 │
│  - Prepares metadata                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           News Generation API (/api/news)                    │
│  - Receives generation request                               │
│  - Calls bilingual generator                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Bilingual News Generator (generateBilingualNews)      │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  English Branch  │         │ Malayalam Branch │         │
│  │  - Gemini AI     │         │  - Gemini AI     │         │
│  │  - Tone System   │         │  - Tone System   │         │
│  │  - Prompts       │         │  - Prompts       │         │
│  └──────────────────┘         └──────────────────┘         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Image Generation (generateNewsImage)                │
│  - Pollinations.ai (Primary - Free)                         │
│  - Hugging Face (Fallback)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Storage (Neon PostgreSQL)              │
│  - Stores bilingual content                                  │
│  - Metadata & images                                         │
│  - Publishing status                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Admin Review Panel (/admin/news)                   │
│  - Review AI-generated content                               │
│  - Publish/Unpublish                                         │
│  - Edit if needed                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Public News Display (/news)                     │
│  - Bilingual news feed                                       │
│  - Language toggle (EN/ML)                                   │
│  - Category filtering                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Step-by-Step Process

1. **Event Occurs**: A tournament event happens (e.g., player registration milestone, match result, auction completion)

2. **Event Trigger**: The system calls `triggerNews()` with:
   - Event type (e.g., `'player_milestone'`)
   - Metadata (player count, team names, scores, etc.)
   - Season information

3. **Tone Determination**: The system automatically determines the appropriate tone:
   - **Neutral**: Professional, factual reporting
   - **Dramatic**: Exciting, storytelling style
   - **Funny**: Witty, entertaining commentary
   - **Harsh**: Critical, sarcastic roasting

4. **Bilingual Generation**: Two parallel AI calls to Gemini:
   - **English**: Uses reporter "Alex Thompson" persona
   - **Malayalam**: Uses reporter "Rajesh Nair" persona
   - Each with language-specific prompts and tone instructions

5. **Content Parsing**: AI responses are parsed into structured format:
   ```json
   {
     "title": "Headline (under 80 chars)",
     "content": "2-3 paragraphs (~150-200 words)",
     "summary": "One sentence summary (under 100 chars)"
   }
   ```

6. **Image Generation**: 
   - Primary: Pollinations.ai (free, no API key)
   - Fallback: Hugging Face Stable Diffusion XL
   - Images include event-specific text overlays

7. **Database Storage**: News saved to Neon PostgreSQL with:
   - Bilingual content (title_en, title_ml, content_en, content_ml)
   - Metadata, tone, reporter names
   - Image URL
   - Publishing status

8. **Admin Review**: Admins can review, edit, publish/unpublish via `/admin/news`

9. **Public Display**: Published news appears on public feed with language toggle

---

## Key Features

### 1. **Bilingual Content Generation**
- Simultaneous English and Malayalam generation
- Language-specific reporter personas
- Cultural adaptation (not just translation)

### 2. **Dynamic Tone System**
- Automatically selects tone based on event type
- 4 tone variations: Neutral, Dramatic, Funny, Harsh
- Tone-specific writing instructions for AI

### 3. **Event-Aware Prompts**
- 50+ event types supported
- Context-specific prompts for each event
- Metadata-driven content generation

### 4. **Retry & Fallback Mechanisms**
- 3 retry attempts for AI generation
- Exponential backoff for rate limits
- Multiple API key rotation support

### 5. **Image Generation**
- Free image generation via Pollinations.ai
- Event-specific visual themes
- Text overlay support for scores/names

### 6. **Admin Control**
- Review before publishing
- Edit AI-generated content
- Bulk management interface

---

## Technology Stack

### AI & ML
- **Google Gemini 2.0 Flash**: Primary AI model for text generation
- **Pollinations.ai**: Free image generation (primary)
- **Hugging Face Stable Diffusion XL**: Image generation (fallback)

### Backend
- **Next.js 16**: API routes and server-side rendering
- **Neon PostgreSQL**: Database for news storage via `@neondatabase/serverless`
- **Prisma ORM**: Database client and schema management
- **NextAuth.js v5**: Authentication system

### Frontend
- **React 19**: UI components
- **TypeScript 6**: Type safety
- **Tailwind CSS 4**: Styling
- **Framer Motion**: Animations

### Media & Storage
- **ImageKit**: Image hosting and CDN
- **ImageKit.io React**: Client-side image uploads

### Notifications
- **Web Push**: Push notifications via `web-push` library
- **Inngest**: Background job processing for notifications

### Libraries
- `@google/generative-ai`: Gemini AI SDK
- `@huggingface/inference`: Hugging Face API
- `@neondatabase/serverless`: Neon database client
- `@prisma/client`: Prisma ORM
- `next-auth`: Authentication
- `web-push`: Push notifications
- `inngest`: Background jobs
- `imagekit`: Image management
- `bcryptjs`: Password hashing
- `zod`: Schema validation

---

## Environment Variables

### Required Variables

Add these to your `.env.local` file:

```bash
# ================================================
# GOOGLE GEMINI AI (Required for News Generation)
# ================================================
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional API keys for rate limit rotation
GEMINI_API_KEY_2=your_second_gemini_api_key
GEMINI_API_KEY_3=your_third_gemini_api_key

# ================================================
# HUGGING FACE (Optional - Fallback for Images)
# ================================================
# Get from: https://huggingface.co/settings/tokens
HUGGING_FACE_TOKEN=your_hugging_face_token_here

# ================================================
# NEON DATABASE (Required)
# ================================================
# Your Neon PostgreSQL connection strings
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&pgbouncer=true&connection_limit=5&pool_timeout=10"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"

# ================================================
# NEXTAUTH.JS (Required for Authentication)
# ================================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# ================================================
# IMAGEKIT (Required for Image Hosting)
# ================================================
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id/

# ================================================
# ENCRYPTION (Required for Sensitive Data)
# ================================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_SECRET=your-64-character-hex-key-here
```

### How to Get API Keys

#### 1. Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key to `GEMINI_API_KEY`

**Rate Limits**: 
- Free tier: 60 requests per minute
- Use multiple keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3) for automatic rotation

#### 2. Hugging Face Token (Optional)
1. Visit [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create new token with "Read" access
3. Copy to `HUGGING_FACE_TOKEN`

**Note**: Pollinations.ai is used by default (no API key needed)

#### 3. Neon Database
1. Visit [Neon Console](https://console.neon.tech)
2. Create project or select existing
3. Copy connection strings from dashboard
4. Add pooled connection to `DATABASE_URL`
5. Add direct connection to `DIRECT_URL`

#### 4. NextAuth Secret
Generate a secure secret:
```bash
openssl rand -base64 32
```
Add to `NEXTAUTH_SECRET`

#### 5. ImageKit
1. Visit [ImageKit Dashboard](https://imagekit.io/dashboard)
2. Get your public key, private key, and URL endpoint
3. Add to respective environment variables

#### 6. Encryption Secret
Generate a 64-character hex key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add to `ENCRYPTION_SECRET`

---

## Core Components

### 1. News Trigger (`lib/news/trigger.ts`)

**Purpose**: Simplifies triggering news generation from anywhere in the app

```typescript
import { triggerNews } from '@/lib/news/trigger';

// Example: Trigger news for player milestone
await triggerNews('player_milestone', {
  season_id: 'SSPSLS17',
  season_name: 'Season 17',
  milestone_number: 100,
  player_count: 100
});
```

**Key Functions**:
- `triggerNews()`: Main trigger function
- `isPlayerMilestone()`: Check if count is a milestone
- `getEventCategory()`: Auto-determine category from event type

### 2. Bilingual Generator (`lib/news/auto-generate.ts`)

**Purpose**: Generates news in both English and Malayalam

```typescript
import { generateBilingualNews } from '@/lib/news/auto-generate';

const result = await generateBilingualNews({
  event_type: 'match_result',
  category: 'match',
  season_id: 'SSPSLS17',
  metadata: {
    home_team: 'Red Panthers',
    away_team: 'Blue Tigers',
    home_score: 3,
    away_score: 2,
    winner: 'Red Panthers'
  }
});

// result.en = { title, content, summary, tone, reporter }
// result.ml = { title, content, summary, tone, reporter }
```

**Features**:
- Parallel generation (EN + ML)
- Retry logic with exponential backoff
- JSON response parsing with fallbacks
- Error handling and logging

### 3. Tone System (`lib/news/determine-tone.ts`)

**Purpose**: Automatically determines appropriate tone for each event

```typescript
import { determineTone } from '@/lib/news/determine-tone';

const tone = determineTone({
  event_type: 'thrashing',
  metadata: { goal_diff: 5 }
});
// Returns: 'harsh' (for roasting the losing team)
```

**Tone Rules**:
- **Neutral**: Injuries, lineup locks, general announcements
- **Dramatic**: Close matches, milestones, championships
- **Funny**: Draws, bargain signings, early bird surges
- **Harsh**: Thrashings, budget crises, lineup failures

### 4. Prompt Generator (`lib/news/prompts-bilingual.ts`)

**Purpose**: Creates language-specific prompts for Gemini AI

```typescript
import { generatePrompt } from '@/lib/news/prompts-bilingual';

const enPrompt = generatePrompt(input, 'en');
const mlPrompt = generatePrompt(input, 'ml');
```

**Prompt Structure**:
1. Reporter persona introduction
2. Personality and tone instructions
3. Event context and metadata
4. Format requirements (JSON)
5. Uniqueness guidelines

### 5. Image Generator (`lib/images/generate.ts`)

**Purpose**: Generates event-specific images with text overlays

```typescript
import { generateNewsImage } from '@/lib/images/generate';

const imageUrl = await generateNewsImage(
  'match_result',
  {
    home_team: 'Red Panthers',
    away_team: 'Blue Tigers',
    home_score: 3,
    away_score: 2
  },
  'news_123'
);
```

**Image Services**:
1. **Pollinations.ai** (Primary - Free)
   - No API key required
   - URL-based generation
   - Fast and reliable

2. **Hugging Face** (Fallback)
   - Requires API token
   - Stable Diffusion XL model
   - Higher quality but slower

### 6. Gemini Config (`lib/gemini/config.ts`)

**Purpose**: Manages Gemini API connections and key rotation

**Features**:
- Multiple API key support
- Automatic key rotation on rate limits
- Connection testing
- Error handling

```typescript
import { getGeminiModel } from '@/lib/gemini/config';

const model = getGeminiModel();
const result = await model.generateContent(prompt);
```

---

## Event Types

The system supports 60+ event types across 10 categories:

### Season Events
- `season_created`: New season announcement
- `season_activated`: Season goes live
- `season_completed`: Season ends
- `season_milestone`: Season reaches milestone (e.g., 10th season)

### Team Events
- `team_registered`: New team joins season
- `team_squad_complete`: Team completes minimum roster (5 players)
- `team_level_up`: Team reaches new level
- `team_badge_unlocked`: Team unlocks achievement badge
- `team_xp_milestone`: Team reaches XP milestone (1000, 5000, 10000 XP)

### Auction Events
- `auction_calendar_created`: Auction schedule announced
- `auction_round_scheduled`: New auction round scheduled
- `auction_round_started`: Auction round goes LIVE
- `auction_round_completed`: Auction round ends
- `normal_round_result`: Normal auction round results
- `bulk_round_result`: Bulk auction round results
- `tiebreaker_created`: Tiebreaker battle begins
- `tiebreaker_resolved`: Tiebreaker winner decided
- `bulk_tiebreaker_created`: Bulk tiebreaker begins
- `bulk_tiebreaker_resolved`: Bulk tiebreaker winner decided
- `record_breaking_bid`: Highest bid in season/tournament history
- `bargain_signing`: Great value player signing (low price, high rating)
- `expensive_signing`: High-value player signing (top 5 most expensive)
- `auction_plan_submitted`: Team submits auction strategy

### Player Transfer Events
- `player_sold`: Player sold in auction
- `player_released`: Player released from team (admin action)
- `player_swap`: Players swapped between teams
- `release_request_submitted`: Team requests player release
- `release_request_approved`: Admin approves release request
- `release_request_rejected`: Admin rejects release request
- `swap_request_submitted`: Team requests player swap
- `swap_request_approved`: Admin approves swap request
- `swap_request_rejected`: Admin rejects swap request
- `release_window_opened`: Release request window opens
- `release_window_closed`: Release request window closes
- `swap_window_opened`: Swap request window opens
- `swap_window_closed`: Swap request window closes
- `retention_completed`: Teams complete player retention for new season

### Tournament Events
- `tournament_created`: New tournament announced
- `tournament_started`: Tournament begins
- `tournament_completed`: Tournament ends
- `tournament_round_started`: Tournament round begins
- `tournament_round_completed`: Tournament round ends
- `knockout_round_started`: Knockout stage begins
- `semifinals_started`: Semifinals begin
- `finals_started`: Championship final begins

### Match Events
- `match_scheduled`: Upcoming match announced
- `match_started`: Match goes LIVE
- `match_completed`: Match result
- `match_rescheduled`: Match date changed
- `thrashing`: One-sided victory (5+ goal difference)
- `close_match`: Tight 1-goal margin victory
- `boring_draw`: 0-0 draw
- `high_scoring`: High-scoring match (6+ total goals)
- `comeback_victory`: Team comes from behind to win
- `clean_sheet`: Team keeps clean sheet (0 goals conceded)
- `penalty_shootout`: Match decided by penalties

### Achievement & Awards Events
- `badge_unlocked`: Team unlocks achievement badge
- `iron_curtain`: Clean sheet badge earned
- `squeaky_bum_time`: 1-goal margin win badge
- `sleeping_pills`: 0-0 draw badge
- `goal_machine`: High-scoring match badge
- `comeback_kings`: Comeback victory badge
- `giant_killers`: Underdog victory badge
- `clean_sweep`: Win streak badge (3, 5, 10 wins)
- `unbeaten_run`: Unbeaten streak badge (5, 10, 15 matches)
- `golden_invincibles`: Unbeaten tournament winner
- `season_awards_announced`: Season awards revealed
- `golden_boot_winner`: Top scorer award
- `golden_glove_winner`: Best goalkeeper award
- `best_manager_winner`: Manager of the season

### Position Group Events
- `position_groups_created`: Position groups set up for auction
- `position_groups_updated`: Position groups modified
- `player_moved_group`: Player moved to different position group

### Admin Events
- `sub_admin_created`: New sub-admin account created
- `team_manager_created`: New team manager account created
- `password_reset_requested`: Password reset request submitted
- `password_reset_approved`: Password reset approved
- `historical_data_imported`: Historical season data imported
- `notification_sent`: System notification sent to teams

### Financial Events
- `budget_refund`: Team receives budget refund
- `budget_adjustment`: Admin adjusts team budget
- `financial_milestone`: Team reaches budget milestone
- `ledger_export`: Financial statements exported

---

## Tone System

### Tone Types

#### 1. Neutral
**When Used**: Admin actions, system announcements, window openings/closings, password resets
**Style**: Professional, factual, balanced
**Example**: "The tournament organizers have announced..."

#### 2. Dramatic
**When Used**: Close matches, milestones, championships, comebacks, tiebreakers, knockout stages
**Style**: Intense, storytelling, exciting
**Example**: "In a thrilling encounter that had fans on the edge of their seats..."

#### 3. Funny
**When Used**: Boring draws, bargain signings, badge unlocks, 0-0 matches
**Style**: Witty, entertaining, humorous
**Example**: "In what can only be described as a masterclass in budget shopping..."

#### 4. Harsh
**When Used**: Thrashings, rejected requests, poor performances, heavy defeats
**Style**: Critical, sarcastic, roasting
**Example**: "It was a performance to forget as [team] were absolutely dismantled..."

### Tone Determination Logic

```typescript
// Automatic tone selection based on event
if (event_type === 'match_completed') {
  const goalDiff = Math.abs(home_score - away_score);
  if (goalDiff >= 5) return 'harsh';      // Thrashing
  if (goalDiff === 0 && home_score === 0) return 'funny'; // Boring 0-0
  if (goalDiff === 1) return 'dramatic';  // Close match
  return 'dramatic';                       // Normal match
}

if (event_type === 'thrashing') return 'harsh';
if (event_type === 'comeback_victory') return 'dramatic';
if (event_type === 'bargain_signing') return 'funny';
if (event_type === 'tiebreaker_resolved') return 'dramatic';
if (event_type === 'release_request_rejected') return 'harsh';
if (event_type === 'swap_request_rejected') return 'harsh';
if (event_type === 'badge_unlocked') return 'funny';
if (event_type === 'boring_draw') return 'funny';
```

---

## Image Generation

### Pollinations.ai (Primary)

**Advantages**:
- Completely free
- No API key required
- Fast generation
- Reliable uptime

**Usage**:
```typescript
const imageUrl = generateImageWithPollinations(
  prompt,
  1200,  // width
  630    // height
);
// Returns: https://image.pollinations.ai/prompt/...
```

### Hugging Face (Fallback)

**Model**: Stable Diffusion XL Base 1.0

**Advantages**:
- Higher quality
- Better text rendering
- More control

**Disadvantages**:
- Requires API token
- Rate limits
- Slower generation

### Image Prompts

Event-specific prompts with text instructions:

```typescript
// Match Result
"professional esports gaming banner, eFootball tournament, 
text 'MATCH RESULT' at top, large numbers '3 - 2' in center, 
team names 'Red Panthers' and 'Blue Tigers' below, 
blue and gold theme, stadium atmosphere"

// Player Milestone
"eFootball esports tournament registration celebration, 
text 'REGISTRATION MILESTONE' at top, 
large numbers '100 PLAYERS' in center, 
green gradient, achievement celebration"
```

---

## API Endpoints

### 1. GET `/api/news`

**Purpose**: Fetch published news items

**Query Parameters**:
- `season_id`: Filter by season
- `category`: Filter by category
- `limit`: Number of items (default: 50)
- `include_drafts`: Include unpublished (admin only)

**Response**:
```json
{
  "success": true,
  "news": [
    {
      "id": "news_123",
      "title_en": "Red Panthers Secure Victory",
      "title_ml": "റെഡ് പാന്തേഴ്സ് വിജയം നേടി",
      "content_en": "...",
      "content_ml": "...",
      "category": "match",
      "is_published": true,
      "image_url": "https://...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### 2. POST `/api/news`

**Purpose**: Create or update news (with AI generation)

**Request Body (AI Generation)**:
```json
{
  "generate_with_ai": true,
  "generation_input": {
    "event_type": "match_result",
    "category": "match",
    "season_id": "SSPSLS17",
    "season_name": "Season 17",
    "metadata": {
      "home_team": "Red Panthers",
      "away_team": "Blue Tigers",
      "home_score": 3,
      "away_score": 2,
      "winner": "Red Panthers"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bilingual news generated with AI successfully",
  "news_id": "news_123",
  "news": { ... }
}
```

### 3. DELETE `/api/news?id=xxx`

**Purpose**: Delete news item

**Response**:
```json
{
  "success": true,
  "message": "News deleted successfully"
}
```

### 4. GET `/api/test-news`

**Purpose**: Test news generation system

**Response**:
```json
{
  "success": true,
  "message": "News generation test completed!",
  "gemini_connected": true,
  "news_triggered": true
}
```

---

## Database Schema

### Table: `news`

```sql
CREATE TABLE news (
  id VARCHAR(255) PRIMARY KEY,
  
  -- Bilingual Content
  title_en TEXT NOT NULL,
  title_ml TEXT,
  content_en TEXT NOT NULL,
  content_ml TEXT,
  summary_en TEXT,
  summary_ml TEXT,
  
  -- Classification
  category VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  
  -- Season Context
  season_id VARCHAR(50),
  season_name VARCHAR(255),
  
  -- Publishing
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  -- Generation
  generated_by VARCHAR(20) DEFAULT 'ai',
  edited_by_admin BOOLEAN DEFAULT false,
  tone VARCHAR(20),
  reporter_en VARCHAR(100),
  reporter_ml VARCHAR(100),
  
  -- Metadata
  metadata JSONB,
  image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_news_season ON news(season_id);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published ON news(is_published, created_at DESC);
```

---

## Usage Examples

### Example 1: Team Squad Complete

```typescript
// When team completes minimum 5-player roster
await triggerNews('team_squad_complete', {
  season_id: 'SSPSLS17',
  season_name: 'Season 17',
  team_name: 'Red Panthers',
  player_count: 5,
  total_spent: 290,
  remaining_budget: 10
});
```

**Generated Output (English)**:
```
Title: "Red Panthers Complete Squad with 5 Players!"
Content: "The Red Panthers have successfully assembled their minimum squad for Season 17, signing 5 players for a total of £290K. With just £10K remaining in their budget, manager [Manager Name] has made strategic choices to build a competitive roster...

The team's recruitment strategy focused on value and balance, ensuring they meet the minimum requirements while preserving flexibility for future moves.

With their squad now complete, the Red Panthers are ready to compete in the upcoming season."
Summary: "Red Panthers complete 5-player squad for Season 17"
```

### Example 2: Match Result

```typescript
await triggerNews('match_completed', {
  season_id: 'SSPSLS17',
  tournament_name: 'Premier League',
  metadata: {
    home_team: 'Red Panthers',
    away_team: 'Blue Tigers',
    home_score: 3,
    away_score: 2,
    winner: 'Red Panthers',
    goal_diff: 1
  }
});
```

**Generated Output (Malayalam)**:
```
Title: "റെഡ് പാന്തേഴ്സ് ബ്ലൂ ടൈഗേഴ്സിനെതിരെ 3-2 വിജയം നേടി"
Content: "ഇന്നത്തെ ആവേശകരമായ ഏറ്റുമുട്ടലിൽ റെഡ് പാന്തേഴ്സ് ബ്ലൂ ടൈഗേഴ്സിനെ 3-2 എന്ന സ്കോറിന് പരാജയപ്പെടുത്തി. മത്സരം അവസാന നിമിഷം വരെ പിരിമുറുക്കത്തിലായിരുന്നു...

രണ്ട് ടീമുകളും മികച്ച പ്രകടനം കാഴ്ചവച്ചെങ്കിലും റെഡ് പാന്തേഴ്സിന്റെ ആക്രമണ കളിയാണ് വിജയം നേടിക്കൊടുത്തത്.

ഈ വിജയത്തോടെ റെഡ് പാന്തേഴ്സ് പട്ടികയിൽ മുന്നേറുന്നു."
Summary: "റെഡ് പാന്തേഴ്സ് ബ്ലൂ ടൈഗേഴ്സിനെ 3-2 ന് തോൽപ്പിച്ചു"
```

### Example 3: Auction Round Completed

```typescript
await triggerNews('auction_round_completed', {
  season_id: 'SSPSLS17',
  metadata: {
    round_number: 5,
    position: 'Forward',
    total_spent: 450,
    player_count: 12,
    highest_bid: 80,
    highest_bid_player: 'Cristiano Ronaldo',
    highest_bid_team: 'Red Panthers'
  }
});
```

### Example 4: Tiebreaker Resolved

```typescript
await triggerNews('tiebreaker_resolved', {
  season_id: 'SSPSLS17',
  metadata: {
    player_name: 'Lionel Messi',
    winning_team: 'Blue Tigers',
    winning_bid: 95,
    original_bid: 80,
    tied_teams_count: 3,
    tied_teams: ['Red Panthers', 'Blue Tigers', 'Green Eagles']
  }
});
```

### Example 5: Release Request Approved

```typescript
await triggerNews('release_request_approved', {
  season_id: 'SSPSLS17',
  metadata: {
    team_name: 'Red Panthers',
    player_count: 2,
    total_refund: 150,
    players: ['Player A', 'Player B']
  }
});
```

### Example 6: Badge Unlocked

```typescript
await triggerNews('badge_unlocked', {
  season_id: 'SSPSLS17',
  metadata: {
    team_name: 'Red Panthers',
    badge_name: 'Iron Curtain',
    badge_tier: 'BRONZE',
    xp_earned: 50,
    description: 'Keep a clean sheet'
  }
});
```

### Example 7: Tournament Finals

```typescript
await triggerNews('finals_started', {
  season_id: 'SSPSLS17',
  metadata: {
    tournament_name: 'Champions Cup',
    team1: 'Red Panthers',
    team2: 'Blue Tigers',
    match_date: '2024-06-15',
    venue: 'Virtual Stadium'
  }
});
```

---

## Testing

### Test Gemini Connection

```bash
# Visit in browser
http://localhost:3000/api/test-gemini
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Gemini API is working!",
  "model": "gemini-2.0-flash",
  "test_response": "Hello! How can I help you today?"
}
```

### Test News Generation

```bash
# Visit in browser
http://localhost:3000/api/test-news
```

**Expected Response**:
```json
{
  "success": true,
  "message": "News generation test completed!",
  "gemini_connected": true,
  "news_triggered": true
}
```

### Manual Test via Code

```typescript
// In any API route or server component
import { triggerNews } from '@/lib/news/trigger';

// Test player milestone
await triggerNews('player_milestone', {
  season_id: 'TEST',
  season_name: 'Test Season',
  milestone_number: 50,
  player_count: 50
});

// Check database for generated news
// SELECT * FROM news WHERE season_id = 'TEST';
```

---

## Troubleshooting

### Issue: "GEMINI_API_KEY not configured"

**Solution**:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env.local`: `GEMINI_API_KEY=your_key_here`
3. Restart dev server

### Issue: "Gemini API overloaded (503)"

**Solution**:
1. Add multiple API keys for rotation:
   ```bash
   GEMINI_API_KEY=key1
   GEMINI_API_KEY_2=key2
   GEMINI_API_KEY_3=key3
   ```
2. System will automatically rotate on rate limits

### Issue: "Failed to parse AI response"

**Cause**: Gemini returned malformed JSON

**Solution**:
- System has 3-level fallback parsing
- Retries automatically (3 attempts)
- Check console logs for raw response
- Usually resolves on retry

### Issue: Images not generating

**Solution**:
1. Pollinations.ai is primary (no setup needed)
2. If failing, add Hugging Face token:
   ```bash
   HUGGING_FACE_TOKEN=your_token_here
   ```
3. Check console for image generation logs

---

## Performance Metrics

### Generation Times
- **English Content**: ~3-5 seconds
- **Malayalam Content**: ~3-5 seconds
- **Total (Parallel)**: ~5-7 seconds
- **Image Generation**: ~2-3 seconds
- **Total End-to-End**: ~8-10 seconds

### API Costs
- **Gemini API**: Free tier (60 req/min)
- **Pollinations.ai**: Free (unlimited)
- **Hugging Face**: Free tier (1000 req/month)

### Database Storage
- Average news item: ~2-3 KB
- With image URL: ~2.5-3.5 KB
- 1000 news items: ~3 MB

---

## Future Enhancements

### Planned Features
1. **Voice Generation**: Text-to-speech for news articles
2. **Video Highlights**: Auto-generate match highlight videos
3. **Social Media Integration**: Auto-post to Twitter/Facebook
4. **Sentiment Analysis**: Track fan reactions
5. **Personalized News**: User-specific news feeds
6. **Push Notifications**: Real-time news alerts
7. **SEO Optimization**: Auto-generate meta tags
8. **Analytics Dashboard**: Track news engagement

### Potential Improvements
1. **Caching**: Cache frequently accessed news
2. **CDN**: Serve images via CDN
3. **Batch Generation**: Generate multiple news items at once
4. **A/B Testing**: Test different tones/styles
5. **User Feedback**: Allow users to rate news quality

---

## Credits

**Developed by**: Turf Cats Development Team
**AI Model**: Google Gemini 2.0 Flash
**Image Generation**: Pollinations.ai, Hugging Face
**Database**: Neon PostgreSQL with Prisma ORM
**Framework**: Next.js 16
**Authentication**: NextAuth.js v5
**Image Hosting**: ImageKit
**Notifications**: Web Push + Inngest

---

## License

Proprietary - Turf Cats Tournament System

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Test API endpoints individually
- Verify environment variables are set
- Check database connectivity
- Review Gemini API quota

---

**Last Updated**: June 1, 2026
**Version**: 2.0.0
**Status**: Production Ready ✅
**Framework**: Next.js 16 + React 19 + TypeScript 6
**Database**: Neon PostgreSQL + Prisma ORM
**Authentication**: NextAuth.js v5
**AI**: Google Gemini 2.0 Flash
