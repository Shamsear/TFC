/**
 * Client-side SQLite parser for eFootball player data
 * Parses database files in the browser to avoid file size upload limits
 */

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

export interface EFootballPlayer {
  playerId: string;
  playerName: string;
  position: string;
  teamName: string;
  nationality: string;
  overallRating: number;
  starRating?: number;
  playingStyle: string;
  
  // Player Info
  height?: number;
  weight?: number;
  age?: number;
  foot?: string;
  featured?: string;
  weakFootUsage?: string;
  weakFootAccuracy?: string;
  form?: string;
  injuryResistance?: string;
  condition?: string;
  maxLevel?: number;
  overallAtMaxLevel?: number;
  
  // Offensive stats
  offensiveAwareness: number;
  ballControl: number;
  dribbling: number;
  tightPossession: number;
  lowPass: number;
  loftedPass: number;
  finishing: number;
  heading: number;
  setPieceTaking: number;
  curl: number;
  
  // Physical stats
  speed: number;
  acceleration: number;
  kickingPower: number;
  jumping: number;
  physicalContact: number;
  balance: number;
  stamina: number;
  
  // Defensive stats
  defensiveAwareness: number;
  tackling: number;
  aggression: number;
  defensiveEngagement: number;
  
  // Goalkeeper stats
  gkAwareness: number | null;
  gkCatching: number | null;
  gkParrying: number | null;
  gkReflexes: number | null;
  gkReach: number | null;
  
  // Skills (all optional string fields)
  [key: string]: any;
}

export interface ParseResult {
  success: boolean;
  players?: EFootballPlayer[];
  error?: string;
}

/**
 * Map eFootball positions to system positions
 */
function mapPosition(efootballPosition: string): string {
  const pos = efootballPosition.toUpperCase();
  
  const validPositions = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF'];
  if (validPositions.includes(pos)) {
    return pos;
  }
  
  if (pos === 'LWB') return 'LB';
  if (pos === 'RWB') return 'RB';
  
  return 'CMF';
}

/**
 * Parse SQLite database file in the browser
 */
export async function parseClientSQLiteDB(file: File): Promise<ParseResult> {
  try {
    // Initialize SQL.js with local WASM file
    const SQL = await initSqlJs({
      locateFile: (filename) => `/${filename}`
    });
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Open database
    const db = new SQL.Database(uint8Array);
    
    // Query all players with the same structure as server-side
    const query = `
      SELECT 
        player_id as playerId,
        player_name as playerName,
        position,
        team_name as teamName,
        nationality,
        overall_rating as overallRating,
        star_rating as starRating,
        playing_style as playingStyle,
        height,
        weight,
        age,
        foot,
        featured,
        weak_foot_usage as weakFootUsage,
        weak_foot_accuracy as weakFootAccuracy,
        form,
        injury_resistance as injuryResistance,
        condition,
        max_level as maxLevel,
        overall_at_max_level as overallAtMaxLevel,
        offensive_awareness as offensiveAwareness,
        ball_control as ballControl,
        dribbling,
        tight_possession as tightPossession,
        low_pass as lowPass,
        lofted_pass as loftedPass,
        finishing,
        heading,
        set_piece_taking as setPieceTaking,
        curl,
        speed,
        acceleration,
        kicking_power as kickingPower,
        jumping,
        physical_contact as physicalContact,
        balance,
        stamina,
        defensive_awareness as defensiveAwareness,
        tackling,
        aggression,
        defensive_engagement as defensiveEngagement,
        gk_awareness as gkAwareness,
        gk_catching as gkCatching,
        gk_parrying as gkParrying,
        gk_reflexes as gkReflexes,
        gk_reach as gkReach,
        scissors_feint as scissorsFeint,
        double_touch as doubleTouch,
        flip_flap as flipFlap,
        marseille_turn as marseilleTurn,
        sombrero,
        chop_turn as chopTurn,
        cut_behind_turn as cutBehindTurn,
        scotch_move as scotchMove,
        sole_control as soleControl,
        momentum_dribbling as momentumDribbling,
        acceleration_burst as accelerationBurst,
        magnetic_feet as magneticFeet,
        heading_skill as headingSkill,
        bullet_header as bulletHeader,
        long_range_curler as longRangeCurler,
        blitz_curler as blitzCurler,
        chip_shot_control as chipShotControl,
        knuckle_shot as knuckleShot,
        dipping_shot as dippingShot,
        rising_shot as risingShot,
        long_range_shooting as longRangeShooting,
        low_screamer as lowScreamer,
        acrobatic_finishing as acrobaticFinishing,
        heel_trick as heelTrick,
        first_time_shot as firstTimeShot,
        phenomenal_finishing as phenomenalFinishing,
        willpower,
        one_touch_pass as oneTouchPass,
        through_passing as throughPassing,
        weighted_pass as weightedPass,
        pinpoint_crossing as pinpointCrossing,
        edged_crossing as edgedCrossing,
        outside_curler as outsideCurler,
        rabona,
        no_look_pass as noLookPass,
        game_changing_pass as gameChangingPass,
        visionary_pass as visionaryPass,
        phenomenal_pass as phenomenalPass,
        low_lofted_pass as lowLoftedPass,
        gk_low_punt as gkLowPunt,
        gk_high_punt as gkHighPunt,
        long_throw as longThrow,
        gk_long_throw as gkLongThrow,
        penalty_specialist as penaltySpecialist,
        gk_penalty_saver as gkPenaltySaver,
        gk_directing_defence as gkDirectingDefence,
        gk_spirit_roar as gkSpiritRoar,
        gamesmanship,
        man_marking as manMarking,
        track_back as trackBack,
        interception,
        blocker,
        aerial_superiority as aerialSuperiority,
        sliding_tackle as slidingTackle,
        long_reach_tackle as longReachTackle,
        fortress,
        acrobatic_clearance as acrobaticClearance,
        aerial_fort as aerialFort,
        captaincy,
        attack_trigger as attackTrigger,
        super_sub as superSub,
        fighting_spirit as fightingSpirit,
        trickster,
        mazing_run as mazingRun,
        speeding_bullet as speedingBullet,
        incisive_run as incisiveRun,
        long_ball_expert as longBallExpert,
        early_cross as earlyCross,
        long_ranger as longRanger
      FROM players_all
      ORDER BY overall_rating DESC, player_name ASC
    `;
    
    const results = db.exec(query);
    
    if (!results || results.length === 0) {
      db.close();
      return {
        success: false,
        error: 'No players found in database'
      };
    }
    
    const { columns, values } = results[0];
    
    // Convert to objects
    const players: EFootballPlayer[] = values.map((row: any[]) => {
      const player: any = {};
      columns.forEach((col, idx) => {
        player[col] = row[idx];
      });
      
      // Map position
      player.position = mapPosition(player.position);
      
      return player as EFootballPlayer;
    });
    
    // Close database
    db.close();
    
    return {
      success: true,
      players
    };
    
  } catch (error) {
    console.error('Client-side parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing database'
    };
  }
}
