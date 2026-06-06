/**
 * News Image Generator - StatsPoster Style
 * 
 * Generates premium poster-style images for news articles matching StatsPoster design
 * - Dark gradients with team colors
 * - Team logos from database
 * - TFC logo watermark
 * - Professional typography and layout
 */

import { createCanvas, loadImage, Image, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import ImageKit from 'imagekit';

// Register custom fonts for canvas rendering
try {
  const fontsPath = path.join(process.cwd(), 'fonts');
  
  // Bahnschrift (existing)
  registerFont(path.join(fontsPath, 'BAHNSCHRIFT.TTF'), { family: 'Bahnschrift' });
  
  // Segoe UI (existing)
  registerFont(path.join(fontsPath, 'Segoe UI.ttf'), { family: 'Segoe UI' });
  registerFont(path.join(fontsPath, 'Segoe UI Bold.ttf'), { family: 'Segoe UI', weight: 'bold' });
  
  // Oswald (existing)
  registerFont(path.join(fontsPath, 'Oswald-Bold.ttf'), { family: 'Oswald', weight: 'bold' });
  registerFont(path.join(fontsPath, 'Oswald-SemiBold.ttf'), { family: 'Oswald', weight: '600' });
  registerFont(path.join(fontsPath, 'Oswald-Medium.ttf'), { family: 'Oswald', weight: '500' });
  registerFont(path.join(fontsPath, 'Oswald-Regular.ttf'), { family: 'Oswald', weight: 'normal' });
  
  // Impact (NEW - CRITICAL for scores and large text)
  try {
    registerFont(path.join(fontsPath, 'Impact.ttf'), { family: 'Impact' });
  } catch {
    try {
      registerFont(path.join(fontsPath, 'impact.ttf'), { family: 'Impact' });
    } catch {
      registerFont(path.join(fontsPath, 'IMPACT.TTF'), { family: 'Impact' });
    }
  }
  

  
  console.log('[News Image] ✅ All custom fonts registered successfully');
} catch (error) {
  console.error('[News Image] ⚠️ Font registration failed:', error);
  console.error('[News Image] Images will use fallback system fonts');
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

// ImageKit configuration
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
});

/**
 * Fetch team data from database
 */
async function fetchTeamData(teamName: string): Promise<{ logoUrl: string | null; primaryColor: string | null } | null> {
  try {
    const team = await prisma.teams.findFirst({
      where: { name: teamName },
      select: { logoUrl: true, primaryColor: true }
    });
    return team;
  } catch (error) {
    console.warn(`[News Image] Could not fetch team data for ${teamName}:`, error);
    return null;
  }
}

/**
 * Load image from URL or path
 */
async function loadImageSafe(src: string): Promise<Image | null> {
  try {
    // Check if URL or path
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const response = await fetch(src);
      const buffer = await response.arrayBuffer();
      const img = new Image();
      img.src = Buffer.from(buffer);
      return img;
    } else {
      // Local path
      const fullPath = src.startsWith('/') ? path.join(process.cwd(), 'public', src) : src;
      if (fs.existsSync(fullPath)) {
        return await loadImage(fullPath);
      }
    }
  } catch (error) {
    console.warn(`[News Image] Could not load image from ${src}:`, error);
  }
  return null;
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + ((255 - (num >> 16)) * percent)));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + ((255 - ((num >> 8) & 0x00FF)) * percent)));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + ((255 - (num & 0x0000FF)) * percent)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}


/**
 * Draw TFC logo watermark (top right)
 */
async function drawLogoWatermark(ctx: CanvasRenderingContext2D, logo: Image | null) {
  if (!logo) return;
  
  const logoSize = 60;
  const x = CANVAS_WIDTH - logoSize - 30;
  const y = 30;
  
  ctx.globalAlpha = 0.9;
   ctx.drawImage(logo as any, x, y, logoSize, logoSize);
  ctx.globalAlpha = 1.0;
}

/**
 * Draw premium dynamic event badge (top left)
 */
function drawEventBadge(
  ctx: CanvasRenderingContext2D,
  badgeText: string,
  badgeColor: string
) {
  ctx.save();
  ctx.font = 'bold 24px "Bahnschrift", "Segoe UI", sans-serif';
  const textWidth = ctx.measureText(badgeText).width;
  
  const badgeX = 40;
  const badgeY = 40;
  const badgeHeight = 60;
  const badgeWidth = textWidth + 70; // Extra padding for icon/dot and margins
  const badgeRadius = 30;
  
  // Background
  ctx.fillStyle = `${badgeColor}15`;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = `${badgeColor}35`;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
  ctx.stroke();
  
  // Glowing effect under badge active dot
  ctx.shadowColor = badgeColor;
  ctx.shadowBlur = 10;
  
  // Active dot
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.arc(badgeX + 25, badgeY + badgeHeight / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0; // Reset shadow
  
  // Badge text
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + 45, badgeY + badgeHeight / 2);
  
  ctx.restore();
}

/**
 * Draw premium transparent footer bar with light readable text
 */
async function drawFooter(
  ctx: CanvasRenderingContext2D,
  tfcLogo: Image | null,
  centerText: string = ''
) {
  // Let the background flow naturally to the bottom (completely transparent bar or extremely subtle dark gradient)
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  // Footer content (clean semi-transparent white/cream text)
  ctx.fillStyle = 'rgba(245, 240, 232, 0.5)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  
  // Left: Domain
  ctx.textAlign = 'left';
  // Removed URL text
  
  // Center (Optional)
  if (centerText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 240, 232, 0.4)';
    ctx.fillText(centerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35);
    ctx.fillStyle = 'rgba(245, 240, 232, 0.5)'; // Restore
  }
  
  // Right: Date
  ctx.textAlign = 'right';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // Removed Date text
  
  // TFC logo watermark
  await drawLogoWatermark(ctx, tfcLogo);
}


/**
 * Draw rounded rectangle
 */
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw diagonal lines pattern (StatsPoster style)
 */
function drawDiagonalPattern(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  for (let i = -CANVAS_HEIGHT; i < CANVAS_WIDTH + CANVAS_HEIGHT; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + CANVAS_HEIGHT, CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw background glow orb (StatsPoster style)
 */
function drawGlowOrb(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, opacity: number = 0.35) {
  const rgb = hexToRgb(color);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
  gradient.addColorStop(0.7, 'transparent');
  
  ctx.save();
  ctx.filter = 'blur(40px)';
  ctx.fillStyle = gradient;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.restore();
}

/**
 * Draw team logo with fallback
 */
async function drawTeamLogo(
  ctx: CanvasRenderingContext2D,
  teamLogo: Image | null,
  teamName: string,
  x: number,
  y: number,
  size: number,
  teamColor: string
) {
  if (teamLogo) {
    // Draw actual logo
    const logoX = x - size / 2;
    const logoY = y - size / 2;
        ctx.drawImage(teamLogo as any, logoX, logoY, size, size);
    } else {
    // Draw fallback with team initials
    ctx.save();
    ctx.fillStyle = `linear-gradient(135deg, ${teamColor}, ${lightenColor(teamColor, 0.2)})`;
    drawRoundedRect(ctx, x - size / 2, y - size / 2, size, size, size / 4);
    ctx.fill();
    
    ctx.fillStyle = '#0a0a0a';
    ctx.font = `bold ${size / 2.5}px "Bahnschrift", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(teamName.slice(0, 2).toUpperCase(), x, y);
    ctx.restore();
  }
}

let emojiFontRegistered = false;
async function ensureEmojiFont() {
  if (emojiFontRegistered) return;
  
  // Vercel serverless environments allow writing to /tmp
  const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'public');
  const tempFontPath = path.join(tempDir, 'seguiemj.ttf');
  
  // URL to fetch from - defaults to ImageKit if configured, otherwise falls back to jsdelivr Github
  const baseUrl = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.replace(/\/$/, '') || 'https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main';
  const cdnUrl = `${baseUrl}/fonts/seguiemj.ttf`;
  
  try {
    if (!fs.existsSync(tempFontPath)) {
      console.log(`[News Image] Downloading emoji font from CDN: ${cdnUrl}...`);
      const response = await fetch(cdnUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tempFontPath, Buffer.from(buffer));
        console.log(`[News Image] Emoji font saved to ${tempFontPath}`);
      } else {
        console.warn(`[News Image] Failed to download emoji font: ${response.statusText}`);
        return;
      }
    }
    
    registerFont(tempFontPath, { family: 'system-ui' });
    emojiFontRegistered = true;
    console.log('[News Image] ✅ Emoji font registered successfully from CDN');
  } catch (error) {
    console.warn('[News Image] ⚠️ Failed to register emoji font from CDN:', error);
  }
}

/**
 * Generate news image (main entry point)
 */
export async function generateNewsImage(
  newsId: string,
  eventType: string,
  metadata: Record<string, any>
): Promise<string> {
  try {
    console.log(`[News Image] Generating for ${newsId} (${eventType})`);
    
    // Ensure emoji font is loaded from CDN before creating canvas context
    await ensureEmojiFont();

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Load TFC logo
    const tfcLogo = await loadImageSafe(LOGO_PATH);

    // Fetch team data if teams are mentioned
    let homeTeamData = null;
    let awayTeamData = null;
    let homeTeamLogo: Image | null = null;
    let awayTeamLogo: Image | null = null;
    
    if (metadata.home_team) {
      homeTeamData = await fetchTeamData(metadata.home_team);
      if (homeTeamData?.logoUrl) {
        homeTeamLogo = await loadImageSafe(homeTeamData.logoUrl);
      }
    }
    
    if (metadata.away_team) {
      awayTeamData = await fetchTeamData(metadata.away_team);
      if (awayTeamData?.logoUrl) {
        awayTeamLogo = await loadImageSafe(awayTeamData.logoUrl);
      }
    }

    // Determine which template to use
    const isMatchEvent = eventType.includes('match_') || 
                         ['matchday_opener', 'thrashing', 'close_match', 'high_scoring', 'upset', 'draw', 'clean_sheet'].includes(eventType) ||
                         (metadata.home_team && metadata.away_team && metadata.home_score !== undefined);
                         
    if (isMatchEvent) {
      await generateMatchResultTemplate(ctx as any, metadata, eventType, tfcLogo, homeTeamData, awayTeamData, homeTeamLogo, awayTeamLogo);
    } else if (eventType === 'matchday_started') {
      await generateMatchdayStartTemplate(ctx as any, metadata, tfcLogo);
    } else if (eventType === 'matchday_completed') {
      await generateMatchdayCompleteTemplate(ctx as any, metadata, tfcLogo);
    } else if (eventType.includes('level_up')) {
      await generateLevelUpTemplate(ctx as any, metadata, tfcLogo);
    } else {
      await generateGenericTemplate(ctx as any, metadata, tfcLogo);
    }

    // Generate image buffer
    const buffer = canvas.toBuffer('image/png');

    // Upload to ImageKit
    try {
      const uploadResponse = await imagekit.upload({
        file: buffer,
        fileName: `${newsId}.png`,
        folder: '/news-images',
        useUniqueFileName: false,
      });

      console.log(`[News Image] ✅ Uploaded to ImageKit: ${uploadResponse.url}`);
      return uploadResponse.url;
    } catch (uploadError) {
      console.error('[News Image] ❌ ImageKit upload failed:', uploadError);
      
      // Fallback: Save to /tmp for serverless or local directory for development
      const tempDir = process.env.NODE_ENV === 'production' ? '/tmp/news-images' : path.join(process.cwd(), 'public', 'news-images');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filename = `${newsId}.png`;
      const filepath = path.join(tempDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      const localPath = process.env.NODE_ENV === 'production' ? '' : `/news-images/${filename}`;
      console.log(`[News Image] ⚠️ Saved locally (fallback): ${localPath || filepath}`);
      return localPath;
    }
  } catch (error) {
    console.error('[News Image] ❌ Generation failed:', error);
    return '';
  }
}


/**
 * Match Result Template (StatsPoster Style)
 * Used for: match_completed, matchday_opener, thrashing, close_match, etc.
 */
async function generateMatchResultTemplate(
  ctx: CanvasRenderingContext2D,
  metadata: Record<string, any>,
  eventType: string,
  tfcLogo: Image | null,
  homeTeamData: any,
  awayTeamData: any,
  homeTeamLogo: Image | null,
  awayTeamLogo: Image | null
) {
  // Determine winner
  const homeScore = metadata.home_score ?? 0;
  const awayScore = metadata.away_score ?? 0;
  const homeWins = homeScore > awayScore;
  const awayWins = awayScore > homeScore;
  const isDraw = homeScore === awayScore;
  
  // Determine primary color - use WINNING team's color, fallback to home team, then default
  const defaultColor = '#00e5ff';
  let primaryColor = defaultColor;
  
  if (!isDraw) {
    // Use winner's color
    const winnerTeamData = homeWins ? homeTeamData : awayTeamData;
    if (winnerTeamData?.primaryColor && 
        winnerTeamData.primaryColor !== '' && 
        winnerTeamData.primaryColor.startsWith('#') &&
        winnerTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
      primaryColor = winnerTeamData.primaryColor;
    } else if (homeTeamData?.primaryColor && 
               homeTeamData.primaryColor !== '' && 
               homeTeamData.primaryColor.startsWith('#') &&
               homeTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
      // Fallback to home team if winner has no color
      primaryColor = homeTeamData.primaryColor;
    }
  } else {
    // For draws, prefer home team color
    if (homeTeamData?.primaryColor && 
        homeTeamData.primaryColor !== '' && 
        homeTeamData.primaryColor.startsWith('#') &&
        homeTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
      primaryColor = homeTeamData.primaryColor;
    }
  }
  
  const lighterColor = lightenColor(primaryColor, 0.3);
  const rgb = hexToRgb(lighterColor);
  
  // Background gradient (dark, StatsPoster style)
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, `rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05})`);
  gradient.addColorStop(0.5, `rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08})`);
  gradient.addColorStop(1, `rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Diagonal pattern overlay
  drawDiagonalPattern(ctx);
  
  // Glow orbs
  drawGlowOrb(ctx, CANVAS_WIDTH - 100, 100, 160, lighterColor, 0.35);
  drawGlowOrb(ctx, 100, CANVAS_HEIGHT - 80, 120, lighterColor, 0.15);
  
  // Large background logos (left side for home team, right side for away team)
  if (homeTeamLogo) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.drawImage(homeTeamLogo as any, -200, CANVAS_HEIGHT / 2 - 300, 600, 600);
    ctx.restore();
  }
  
  if (awayTeamLogo) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.drawImage(awayTeamLogo as any, CANVAS_WIDTH - 400, CANVAS_HEIGHT / 2 - 300, 600, 600);
    ctx.restore();
  }
  
  // Event badge (top left)
  let badgeText = '⚽ MATCH RESULT';
  let badgeColor = lighterColor;
  
  if (eventType === 'matchday_opener') {
    badgeText = '🎬 OPENER';
    badgeColor = '#FFD700';
  } else if (eventType === 'thrashing') {
    badgeText = '🔥 THRASHING';
    badgeColor = '#ef4444';
  } else if (eventType === 'close_match') {
    badgeText = '⚡ NAIL-BITER';
    badgeColor = '#FFD700';
  } else if (eventType === 'high_scoring') {
    badgeText = '🔥 GOAL FEST';
    badgeColor = '#f97316';
  } else if (eventType === 'upset') {
    badgeText = '😲 SHOCKER';
    badgeColor = '#eab308';
  } else if (eventType === 'draw') {
    badgeText = '🤝 STALEMATE';
    badgeColor = '#94a3b8';
  } else if (eventType === 'clean_sheet') {
    badgeText = '🧱 BRICK WALL';
    badgeColor = '#38bdf8';
  }
  
  drawEventBadge(ctx, badgeText, badgeColor);
  
  // Tournament name (below badge)
  ctx.fillStyle = '#8a8278';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((metadata.tournament_name || 'TFC League').toUpperCase(), 40, 130);
  
  // Main content area - center
  const centerY = CANVAS_HEIGHT / 2 + 20;
  
  // Home team logo (left)
  if (metadata.home_team) {
    await drawTeamLogo(ctx, homeTeamLogo, metadata.home_team, 250, centerY - 50, 200, primaryColor);

    // Home team name
    ctx.fillStyle = '#F5F0E8';
    ctx.font = 'bold 52px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(metadata.home_team, 250, centerY + 110);
  }
  
  // Score (center)
  if (metadata.home_score !== undefined && metadata.away_score !== undefined) {
    ctx.fillStyle = lighterColor;
    ctx.font = 'bold 130px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    ctx.shadowBlur = 30;
    ctx.fillText(`${metadata.home_score} - ${metadata.away_score}`, CANVAS_WIDTH / 2, centerY);
    ctx.shadowBlur = 0;
  }
  
  // Away team logo (right)
  if (metadata.away_team) {
    const awayColor = awayTeamData?.primaryColor && 
                      awayTeamData.primaryColor !== '' && 
                      awayTeamData.primaryColor.startsWith('#') &&
                      awayTeamData.primaryColor.toLowerCase() !== '#00e5ff'
      ? awayTeamData.primaryColor 
      : primaryColor;
    
    await drawTeamLogo(ctx, awayTeamLogo, metadata.away_team, CANVAS_WIDTH - 250, centerY - 50, 200, awayColor);
    
    // Away team name
    ctx.fillStyle = '#F5F0E8';
    ctx.font = 'bold 52px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(metadata.away_team, CANVAS_WIDTH - 250, centerY + 110);
  }
  
  // Footer bar
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  // Footer content
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';

  ctx.textAlign = 'right';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // TFC logo watermark
  await drawLogoWatermark(ctx, tfcLogo);
}


/**
 * Matchday Start Template (StatsPoster Style)
 */
async function generateMatchdayStartTemplate(
  ctx: CanvasRenderingContext2D,
  metadata: Record<string, any>,
  tfcLogo: Image | null
) {
  const primaryColor = '#6366f1';
  const lighterColor = lightenColor(primaryColor, 0.3);
  const rgb = hexToRgb(lighterColor);
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, `rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05})`);
  gradient.addColorStop(0.5, `rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08})`);
  gradient.addColorStop(1, `rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Diagonal pattern
  drawDiagonalPattern(ctx);
  
  // Glow orbs
  drawGlowOrb(ctx, CANVAS_WIDTH - 100, 100, 160, lighterColor, 0.35);
  drawGlowOrb(ctx, 100, CANVAS_HEIGHT - 80, 120, lighterColor, 0.15);
  
  // Event badge
  drawEventBadge(ctx, '🚀 MATCHDAY START', lighterColor);
  
  // Tournament name
  ctx.fillStyle = '#8a8278';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((metadata.tournament_name || 'TFC League').toUpperCase(), 40, 130);
  
  // Main title - extract round number from 'Matchday 1' style strings
  const centerY = CANVAS_HEIGHT / 2 - 40;
  const roundStr = (metadata.round || '').toString();
  const roundNumber = roundStr.replace(/matchday\s*/i, '').trim();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MATCHDAY', CANVAS_WIDTH / 2, centerY);
  
  ctx.fillStyle = lighterColor;
  ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  ctx.shadowBlur = 30;
  ctx.font = 'bold 100px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillText(roundNumber || 'KICKS OFF', CANVAS_WIDTH / 2, centerY + 100);
  ctx.shadowBlur = 0;
  
  // Stats card
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  drawRoundedRect(ctx, CANVAS_WIDTH / 2 - 250, centerY + 140, 500, 120, 15);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${metadata.match_count || 0} MATCHES`, CANVAS_WIDTH / 2, centerY + 195);
  
  if (metadata.deadline) {
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = lighterColor;
    ctx.fillText(`Deadline: ${metadata.deadline}`, CANVAS_WIDTH / 2, centerY + 235);
  }
  
  // Footer
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  
  ctx.textAlign = 'right';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  await drawLogoWatermark(ctx, tfcLogo);
}


/**
 * Matchday Complete Template (StatsPoster Style)
 */
async function generateMatchdayCompleteTemplate(
  ctx: CanvasRenderingContext2D,
  metadata: Record<string, any>,
  tfcLogo: Image | null
) {
  const primaryColor = '#10b981';
  const lighterColor = lightenColor(primaryColor, 0.3);
  const rgb = hexToRgb(lighterColor);
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, `rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05})`);
  gradient.addColorStop(0.5, `rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08})`);
  gradient.addColorStop(1, `rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Diagonal pattern
  drawDiagonalPattern(ctx);
  
  // Glow orbs
  drawGlowOrb(ctx, CANVAS_WIDTH - 100, 100, 160, lighterColor, 0.35);
  drawGlowOrb(ctx, 100, CANVAS_HEIGHT - 80, 120, lighterColor, 0.15);
  
  // Event badge
  drawEventBadge(ctx, '✅ MATCHDAY DONE', lighterColor);
  
  // Tournament name
  ctx.fillStyle = '#8a8278';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((metadata.tournament_name || 'TFC League').toUpperCase(), 40, 130);
  
  // Title
  const centerY = CANVAS_HEIGHT / 2 - 80;
  const roundStr = (metadata.round || '').toString();
  const roundNumber = roundStr.replace(/matchday\s*/i, '').trim();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MATCHDAY COMPLETE', CANVAS_WIDTH / 2, centerY);
  
  if (roundNumber) {
    ctx.fillStyle = lighterColor;
    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    ctx.shadowBlur = 30;
    ctx.font = 'bold 72px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
    ctx.fillText(roundNumber, CANVAS_WIDTH / 2, centerY + 70);
    ctx.shadowBlur = 0;
  }
  
  // Stats cards
  const cardY = centerY + 140;
  const cardWidth = 280;
  const gap = 40;
  const startX = (CANVAS_WIDTH - (cardWidth * 3 + gap * 2)) / 2;
  
  // Card 1: Goals
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  drawRoundedRect(ctx, startX, cardY, cardWidth, 140, 15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${metadata.total_goals || 0}`, startX + cardWidth / 2, cardY + 65);
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillText('GOALS', startX + cardWidth / 2, cardY + 100);
  
  // Card 2: Matches
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  drawRoundedRect(ctx, startX + cardWidth + gap, cardY, cardWidth, 140, 15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillText(`${metadata.total_matches || 0}`, startX + cardWidth + gap + cardWidth / 2, cardY + 65);
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillText('MATCHES', startX + cardWidth + gap + cardWidth / 2, cardY + 100);
  
  // Card 3: Best team
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  drawRoundedRect(ctx, startX + (cardWidth + gap) * 2, cardY, cardWidth, 140, 15);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 36px "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillText('🏆', startX + (cardWidth + gap) * 2 + cardWidth / 2, cardY + 50);
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  const bestTeam = (metadata.best_team || 'N/A').substring(0, 12);
  ctx.fillText(bestTeam, startX + (cardWidth + gap) * 2 + cardWidth / 2, cardY + 100);
  
  // Footer
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  
  ctx.textAlign = 'right';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  await drawLogoWatermark(ctx, tfcLogo);
}

/**
 * Level Up Template (StatsPoster Style)
 */
async function generateLevelUpTemplate(
  ctx: CanvasRenderingContext2D,
  metadata: Record<string, any>,
  tfcLogo: Image | null
) {
  const primaryColor = '#fbbf24';
  const lighterColor = lightenColor(primaryColor, 0.3);
  const rgb = hexToRgb(lighterColor);
  
  // Background gradient (gold theme)
  const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 600);
  gradient.addColorStop(0, `rgb(${rgb.r * 0.15}, ${rgb.g * 0.15}, ${rgb.b * 0.05})`);
  gradient.addColorStop(1, `rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.02})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Diagonal pattern
  drawDiagonalPattern(ctx);
  
  // Star burst effect
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH / 2 + Math.cos(angle) * 400, CANVAS_HEIGHT / 2 + Math.sin(angle) * 300);
    ctx.stroke();
  }
  ctx.restore();
  
  // Glow orbs
  drawGlowOrb(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, lighterColor, 0.25);
  
  // Event badge
  drawEventBadge(ctx, '🏆 ACHIEVEMENT', lighterColor);
  // Trophy icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 100px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', CANVAS_WIDTH / 2, 200);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, 280);
  
  // Team name card
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  drawRoundedRect(ctx, CANVAS_WIDTH / 2 - 300, 310, 600, 100, 15);
  ctx.fill();
  
  ctx.fillStyle = lighterColor;
  ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillText(metadata.team_name || 'Team', CANVAS_WIDTH / 2, 370);
  ctx.shadowBlur = 0;
  
  // Level info
  if (metadata.new_level) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
    ctx.fillText(`LEVEL ${metadata.new_level}`, CANVAS_WIDTH / 2, 470);
  }
  
  // Footer
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b6560';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillText('TFC League • Achievement Unlocked', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  await drawLogoWatermark(ctx, tfcLogo);
}

/**
 * Generic Template (StatsPoster Style)
 * Used for news types without specific templates
 */
async function generateGenericTemplate(
  ctx: CanvasRenderingContext2D,
  metadata: Record<string, any>,
  tfcLogo: Image | null
) {
  const primaryColor = '#1e40af';
  const lighterColor = lightenColor(primaryColor, 0.3);
  const rgb = hexToRgb(lighterColor);
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, `rgb(${rgb.r * 0.05}, ${rgb.g * 0.05}, ${rgb.b * 0.05})`);
  gradient.addColorStop(0.5, `rgb(${rgb.r * 0.08}, ${rgb.g * 0.08}, ${rgb.b * 0.08})`);
  gradient.addColorStop(1, `rgb(${rgb.r * 0.12}, ${rgb.g * 0.12}, ${rgb.b * 0.12})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Diagonal pattern
  drawDiagonalPattern(ctx);
  
  // Glow orbs
  drawGlowOrb(ctx, CANVAS_WIDTH - 100, 100, 160, lighterColor, 0.35);
  drawGlowOrb(ctx, 100, CANVAS_HEIGHT - 80, 120, lighterColor, 0.15);
  
  // Event badge
  drawEventBadge(ctx as any, metadata.event_type || 'NEWS UPDATE', lighterColor);
  
  // Main content box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  drawRoundedRect(ctx, CANVAS_WIDTH / 2 - 400, CANVAS_HEIGHT / 2 - 150, 800, 300, 20);
  ctx.fill();
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Impact", "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TFC LEAGUE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  
  // Subtitle
  ctx.font = 'bold 42px "Bahnschrift", "Segoe UI", sans-serif';
  ctx.fillStyle = lighterColor;
  ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  ctx.shadowBlur = 20;
  ctx.fillText('NEWS UPDATE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  ctx.shadowBlur = 0;
  
  // Tournament/Season info
  if (metadata.tournament_name) {
    ctx.font = '32px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(metadata.tournament_name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
  } else if (metadata.season_name) {
    ctx.font = '32px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(metadata.season_name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
  }
  
  // Footer
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, CANVAS_HEIGHT - 70, CANVAS_WIDTH, 70);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  
  ctx.textAlign = 'right';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  await drawLogoWatermark(ctx, tfcLogo);
}

/**
 * Generate images for existing news (backfill)
 */
export async function generateImagesForExistingNews() {
  console.log('[News Image] Backfilling images for existing news...\n');
  
  const newsItems = await prisma.news.findMany({
    where: {
      OR: [
        { image_url: null },
        { image_url: '' }
      ]
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  console.log(`Found ${newsItems.length} news items without images\n`);

  let successCount = 0;
  for (const news of newsItems) {
    try {
      const metadata = typeof news.metadata === 'string' 
        ? JSON.parse(news.metadata) 
        : news.metadata || {};

      const imageUrl = await generateNewsImage(
        news.id,
        news.event_type,
        metadata
      );

      if (imageUrl) {
        await prisma.news.update({
          where: { id: news.id },
          data: { image_url: imageUrl }
        });
        successCount++;
        console.log(`✅ ${news.id}: ${news.title_en}`);
      }
    } catch (error) {
      console.error(`❌ ${news.id}: Failed -`, error);
    }
  }

  console.log(`\n✅ Generated ${successCount}/${newsItems.length} images`);
}
