'use client'

import { useState, useRef } from 'react'
import { captureTableAsPng } from '@/lib/share-table'
import type { TeamStatRow } from './TournamentStats'

/* ───────────────────────────── Theme Definitions ────────────────────────── */

type ThemeKey = 'golden_boot' | 'ball' | 'glove' | 'team_matchday'

interface Theme {
  label: string
  emoji: string
  bg: string[]
  accent: string
  accent2: string
  glow: string
  tagline: string
}

const THEMES: Record<ThemeKey, Theme> = {
  golden_boot: {
    label: 'Golden Boot',
    emoji: '🥾',
    bg: ['#0a0a0a', '#1a1200', '#2d1f00'],
    accent: '#FFD700',
    accent2: '#FFA500',
    glow: 'rgba(255,215,0,0.35)',
    tagline: 'GOLDEN BOOT',
  },
  ball: {
    label: 'Match Ball',
    emoji: '⚽',
    bg: ['#050a1a', '#0a1628', '#0d2040'],
    accent: '#3ab8ff',
    accent2: '#ffffff',
    glow: 'rgba(58,184,255,0.35)',
    tagline: 'MATCH STATISTICS',
  },
  glove: {
    label: 'Golden Glove',
    emoji: '🧤',
    bg: ['#0a0a14', '#0d1a2d', '#1a0d2d'],
    accent: '#a78bfa',
    accent2: '#38bdf8',
    glow: 'rgba(167,139,250,0.35)',
    tagline: 'GOLDEN GLOVE',
  },
  team_matchday: {
    label: 'Team Matchday',
    emoji: '⚡',
    bg: ['#0a0a0a', '#0f0f0f', '#141414'],
    accent: '#00e5ff',
    accent2: '#0077ff',
    glow: 'rgba(0,229,255,0.35)',
    tagline: 'TEAM OF THE DAY',
  },
}

/* ─────────────────────────── SVG Icon Components ────────────────────────── */

function BootIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M12 48c0-4 2-8 6-10l8-4c2-1 4-3 4-5V16c0-2 2-4 4-4h8c2 0 4 2 4 4v6l4 2c4 2 6 6 6 10v4c0 6-4 10-10 10H22c-6 0-10-4-10-10z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M30 12v17M26 34l-8 4M46 34v4" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <circle cx="34" cy="24" r="3" fill={color} fillOpacity={0.3} />
    </svg>
  )
}

function BallIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="22" stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0.08} />
      <path
        d="M32 10v12l10 6 12-2M32 22l-10 6-2 12M22 28l-12-2M44 28l12-2M20 40l-4 10M20 40l12 8M44 40l4 10M44 40l-12 8M32 48v6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.4}
      />
      <polygon
        points="32,22 42,28 38,40 26,40 22,28"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.5}
      />
    </svg>
  )
}

function GloveIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M18 38V22c0-3 2-5 5-5s5 2 5 5v-6c0-3 2-5 5-5s5 2 5 5v-2c0-3 2-5 5-5s5 2 5 5v20c0 10-6 16-15 16H28c-6 0-10-4-10-10z"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23 22v12M28 16v14M33 14v16M38 16v14" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
      <path d="M20 42h24" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.25} />
    </svg>
  )
}

function ShieldIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 8L48 14L48 30C48 40 44 48 32 56C20 48 16 40 16 30L16 14Z"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 20v24M24 28h16M24 36h16" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      <circle cx="32" cy="32" r="8" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.08} />
    </svg>
  )
}

const ICON_MAP: Record<ThemeKey, typeof BootIcon> = {
  golden_boot: BootIcon,
  ball: BallIcon,
  glove: GloveIcon,
  team_matchday: ShieldIcon,
}

/* ──────────────────────── Poster Snapshot Component ──────────────────────── */

function TeamMatchdayPosterSnapshot({
  theme,
  team,
  tournamentName,
  seasonName,
  roundLabel,
}: {
  theme: Theme
  themeKey: ThemeKey
  team: TeamStatRow
  tournamentName: string
  seasonName: string
  roundLabel: string
}) {
  // Use team's primary color if available and valid, otherwise use theme color
  const teamColor = (team.primaryColor && team.primaryColor !== '' && team.primaryColor.startsWith('#')) 
    ? team.primaryColor 
    : theme.accent
  
  // Lighten the team color by 20% for better visibility
  const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.floor((num >> 16) + ((255 - (num >> 16)) * percent)))
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + ((255 - ((num >> 8) & 0x00FF)) * percent)))
    const b = Math.min(255, Math.floor((num & 0x0000FF) + ((255 - (num & 0x0000FF)) * percent)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
  
  const lighterTeamColor = lightenColor(teamColor, 0.3)
  
  // Generate background gradient based on team color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  const rgb = hexToRgb(lighterTeamColor)
  const bgGradient = `linear-gradient(145deg, rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05}), rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08}), rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12}))`
  const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`
  
  // Safety check - if no team data, show placeholder
  if (!team || !team.teamName) {
    return (
      <div
        style={{
          width: 800,
          minHeight: 600,
          background: `linear-gradient(145deg, ${theme.bg[0]}, ${theme.bg[1]}, ${theme.bg[2]})`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          padding: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ color: '#8a8278', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            No team data available for this matchday
          </div>
          <div style={{ color: '#6b6560', fontSize: 14 }}>
            Please select a different matchday or check if matches have been played.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 800,
        minHeight: 600,
        background: bgGradient,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: 48,
      }}
    >
      {/* Diagonal Lines Pattern Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.02) 10px,
            rgba(255, 255, 255, 0.02) 20px
          )`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Large Half-Cut Team Logo Background (Right Side) - High Quality */}
      {team.logoUrl && (
        <div
          style={{
            position: 'absolute',
            right: -200,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 600,
            height: 600,
            opacity: 0.10,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <img
            src={team.logoUrl}
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

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${theme.accent}15`,
                border: `1.5px solid ${theme.accent}35`,
                padding: '5px 14px',
                borderRadius: 30,
                marginBottom: 16,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent }} />
              <span style={{ color: lighterTeamColor, fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' as const }}>
                {roundLabel}
              </span>
            </div>
            <div style={{ color: '#8a8278', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>
              {seasonName} · {tournamentName}
            </div>
            <div style={{ color: '#FFFFFF', fontSize: 56, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1, marginBottom: 8 }}>
              TEAM OF
            </div>
            <div
              style={{
                color: lighterTeamColor,
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: -1.5,
                lineHeight: 1,
                textShadow: `0 0 30px ${glowColor}`,
              }}
            >
              THE DAY
            </div>
          </div>
        </div>

        {/* Team Card */}
        <div
          style={{
            padding: 40,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Team Logo - No box, no background */}
          <div
            style={{
              width: 280,
              height: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: `drop-shadow(0 12px 32px ${glowColor})`,
            }}
          >
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.teamName}
                crossOrigin="anonymous"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  imageRendering: 'high-quality' as any,
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${teamColor}, ${teamColor}dd)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 72, fontWeight: 900, color: '#0a0a0a' }}>
                  {team.teamName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Team Name */}
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ color: '#F5F0E8', fontSize: 48, fontWeight: 900, letterSpacing: -1, lineHeight: 1, marginBottom: 12 }}>
              {team.teamName}
            </div>
            
            {/* Manager Name - Clean and elegant */}
            {team.managerName && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  background: lighterTeamColor 
                }} />
                <div style={{ 
                  color: lighterTeamColor, 
                  fontSize: 14, 
                  fontWeight: 700, 
                  letterSpacing: 1,
                  textTransform: 'uppercase' as const,
                }}>
                  {team.managerName}
                </div>
                <div style={{ 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  background: lighterTeamColor 
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Match Results - Centered Layout */}
        {(team as any).matchDetails && (team as any).matchDetails.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 24 }}>
            {(team as any).matchDetails.map((match: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Score - Large and Centered */}
                <div style={{ 
                  color: match.result === 'W' ? '#22c55e' : 
                         match.result === 'L' ? '#ef4444' : 
                         theme.accent, 
                  fontSize: 64, 
                  fontWeight: 900, 
                  lineHeight: 1,
                  letterSpacing: 3,
                }}>
                  {match.goalsFor}-{match.goalsAgainst}
                </div>

                {/* VS Divider */}
                <div style={{ 
                  color: '#6b6560', 
                  fontSize: 11, 
                  fontWeight: 800, 
                  letterSpacing: 2,
                  textTransform: 'uppercase' as const,
                }}>
                  VERSUS
                </div>

                {/* Opponent Team Logo and Name */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {match.opponentLogo ? (
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: `drop-shadow(0 4px 12px ${theme.glow})`,
                      }}
                    >
                      <img
                        src={match.opponentLogo}
                        alt={match.opponentName}
                        crossOrigin="anonymous"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${theme.accent}20, ${theme.accent}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${theme.accent}30`,
                      }}
                    >
                      <span style={{ fontSize: 28, fontWeight: 900, color: theme.accent }}>
                        {match.opponentName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div style={{ color: '#F5F0E8', fontSize: 20, fontWeight: 800, textAlign: 'center' as const }}>
                    {match.opponentName}
                  </div>
                </div>

                {/* Separator line between matches (if not last) */}
                {idx < (team as any).matchDetails.length - 1 && (
                  <div style={{ 
                    width: '100%', 
                    height: 1, 
                    background: 'rgba(255,255,255,0.05)', 
                    marginTop: 12 
                  }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center' as const, 
            padding: '32px 24px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 14,
            marginBottom: 32
          }}>
            <div style={{ color: '#8a8278', fontSize: 14, fontWeight: 700 }}>
              No matches played in this matchday
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ color: '#3a3630', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>turfcats.vercel.app</div>
          <div style={{ color: '#3a3630', fontSize: 11, fontWeight: 700 }}>
            Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}

function PosterSnapshot({
  theme,
  themeKey,
  teams,
  maxTeams,
  tournamentName,
  seasonName,
  roundLabel,
  getMetric,
}: {
  theme: Theme
  themeKey: ThemeKey
  teams: TeamStatRow[]
  maxTeams: number
  tournamentName: string
  seasonName: string
  roundLabel: string
  getMetric: (t: TeamStatRow) => { primary: number; label: string; secondary: string }
}) {
  const Icon = ICON_MAP[themeKey]
  const displayTeams = teams.slice(0, maxTeams)
  const winner = displayTeams[0]

  // Use winner's primary color if available and valid, otherwise use theme color
  const winnerColor = (winner?.primaryColor && winner.primaryColor !== '' && winner.primaryColor.startsWith('#'))
    ? winner.primaryColor 
    : theme.accent
  
  // Lighten the winner color by 20% for better visibility
  const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.floor((num >> 16) + ((255 - (num >> 16)) * percent)))
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + ((255 - ((num >> 8) & 0x00FF)) * percent)))
    const b = Math.min(255, Math.floor((num & 0x0000FF) + ((255 - (num & 0x0000FF)) * percent)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
  
  const lighterWinnerColor = lightenColor(winnerColor, 0.3)
  
  // Generate background gradient based on winner's color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  const rgb = hexToRgb(lighterWinnerColor)
  const bgGradient = `linear-gradient(145deg, rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05}), rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08}), rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12}))`
  const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`
  const glowColorLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`

  return (
    <div
      style={{
        width: 800,
        minHeight: 600,
        background: bgGradient,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Diagonal Lines Pattern Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.02) 10px,
            rgba(255, 255, 255, 0.02) 20px
          )`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Background Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColorLight}, transparent 70%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Large Half-Cut Winner Team Logo Background (Right Side) - High Quality */}
      {winner?.logoUrl && (
        <div
          style={{
            position: 'absolute',
            right: -200,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 600,
            height: 600,
            opacity: 0.10,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <img
            src={winner.logoUrl}
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

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: 48 }}>
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${winnerColor}15`,
                border: `1.5px solid ${winnerColor}35`,
                padding: '5px 14px',
                borderRadius: 30,
                marginBottom: 16,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: lighterWinnerColor }} />
              <span style={{ color: lighterWinnerColor, fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' as const }}>
                {theme.tagline}
              </span>
            </div>
            <div style={{ color: '#8a8278', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>
              {seasonName} · {roundLabel}
            </div>
            <div style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.15 }}>
              {tournamentName}
            </div>
          </div>
          <div style={{ opacity: 0.2, flexShrink: 0, marginTop: 8 }}>
            <Icon color={winnerColor} size={80} />
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(to right, ${winnerColor}40, transparent)`,
            margin: '20px 0 28px',
          }}
        />

        {/* Winner Highlight Card */}
        {winner && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: `linear-gradient(135deg, ${winnerColor}12, ${winnerColor}05)`,
              border: `1.5px solid ${winnerColor}30`,
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: winner.logoUrl ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${winnerColor}, ${winnerColor}dd)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 20px ${glowColor}`,
                overflow: 'hidden',
                border: `1.5px solid ${winnerColor}40`,
              }}
            >
              {winner.logoUrl ? (
                <img
                  src={winner.logoUrl}
                  alt={winner.teamName}
                  crossOrigin="anonymous"
                  style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0a0a0a' }}>
                  {winner.teamName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#8a8278', fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                CURRENT LEADER
              </div>
              <div style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
                {winner.teamName}
              </div>
              <div style={{ color: '#9a9288', fontSize: 12, fontWeight: 700, marginTop: 4, letterSpacing: 0.3 }}>
                {getMetric(winner).secondary.split('·').map((part: string, i: number) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: '#4a4540', margin: '0 6px' }}>•</span>}
                    <span style={{ color: i === 0 ? '#a8a098' : '#8a8278' }}>{part.trim()}</span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: lighterWinnerColor, fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                {getMetric(winner).primary}
              </div>
              <div style={{ color: lighterWinnerColor, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, opacity: 0.7 }}>
                {getMetric(winner).label}
              </div>
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <span style={{ width: 40, color: '#6b6560', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>#</span>
            <span style={{ flex: 1, color: '#6b6560', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>TEAM</span>
            <span style={{ width: 80, textAlign: 'center' as const, color: lighterWinnerColor, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
              {getMetric(teams[0] || ({} as TeamStatRow)).label}
            </span>
            <span style={{ width: 180, textAlign: 'center' as const, color: '#6b6560', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>RECORD</span>
          </div>

          {/* Rows */}
          {displayTeams.map((team, idx) => {
            const pos = idx + 1
            const metric = getMetric(team)
            const isTop3 = pos <= 3
            const posBg =
              pos === 1
                ? `linear-gradient(135deg, #FFD700, #FFA500)`
                : pos === 2
                  ? `linear-gradient(135deg, #E0E0E0, #9E9E9E)`
                  : pos === 3
                    ? `linear-gradient(135deg, #CD7F32, #8B4513)`
                    : 'rgba(255,255,255,0.06)'
            const posColor = isTop3 ? '#0a0a0a' : '#7A7367'

            return (
              <div
                key={team.teamId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ width: 40, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 900,
                      background: posBg,
                      color: posColor,
                      boxShadow: isTop3 ? `0 2px 8px ${glowColor.replace('0.35', '0.2')}` : 'none',
                    }}
                  >
                    {pos}
                  </div>
                </div>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginRight: 10,
                    background: team.logoUrl ? 'transparent' : 'rgba(255,255,255,0.06)',
                    border: team.logoUrl ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.teamName}
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7A7367' }}>
                      {team.teamName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: '#F5F0E8', fontSize: 14 }}>{team.teamName}</span>
                </div>
                <div
                  style={{
                    width: 80,
                    textAlign: 'center' as const,
                    fontWeight: 900,
                    fontSize: 18,
                    color: isTop3 ? lighterWinnerColor : '#F5F0E8',
                  }}
                >
                  {metric.primary}
                </div>
                <div style={{ width: 180, textAlign: 'center' as const, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#A0988A' }}>{metric.secondary.split('·')[0]}</span>
                  {metric.secondary.includes('·') && (
                    <>
                      <span style={{ color: '#4a4540', margin: '0 4px' }}>•</span>
                      <span style={{ color: '#8a8278' }}>{metric.secondary.split('·')[1]}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ color: '#3a3630', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>turfcats.vercel.app</div>
          <div style={{ color: '#3a3630', fontSize: 11, fontWeight: 700 }}>
            Generated on{' '}
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────── Main StatsPoster Component ──────────────────────── */

interface StatsPosterProps {
  teams: TeamStatRow[]
  tournamentName: string
  seasonName: string
  roundLabel: string
  activeAward: 'golden-boot' | 'golden-ball' | 'golden-glove'
  imageTeamsLimit: string
  matches?: any[]
}

export default function StatsPoster({
  teams,
  tournamentName,
  seasonName,
  roundLabel,
  activeAward,
  imageTeamsLimit,
  matches = [],
}: StatsPosterProps) {
  const posterRef = useRef<HTMLDivElement>(null)
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(
    activeAward === 'golden-boot' ? 'golden_boot' : activeAward === 'golden-glove' ? 'glove' : 'ball'
  )
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [selectedMatchday, setSelectedMatchday] = useState<number>(0)

  const theme = THEMES[activeTheme]
  const maxTeams = imageTeamsLimit === 'all' ? teams.length : Number(imageTeamsLimit)

  // Generate matchday options from matches data
  const matchdayOptions = (() => {
    if (matches && matches.length > 0) {
      const rounds = Array.from(new Set(matches.filter(m => m.round).map(m => m.round as string)))
        .sort((a, b) => {
          const getRoundNum = (name: string) => {
            const num = name.match(/\d+/)
            return num ? parseInt(num[0], 10) : 1
          }
          return getRoundNum(a) - getRoundNum(b)
        })
      return rounds.map(r => {
        const num = r.match(/\d+/)
        return num ? parseInt(num[0], 10) : 1
      })
    }
    // Fallback to max played games
    const maxMatchdays = Math.max(...teams.map(t => t.played), 10)
    return Array.from({ length: maxMatchdays }, (_, i) => i + 1)
  })()

  // Calculate cumulative team stats up to a specific matchday (for Golden Boot, Ball, Glove)
  const getCumulativeStatsUpToMatchday = (matchdayNum: number) => {
    if (!matches || matches.length === 0 || matchdayNum === 0) {
      return teams
    }

    // Get all matches up to and including the selected matchday
    const cumulativeMatches = matches.filter(m => {
      if (!m.round || m.status !== 'COMPLETED') return false
      const matchRoundNum = parseInt(m.round.match(/\d+/)?.[0] || '0')
      return matchRoundNum <= matchdayNum
    })

    if (cumulativeMatches.length === 0) {
      return teams
    }

    // Calculate cumulative stats for each team
    const teamStats = teams.map(team => {
      const teamMatches = cumulativeMatches.filter(
        m => m.homeTeamId === team.seasonTeamId || m.awayTeamId === team.seasonTeamId
      )

      let played = 0
      let won = 0
      let drawn = 0
      let lost = 0
      let goalsFor = 0
      let goalsAgainst = 0
      let cleanSheets = 0
      let points = 0

      teamMatches.forEach(match => {
        const isHome = match.homeTeamId === team.seasonTeamId
        const myScore = isHome ? (match.homeScore || 0) : (match.awayScore || 0)
        const oppScore = isHome ? (match.awayScore || 0) : (match.homeScore || 0)

        played++
        goalsFor += myScore
        goalsAgainst += oppScore
        if (oppScore === 0) cleanSheets++

        if (myScore > oppScore) {
          won++
          points += 3
        } else if (myScore === oppScore) {
          drawn++
          points += 1
        } else {
          lost++
        }
      })

      return {
        ...team,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff: goalsFor - goalsAgainst,
        points,
        cleanSheets
      }
    })

    return teamStats
  }

  // Calculate team performance for selected matchday
  const getTeamStatsForMatchday = (matchdayNum: number) => {
    if (!matches || matches.length === 0) {
      return teams.map(t => ({ ...t, matchDetails: [] }))
    }

    const matchdayName = `Matchday ${matchdayNum}`

    let matchdayMatches = matches.filter(m => m.round === matchdayName)

    // If no matches found, try fallback
    if (matchdayMatches.length === 0) {
      // Try case-insensitive exact match
      matchdayMatches = matches.filter(m => 
        m.round && m.round.toLowerCase() === matchdayName.toLowerCase()
      )
    }

    if (matchdayMatches.length === 0) {
      return teams.map(t => ({ ...t, matchDetails: [] }))
    }

    // Calculate stats for each team based on matchday matches
    const teamStats = teams.map(team => {
      // Match using seasonTeamId (TFCST-X) which is what matches use
      const teamMatches = matchdayMatches.filter(
        m => m.homeTeamId === team.seasonTeamId || m.awayTeamId === team.seasonTeamId
      )

      let matchdayPoints = 0
      let matchdayGoalsFor = 0
      let matchdayGoalsAgainst = 0
      let matchdayWon = 0
      let matchdayDrawn = 0
      let matchdayLost = 0

      // Store match details with opponent info
      const matchDetails = teamMatches.map(match => {
        const isHome = match.homeTeamId === team.seasonTeamId
        const goalsFor = isHome ? (match.homeScore || 0) : (match.awayScore || 0)
        const goalsAgainst = isHome ? (match.awayScore || 0) : (match.homeScore || 0)
        const opponentId = isHome ? match.awayTeamId : match.homeTeamId
        const opponentTeam = teams.find(t => t.seasonTeamId === opponentId)

        matchdayGoalsFor += goalsFor
        matchdayGoalsAgainst += goalsAgainst

        if (goalsFor > goalsAgainst) {
          matchdayPoints += 3
          matchdayWon += 1
        } else if (goalsFor === goalsAgainst) {
          matchdayPoints += 1
          matchdayDrawn += 1
        } else {
          matchdayLost += 1
        }

        return {
          goalsFor,
          goalsAgainst,
          opponentName: opponentTeam?.teamName || 'Unknown',
          opponentLogo: opponentTeam?.logoUrl,
          result: goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L'
        }
      })

      return {
        ...team,
        played: teamMatches.length,
        points: matchdayPoints,
        goalsFor: matchdayGoalsFor,
        goalsAgainst: matchdayGoalsAgainst,
        goalDiff: matchdayGoalsFor - matchdayGoalsAgainst,
        won: matchdayWon,
        drawn: matchdayDrawn,
        lost: matchdayLost,
        matchDetails
      }
    })

    const teamsWithMatches = teamStats.filter(t => t.played > 0)
    
    return teamsWithMatches.length > 0 ? teamsWithMatches : teams.map(t => ({ ...t, matchDetails: [] }))
  }

  // Metric extraction per theme
  const getMetric = (t: TeamStatRow) => {
    switch (activeTheme) {
      case 'golden_boot':
        return {
          primary: t.goalsFor,
          label: 'Goals',
          secondary: `${t.played} MP · ${t.won}W ${t.drawn}D ${t.lost}L`,
        }
      case 'ball':
        return {
          primary: t.points,
          label: 'Points',
          secondary: `GD ${t.goalDiff > 0 ? '+' : ''}${t.goalDiff} · ${t.goalsFor} GF`,
        }
      case 'glove':
        return {
          primary: t.goalsAgainst,
          label: 'GA',
          secondary: `${t.cleanSheets ?? 0} CS · ${t.played} MP`,
        }
      case 'team_matchday':
        return {
          primary: t.points,
          label: 'Points',
          secondary: `${t.played} MP · ${t.won}W ${t.drawn}D ${t.lost}L`,
        }
    }
  }

  // Get teams based on poster type and matchday selection
  const matchdayTeams = (() => {
    if (selectedMatchday === 0) {
      return teams // All matchdays
    }
    
    if (activeTheme === 'team_matchday') {
      // Team Matchday: Show only that specific matchday
      return getTeamStatsForMatchday(selectedMatchday)
    } else {
      // Golden Boot, Ball, Glove: Show cumulative stats up to that matchday
      return getCumulativeStatsUpToMatchday(selectedMatchday)
    }
  })()

  // Sort teams based on active theme
  const sortedTeams = (() => {
    const teamsToSort = matchdayTeams
    
    switch (activeTheme) {
      case 'golden_boot':
        return [...teamsToSort].sort((a, b) => b.goalsFor - a.goalsFor || b.won - a.won)
      case 'ball':
        return [...teamsToSort].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
      case 'glove':
        return [...teamsToSort].filter(t => t.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst || (b.cleanSheets ?? 0) - (a.cleanSheets ?? 0))
      case 'team_matchday':
        return [...teamsToSort].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
      default:
        return teamsToSort
    }
  })()

  // Get the best team for the selected matchday
  const bestTeamForMatchday = sortedTeams[0] || ({} as TeamStatRow)

  const handleDownload = async () => {
    if (!posterRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await captureTableAsPng(posterRef.current, {
        width: 800,
        backgroundColor: theme.bg[0],
      })
      const blob = await (await fetch(dataUrl)).blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${(tournamentName || 'TFC').replace(/\s+/g, '-').toLowerCase()}-${activeTheme}-poster.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      setDownloadDone(true)
      setTimeout(() => setDownloadDone(false), 2500)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!posterRef.current || sharing) return
    setSharing(true)
    try {
      const dataUrl = await captureTableAsPng(posterRef.current, {
        width: 800,
        backgroundColor: theme.bg[0],
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File(
        [blob],
        `${(tournamentName || 'TFC').replace(/\s+/g, '-').toLowerCase()}-${activeTheme}-poster.png`,
        { type: 'image/png' }
      )
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${tournamentName} — ${theme.label} Poster`,
        })
      } else {
        await handleDownload()
        return
      }
      setShareDone(true)
      setTimeout(() => setShareDone(false), 2500)
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setShowPoster(!showPoster)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
          showPoster
            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
            : 'bg-white/5 border-white/10 text-[#D4CCBB] hover:bg-white/10 hover:text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {showPoster ? 'Hide Poster Studio' : '🎨 Poster Studio'}
      </button>

      {/* Poster Studio Panel */}
      {showPoster && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
          {/* Studio Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#F5F0E8] flex items-center gap-2">
                  <span className="text-lg">🎨</span> Poster Studio
                </h3>
                <p className="text-xs text-[#7A7367] mt-0.5">
                  Create premium shareable posters for your stats
                </p>
              </div>

              {/* Theme Selector */}
              <div className="flex gap-2">
                {(Object.entries(THEMES) as [ThemeKey, Theme][]).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTheme(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      activeTheme === key
                        ? 'border-opacity-50 shadow-lg'
                        : 'border-white/10 bg-white/5 text-[#7A7367] hover:bg-white/10'
                    }`}
                    style={
                      activeTheme === key
                        ? {
                            background: `${t.accent}18`,
                            borderColor: `${t.accent}50`,
                            color: t.accent,
                            boxShadow: `0 2px 12px ${t.glow.replace('0.35', '0.2')}`,
                          }
                        : undefined
                    }
                  >
                    <span>{t.emoji}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Matchday Selector - Show for all poster types */}
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-bold text-[#7A7367] uppercase tracking-wider">
                Filter by Matchday:
              </label>
              <select
                value={selectedMatchday}
                onChange={(e) => setSelectedMatchday(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#F5F0E8] text-sm font-bold focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/30"
                style={{
                  background: `${theme.accent}08`,
                  borderColor: `${theme.accent}30`,
                }}
              >
                <option value={0} className="bg-[#0a0a0a] text-[#F5F0E8]">
                  All Matchdays
                </option>
                {matchdayOptions.map((md) => (
                  <option key={md} value={md} className="bg-[#0a0a0a] text-[#F5F0E8]">
                    Matchday {md}
                  </option>
                ))}
              </select>
              {selectedMatchday > 0 && (
                <div className="text-xs text-[#7A7367]">
                  {activeTheme === 'team_matchday' 
                    ? `Showing best team from Matchday ${selectedMatchday}`
                    : `Showing cumulative stats till Matchday ${selectedMatchday}`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Poster Preview (scaled down for display) */}
          <div className="p-5">
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl mx-auto" style={{ maxWidth: 600 }}>
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%' }}>
                {activeTheme === 'team_matchday' ? (
                  <TeamMatchdayPosterSnapshot
                    theme={theme}
                    themeKey={activeTheme}
                    team={bestTeamForMatchday}
                    tournamentName={tournamentName}
                    seasonName={seasonName}
                    roundLabel={`Matchday ${selectedMatchday}`}
                  />
                ) : (
                  <PosterSnapshot
                    theme={theme}
                    themeKey={activeTheme}
                    teams={sortedTeams}
                    maxTeams={maxTeams}
                    tournamentName={tournamentName}
                    seasonName={seasonName}
                    roundLabel={selectedMatchday > 0 ? `Till Matchday ${selectedMatchday}` : roundLabel}
                    getMetric={getMetric}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap gap-2 justify-end">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-[1.02] disabled:opacity-60 ${
                downloadDone
                  ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#D4CCBB] hover:text-[#F5F0E8]'
              }`}
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : downloadDone ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Poster
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              disabled={sharing}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-[1.02] disabled:opacity-60 ${
                shareDone
                  ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                  : ''
              }`}
              style={
                !shareDone
                  ? {
                      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`,
                      color: '#0a0a0a',
                      border: 'none',
                    }
                  : undefined
              }
            >
              {sharing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sharing…
                </>
              ) : shareDone ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Shared!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Poster
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Off-screen render target for capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }} aria-hidden="true">
        <div ref={posterRef}>
          {activeTheme === 'team_matchday' ? (
            <TeamMatchdayPosterSnapshot
              theme={theme}
              themeKey={activeTheme}
              team={bestTeamForMatchday}
              tournamentName={tournamentName}
              seasonName={seasonName}
              roundLabel={selectedMatchday > 0 ? `Matchday ${selectedMatchday}` : roundLabel}
            />
          ) : (
            <PosterSnapshot
              theme={theme}
              themeKey={activeTheme}
              teams={sortedTeams}
              maxTeams={maxTeams}
              tournamentName={tournamentName}
              seasonName={seasonName}
              roundLabel={selectedMatchday > 0 ? `Till Matchday ${selectedMatchday}` : roundLabel}
              getMetric={getMetric}
            />
          )}
        </div>
      </div>
    </>
  )
}
