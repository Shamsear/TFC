"use client";

import { useState } from "react";

const FORMATIONS = {
  "4-3-3": {
    positions: [
      { id: "gk", label: "GK", row: 0, col: 2 },
      { id: "lb", label: "LB", row: 1, col: 0 },
      { id: "cb1", label: "CB", row: 1, col: 1 },
      { id: "cb2", label: "CB", row: 1, col: 3 },
      { id: "rb", label: "RB", row: 1, col: 4 },
      { id: "cm1", label: "CM", row: 2, col: 1 },
      { id: "cm2", label: "CM", row: 2, col: 2 },
      { id: "cm3", label: "CM", row: 2, col: 3 },
      { id: "lw", label: "LW", row: 3, col: 0 },
      { id: "st", label: "ST", row: 3, col: 2 },
      { id: "rw", label: "RW", row: 3, col: 4 },
    ],
  },
  "4-4-2": {
    positions: [
      { id: "gk", label: "GK", row: 0, col: 2 },
      { id: "lb", label: "LB", row: 1, col: 0 },
      { id: "cb1", label: "CB", row: 1, col: 1 },
      { id: "cb2", label: "CB", row: 1, col: 3 },
      { id: "rb", label: "RB", row: 1, col: 4 },
      { id: "lm", label: "LM", row: 2, col: 0 },
      { id: "cm1", label: "CM", row: 2, col: 1 },
      { id: "cm2", label: "CM", row: 2, col: 3 },
      { id: "rm", label: "RM", row: 2, col: 4 },
      { id: "st1", label: "ST", row: 3, col: 1 },
      { id: "st2", label: "ST", row: 3, col: 3 },
    ],
  },
  "3-5-2": {
    positions: [
      { id: "gk", label: "GK", row: 0, col: 2 },
      { id: "cb1", label: "CB", row: 1, col: 1 },
      { id: "cb2", label: "CB", row: 1, col: 2 },
      { id: "cb3", label: "CB", row: 1, col: 3 },
      { id: "lm", label: "LM", row: 2, col: 0 },
      { id: "cm1", label: "CM", row: 2, col: 1 },
      { id: "cm2", label: "CM", row: 2, col: 2 },
      { id: "cm3", label: "CM", row: 2, col: 3 },
      { id: "rm", label: "RM", row: 2, col: 4 },
      { id: "st1", label: "ST", row: 3, col: 1 },
      { id: "st2", label: "ST", row: 3, col: 3 },
    ],
  },
};

const DEFAULT_DATA = {
  matchday: "Matchday 7",
  season: "Season 7",
  teamName: "IRON FC",
  teamColor: "#00e5ff",
  managerName: "Alex Rodriguez",
  formation: "4-3-3",
  players: {
    gk: { name: "M. Vasquez", rating: 9.2 },
    lb: { name: "A. Ortega", rating: 8.1 },
    cb1: { name: "P. Nkosi", rating: 8.8 },
    cb2: { name: "D. Reyes", rating: 8.5 },
    rb: { name: "J. Melo", rating: 8.3 },
    cm1: { name: "R. Torres", rating: 8.7 },
    cm2: { name: "K. Osei", rating: 9.0 },
    cm3: { name: "L. Park", rating: 8.4 },
    lw: { name: "S. Diallo", rating: 8.9 },
    st: { name: "C. Bianchi", rating: 9.4 },
    rw: { name: "T. Asante", rating: 8.6 },
  },
  captain: "st",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function PlayerChip({ name, pos, rating, isCaptain, accent, size = "md" }: any) {
  const isLg = size === "lg";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isLg ? "6px" : "4px",
        filter: isCaptain ? `drop-shadow(0 0 10px ${accent})` : "none",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: isLg ? 56 : 44,
          height: isLg ? 56 : 44,
          borderRadius: "50%",
          background: isCaptain ? accent : "rgba(255,255,255,0.08)",
          border: `2px solid ${isCaptain ? accent : "rgba(255,255,255,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: isLg ? "11px" : "9px",
            fontWeight: 700,
            color: isCaptain ? "#000" : "rgba(255,255,255,0.7)",
            letterSpacing: "1px",
          }}
        >
          {pos}
        </span>
        {isCaptain && (
          <div
            style={{
              position: "absolute",
              top: -7,
              right: -4,
              background: accent,
              borderRadius: "4px",
              padding: "1px 4px",
              fontSize: "7px",
              fontWeight: 800,
              color: "#000",
              letterSpacing: "0.5px",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            C
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: isLg ? "12px" : "10px",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.5px",
          textAlign: "center",
          maxWidth: isLg ? "72px" : "58px",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </div>
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "9px",
          fontWeight: 800,
          color: accent,
          letterSpacing: "0.5px",
        }}
      >
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PitchFormation({ data, formation }: any) {
  const accent = data.teamColor;
  const form = FORMATIONS[formation as keyof typeof FORMATIONS];
  const rowsByIndex: any = {};
  form.positions.forEach((p) => {
    if (!rowsByIndex[p.row]) rowsByIndex[p.row] = [];
    rowsByIndex[p.row].push(p);
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        background: "linear-gradient(180deg, #0a1a0e 0%, #0d2010 40%, #0a1a0e 100%)",
        border: `1px solid rgba(${hexToRgb(accent)}, 0.18)`,
      }}
    >
      <svg
        viewBox="0 0 360 480"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}
      >
        <rect x="20" y="20" width="320" height="440" fill="none" stroke={accent} strokeWidth="1.5" />
        <line x1="20" y1="240" x2="340" y2="240" stroke={accent} strokeWidth="1" />
        <circle cx="180" cy="240" r="50" fill="none" stroke={accent} strokeWidth="1" />
        <circle cx="180" cy="240" r="2" fill={accent} />
        <rect x="90" y="20" width="180" height="80" fill="none" stroke={accent} strokeWidth="1" />
        <rect x="130" y="20" width="100" height="40" fill="none" stroke={accent} strokeWidth="1" />
        <rect x="90" y="380" width="180" height="80" fill="none" stroke={accent} strokeWidth="1" />
        <rect x="130" y="420" width="100" height="40" fill="none" stroke={accent} strokeWidth="1" />
        <circle cx="180" cy="78" r="2" fill={accent} />
        <circle cx="180" cy="402" r="2" fill={accent} />
      </svg>

      <div style={{ position: "relative", zIndex: 2, padding: "12px 8px 16px" }}>
        {[3, 2, 1, 0].map((rowIndex) => {
          const rowPlayers = rowsByIndex[rowIndex] || [];
          if (rowPlayers.length === 0) return null;
          return (
            <div
              key={rowIndex}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: rowPlayers.length >= 5 ? "6px" : "12px",
                marginBottom: rowIndex === 0 ? 0 : "8px",
              }}
            >
              {rowPlayers.map((pos: any) => {
                const p = data.players[pos.id];
                if (!p) return null;
                const isCaptain = data.captain === pos.id;
                return (
                  <PlayerChip
                    key={pos.id}
                    name={p.name}
                    pos={pos.label}
                    rating={p.rating}
                    isCaptain={isCaptain}
                    accent={accent}
                    size={isCaptain ? "lg" : "md"}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Poster({ data }: any) {
  const rgb = hexToRgb(data.teamColor);
  return (
    <div
      style={{
        width: "400px",
        minHeight: "680px",
        background: "#060910",
        borderRadius: "18px",
        overflow: "hidden",
        fontFamily: "'Barlow Condensed', sans-serif",
        position: "relative",
        border: `1px solid rgba(${rgb}, 0.25)`,
        boxShadow: `0 0 60px rgba(${rgb}, 0.15)`,
        flexShrink: 0,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse 200% 80% at 50% 0%, rgba(${rgb},0.12) 0%, transparent 60%)`,
        }}
      />

      <div style={{ position: "relative", zIndex: 2, padding: "22px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="36" height="42" viewBox="0 0 80 92" fill="none">
              <path
                d="M40 4 L72 16 L72 50 Q72 72 40 88 Q8 72 8 50 L8 16 Z"
                fill="rgba(0,0,0,0.7)"
                stroke={data.teamColor}
                strokeWidth="1.8"
              />
              <text
                x="40"
                y="50"
                textAnchor="middle"
                fill={data.teamColor}
                fontFamily="'Barlow Condensed',sans-serif"
                fontWeight="800"
                fontSize="18"
                letterSpacing="1"
              >
                {data.teamName.substring(0, 3).toUpperCase()}
              </text>
            </svg>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "4px", color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>
                {data.season}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#fff", letterSpacing: "2px", lineHeight: 1.2, marginTop: "3px" }}>
                {data.teamName}
              </div>
            </div>
          </div>

          <div
            style={{
              background: `rgba(${rgb}, 0.12)`,
              border: `1px solid rgba(${rgb}, 0.4)`,
              borderRadius: "6px",
              padding: "6px 10px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "8px", fontWeight: 700, color: data.teamColor, letterSpacing: "3px", lineHeight: 1 }}>MATCHDAY</div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#fff", letterSpacing: "1px", lineHeight: 1.2 }}>
              {data.matchday.replace(/^[^\d]*/, "")}
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: "6px", paddingBottom: "14px" }}>
          <div
            style={{
              fontSize: "38px",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-1px",
              lineHeight: 0.9,
              textTransform: "uppercase",
            }}
          >
            MATCHDAY
          </div>
          <div
            style={{
              fontSize: "38px",
              fontWeight: 900,
              background: `linear-gradient(90deg, ${data.teamColor}, ${data.teamColor}dd)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-1px",
              lineHeight: 0.9,
              textTransform: "uppercase",
            }}
          >
            SQUAD
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: `linear-gradient(90deg, ${data.teamColor}, transparent)`,
              borderRadius: "2px",
            }}
          />
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "5px",
            padding: "4px 10px",
            marginBottom: "14px",
          }}
        >
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "2px" }}>FORMATION</span>
          <span style={{ fontSize: "14px", color: data.teamColor, fontWeight: 800, letterSpacing: "2px" }}>{data.formation}</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "0 16px" }}>
        <PitchFormation data={data} formation={data.formation} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          margin: "12px 16px 0",
          background: `linear-gradient(90deg, rgba(${rgb},0.18), rgba(${rgb},0.06))`,
          border: `1px solid rgba(${rgb},0.35)`,
          borderRadius: "8px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: data.teamColor,
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "9px",
              fontWeight: 800,
              color: "#000",
              letterSpacing: "1.5px",
            }}
          >
            MANAGER
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#fff", letterSpacing: "0.5px", lineHeight: 1 }}>
              {data.managerName}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          margin: "14px 16px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "16px", height: "1.5px", background: data.teamColor }} />
          <span style={{ fontSize: "8px", fontWeight: 700, color: data.teamColor, letterSpacing: "3px" }}>
            {data.teamName.substring(0, 3).toUpperCase()}
          </span>
          <div style={{ width: "16px", height: "1.5px", background: data.teamColor }} />
        </div>
        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.25)", letterSpacing: "2px" }}>FOOTBALL CLUB · 2025</span>
        <div
          style={{
            fontSize: "8px",
            color: data.teamColor,
            fontWeight: 700,
            letterSpacing: "2px",
            background: `rgba(${rgb},0.12)`,
            border: `1px solid rgba(${rgb},0.3)`,
            borderRadius: "4px",
            padding: "2px 7px",
          }}
        >
          MATCHDAY XI
        </div>
      </div>
    </div>
  );
}

export default function TeamMatchdayPoster() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030508",
        padding: "24px 16px",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div style={{ textAlign: "center", marginBottom: "22px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "5px", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>
          TEAM MATCHDAY POSTER
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 900,
            letterSpacing: "1px",
            background: `linear-gradient(90deg, ${data.teamColor}, ${data.teamColor}dd)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {data.teamName}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <Poster data={data} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => setEditOpen(!editOpen)}
          style={{
            background: `rgba(${hexToRgb(data.teamColor)},0.12)`,
            border: `1.5px solid rgba(${hexToRgb(data.teamColor)},0.4)`,
            borderRadius: "7px",
            padding: "10px 20px",
            color: data.teamColor,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "2px",
            cursor: "pointer",
          }}
        >
          ✏️ EDIT SQUAD
        </button>
      </div>
    </div>
  );
}
