import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';

/**
 * GET /api/auction-settings - Get auction settings for a season
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');

    if (!seasonId) {
      return NextResponse.json(
        { error: 'season_id is required' },
        { status: 400 }
      );
    }

    // Get auction settings
    const result = await sql`
      SELECT *
      FROM auction_settings
      WHERE season_id = ${seasonId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        settings: null,
        message: 'No settings found for this season'
      });
    }

    return NextResponse.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Get auction settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get auction settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auction-settings - Create or update auction settings
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      season_id,
      auction_window = 'season_start',
      phase_1_end_round,
      phase_1_min_balance,
      phase_2_end_round,
      phase_2_min_balance,
      phase_3_min_balance,
      min_squad_size,
      max_squad_size,
      max_rounds,
      contract_duration,
      min_balance_per_round
    } = body;

    // Validation
    if (!season_id) {
      return NextResponse.json(
        { error: 'season_id is required' },
        { status: 400 }
      );
    }

    if (phase_2_end_round <= phase_1_end_round) {
      return NextResponse.json(
        { error: 'Phase 2 end round must be after Phase 1 end round' },
        { status: 400 }
      );
    }

    if (max_squad_size < min_squad_size) {
      return NextResponse.json(
        { error: 'Maximum squad size must be >= minimum squad size' },
        { status: 400 }
      );
    }

    if (max_rounds < phase_2_end_round) {
      return NextResponse.json(
        { error: 'Max rounds must be >= Phase 2 end round' },
        { status: 400 }
      );
    }

    // Upsert auction settings
    const result = await sql`
      INSERT INTO auction_settings (
        season_id,
        auction_window,
        phase_1_end_round,
        phase_1_min_balance,
        phase_2_end_round,
        phase_2_min_balance,
        phase_3_min_balance,
        min_squad_size,
        max_squad_size,
        max_rounds,
        contract_duration,
        min_balance_per_round,
        updated_at
      ) VALUES (
        ${season_id},
        ${auction_window},
        ${phase_1_end_round},
        ${phase_1_min_balance},
        ${phase_2_end_round},
        ${phase_2_min_balance},
        ${phase_3_min_balance},
        ${min_squad_size},
        ${max_squad_size},
        ${max_rounds},
        ${contract_duration},
        ${min_balance_per_round},
        NOW()
      )
      ON CONFLICT (season_id) DO UPDATE SET
        auction_window = ${auction_window},
        phase_1_end_round = ${phase_1_end_round},
        phase_1_min_balance = ${phase_1_min_balance},
        phase_2_end_round = ${phase_2_end_round},
        phase_2_min_balance = ${phase_2_min_balance},
        phase_3_min_balance = ${phase_3_min_balance},
        min_squad_size = ${min_squad_size},
        max_squad_size = ${max_squad_size},
        max_rounds = ${max_rounds},
        contract_duration = ${contract_duration},
        min_balance_per_round = ${min_balance_per_round},
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      settings: result.rows[0],
      message: 'Auction settings saved successfully'
    });
  } catch (error) {
    console.error('Save auction settings error:', error);
    return NextResponse.json(
      { error: 'Failed to save auction settings' },
      { status: 500 }
    );
  }
}
