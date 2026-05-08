import sqlite3

# Connect to the database
conn = sqlite3.connect('efootball_latest.db')
cursor = conn.cursor()

# Get all columns from players_all table
cursor.execute("PRAGMA table_info(players_all)")
columns = cursor.fetchall()

print("=" * 80)
print("COLUMNS IN players_all TABLE")
print("=" * 80)
print(f"Total columns: {len(columns)}\n")

for col in columns:
    col_id, name, col_type, not_null, default_val, pk = col
    print(f"{col_id:3d}. {name:30s} {col_type:15s} {'NOT NULL' if not_null else ''}")

conn.close()
