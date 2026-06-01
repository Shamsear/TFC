# News AI System - Setup Instructions

## Overview
The News AI system has been integrated into your app. Follow these steps to get it running.

## 1. Install Dependencies

```bash
npm install @google/generative-ai
```

## 2. Database Migration

Run the migration to create the `news` table:

```bash
psql $DATABASE_URL -f scripts/migrations/008-add-news-table.sql
```

Or manually execute the SQL in your Neon dashboard.

## 3. Environment Variables

Add to your `.env` file:

```bash
# Google Gemini AI (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional keys for rate limit rotation
GEMINI_API_KEY_2=your_second_key
GEMINI_API_KEY_3=your_third_key
```

### Get Gemini API Key:
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy and paste into `.env`

## 4. Test the System

### Test Gemini Connection:
```bash
curl http://localhost:3000/api/test-gemini
```

Expected response:
```json
{
  "success": true,
  "message": "Gemini API is working!",
  "model": "gemini-2.0-flash-exp"
}
```

### Test News Generation:
```bash
curl http://localhost:3000/api/test-news
```

This will generate a test news article.

## 5. Usage in Your Code

### Trigger News from Events:

```typescript
import { triggerNews } from '@/lib/news/trigger';

// Example: Team completes squad
await triggerNews('team_squad_complete', {
  season_id: 'SSPSLS17',
  season_name: 'Season 17',
  metadata: {
    team_name: 'Red Panthers',
    player_count: 5,
    total_spent: 290,
    remaining_budget: 10
  }
});

// Example: Match result
await triggerNews('match_completed', {
  season_id: 'SSPSLS17',
  metadata: {
    home_team: 'Red Panthers',
    away_team: 'Blue Tigers',
    home_score: 3,
    away_score: 2,
    winner: 'Red Panthers',
    goal_diff: 1
  }
});

// Example: Auction round completed
await triggerNews('auction_round_completed', {
  season_id: 'SSPSLS17',
  metadata: {
    round_number: 5,
    position: 'Forward',
    total_spent: 450,
    player_count: 12
  }
});
```

## 6. Integration Points

Add `triggerNews()` calls to these locations:

### Auction Events:
- `app/api/admin/rounds/[id]/finalize/route.ts` - When round completes
- `app/api/admin/rounds/[id]/start/route.ts` - When round starts
- `app/api/admin/tiebreakers/[id]/resolve/route.ts` - When tiebreaker resolves

### Match Events:
- `app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts` - When match completes

### Transfer Events:
- `app/api/admin/release-requests/[id]/approve/route.ts` - When release approved
- `app/api/admin/swap-requests/[id]/approve/route.ts` - When swap approved

### Team Events:
- When team completes minimum squad
- When team unlocks badge
- When team levels up

## 7. File Structure

```
lib/
├── gemini/
│   └── config.ts              # Gemini AI configuration
├── news/
│   ├── types.ts               # TypeScript types
│   ├── determine-tone.ts      # Tone selection logic
│   ├── prompts-bilingual.ts   # AI prompts (EN + ML)
│   ├── auto-generate.ts       # News generation engine
│   └── trigger.ts             # Event trigger system

app/api/
├── news/
│   └── route.ts               # News CRUD API
├── test-gemini/
│   └── route.ts               # Test Gemini connection
└── test-news/
    └── route.ts               # Test news generation

scripts/migrations/
└── 008-add-news-table.sql     # Database migration
```

## 8. Supported Events

60+ event types across 10 categories:
- Season events (created, activated, completed)
- Team events (registration, squad, badges, XP)
- Auction events (rounds, tiebreakers, bids)
- Transfer events (releases, swaps, requests)
- Tournament events (creation, knockout, finals)
- Match events (scheduled, live, completed)
- Achievement events (badges, awards)
- Admin events (user management)
- Financial events (refunds, adjustments)

See `lib/news/types.ts` for complete list.

## 9. Tone System

News automatically uses appropriate tone:
- **Neutral**: Admin actions, announcements
- **Dramatic**: Close matches, tiebreakers, finals
- **Funny**: Boring draws, bargain signings, badges
- **Harsh**: Thrashings, rejected requests

## 10. Bilingual Output

Every news item generates:
- English content (reporter: Alex Thompson)
- Malayalam content (reporter: Rajesh Nair)
- Both stored in database
- Frontend can toggle languages

## 11. Next Steps

1. ✅ Install dependencies
2. ✅ Run database migration
3. ✅ Add environment variables
4. ✅ Test the system
5. 🔲 Add `triggerNews()` calls to your event handlers
6. 🔲 Create admin UI to manage news
7. 🔲 Create public UI to display news
8. 🔲 Add image generation (optional)

## 12. Troubleshooting

### "GEMINI_API_KEY not configured"
- Check `.env` file has `GEMINI_API_KEY`
- Restart dev server after adding

### "Failed to parse AI response"
- System has 3 retry attempts
- Usually resolves automatically
- Check console logs for details

### "Rate limit exceeded"
- Add multiple API keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3)
- System will rotate automatically

## 13. Documentation

Full documentation in `news_ai.md` including:
- Complete system architecture
- All event types
- API endpoints
- Usage examples
- Image generation setup

## Support

For issues or questions, check:
- Console logs for detailed errors
- Test endpoints for connectivity
- Database for generated news
- `news_ai.md` for full documentation
