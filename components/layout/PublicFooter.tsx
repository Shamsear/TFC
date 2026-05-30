"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function PublicFooter() {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null)

  return (
    <footer className="relative border-t border-white/[0.06] bg-black/40 backdrop-blur-md overflow-hidden z-10">
      {/* Decorative Foot Spotlight */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-[#E8A800]/[0.03] rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#E8A800]/30 transition-colors shadow-2xl">
                <Image
                  src="/logo.jpeg"
                  alt="Turf Cats"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div>
                <div className="text-xl font-black bg-gradient-to-r from-[#FFC93A] via-[#FFD066] to-[#E8A800] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(232,168,0,0.15)]">
                  Turf Cats
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                  eFootball League
                </div>
              </div>
            </Link>
            <p className="text-gray-400 font-medium leading-relaxed max-w-md text-sm mt-3">
              The premier eFootball tournament management platform. Build your dynasty through strategic auctions, player retention, and real-time team management.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#F5F0E8] mb-5">Quick Links</h3>
            <nav className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: 'Seasons', href: '/seasons' },
                { label: 'Teams', href: '/teams' },
                { label: 'Players', href: '/players' },
                { label: 'Calendar', href: '/calendar' },
                { label: 'Auctions', href: '/auctions' },
                { label: 'Tournaments', href: '/tournaments' }
              ].map(link => (
                <Link 
                  key={link.label} 
                  href={link.href} 
                  className="text-gray-400 hover:text-[#E8A800] transition-colors text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-[#E8A800] transition-colors" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase">
            © {new Date().getFullYear()} Turf Cats. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setModalType('privacy')}
              className="text-gray-500 hover:text-[#E8A800] transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setModalType('terms')}
              className="text-gray-500 hover:text-[#E8A800] transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Premium Glassmorphic Modal Overlay */}
      {modalType && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-[#0d0d10]/95 border border-white/10 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 border border-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {modalType === 'privacy' ? (
              <div>
                <h3 className="text-2xl font-black text-white mb-4 bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                  Privacy Policy
                </h3>
                <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    Your privacy is of utmost importance to us. Turf Cats is dedicated to protecting the personal and tactical data of our league managers.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">1. Data We Collect</h4>
                  <p>
                    We collect your account credentials, squad setups, bid allocations, financial ledger transactions, and push subscription endpoints to ensure active gameplay and delivery of real-time notifications.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">2. Bid Secrecy & Fair Play</h4>
                  <p>
                    All auction planner strategies and round-bids are stored securely and encrypted with AES-256 standard protocols. No manager, administrator, or outside entity has access to decrypted bids until the auction round closes.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">3. Device Notifications</h4>
                  <p>
                    If opted-in, we collect your browser VAPID push token to notify you of outbids, completed trades, and match schedules. You can toggle this setting off instantly via your Profile tab.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-black text-white mb-4 bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                  Terms of Service
                </h3>
                <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
                  <p>
                    Welcome to Turf Cats. By accessing and managing your team, you agree to comply with the rules outlined below.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">1. Manager Conduct & Fair Play</h4>
                  <p>
                    Managers must participate actively during scheduled auction slots. Submitting malicious, bot-generated, or illegal bid operations is strictly forbidden.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">2. Budget & Roster Limits</h4>
                  <p>
                    Rosters are strictly limited to between 25 and 30 active player slots. The financial purse acts as the governing balance — any ledger adjustment due to releases or trade swaps is subject to admin approval and transaction-audit protocols.
                  </p>
                  <h4 className="font-bold text-white text-base mt-4">3. Roster Window Rules</h4>
                  <p>
                    Roster changes including swaps and releases can only occur during open transfer windows designated by active league admins.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="px-6 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all shadow-md"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
