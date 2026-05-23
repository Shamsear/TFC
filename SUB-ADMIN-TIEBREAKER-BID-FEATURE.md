# Sub-Admin Tiebreaker Bid Submission Feature

## Overview
Sub-admins can now submit tiebreaker bids on behalf of teams in normal rounds. This allows admins to help teams who may have difficulty submitting bids themselves.

## Changes Made

### 1. New API Endpoint
**File:** `app/api/admin/tiebreakers/[id]/submit-bid/route.ts`

- **Endpoint:** `POST /api/admin/tiebreakers/[id]/submit-bid`
- **Authorization:** SUB_ADMIN or SUPER_ADMIN only
- **Parameters:**
  - `teamId`: The team to submit the bid for
  - `newBidAmount`: The new bid amount (must be higher than original)

**Features:**
- Validates that the tiebreaker is active
- Checks that the bid is higher than the original amount
- Validates budget and reserve requirements
- Prevents duplicate submissions
- Automatically triggers resolution when all teams have submitted
- Logs all actions for audit purposes

### 2. UI Updates
**File:** `components/auction/RoundDetailClient.tsx`

**New State Variables:**
- `showSubmitBidModal`: Controls modal visibility
- `selectedTiebreaker`: Stores the tiebreaker being acted upon
- `selectedTeamForBid`: Stores the team for which the bid is being submitted
- `adminBidAmount`: The bid amount being entered
- `submittingAdminBid`: Loading state during submission

**New Functions:**
- `handleAdminSubmitBid()`: Handles the bid submission process
- `openSubmitBidModal()`: Opens the modal with pre-filled data

**UI Changes:**
- Added "Submit Bid" button next to each pending team in the tiebreaker section
- Created a modal dialog for entering bid amounts
- Added quick increment buttons (+£5, +£10, +£50) for convenience
- Shows player info and original bid amount in the modal
- Displays validation errors if bid is invalid

## How to Use

1. Navigate to a round with active tiebreakers: `/sub-admin/[seasonId]/auction/rounds/[roundId]`
2. Scroll to the "Active Tiebreakers" section
3. Find the team that needs help submitting a bid
4. Click the "Submit Bid" button next to the team's name
5. Enter the new bid amount (must be higher than the original bid)
6. Use the quick increment buttons to adjust the amount
7. Click "Submit" to submit the bid on behalf of the team

## Validation

The system validates:
- Bid must be higher than the original amount
- Bid must not exceed the team's budget
- Bid must comply with reserve requirements (Phase 1/2/3 rules)
- Team must be part of the tiebreaker
- Tiebreaker must be active
- Bid cannot be submitted twice for the same team

## Auto-Resolution

When the last team's bid is submitted (either by the team or by a sub-admin), the system automatically:
1. Resolves the tiebreaker by determining the winner
2. Resumes round finalization
3. Creates new tiebreakers if another tie is detected
4. Completes the round if no more ties exist

## Security

- Only SUB_ADMIN and SUPER_ADMIN roles can access this endpoint
- All submissions are logged with timestamps
- The system prevents unauthorized access and duplicate submissions
- Budget and reserve validations ensure fair play

## Notes

- This feature only works for **normal round tiebreakers**
- Bulk round tiebreakers use a different system (bulk tiebreaker participants)
- The bid submission is final and cannot be changed once submitted
- Sub-admins should confirm with the team before submitting on their behalf
