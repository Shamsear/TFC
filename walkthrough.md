# Walkthrough: Tournament Linking & Editing System

We have successfully implemented the **Tournament Linking System** (supporting sequential flow, clinched progressive qualification, manual override triggers, and dynamic team exclusions) along with a complete **Edit Tournament** feature that supports editing **every single parameter** from the tournament creation form.

All automated and compilation checks passed successfully!

---

## 🛠️ Changes Implemented

### 1. Database & Schema Updates
- **`prisma/schema.prisma`**:
  - Added `TournamentLinkStatus` and `TournamentQualificationStatus` enums.
  - Added `isLinked` (source) and `requiresQualification` / `qualificationStatus` (target) metadata columns to the `tournaments` model.
  - Created the `tournament_links` model representing qualification criteria between tournaments.
  - Created the `tournament_team_qualifications` model to track team state (PROVISIONAL vs CONFIRMED vs FINAL) mapping to specific links.
- **`scripts/add-tournament-linking.sql`**: Script to alter existing tables and create indexes in PostgreSQL.
- **`scripts/run-linking-migration.js`**: Migration runner which executes SQL statements and triggers `npx prisma generate` to rebuild the client.

### 2. Core Linking Logic (`lib/tournament-linking.ts`)
- **`checkCircularDependency`**: Cycle-detection DFS helper that prevents creation of circular links (e.g. A → B → C → A).
- **`getQualifiedTeams`**: Resolves current standing positions (including group-specific and multiple position rules) to return qualifying season-teams. Now supports filtering out team IDs specified in the `excludeTeamIds` array inside the qualification config.
- **`checkGuaranteedQualifications`**: Our mathematical certainty algorithm. Computes the maximum possible points for teams outside the qualification spots based on remaining matches, and determines which qualifying teams have clinched their spots. Also supports team exclusion filtering.
- **`checkAndPopulateConfirmedTeams`**: Performs progressive population of mathematically guaranteed teams in the target tournament.
- **`populateTournamentLink`**: Finalizes the link (marking qualifications as `FINAL` and populating all remaining teams) when a source tournament completes or via manual override.
- **`clearPopulatedTeams`**: Safely clears qualified teams and resets target tournament rosters.
- **`runTournamentStatusUpdate`**: A unified utility that updates tournament status (UPCOMING, IN_PROGRESS, COMPLETED) and processes link auto-population on match completion or round stop.

### 3. Backend APIs
- **`POST /api/admin/tournaments/links`**: Creates new qualification links with cycle verification.
- **`GET /api/admin/tournaments/[tournamentId]/links`**: Fetches all incoming/outgoing links for a tournament.
- **`PUT/DELETE /api/admin/tournaments/links/[linkId]`**: Updates or deletes linking rules and clears associated teams.
- **`GET /api/admin/tournaments/links/[linkId]/preview`**: Previews provisional qualifications and mathematical clinches. Returns detailed info for excluded teams in a separate array.
- **`POST /api/admin/tournaments/links/[linkId]/populate`**: Manually triggers team population (supports `force` query/body parameters).
- **`POST /api/admin/tournaments/links/[linkId]/clear`**: Clears populated teams.
- **Match-Saving Hook** (`app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts`):
  - Integrates `runTournamentLinking()` in the background to automatically transition completed tournaments, populate finalized links, and progressive-clinches on saved match results.
- **Tournament Creation API Hook** (`app/api/seasons/[seasonId]/tournaments/route.ts`):
  - Added support for creating a linked tournament directly. Bypasses manual team selection, flags the tournament as requiring qualification, and creates the link within the creation transaction.
- **Edit Tournament API Endpoint** (`app/api/seasons/[seasonId]/tournaments/[tournamentId]/route.ts`):
  - Upgraded the `PUT` endpoint to fully process updates for **all configuration options** (name, description, dates, status, format, legs, selected teams, and linking rules) in a safe database transaction.

### 4. Frontend UI Components
- **Tournament Creation Form** (`components/tournament/TournamentFormAdvanced.tsx`):
  - Added "Team Population Mode" radio buttons (Manual vs Automatic Linking).
  - Hides manual team selection when linking is enabled and renders dropdowns and form inputs to configure the source tournament and qualification criteria.
  - **Upgraded to support Edit Mode**: Uses `initialTournament` to prefill form states and sub-states, dynamically changes button/header texts, supports modifying status, and makes `PUT` requests to the details route.
- **Tournament Cards** (`app/(admin)/sub-admin/[seasonId]/tournaments/page.tsx`): Displays a visual badge indicating what target tournaments are linked to it and what rules govern them.
- **Manage Links Button** (`app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx`): Directly accessible from the tournament detail header.
- **Tournament Link Manager Page** (`app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/links/page.tsx`): Provides list views of incoming/outgoing links, statuses, and config rules.
- **`CreateLinkDialog`**, **`EditLinkDialog`**, **`PreviewQualifiedDialog`**: Custom modals with full configuration forms, standing tables, clinched status markers, and override triggers.
  - **`PreviewQualifiedDialog`** now includes **Exclude / Include** action buttons next to each team and an **Excluded Teams** skip list section at the bottom to easily handle ineligible or non-participating teams.
- **Edit Tournament Button** (`app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx`):
  - Added a new administrative button in the tournament header redirecting users to the edit page.
- **Edit Tournament Page** (`app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/edit/page.tsx`):
  - Re-wired this page to fetch tournament details and season teams list, rendering the full `TournamentFormAdvanced` component in Edit Mode.

---

## 🧪 Verification Results

We verified all core rules, triggers, and team exclusion/skip logic using an automated mock league test suite (`scratch/test-tournament-linking.ts`).

### Test Log Output
```
🧪 Starting Tournament Linking System verification tests...

1. Setting up mock data (Season: TEST-S-71273135, Source: TFCT-38, Target: TFCT-39)
✓ Mock teams, seasons, tournaments, and standings created.

2. Testing Circular Dependency prevention...
- Path Target -> Source circular dependency check: PASS (Circular detected)
- Path Circular -> Source circular dependency check: PASS (Circular detected)
- Path Circular -> Target circular dependency check: PASS (Circular detected)
- Path Source -> Circular circular dependency check: PASS (No circle)
✓ Circular Dependency tests completed successfully.

3. Testing Mathematical Certainty (Clinched qualification)...
Confirmed qualifiers: [ 'TEST-ST-1-77568', 'TEST-ST-2-79530', 'TEST-ST-3-80900' ]
- Team 1 (15 pts) mathematically clinched top 3: PASS (Clinched)
- Team 1 qualification record created: PASS (Status: CONFIRMED)
- Team 1 added to target tournament: PASS
✓ Mathematical Certainty tests completed successfully.

4. Testing Full/Forced Population...
- Populate result: { success: true, alreadyPopulated: 3, newlyPopulated: 0, total: 3 }
- Total qualification records: 3 (Expected: 3)
- All qualifications updated to FINAL: PASS
- Target tournament teams count: 3 (Expected: 3)
✓ Full Population tests completed successfully.

5. Testing Clear/Reset Logic...
- Clear result: { success: true, clearedCount: 3 }
- Qualifications count post-clear: 0 (Expected: 0)
- Target teams count post-clear: 0 (Expected: 0)
✓ Clear/Reset tests completed successfully.

6. Testing Team Exclusions (Skipping Team 3)...
Qualified teams with Team 3 excluded: [ 'TEST-ST-1-77568', 'TEST-ST-2-79530', 'TEST-ST-4-81820' ]
- Excluded Team 3 not present in qualified: PASS
- Team 4 rolled up and is present in qualified: PASS
✓ Team Exclusions tests completed successfully.

🎉 ALL TESTS PASSED SUCCESSFULLY! The Tournament Linking System is working perfectly.

🗑 Cleaning up test database records...
✓ Test database cleanup complete.
```

---

## 🚀 Deployment & Next Steps
- The database schema is fully updated.
- All backend endpoints are live.
- Next.js administrative client routes, creation forms, edit forms, and dialogs are completely wired up.
- You can now test the Edit Tournament flow by clicking **Edit Tournament** on any tournament detail page.
