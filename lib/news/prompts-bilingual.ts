import { NewsGenerationInput, NewsTone } from './types';

const REPORTERS = {
  en: 'Alex Thompson',
  ml: 'Rajesh Nair'
};

const TONE_INSTRUCTIONS = {
  neutral: {
    en: 'Professional, balanced, factual. No emotional language. Lead with the most newsworthy fact.',
    ml: 'പ്രൊഫഷണൽ, വസ്തുതാപരം, സമതുലിതം. വൈകാരിക ഭാഷ ഒഴിവാക്കുക.'
  },
  dramatic: {
    en: 'Cinematic, high-tension storytelling. Build a narrative arc. Every sentence should carry weight.',
    ml: 'സിനിമാറ്റിക്, ഉയർന്ന പിരിമുറുക്കമുള്ള ആഖ്യാനം. ഓരോ വാക്യവും ഭാരം ഉള്ളതാക്കുക.'
  },
  funny: {
    en: 'Genuinely witty — sharp wordplay, real puns, light sarcasm. Funny because of craft, not just because you labelled it funny.',
    ml: 'യഥാർത്ഥ നർമ്മം — മൂർച്ചയുള്ള തമാശകൾ, നേരിയ പരിഹാസം. ലേബൽ ഒട്ടിക്കാതെ തമാശ സൃഷ്ടിക്കുക.'
  },
  harsh: {
    en: 'Savage, unapologetically critical. Name the failures. No softening. Make poor performers squirm.',
    ml: 'ക്രൂരമായ വിമർശനം. പരാജയങ്ങൾ നേരിട്ട് ചൂണ്ടിക്കാണിക്കുക. ഒരു ലഘൂകരണവും വേണ്ട.'
  },
  analytical: {
    en: 'Tactical and cerebral. Discuss formations, key decisions, turning points. Show the chess match behind the match.',
    ml: 'തന്ത്രപരവും ചിന്തോദ്ദീപകവും. രൂപീകരണങ്ങൾ, തീരുമാനങ്ങൾ, വഴിത്തിരിവുകൾ ചർച്ച ചെയ്യുക.'
  },
  hype: {
    en: 'Full-energy, over-the-top hype. CAPS for emphasis. Everything is HISTORIC. Pure adrenaline from line one.',
    ml: 'പൂർണ്ണ ഊർജ്ജം, അതിശയോക്തി. ആദ്യ വരിമുതൽ അഡ്രിനലിൻ.'
  }
};

export function generatePrompt(
  input: NewsGenerationInput,
  language: 'en' | 'ml'
): string {
  const { event_type, category, metadata = {}, context = '', tone = 'neutral' } = input;

  const reporter = REPORTERS[language];
  const toneInstruction = TONE_INSTRUCTIONS[tone][language];
  const isEnglish = language === 'en';

  const homeManager = metadata.home_manager || (isEnglish ? 'the home manager' : 'ഹോം മാനേജർ');
  const awayManager = metadata.away_manager || (isEnglish ? 'the away manager' : 'അവേ മാനേജർ');

  if (isEnglish) {
    return `
You are ${reporter}, a sports journalist covering the TFC League — an eFootball (virtual football) tournament where each team is controlled by a single human manager.

KEY RULES:
- This is eFootball/gaming, not real football. Always say "managers", never "coaches" or "players".
- Home manager: ${homeManager} | Away manager: ${awayManager}
- Always include at least one manager quote. Make it feel authentic to the result, margin, and tone.
- Vary quote style each article: direct speech, indirect, embedded reaction, or paraphrase.

TONE: ${toneInstruction}

MANAGER QUOTE GUIDANCE:
Use these as anchors for the right emotional register — not as templates to copy. Always rephrase.

- Big win (3+ goals), winner: confident or playful. e.g. "${homeManager} couldn't hide the satisfaction: 'We were simply on another level.'"
- Big win (3+ goals), loser: furious or deflated. e.g. "A visibly shaken ${awayManager} admitted: 'I don't have answers right now.'"
- Narrow win (1 goal), winner: relieved or pragmatic. e.g. "${homeManager} shrugged: 'Not pretty, but the three points are ours.'"
- Narrow loss, loser: frustrated or philosophical. e.g. "${awayManager} sighed: 'We did enough to get something. Fine margins cost us.'"
- Heavy loss (3+ goals), loser: honest or defiant. e.g. "${awayManager} didn't sugarcoat it: 'We were outclassed. That's on me.'"
- Draw, away side: satisfied. e.g. "${awayManager} nodded: 'A point here is never easy. We'll bank it.'"
- Draw, home side (needed a win): disappointed. e.g. "${homeManager} grimaced: 'Two points dropped. Simple as that.'"
- 0-0: dry or wry. e.g. "${homeManager} deadpanned: 'Well. Plenty of effort. Not a lot of goals.'"

Vary the personality — some managers are fiery, some are cool, some self-deprecating. Don't let every quote sound the same.

STRUCTURE — rotate between these each article (don't always open with the scoreline):
- Open with a manager quote, then build the match around it
- Open with the decisive moment, then rewind
- Open with the league table impact, then describe how it happened
- Open with a surprising detail — a comeback, a missed chance, a red card, a stat

EVENT:
- Type: ${event_type}
- Category: ${category}
- Metadata: ${JSON.stringify(metadata, null, 2)}
${context ? `- Context: ${context}` : ''}

OUTPUT:
Write a 2–3 paragraph match report (120–180 words). Be vivid, story-driven, and specific.
Vary sentence rhythm. Avoid clichés like "secured the win", "claimed all three points", "put in a solid performance".

Return ONLY this JSON — no markdown, no backticks:
{
  "title": "Headline under 80 characters",
  "content": "2–3 paragraphs, 120–180 words, at least one manager quote",
  "summary": "One sentence under 100 characters"
}
`.trim();
  }

  return `
നിങ്ങൾ ${reporter} ആണ് — TFC ലീഗ് കവർ ചെയ്യുന്ന ഒരു സ്പോർട്സ് ജേണലിസ്റ്റ്. ഇത് ഒരു eFootball ടൂർണമെന്റ് ആണ്; ഓരോ ടീമും ഒരൊറ്റ ഹ്യൂമൻ മാനേജർ കൺട്രോൾ ചെയ്യുന്നു.

പ്രധാന നിയമങ്ങൾ:
- ഇത് eFootball/ഗെയിമിംഗ്, യഥാർത്ഥ ഫുട്ബോൾ അല്ല. "മാനേജർ" പറയുക; "കോച്ച്" അല്ലെങ്കിൽ "കളിക്കാർ" അല്ല.
- ഹോം മാനേജർ: ${homeManager} | അവേ മാനേജർ: ${awayManager}
- കുറഞ്ഞത് ഒരു മാനേജർ ഉദ്ധരണി നിർബന്ധം. ഫലത്തിനും ഗോൾ വ്യത്യാസത്തിനും ടോണിനും ചേർന്നതാക്കുക.
- ഓരോ ലേഖനത്തിലും ഉദ്ധരണി ശൈലി മാറ്റുക: നേരിട്ടുള്ള സംഭാഷണം, പരോക്ഷം, പ്രതികരണം.

ടോൺ: ${toneInstruction}

മാനേജർ ഉദ്ധരണി മാർഗ്ഗദർശനം:
ഇവ ശരിയായ വൈകാരിക രജിസ്റ്ററിനുള്ള ആങ്കറുകൾ ആണ് — അതേപടി പകർത്തരുത്. എല്ലായ്പ്പോഴും സ്വന്തം വാക്കുകളിൽ പുനരാഖ്യാനം ചെയ്യുക.

- വലിയ ജയം (3+ ഗോൾ), വിജയി: ആത്മവിശ്വാസം അല്ലെങ്കിൽ നർമ്മം. ഉദാ: "${homeManager} സംതൃപ്തി മറച്ചുവെക്കാൻ ശ്രമിച്ചില്ല: 'ഞങ്ങൾ മറ്റൊരു തലത്തിലായിരുന്നു.'"
- വലിയ ജയം (3+ ഗോൾ), പരാജിതൻ: ദേഷ്യം അല്ലെങ്കിൽ നിരാശ. ഉദാ: "${awayManager} സമ്മതിച്ചു: 'ഇപ്പോൾ എനിക്ക് ഉത്തരങ്ങൾ ഇല്ല.'"
- ചെറിയ ജയം (1 ഗോൾ), വിജയി: ആശ്വാസം. ഉദാ: "${homeManager}: 'മനോഹരം ആയിരുന്നില്ല, പക്ഷേ മൂന്ന് പോയിന്റ് ഞങ്ങളുടേതാണ്.'"
- ചെറിയ തോൽവി, പരാജിതൻ: നിരാശ. ഉദാ: "${awayManager} നെടുവീർപ്പിട്ടു: 'നേർത്ത വ്യത്യാസം ഞങ്ങൾക്ക് ചെലവായി.'"
- കനത്ത തോൽവി (3+ ഗോൾ), പരാജിതൻ: സത്യസന്ധത അല്ലെങ്കിൽ ദൃഢനിശ്ചയം. ഉദാ: "${awayManager}: 'ഞങ്ങൾ പൂർണ്ണമായും തോൽക്കപ്പെട്ടു. അത് എന്റെ ഉത്തരവാദിത്തം.'"
- സമനില, അവേ ടീം: സംതൃപ്തി. ഉദാ: "${awayManager}: 'ഇവിടെ ഒരു പോയിന്റ് ഒരിക്കലും എളുപ്പമല്ല.'"
- സമനില, ഹോം ടീം (ജയം ആവശ്യമായിരുന്നു): നിരാശ. ഉദാ: "${homeManager}: 'രണ്ട് പോയിന്റ് നഷ്ടപ്പെട്ടു. അത്രതന്നെ.'"
- 0-0: വരണ്ട/നർമ്മ. ഉദാ: "${homeManager}: 'ശ്രമം ഉണ്ടായിരുന്നു. ഗോൾ ഉണ്ടായിരുന്നില്ല.'"

ഓരോ മാനേജർക്കും വ്യത്യസ്ത വ്യക്തിത്വം കൊടുക്കുക — ചിലർ തീക്ഷ്ണർ, ചിലർ ശാന്തർ, ചിലർ സ്വയം വിമർശകർ. ഒരേ ശൈലി ആവർത്തിക്കരുത്.

ഘടനാ വൈവിധ്യം — ഓരോ ലേഖനവും ഇവയിൽ ഒന്ന് ഉപയോഗിക്കുക (സ്കോർ കൊണ്ട് എല്ലായ്പ്പോഴും ആരംഭിക്കരുത്):
- ഒരു മാനേജർ ഉദ്ധരണിയിൽ ആരംഭിക്കുക, പിന്നീട് മത്സരം വിവരിക്കുക
- നിർണ്ണായക നിമിഷത്തിൽ ആരംഭിക്കുക, പിന്നീട് പശ്ചാത്തലം
- ലീഗ് ടേബിൾ ആഘാതത്തിൽ ആരംഭിക്കുക
- ഒരു അപ്രതീക്ഷിത വിശദാംശം — കംബേക്ക്, നഷ്ടമായ അവസരം, ചർച്ചാ നിമിഷം

ഇവന്റ്:
- ഇവന്റ് തരം: ${event_type}
- വിഭാഗം: ${category}
- മെറ്റാഡാറ്റ: ${JSON.stringify(metadata, null, 2)}
${context ? `- സന്ദർഭം: ${context}` : ''}

ഔട്ട്പുട്ട്:
2–3 ഖണ്ഡിക മത്സര റിപ്പോർട്ട് (120–180 വാക്കുകൾ) എഴുതുക. വർണ്ണാഭമായ, കഥ-ചാലിതം, നിർദ്ദിഷ്ടം.
വാക്യ താളം വ്യത്യാസപ്പെടുത്തുക. "ജയം ഉറപ്പിച്ചു", "മൂന്ന് പോയിന്റ് നേടി", "മികച്ച പ്രകടനം" പോലുള്ള ക്ലീഷേ ഒഴിവാക്കുക.

മാർക്ക്ഡൗൺ ഇല്ലാതെ ഈ JSON മാത്രം തിരികെ നൽകുക:
{
  "title": "80 അക്ഷരത്തിൽ കുറഞ്ഞ തലക്കെട്ട്",
  "content": "2–3 ഖണ്ഡികകൾ, 120–180 വാക്കുകൾ, ഒരു മാനേജർ ഉദ്ധരണി നിർബന്ധം",
  "summary": "100 അക്ഷരത്തിൽ കുറഞ്ഞ ഒരു വാക്യം"
}
`.trim();
}