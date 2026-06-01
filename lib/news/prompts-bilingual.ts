import { NewsGenerationInput, NewsTone } from './types';

/**
 * Generate language-specific prompts for Gemini AI
 */

const REPORTERS = {
  en: 'Alex Thompson',
  ml: 'Rajesh Nair'
};

const TONE_INSTRUCTIONS = {
  neutral: {
    en: 'Write in a professional, factual, and balanced tone. Focus on clear reporting without excessive emotion.',
    ml: 'പ്രൊഫഷണൽ, വസ്തുതാപരമായ, സമതുലിതമായ രീതിയിൽ എഴുതുക. അമിതമായ വികാരങ്ങൾ ഇല്ലാതെ വ്യക്തമായ റിപ്പോർട്ടിംഗിൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കുക.'
  },
  dramatic: {
    en: 'Write in an intense, exciting, storytelling style. Build tension and drama. Make readers feel the excitement.',
    ml: 'തീവ്രമായ, ആവേശകരമായ, കഥ പറയുന്ന ശൈലിയിൽ എഴുതുക. പിരിമുറുക്കവും നാടകീയതയും സൃഷ്ടിക്കുക. വായനക്കാർക്ക് ആവേശം അനുഭവപ്പെടുത്തുക.'
  },
  funny: {
    en: 'Write in a witty, entertaining, humorous style. Use clever wordplay and light sarcasm. Keep it fun and engaging.',
    ml: 'തമാശയുള്ള, രസകരമായ, നർമ്മപൂർണ്ണമായ ശൈലിയിൽ എഴുതുക. മിടുക്കായ വാക്കുകളും നേരിയ പരിഹാസവും ഉപയോഗിക്കുക. രസകരവും ആകർഷകവുമായി നിലനിർത്തുക.'
  },
  harsh: {
    en: 'Write in a critical, sarcastic, roasting style. Point out failures and poor performances. Be brutally honest.',
    ml: 'വിമർശനാത്മകമായ, പരിഹാസപൂർണ്ണമായ ശൈലിയിൽ എഴുതുക. പരാജയങ്ങളും മോശം പ്രകടനങ്ങളും ചൂണ്ടിക്കാണിക്കുക. ക്രൂരമായി സത്യസന്ധത പുലർത്തുക.'
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
  
  const basePrompt = isEnglish ? `
You are ${reporter}, a sports journalist covering the TFC League.

PERSONALITY & TONE:
${toneInstruction}

EVENT DETAILS:
- Event Type: ${event_type}
- Category: ${category}
- Metadata: ${JSON.stringify(metadata, null, 2)}
${context ? `- Additional Context: ${context}` : ''}

TASK:
Write a news article about this event in English. The article should be:
1. Engaging and well-written
2. 2-3 paragraphs (150-200 words total)
3. Appropriate for the ${tone} tone
4. Focused on the key facts and story

OUTPUT FORMAT (JSON):
{
  "title": "Headline (under 80 characters)",
  "content": "2-3 paragraphs of article content",
  "summary": "One sentence summary (under 100 characters)"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- Title must be under 80 characters
- Summary must be under 100 characters
- Content should be 150-200 words
- Match the ${tone} tone throughout
- Be creative and unique - avoid generic phrases
` : `
നിങ്ങൾ ${reporter} ആണ്, TFC ലീഗ് കവർ ചെയ്യുന്ന ഒരു സ്പോർട്സ് ജേണലിസ്റ്റ്.

വ്യക്തിത്വവും ടോണും:
${toneInstruction}

ഇവന്റ് വിശദാംശങ്ങൾ:
- ഇവന്റ് തരം: ${event_type}
- വിഭാഗം: ${category}
- മെറ്റാഡാറ്റ: ${JSON.stringify(metadata, null, 2)}
${context ? `- അധിക സന്ദർഭം: ${context}` : ''}

ചുമതല:
ഈ ഇവന്റിനെക്കുറിച്ച് മലയാളത്തിൽ ഒരു വാർത്താ ലേഖനം എഴുതുക. ലേഖനം ഇങ്ങനെയായിരിക്കണം:
1. ആകർഷകവും നന്നായി എഴുതിയതും
2. 2-3 ഖണ്ഡികകൾ (മൊത്തം 150-200 വാക്കുകൾ)
3. ${tone} ടോണിന് അനുയോജ്യം
4. പ്രധാന വസ്തുതകളിലും കഥയിലും ശ്രദ്ധ കേന്ദ്രീകരിച്ചത്

ഔട്ട്പുട്ട് ഫോർമാറ്റ് (JSON):
{
  "title": "തലക്കെട്ട് (80 അക്ഷരങ്ങൾക്ക് താഴെ)",
  "content": "ലേഖന ഉള്ളടക്കത്തിന്റെ 2-3 ഖണ്ഡികകൾ",
  "summary": "ഒരു വാക്യ സംഗ്രഹം (100 അക്ഷരങ്ങൾക്ക് താഴെ)"
}

പ്രധാനം:
- സാധുവായ JSON മാത്രം തിരികെ നൽകുക, മാർക്ക്ഡൗൺ ഫോർമാറ്റിംഗ് വേണ്ട
- തലക്കെട്ട് 80 അക്ഷരങ്ങൾക്ക് താഴെയായിരിക്കണം
- സംഗ്രഹം 100 അക്ഷരങ്ങൾക്ക് താഴെയായിരിക്കണം
- ഉള്ളടക്കം 150-200 വാക്കുകൾ ആയിരിക്കണം
- ${tone} ടോൺ മുഴുവൻ പാലിക്കുക
- സർഗ്ഗാത്മകവും അദ്വിതീയവുമായിരിക്കുക - സാധാരണ വാക്യങ്ങൾ ഒഴിവാക്കുക
`;

  return basePrompt.trim();
}
