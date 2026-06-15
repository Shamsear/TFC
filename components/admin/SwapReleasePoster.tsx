'use client'

import { useState, useEffect, useRef } from 'react'
import { getPlayerCardById, getPlayerPhotoUrl } from '@/lib/image-cdn'
import { captureTableAsPng, shareOrDownloadPng } from '@/lib/share-table'

/* ────────────────────────── Player Image Wrapper ────────────────────────── */

function PlayerImageWithFallback({ playerPhotoId, playerName }: { playerPhotoId: string; playerName: string }) {
  // Add a cache buster query parameter specifically for the poster to bypass poisoned CORS browser cache
  const getBustedUrl = (url: string) => {
    if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
    return `${url}?cb=tfc-poster`;
  }

  const [imgSrc, setImgSrc] = useState(() => getBustedUrl(getPlayerCardById(playerPhotoId)))
  const [hasFailedOnce, setHasFailedOnce] = useState(false)
  const [hasFailedTwice, setHasFailedTwice] = useState(false)

  return (
    <img
      src={imgSrc}
      alt={playerName}
      crossOrigin="anonymous"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: 14,
      }}
      onError={() => {
        if (!hasFailedOnce) {
          setHasFailedOnce(true)
          setImgSrc(getBustedUrl(getPlayerPhotoUrl(`${playerPhotoId}.webp`)))
        } else if (!hasFailedTwice) {
          setHasFailedTwice(true)
          setImgSrc('/default-player-card.png')
        }
      }}
    />
  )
}

/* ─────────────────────────── Player Cards Render ────────────────────────── */

function RenderPlayerCards({ 
  teamPlayers 
}: { 
  teamPlayers: Array<{ id: string; playerPhotoId: string; playerName: string; playerValue: number }>;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: 320, width: 260 }}>
      {teamPlayers.map((player, idx) => {
        // Dynamic tilt & offset for a premium stacked trading card look
        const offsetLeft = idx * 28
        const offsetTop = idx * 18
        const rotate = (idx - (teamPlayers.length - 1) / 2) * 6
        
        return (
          <div
            key={player.id}
            style={{
              position: idx === 0 ? 'relative' : 'absolute',
              left: idx === 0 ? undefined : `${50 + offsetLeft}%`,
              transform: idx === 0 ? `rotate(${rotate}deg)` : `translate(-50%, -50%) rotate(${rotate}deg)`,
              top: idx === 0 ? undefined : `${50 + offsetTop}%`,
              zIndex: idx + 1,
              width: 200,
              height: 266,
              borderRadius: 14,
              boxShadow: '0 15px 25px rgba(0,0,0,0.65)',
              transition: 'all 0.3s ease',
            }}
          >
            <PlayerImageWithFallback playerPhotoId={player.playerPhotoId} playerName={player.playerName} />
            
            {/* Price badge overlaid on card */}
            <div style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #111 0%, #222 100%)',
              border: '1.5px solid #FFD700',
              borderRadius: 8,
              padding: '4px 12px',
              color: '#FFD700',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 900,
              fontSize: 14,
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 6px 12px rgba(0,0,0,0.6), 0 0 10px rgba(255,215,0,0.25)',
              letterSpacing: '0.5px'
            }}>
              £{player.playerValue.toLocaleString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper to add a cache buster query parameter specifically for the poster to bypass poisoned CORS browser cache
const getBustedUrl = (url: string | null | undefined) => {
  if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
  return `${url}?cb=tfc-poster`;
}

export interface SwapPosterProps {
  requestingTeamName: string
  requestingTeamLogo?: string | null
  targetTeamName: string
  targetTeamLogo?: string | null
  players: any[]
  requestingTeamId: string
  targetTeamId: string
  status: string
  seasonName: string
  swapWindowName?: string | null
}

export function SwapPoster({
  requestingTeamName,
  requestingTeamLogo,
  targetTeamName,
  targetTeamLogo,
  players,
  requestingTeamId,
  targetTeamId,
  status,
  seasonName,
  swapWindowName,
}: SwapPosterProps) {
  const requestingPlayers = players.filter(p => p.fromTeamId === requestingTeamId)
  const targetPlayers = players.filter(p => p.fromTeamId === targetTeamId)
  
  const isApproved = status.toLowerCase() === 'approved'
  const isRejected = status.toLowerCase() === 'rejected'
  
  const accentColor = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#E8A800'
  const statusLabel = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING APPROVAL'

  return (
    <div
      style={{
        width: 800,
        height: 1000,
        background: 'linear-gradient(135deg, #04060f 0%, #080d1f 35%, #10061c 75%, #05020a 100%)',
        fontFamily: '"Barlow Condensed", "Outfit", "Bahnschrift", "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: '50px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: `inset 0 0 80px rgba(0,0,0,0.9)`
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" crossOrigin="anonymous" />
      
      {/* Background patterns */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255, 255, 255, 0.012) 12px, rgba(255, 255, 255, 0.012) 24px)`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Large Half-Cut Team Logos Background (Both Sides) - High Quality Watermarks */}
      {requestingTeamLogo && (
        <div
          style={{
            position: 'absolute',
            left: -180,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 520,
            height: 520,
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <img
            src={getBustedUrl(requestingTeamLogo)}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'high-quality' as any,
            }}
          />
        </div>
      )}
      {targetTeamLogo && (
        <div
          style={{
            position: 'absolute',
            right: -180,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 520,
            height: 520,
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <img
            src={getBustedUrl(targetTeamLogo)}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'high-quality' as any,
            }}
          />
        </div>
      )}

      {/* Decorative Glow Orbs - Dynamic with Deal Status Accent Color (No CSS blur filters to prevent color bleeding canvas artifacts) */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '-20%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, ${accentColor}05 45%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '-20%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, ${accentColor}05 45%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, borderBottom: '1.5px solid rgba(255, 255, 255, 0.06)', paddingBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: `${accentColor}18`,
            border: `1.5px solid ${accentColor}40`,
            padding: '5px 14px',
            borderRadius: 30,
            marginBottom: 12,
            boxShadow: `0 0 15px ${accentColor}15`
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
              DEAL STATUS: {statusLabel}
            </span>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {seasonName} {swapWindowName ? `· ${swapWindowName}` : ''}
          </div>
          <div style={{ color: '#fff', fontSize: 52, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 }}>
            PLAYER SWAP DEAL
          </div>
        </div>
        
        <img
          src="/logo.png"
          alt="Turf Cats"
          crossOrigin="anonymous"
          style={{
            width: 100,
            height: 100,
            objectFit: 'contain',
            opacity: 0.4,
            flexShrink: 0
          }}
        />
      </div>

      {/* Poster Body - Swap Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, zIndex: 2, margin: '24px 0' }}>
        
        {/* Swapping Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Left Team: Requesting Team */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            
            {/* Team Glassmorphic Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              maxWidth: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)'
            }}>
              {requestingTeamLogo && (
                <img src={getBustedUrl(requestingTeamLogo)} alt="" crossOrigin="anonymous" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              )}
              <div style={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 900,
                fontSize: 16,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 170
              }}>
                {requestingTeamName}
              </div>
            </div>
            
            <div style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#00e5ff',
              letterSpacing: 2,
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(0,229,255,0.2)'
            }}>
              OUTBOUND TRANSFERS
            </div>
            
            <RenderPlayerCards teamPlayers={requestingPlayers} />
            
            <div style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              borderRadius: 12,
              padding: '8px 16px',
              color: '#fff',
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              fontSize: 15,
              textAlign: 'center',
              marginTop: 10,
              width: '100%',
              maxWidth: 240,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)'
            }}>
              {requestingPlayers.map(p => p.playerName).join(' & ')}
            </div>
          </div>

          {/* Middle Swap Arrow Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 100, gap: 14 }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '2.5px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 35px ${accentColor}25, inset 0 0 15px rgba(255,255,255,0.03)`
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
            <div style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 900,
              fontSize: 15,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 2,
              textTransform: 'uppercase'
            }}>
              SWAP
            </div>
          </div>

          {/* Right Team: Target Team */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            
            {/* Team Glassmorphic Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              maxWidth: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)'
            }}>
              {targetTeamLogo && (
                <img src={getBustedUrl(targetTeamLogo)} alt="" crossOrigin="anonymous" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              )}
              <div style={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 900,
                fontSize: 16,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 170
              }}>
                {targetTeamName}
              </div>
            </div>
            
            <div style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#FFB347',
              letterSpacing: 2,
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(255,179,71,0.2)'
            }}>
              INBOUND TRANSFERS
            </div>
            
            <RenderPlayerCards teamPlayers={targetPlayers} />
            
            <div style={{
              background: 'rgba(255, 179, 71, 0.05)',
              border: '1px solid rgba(255, 179, 71, 0.15)',
              borderRadius: 12,
              padding: '8px 16px',
              color: '#fff',
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 800,
              fontSize: 15,
              textAlign: 'center',
              marginTop: 10,
              width: '100%',
              maxWidth: 240,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)'
            }}>
              {targetPlayers.map(p => p.playerName).join(' & ')}
            </div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          TURFCATS.VERCEL.APP
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
          GENERATED ON {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────── Release Poster ────────────────────────────── */

export interface ReleasePosterProps {
  playerName: string
  playerPhotoId: string
  refundAmount: number
  teamName: string
  teamLogo?: string | null
  currentBudget: number
  newBudget: number
  status: string
  seasonName: string
  releaseWindowName?: string | null
  notes?: string | null
}

export function ReleasePoster({
  playerName,
  playerPhotoId,
  refundAmount,
  teamName,
  teamLogo,
  currentBudget,
  newBudget,
  status,
  seasonName,
  releaseWindowName,
}: ReleasePosterProps) {
  const isApproved = status.toLowerCase() === 'approved'
  const isRejected = status.toLowerCase() === 'rejected'
  
  const accentColor = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#E8A800'
  const statusLabel = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'

  return (
    <div
      style={{
        width: 800,
        height: 1000,
        background: 'linear-gradient(135deg, #0f0505 0%, #1c0a0a 35%, #191206 75%, #080202 100%)',
        fontFamily: '"Barlow Condensed", "Outfit", "Bahnschrift", "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: '50px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: `inset 0 0 80px rgba(0,0,0,0.9)`
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" crossOrigin="anonymous" />
      
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255, 255, 255, 0.012) 12px, rgba(255, 255, 255, 0.012) 24px)`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Decorative Glow Orb - Native Gradient (No CSS blur filter to avoid canvas rendering artifacts) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, ${accentColor}05 45%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, borderBottom: '1.5px solid rgba(255, 255, 255, 0.06)', paddingBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: `${accentColor}18`,
            border: `1.5px solid ${accentColor}40`,
            padding: '5px 14px',
            borderRadius: 30,
            marginBottom: 12,
            boxShadow: `0 0 15px ${accentColor}15`
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
              RELEASE {statusLabel}
            </span>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {seasonName} {releaseWindowName ? `· ${releaseWindowName}` : ''}
          </div>
          <div style={{ color: '#fff', fontSize: 52, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 }}>
            CONTRACT TERMINATION
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 900,
            fontSize: 28,
            color: 'rgba(255,255,255,0.08)',
            letterSpacing: 3,
            lineHeight: 1
          }}>
            TFC
          </div>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 2,
            marginTop: 4
          }}>
            ADMINISTRATION
          </div>
        </div>
      </div>

      {/* Poster Body - Content layout (Taller spacing) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, zIndex: 2, margin: '24px 0' }}>
        
        {/* Large Centered Player Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 250,
              height: 333,
              borderRadius: 14,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              position: 'relative'
            }}
          >
            <PlayerImageWithFallback playerPhotoId={playerPhotoId} playerName={playerName} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: -0.5 }}>
              {playerName.toUpperCase()}
            </span>
            <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              RELEASED FROM CONTRACT
            </span>
          </div>
        </div>

        {/* Financial Details Card */}
        <div style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Team Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1.5px solid rgba(255,255,255,0.08)' }}>
            {teamLogo && (
              <img src={getBustedUrl(teamLogo)} alt="" crossOrigin="anonymous" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            )}
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>RELEASING CLUB</span>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
                {teamName}
              </div>
            </div>
          </div>

          {/* Details list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(232, 168, 0, 0.06)', border: '1.5px solid rgba(232, 168, 0, 0.25)', borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>REFUND AMOUNT</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#E8A800', textShadow: '0 0 10px rgba(232,168,0,0.2)' }}>+ £{refundAmount.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>PREVIOUS BUDGET</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255, 255, 255, 0.8)' }}>£{currentBudget.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(16, 185, 129, 0.06)', border: '1.5px solid rgba(16, 185, 129, 0.25)', borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>NEW CLUB BUDGET</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#10B981', textShadow: '0 0 10px rgba(16,185,129,0.2)' }}>£{newBudget.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1.5px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>STATUS REPORT</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {isApproved 
              ? 'Roster slot freed. Player contract terminated and listed in Free Agency.' 
              : 'Release transaction registered. Pending confirmation.'}
          </span>
        </div>
        <div style={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 900,
          fontSize: 16,
          color: '#ef4444',
          letterSpacing: 2,
          textShadow: '0 0 10px rgba(239,68,68,0.2)'
        }}>
          FREE AGENT
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Poster Modal Wrapper ────────────────────────── */

interface PosterModalProps {
  isOpen: boolean
  onClose: () => void
  request: any
  type: 'swap' | 'release'
  seasonName: string
  whatsappMessage?: string
  copyToWhatsApp?: () => void
}

export function PosterModal({
  isOpen,
  onClose,
  request,
  type,
  seasonName,
  whatsappMessage,
  copyToWhatsApp,
}: PosterModalProps) {
  const [scale, setScale] = useState(0.65)
  const [downloading, setDownloading] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)

  // Dynamically scale the taller 800x1000 px poster layout to fit the viewport comfortably
  useEffect(() => {
    if (!isOpen) return
    
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Calculate responsive scale factor based on viewport limits
      const scaleWidth = (width < 640 ? width - 48 : Math.min(width - 400, 600)) / 800
      const scaleHeight = (height - 150) / 1000
      
      setScale(Math.min(scaleWidth, scaleHeight, 0.85))
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  if (!isOpen || !request) return null

  const handleDownload = async () => {
    if (!posterRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await captureTableAsPng(posterRef.current, {
        width: 800,
        backgroundColor: type === 'swap' ? '#04060f' : '#0f0505',
      })
      
      const filename = type === 'swap'
        ? `${request.requestingTeamName.replace(/\s+/g, '-')}-${request.targetTeamName.replace(/\s+/g, '-')}-swap-poster.png`
        : `${request.playerName.replace(/\s+/g, '-')}-release-poster.png`
        
      // Direct download instead of sharing
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    } catch (error) {
      console.error('Poster generation failed:', error)
      alert('Failed to generate image. Please try taking a screenshot of the preview.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-5xl w-full flex flex-col md:flex-row gap-6 my-auto shadow-2xl">
        
        {/* Left Side: Poster Preview (Responsive Scale) */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-xl p-6 border border-white/5 relative min-h-[400px] sm:min-h-[550px] overflow-hidden">
          <span className="absolute top-3 left-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Poster Preview
          </span>
          
          <div 
            style={{ 
              width: 800 * scale, 
              height: 1000 * scale, 
              overflow: 'hidden',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              {type === 'swap' ? (
                <SwapPoster
                  requestingTeamName={request.requestingTeamName}
                  requestingTeamLogo={request.requestingTeamLogo}
                  targetTeamName={request.targetTeamName}
                  targetTeamLogo={request.targetTeamLogo}
                  players={request.players}
                  requestingTeamId={request.requestingTeamId}
                  targetTeamId={request.targetTeamId}
                  status={request.status}
                  seasonName={seasonName}
                  swapWindowName={request.swapWindowName}
                />
              ) : (
                <ReleasePoster
                  playerName={request.playerName}
                  playerPhotoId={request.playerPhotoId}
                  refundAmount={request.refundAmount}
                  teamName={request.teamName}
                  teamLogo={request.teamLogo}
                  currentBudget={request.currentBudget}
                  newBudget={request.newBudget}
                  status={request.status}
                  seasonName={seasonName}
                  releaseWindowName={request.releaseWindowName}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="w-full md:w-80 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Share Graphic</h3>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
                Approved request details generated as a premium 4:5 vertical poster. Perfect for sharing on mobile and social channels.
              </p>
            </div>

            {whatsappMessage && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp Copytext</span>
                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5 max-h-52 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{whatsappMessage}</pre>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-5 border-t border-white/10">
            {whatsappMessage && copyToWhatsApp && (
              <button
                onClick={copyToWhatsApp}
                className="w-full px-4 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#25D366]/10"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Copy Message
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full px-4 py-3 bg-[#E8A800] hover:bg-[#FFC93A] disabled:opacity-50 text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#E8A800]/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? 'Capturing PNG...' : 'Download Poster Image'}
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all border border-white/5"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Hidden 100% scale capture target */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }} aria-hidden="true">
        <div ref={posterRef} style={{ width: 800, height: 1000 }}>
          {type === 'swap' ? (
            <SwapPoster
              requestingTeamName={request.requestingTeamName}
              requestingTeamLogo={request.requestingTeamLogo}
              targetTeamName={request.targetTeamName}
              targetTeamLogo={request.targetTeamLogo}
              players={request.players}
              requestingTeamId={request.requestingTeamId}
              targetTeamId={request.targetTeamId}
              status={request.status}
              seasonName={seasonName}
              swapWindowName={request.swapWindowName}
            />
          ) : (
            <ReleasePoster
              playerName={request.playerName}
              playerPhotoId={request.playerPhotoId}
              refundAmount={request.refundAmount}
              teamName={request.teamName}
              teamLogo={request.teamLogo}
              currentBudget={request.currentBudget}
              newBudget={request.newBudget}
              status={request.status}
              seasonName={seasonName}
              releaseWindowName={request.releaseWindowName}
            />
          )}
        </div>
      </div>
    </div>
  )
}
