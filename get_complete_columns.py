import sqlite3

# Connect to the database
conn = sqlite3.connect('efootball_latest.db')
cursor = conn.cursor()

# Get all columns from players_all table
cursor.execute("PRAGMA table_info(players_all)")
columns = cursor.fetchall()

print("=" * 100)
print(f"COMPLETE COLUMN LIST - players_all TABLE ({len(columns)} columns)")
print("=" * 100)

for col in columns:
    col_id, name, col_type, not_null, default_val, pk = col
    null_str = "NOT NULL" if not_null else "NULL"
    print(f"{col_id:4d}. {name:45s} {col_type:15s} {null_str:10s}")

print("\n" + "=" * 100)

# Now let's check what columns are in our Prisma schema
print("\nColumns that might be missing from Prisma schema:")
print("=" * 100)

# List of columns we know are in Prisma
prisma_columns = [
    'id', 'position', 'player_name', 'team_name', 'nationality',
    'offensive_awareness', 'ball_control', 'dribbling', 'tight_possession',
    'low_pass', 'lofted_pass', 'finishing', 'heading', 'set_piece_taking', 'curl',
    'speed', 'acceleration', 'kicking_power', 'jumping', 'physical_contact', 'balance', 'stamina',
    'defensive_awareness', 'tackling', 'aggression', 'defensive_engagement',
    'gk_awareness', 'gk_catching', 'gk_parrying', 'gk_reflexes', 'gk_reach',
    'overall_rating', 'playing_style', 'player_id', 'scraped_at', 'star_rating'
]

missing = []
for col in columns:
    col_id, name, col_type, not_null, default_val, pk = col
    if name not in prisma_columns:
        missing.append((name, col_type))
        print(f"  - {name:45s} {col_type}")

print(f"\nTotal missing columns: {len(missing)}")

conn.close()
