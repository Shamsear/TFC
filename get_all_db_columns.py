import sqlite3

# Connect to the database
conn = sqlite3.connect('efootball_latest.db')
cursor = conn.cursor()

# Get all columns from players_all table
cursor.execute("PRAGMA table_info(players_all)")
columns = cursor.fetchall()

print("=" * 100)
print("ALL COLUMNS IN players_all TABLE")
print("=" * 100)
print(f"Total columns: {len(columns)}\n")

# Group columns by category
basic_info = []
offensive = []
physical = []
defensive = []
goalkeeper = []
skills = []
other = []

for col in columns:
    col_id, name, col_type, not_null, default_val, pk = col
    col_info = f"{name:40s} {col_type:15s}"
    
    if name in ['id', 'position', 'player_name', 'team_name', 'nationality', 'player_id', 'scraped_at', 'overall_rating', 'playing_style', 'star_rating', 'max_level', 'overall_at_max_level', 'height', 'weight', 'age', 'foot', 'featured', 'weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance', 'condition']:
        basic_info.append(col_info)
    elif name.startswith('offensive_') or name in ['ball_control', 'dribbling', 'tight_possession', 'low_pass', 'lofted_pass', 'finishing', 'heading', 'set_piece_taking', 'curl']:
        offensive.append(col_info)
    elif name in ['speed', 'acceleration', 'kicking_power', 'jumping', 'physical_contact', 'balance', 'stamina']:
        physical.append(col_info)
    elif name.startswith('defensive_') or name in ['tackling', 'aggression']:
        defensive.append(col_info)
    elif name.startswith('gk_'):
        goalkeeper.append(col_info)
    else:
        skills.append(col_info)

print("\n📋 BASIC INFO:")
for col in basic_info:
    print(f"  {col}")

print("\n⚔️  OFFENSIVE STATS:")
for col in offensive:
    print(f"  {col}")

print("\n🏃 PHYSICAL STATS:")
for col in physical:
    print(f"  {col}")

print("\n🛡️  DEFENSIVE STATS:")
for col in defensive:
    print(f"  {col}")

print("\n🧤 GOALKEEPER STATS:")
for col in goalkeeper:
    print(f"  {col}")

print("\n✨ SKILLS & ABILITIES:")
for col in skills:
    print(f"  {col}")

print("\n" + "=" * 100)
print(f"TOTAL: {len(columns)} columns")
print("=" * 100)

conn.close()
