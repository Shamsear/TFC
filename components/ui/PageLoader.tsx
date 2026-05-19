'use client'

import { useEffect } from 'react'
import Image from 'next/image'

export default function PageLoader({ message }: { message?: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">

      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,168,0,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#E8A800]/20 animate-pulse-slow"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            top: `${15 + i * 13}%`,
            left: `${10 + i * 14}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + i}s`,
          }}
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <div
          key={`r${i}`}
          className="absolute rounded-full bg-[#FFC93A]/15 animate-pulse-slow"
          style={{
            width: `${3 + i * 3}px`,
            height: `${3 + i * 3}px`,
            bottom: `${20 + i * 12}%`,
            right: `${8 + i * 15}%`,
            animationDelay: `${i * 0.9 + 0.5}s`,
            animationDuration: `${4 + i}s`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-10 z-10">

        {/* Logo + orbital ring system */}
        <div className="animate-fade-up" style={{ animationDelay: '0s' }}>
          <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>

            {/* Outer glow arc — spins in place */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 55%, rgba(232,168,0,0.3) 75%, rgba(255,201,58,0.7) 90%, transparent)',
                animation: 'spin-ring 3s linear infinite',
                borderRadius: '50%',
              }}
            />

            {/* Spinning conic-gradient border ring — spins in place */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                padding: '2px',
                background:
                  'conic-gradient(from 0deg, #E8A800 0%, #FFC93A 25%, rgba(232,168,0,0.05) 60%, #E8A800 100%)',
                animation: 'spin-ring 2s linear infinite',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Static background fill so ring looks like a border */}
            <div className="absolute inset-[3px] rounded-full bg-[#0f0f0f] border border-white/5" />

            {/* Logo image — stationary, above everything */}
            <div className="relative z-10 w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="Turf Cats"
                width={56}
                height={56}
                className="object-contain p-1"
                priority
              />
            </div>

            {/* Orbiting dot 1 — wrapper rotates, dot stays at offset */}
            <div
              className="absolute inset-0"
              style={{ animation: 'spin-ring 2.5s linear infinite' }}
            >
              <div
                className="absolute w-2.5 h-2.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.9)]"
                style={{ top: '-5px', left: 'calc(50% - 5px)' }}
              />
            </div>

            {/* Orbiting dot 2 — reverse, slightly offset angle */}
            <div
              className="absolute inset-0"
              style={{ animation: 'spin-ring-reverse 4s linear infinite', transform: 'rotate(120deg)' }}
            >
              <div
                className="absolute w-1.5 h-1.5 rounded-full bg-[#FFC93A]/80"
                style={{ bottom: '-3px', left: 'calc(50% - 3px)' }}
              />
            </div>

          </div>
        </div>


        {/* Brand name + subtitle */}
        <div
          className="text-center animate-fade-up"
          style={{ animationDelay: '0.15s', opacity: 0 }}
        >
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-[#FFC93A] via-[#E8A800] to-[#C87A00] bg-clip-text text-transparent mb-1">
            Turf Cats
          </h1>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#7A7367]">
            {message ?? 'Loading'}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-48 animate-fade-up"
          style={{ animationDelay: '0.3s', opacity: 0 }}
        >
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full animate-progress bg-gradient-to-r from-[#E8A800] to-[#FFC93A]" />
          </div>
          <div className="flex justify-between mt-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-[#E8A800]/50 animate-pulse"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
