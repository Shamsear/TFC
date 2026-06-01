'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl hover:border-white/20 transition-all text-sm font-bold"
      aria-label="Toggle language"
    >
      <span className="text-sm font-black uppercase tracking-wider">
        {language === 'en' ? '🇬🇧 English' : '🇮🇳 മലയാളം'}
      </span>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    </button>
  );
}
