'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushToggle() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState<any[]>([])
  const [showIosTip, setShowIosTip] = useState(false)

  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const initStatus = async () => {
      const hasSW = 'serviceWorker' in navigator;
      const hasPush = 'PushManager' in window;
      setIsSupported(hasSW && hasPush);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

      // iOS devices MUST be launched from Home Screen PWA container to use standard Web Push APIs
      if (isIOS && !isStandalone) {
        setShowIosTip(true);
      }

      // Always fetch all registered devices so every device shows in the list
      const serverDevices = await fetchDevices();

      if (hasSW && hasPush && (!isIOS || isStandalone)) {
        try {
          let registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            // Non-blocking 2-second timeout race for service worker ready state
            const swReadyPromise = navigator.serviceWorker.ready;
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('SW ready timeout')), 2000)
            );
            registration = await Promise.race([swReadyPromise, timeoutPromise]);
          }

          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              const isTracked = serverDevices.some((d: any) => d.endpoint === subscription.endpoint);
              setIsSubscribed(isTracked);
            } else {
              setIsSubscribed(false);
            }
          }
        } catch (err) {
          console.warn('[PWA Init Warning] Non-blocking registration load warning:', err);
        }
      }
      setLoading(false);
    }
    initStatus();
  }, [])

  const fetchDevices = async () => {
    try {
      const res = await fetch(`/api/notifications/devices?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
        return data.devices;
      }
    } catch (err) {
      console.error('Failed fetching registered devices:', err);
    }
    return [];
  }

  const handleSubscribe = async () => {
    if (!publicVapidKey) {
      alert('VAPID public key is not loaded. If you recently modified your .env file, please restart your development server (npm run dev) to apply the change.');
      setLoading(false);
      return;
    }

    if (Notification.permission === 'denied') {
      alert('System alerts are blocked in browser preferences. Please reset notification permissions in address bar settings.');
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permission rejected');

      // Safely query service worker registration to prevent infinite hangs in Safari PWA
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        // Fallback with a 5-second timeout safeguard
        const swReadyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker registration timed out. Try closing and reopening the PWA.')), 5000)
        );
        registration = await Promise.race([swReadyPromise, timeoutPromise]);
      }

      if (!registration) {
        throw new Error('Service Worker is not active or could not be found.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const userAgent = navigator.userAgent;
      const isMobile = /Mobi/i.test(userAgent);
      const deviceType = isMobile ? 'Mobile' : 'Desktop';
      let deviceName = 'Browser Target';

      if (/Chrome/i.test(userAgent)) deviceName = 'Chrome';
      else if (/Safari/i.test(userAgent)) deviceName = 'Safari';
      else if (/Firefox/i.test(userAgent)) deviceName = 'Firefox';

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          deviceName,
          deviceType
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server rejected subscription');
      }

      setIsSubscribed(true);
      await fetchDevices();
    } catch (err: any) {
      console.error('[PWA Push Error]', err);
      alert(err.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  }

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Disconnect this device subscription?')) return;
    try {
      const deviceToDelete = devices.find(d => d.id === deviceId);
      const res = await fetch(`/api/notifications/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== deviceId));

        // Only unsubscribe THIS browser's push if its own registration is the one being removed
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const sub = await registration.pushManager.getSubscription();
            // Unsubscribe this browser ONLY if its endpoint matches the device we just deleted
            if (deviceToDelete && sub && sub.endpoint === deviceToDelete.endpoint) {
              await sub.unsubscribe();
              setIsSubscribed(false);
            }
          }
        } catch (swErr) {
          console.warn('SW unsubscribe check failed (non-fatal):', swErr);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Revocation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Revocation failed');
    }
  }

  if (showIosTip) {
    return (
      <div className="p-4 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] text-sm leading-relaxed">
        🔔 <strong>iOS Notification Tip:</strong> Safari requires this application to be installed first. Click your browser Share icon and choose <strong>Add to Home Screen</strong>, then open the installed PWA to enable push notifications!
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="text-gray-400 text-xs italic">
        Push notifications are not supported on this browser version.
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Push Notifications</h3>
          <p className="text-xs text-gray-400">Receive real-time draft notifications and transaction updates</p>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={loading || isSubscribed}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            isSubscribed 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
              : 'bg-[#E8A800] hover:bg-[#FFC93A] text-black'
          }`}
        >
          {loading ? 'Processing...' : isSubscribed ? 'Active' : 'Enable Alerts'}
        </button>
      </div>

      {devices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">My Devices</h4>
          {devices.map(dev => (
            <div key={dev.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-3 text-sm">
              <div>
                <div className="font-bold text-white">{dev.deviceName} ({dev.deviceType})</div>
                <div className="text-xs text-gray-500">Registered: {new Date(dev.lastUsedAt).toLocaleDateString()}</div>
              </div>
              <button
                onClick={() => handleRevokeDevice(dev.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
