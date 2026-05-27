'use client'

import { useEffect, useState } from 'react'

export default function PWARegistry() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
          setSwRegistration(reg);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true); // SW v2 is staged and waiting
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] SW Registration error:', err);
        });
    }
  }, []);

  const refreshServiceWorker = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return updateAvailable ? (
    <div className="fixed bottom-6 right-6 z-50 bg-[#E8A800] text-black px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-bounce">
      <span>A new version of TFC is available!</span>
      <button onClick={refreshServiceWorker} className="bg-black text-white px-3 py-1.5 rounded-lg text-xs hover:bg-neutral-800 transition-colors">
        Refresh
      </button>
    </div>
  ) : null;
}
