# News System Variety & Freshness Enhancements

## Problems Solved
1. ❌ Every news article was a "carbon copy" - same structure, same phrases
2. ❌ No manager quotes in articles
3. ❌ "close_match" scenario triggered for every 1-goal win
4. ❌ Title race news appearing in early season (8% complete)
5. ❌ Limited tone variety - only 4 tones (neutral, dramatic, funny, harsh)
6. ❌ No contextual manager reactions based on result

## Solutions Implemented

### 1. Expanded Match Scenarios
**Before**: Only basic scenarios (close_match, thrashing, high_scoring, boring_draw)

**After**: Rich scenario taxonomy
- `dominant_win` - 3+ goal margin (not quite a thrashing)
- `thriller` - High-scoring but narrow margin (3-2, 4-3)
- `goal_fest` - 6+ goals with a winner
- `entertaining_draw` - Draw with 4+ goals (2-2, 3-3)
- `draw` - Generic draw scenario

**Impact**: Better variety in scenario detection beyond simple "close_match"

### 2. Added New Tones
**Before**: 4 tones
- neutral, dramatic, funny, harsh

**After**: 6 tones with specific use cases
- **neutral** - Professional, factual reporting
- **dramatic** - Intense, exciting storytelling
- **funny** - Witty, entertaining, humorous
- **harsh** - Critical, sarcastic, roasting
- **analytical** (NEW) - Tactical, cerebral, strategic analysis
- **hype** (NEW) - Over-the-top, energetic, EPIC style

### 3. Tone Rotation System
**Implementation**: Memory-based rotation counter that cycles through tone arrays

```typescript
// Example: close_match gets 3 rotating tones
if (event_type === 'close_match') {
  return rotateTone(['dramatic', 'analytical', 'neutral']);
}

// Generic matches get ALL tones for maximum variety
if (event_type === 'match_completed') {
  return rotateTone(['neutral', 'dramatic', 'analytical', 'funny', 'hype']);
}
```

**Impact**: Consecutive news articles will have different tones, preventing repetition

### 4. Contextual Manager Quotes System

#### Quote Templates by Situation

**BIG WIN (3+ goals):**
- Confident: "That's how champions play!"
- Funny: "Should give them a handicap next time"
- Tactical: "Our game plan worked perfectly"
- Humble: "Credit to my players"

**NARROW WIN (1 goal):**
- Relieved: "Three points is three points"
- Tactical: "Sometimes you need to win ugly"
- Grateful: "Lucky? Maybe. But champions make their own luck"

**HEAVY LOSS (3+ goals conceded):**
- Angry: "Unacceptable! Heads will roll in training!"
- Disappointed: "I'm lost for words"
- Defiant: "We'll bounce back. Mark my words"
- Honest: "We were completely outclassed"
- Sarcastic: "A masterclass... in how NOT to defend"

**NARROW LOSS:**
- Frustrated: "We deserved at least a point"
- Philosophical: "Fine margins. That's eFootball"
- Future-focused: "Next match is our focus now"

**DRAW:**
- Satisfied: "A point away from home? I'll take that"
- Disappointed: "Felt like two points dropped"
- Tactical: "We neutralized their threat perfectly"

**HIGH-SCORING DRAW:**
- Entertained: "What a game! Fans got their money's worth!"
- Tactical Failure: "We need to work on defense. Urgently"

**BORING 0-0:**
- Bored: "Not exactly a thriller, was it?"
- Defensive Pride: "Clean sheet. Job done"

### 5. Enhanced Variety Instructions

#### Article Structure Variations
Don't always use: **[Score] → [Context] → [Quote]**

Instead rotate through:
- Start with manager quote → context → analysis
- Start with dramatic moment → buildup → reaction
- Start with standings impact → match details → quotes
- Start with controversy → turning point → aftermath

#### Opening Variations
Don't always start with:
- "Team X secured a victory over Team Y"
- "Team X claimed the win"

Instead vary:
- "In a pulsating encounter..."
- "The tactical battle was settled by..."
- "Manager X's game plan unfolded perfectly as..."
- "Controversy erupted when..."
- "A moment of brilliance decided..."

#### Perspective Variations
- Winner's perspective vs loser's perspective
- Tactical analysis vs emotional narrative
- Individual brilliance vs team performance
- Pre-match expectations vs actual result
- Historical significance vs immediate impact

### 6. Title Race Detection Improvements

**Before**: Triggered if 2+ teams within 5 points (happened early season)

**After**: Context-aware conditions
- **Early season (0-30%)**: Only if top 3 within 1 point AND >30% complete
- **Mid season (30-70%)**: Tournament >50% + 3+ teams within 3-5 points
- **Late season (70%+)**: Tournament >70% + 2+ teams within 6 points

**Dynamic Points Threshold**:
- 0-30% complete: 3 points threshold
- 30-60% complete: 5 points threshold  
- 60%+ complete: 6 points threshold

### 7. Enhanced Tone Instructions

Each tone now has specific personality requirements:

**Analytical**:
- Discuss tactics, formations, strategies
- Include manager tactical insights
- Be cerebral and thoughtful
- Reference key decisions and turning points

**Hype**:
- Energetic, over-the-top style
- Use powerful language and emphasis
- Make everything sound EPIC
- Include enthusiastic celebrations

**Harsh**:
- Critical and sarcastic
- Point out failures brutally
- Include cutting manager criticism
- Be savage about poor performances

**Funny**:
- Genuinely witty (not just adding "joked")
- Clever wordplay and puns
- Light sarcasm
- Funny manager quotes

## Testing Commands

```bash
# Test with different matches to see variety
npx tsx scripts/generate-match-news.ts TFCMA-2673
npx tsx scripts/generate-match-news.ts [another-match-id]
npx tsx scripts/generate-match-news.ts [another-match-id]

# Each should show:
# - Different scenario detection
# - Different tone
# - Unique manager quotes
# - Varied article structure
```

## Key Files Modified

1. **lib/news/scenario-detector.ts**
   - Added: dominant_win, thriller, goal_fest, entertaining_draw, draw
   - Fixed: close_match now only for low-scoring 1-goal wins
   - Enhanced: Title race detection with tournament progress awareness

2. **lib/news/prompts-bilingual.ts**
   - Added: Comprehensive manager quote templates
   - Added: Article structure variation guidelines
   - Added: Opening sentence variation examples
   - Enhanced: Tone instructions for all 6 tones
   - Added: Freshness and anti-repetition rules

3. **lib/news/determine-tone.ts**
   - Added: 2 new tones (analytical, hype)
   - Implemented: Tone rotation system
   - Enhanced: Context-aware tone selection

4. **lib/news/types.ts**
   - Added: 2 new tone types
   - Added: 5 new event types

5. **lib/news/trigger.ts**
   - Updated: Event category detection for new scenarios

## Expected Behavior

### Article 1 (Manager First Match - Hype Tone)
```
"DEBUT DELIGHT! Salman's Manchester United Make Winning Start"

Salman couldn't hide his excitement after his Manchester United debut. 
"What a way to start! The lads were brilliant," he beamed after the 
2-0 victory over Leeds.

The win lifts United to 17th as they begin their campaign...
```

### Article 2 (Dominant Win - Analytical Tone)
```
"Tactical Masterclass: Leicester's System Overwhelms Opposition"

The 6-2 demolition was no accident. Leicester's high press and quick 
transitions exploited every weakness. "We studied them for days," 
manager revealed, "and executed the plan to perfection."

This tactical approach has now yielded three consecutive wins...
```

### Article 3 (Thriller - Dramatic Tone)  
```
"FIVE-GOAL THRILLER! Arsenal Edge Past Dortmund in Epic Encounter"

Hearts were pounding at full-time. This 3-2 classic had everything - 
lead changes, missed chances, and a dramatic late winner. "I aged 
ten years!" Arsenal's manager admitted, still catching his breath.

The pulsating victory keeps Arsenal...
```

## Benefits

✅ **Each article feels unique** - Varied structure, opening, perspective
✅ **Manager personality shines** - Quotes match situation and tone
✅ **Better scenario detection** - More granular match classifications
✅ **Appropriate timing** - Title race only appears when meaningful
✅ **Tone variety** - 6 tones rotating automatically
✅ **Context-aware** - Quotes and narrative match result margin
✅ **Fresh and engaging** - Anti-repetition rules enforced
✅ **Expandable** - Easy to add more templates and variations

## Future Enhancements (Ideas)

- Player-specific quotes (e.g., hat-trick scorer reactions)
- Historical callbacks (e.g., "First time these teams met was...")
- Weather/venue descriptions for atmosphere
- Rivalry intensity mentions
- Manager tenure context (e.g., "Under pressure after 3 losses")
- Form mentions (e.g., "Extending their unbeaten run to 5")
