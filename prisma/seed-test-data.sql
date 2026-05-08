-- Seed test data for Sub Admin features testing
-- This script creates 1 season, 6 teams, and 30 players

-- Insert 6 Teams
INSERT INTO teams (id, name, "managerName", "logoUrl", "createdAt", "updatedAt") VALUES
('team-001', 'Thunder Strikers', 'John Smith', 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=TS', NOW(), NOW()),
('team-002', 'Lightning Bolts', 'Sarah Johnson', 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=LB', NOW(), NOW()),
('team-003', 'Phoenix Rising', 'Mike Davis', 'https://via.placeholder.com/150/FFE66D/000000?text=PR', NOW(), NOW()),
('team-004', 'Dragon Warriors', 'Emily Chen', 'https://via.placeholder.com/150/95E1D3/000000?text=DW', NOW(), NOW()),
('team-005', 'Storm Chasers', 'David Wilson', 'https://via.placeholder.com/150/A8E6CF/000000?text=SC', NOW(), NOW()),
('team-006', 'Titan Force', 'Lisa Anderson', 'https://via.placeholder.com/150/C7CEEA/000000?text=TF', NOW(), NOW());

-- Insert 1 Season (Active)
INSERT INTO seasons (id, name, "startingPurse", "isActive", "createdAt", "updatedAt") VALUES
('season-001', 'Season 2026', 1000000, true, NOW(), NOW());

-- Link Teams to Season
INSERT INTO season_teams (id, "seasonId", "teamId", "currentBudget", "finalBudget", "trophiesWon", "createdAt", "updatedAt") VALUES
('st-001', 'season-001', 'team-001', 1000000, NULL, 0, NOW(), NOW()),
('st-002', 'season-001', 'team-002', 1000000, NULL, 0, NOW(), NOW()),
('st-003', 'season-001', 'team-003', 1000000, NULL, 0, NOW(), NOW()),
('st-004', 'season-001', 'team-004', 1000000, NULL, 0, NOW(), NOW()),
('st-005', 'season-001', 'team-005', 1000000, NULL, 0, NOW(), NOW()),
('st-006', 'season-001', 'team-006', 1000000, NULL, 0, NOW(), NOW());

-- Insert Financial Ledger entries for initial purse
INSERT INTO financial_ledger (id, "seasonTeamId", "seasonId", "transactionType", amount, "previousBalance", "newBalance", description, "createdAt") VALUES
('fl-001', 'st-001', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW()),
('fl-002', 'st-002', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW()),
('fl-003', 'st-003', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW()),
('fl-004', 'st-004', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW()),
('fl-005', 'st-005', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW()),
('fl-006', 'st-006', 'season-001', 'INITIAL_PURSE', 1000000, 0, 1000000, 'Initial purse allocation', NOW());

-- Insert 30 Base Players (5 per position: GK, DEF, MID, FWD)
-- Goalkeepers (5)
INSERT INTO base_players (id, name, "photoUrl", "createdAt", "updatedAt") VALUES
('player-001', 'Alex Martinez', 'https://via.placeholder.com/100/FF6B6B/FFFFFF?text=AM', NOW(), NOW()),
('player-002', 'David Thompson', 'https://via.placeholder.com/100/4ECDC4/FFFFFF?text=DT', NOW(), NOW()),
('player-003', 'Carlos Silva', 'https://via.placeholder.com/100/FFE66D/000000?text=CS', NOW(), NOW()),
('player-004', 'Marco Rossi', 'https://via.placeholder.com/100/95E1D3/000000?text=MR', NOW(), NOW()),
('player-005', 'Lucas Weber', 'https://via.placeholder.com/100/A8E6CF/000000?text=LW', NOW(), NOW()),

-- Defenders (5)
('player-006', 'James Wilson', 'https://via.placeholder.com/100/C7CEEA/000000?text=JW', NOW(), NOW()),
('player-007', 'Roberto Garcia', 'https://via.placeholder.com/100/FFDAC1/000000?text=RG', NOW(), NOW()),
('player-008', 'Thomas Mueller', 'https://via.placeholder.com/100/B5EAD7/000000?text=TM', NOW(), NOW()),
('player-009', 'Pierre Dubois', 'https://via.placeholder.com/100/E2F0CB/000000?text=PD', NOW(), NOW()),
('player-010', 'Antonio Conte', 'https://via.placeholder.com/100/FFDFD3/000000?text=AC', NOW(), NOW()),

-- Midfielders (10)
('player-011', 'Kevin Anderson', 'https://via.placeholder.com/100/FF6B6B/FFFFFF?text=KA', NOW(), NOW()),
('player-012', 'Bruno Santos', 'https://via.placeholder.com/100/4ECDC4/FFFFFF?text=BS', NOW(), NOW()),
('player-013', 'Luka Modric Jr', 'https://via.placeholder.com/100/FFE66D/000000?text=LM', NOW(), NOW()),
('player-014', 'Paul Scholes II', 'https://via.placeholder.com/100/95E1D3/000000?text=PS', NOW(), NOW()),
('player-015', 'Andrea Pirlo Jr', 'https://via.placeholder.com/100/A8E6CF/000000?text=AP', NOW(), NOW()),
('player-016', 'Xavi Hernandez II', 'https://via.placeholder.com/100/C7CEEA/000000?text=XH', NOW(), NOW()),
('player-017', 'Frank Lampard Jr', 'https://via.placeholder.com/100/FFDAC1/000000?text=FL', NOW(), NOW()),
('player-018', 'Steven Gerrard II', 'https://via.placeholder.com/100/B5EAD7/000000?text=SG', NOW(), NOW()),
('player-019', 'Zinedine Zidane II', 'https://via.placeholder.com/100/E2F0CB/000000?text=ZZ', NOW(), NOW()),
('player-020', 'Iniesta Jr', 'https://via.placeholder.com/100/FFDFD3/000000?text=IJ', NOW(), NOW()),

-- Forwards (10)
('player-021', 'Cristiano Silva', 'https://via.placeholder.com/100/FF6B6B/FFFFFF?text=CS', NOW(), NOW()),
('player-022', 'Lionel Martinez', 'https://via.placeholder.com/100/4ECDC4/FFFFFF?text=LM', NOW(), NOW()),
('player-023', 'Neymar Santos', 'https://via.placeholder.com/100/FFE66D/000000?text=NS', NOW(), NOW()),
('player-024', 'Kylian Johnson', 'https://via.placeholder.com/100/95E1D3/000000?text=KJ', NOW(), NOW()),
('player-025', 'Erling Anderson', 'https://via.placeholder.com/100/A8E6CF/000000?text=EA', NOW(), NOW()),
('player-026', 'Mohamed Wilson', 'https://via.placeholder.com/100/C7CEEA/000000?text=MW', NOW(), NOW()),
('player-027', 'Harry Davis', 'https://via.placeholder.com/100/FFDAC1/000000?text=HD', NOW(), NOW()),
('player-028', 'Robert Brown', 'https://via.placeholder.com/100/B5EAD7/000000?text=RB', NOW(), NOW()),
('player-029', 'Sergio Garcia', 'https://via.placeholder.com/100/E2F0CB/000000?text=SG', NOW(), NOW()),
('player-030', 'Luis Rodriguez', 'https://via.placeholder.com/100/FFDFD3/000000?text=LR', NOW(), NOW());

-- Create Seasonal Player Stats for all players in Season 2026
INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "realWorldClub", "overallRating", star_rating, "createdAt", "updatedAt") VALUES
-- Goalkeepers
('sps-001', 'player-001', 'season-001', 'GK', 'Manchester United', 85, 4, NOW(), NOW()),
('sps-002', 'player-002', 'season-001', 'GK', 'Liverpool', 82, 4, NOW(), NOW()),
('sps-003', 'player-003', 'season-001', 'GK', 'Chelsea', 80, 3, NOW(), NOW()),
('sps-004', 'player-004', 'season-001', 'GK', 'Arsenal', 78, 3, NOW(), NOW()),
('sps-005', 'player-005', 'season-001', 'GK', 'Tottenham', 76, 3, NOW(), NOW()),

-- Defenders
('sps-006', 'player-006', 'season-001', 'CB', 'Manchester City', 88, 5, NOW(), NOW()),
('sps-007', 'player-007', 'season-001', 'LB', 'Real Madrid', 86, 4, NOW(), NOW()),
('sps-008', 'player-008', 'season-001', 'RB', 'Bayern Munich', 84, 4, NOW(), NOW()),
('sps-009', 'player-009', 'season-001', 'CB', 'PSG', 82, 4, NOW(), NOW()),
('sps-010', 'player-010', 'season-001', 'LB', 'Juventus', 80, 3, NOW(), NOW()),

-- Midfielders
('sps-011', 'player-011', 'season-001', 'CMF', 'Manchester United', 90, 5, NOW(), NOW()),
('sps-012', 'player-012', 'season-001', 'AMF', 'Barcelona', 89, 5, NOW(), NOW()),
('sps-013', 'player-013', 'season-001', 'DMF', 'Real Madrid', 87, 5, NOW(), NOW()),
('sps-014', 'player-014', 'season-001', 'CMF', 'Manchester City', 86, 4, NOW(), NOW()),
('sps-015', 'player-015', 'season-001', 'LMF', 'AC Milan', 85, 4, NOW(), NOW()),
('sps-016', 'player-016', 'season-001', 'RMF', 'Barcelona', 84, 4, NOW(), NOW()),
('sps-017', 'player-017', 'season-001', 'AMF', 'Chelsea', 83, 4, NOW(), NOW()),
('sps-018', 'player-018', 'season-001', 'CMF', 'Liverpool', 82, 4, NOW(), NOW()),
('sps-019', 'player-019', 'season-001', 'DMF', 'Real Madrid', 81, 4, NOW(), NOW()),
('sps-020', 'player-020', 'season-001', 'LMF', 'Barcelona', 80, 3, NOW(), NOW()),

-- Forwards
('sps-021', 'player-021', 'season-001', 'CF', 'Manchester United', 92, 5, NOW(), NOW()),
('sps-022', 'player-022', 'season-001', 'LWF', 'Barcelona', 91, 5, NOW(), NOW()),
('sps-023', 'player-023', 'season-001', 'RWF', 'PSG', 89, 5, NOW(), NOW()),
('sps-024', 'player-024', 'season-001', 'CF', 'Real Madrid', 88, 5, NOW(), NOW()),
('sps-025', 'player-025', 'season-001', 'SS', 'Manchester City', 87, 5, NOW(), NOW()),
('sps-026', 'player-026', 'season-001', 'LWF', 'Liverpool', 86, 4, NOW(), NOW()),
('sps-027', 'player-027', 'season-001', 'RWF', 'Tottenham', 85, 4, NOW(), NOW()),
('sps-028', 'player-028', 'season-001', 'CF', 'Bayern Munich', 84, 4, NOW(), NOW()),
('sps-029', 'player-029', 'season-001', 'SS', 'Manchester City', 83, 4, NOW(), NOW()),
('sps-030', 'player-030', 'season-001', 'LWF', 'Barcelona', 82, 4, NOW(), NOW());

-- Summary
-- ✓ 6 Teams created
-- ✓ 1 Active Season created (Season 2026)
-- ✓ All 6 teams linked to the season with $1,000,000 starting budget
-- ✓ Financial ledger entries created for initial purse
-- ✓ 30 Base Players created
-- ✓ 30 Seasonal Player Stats created (5 GK, 5 DEF: CB/LB/RB, 10 MID: DMF/CMF/LMF/RMF/AMF, 10 FWD: SS/LWF/RWF/CF)
-- 
-- You can now test:
-- - Team Selection (teams are already linked to the season)
-- - Player Retention (retain players for teams)
-- - Live Auction (auction players to teams)
