#!/usr/bin/env python3
"""
eFootball Database Cleaner
Cleans and prepares eFootball database for import
"""

import sqlite3
import os
import sys
from pathlib import Path
from datetime import datetime
import shutil

class DatabaseCleaner:
    def __init__(self, input_file):
        self.input_file = input_file
        self.output_file = None
        self.conn = None
        self.stats = {
            'original_count': 0,
            'cleaned_count': 0,
            'duplicates_removed': 0,
            'invalid_removed': 0,
            'total_removed': 0
        }
    
    def connect(self):
        """Connect to the database"""
        print(f"📂 Opening database: {self.input_file}")
        self.conn = sqlite3.connect(self.input_file)
        self.conn.row_factory = sqlite3.Row
        print("✓ Database connected")
    
    def analyze(self):
        """Analyze the database"""
        print("\n📊 Analyzing database...")
        cursor = self.conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM players_all")
        self.stats['original_count'] = cursor.fetchone()[0]
        print(f"   Total players: {self.stats['original_count']:,}")
        
        # Find duplicates (same name + position + nationality)
        cursor.execute("""
            SELECT player_name, position, nationality, COUNT(*) as count
            FROM players_all
            GROUP BY player_name, position, nationality
            HAVING count > 1
        """)
        duplicate_groups = cursor.fetchall()
        duplicate_count = sum(row['count'] - 1 for row in duplicate_groups)
        print(f"   Duplicate groups: {len(duplicate_groups)}")
        print(f"   Duplicate entries: {duplicate_count:,}")
        
        # Find invalid entries (missing critical data)
        cursor.execute("""
            SELECT COUNT(*) FROM players_all
            WHERE player_name IS NULL 
               OR player_name = ''
               OR position IS NULL
               OR position = ''
               OR overall_rating IS NULL
               OR overall_rating < 40
        """)
        invalid_count = cursor.fetchone()[0]
        print(f"   Invalid entries: {invalid_count:,}")
        
        # Position distribution
        cursor.execute("""
            SELECT position, COUNT(*) as count
            FROM players_all
            GROUP BY position
            ORDER BY count DESC
            LIMIT 10
        """)
        print("\n   Top positions:")
        for row in cursor.fetchall():
            print(f"      {row['position']}: {row['count']:,}")
        
        # Rating distribution
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN overall_rating >= 85 THEN '85+'
                    WHEN overall_rating >= 80 THEN '80-84'
                    WHEN overall_rating >= 75 THEN '75-79'
                    WHEN overall_rating >= 70 THEN '70-74'
                    ELSE 'Below 70'
                END as rating_range,
                COUNT(*) as count
            FROM players_all
            GROUP BY rating_range
            ORDER BY rating_range DESC
        """)
        print("\n   Rating distribution:")
        for row in cursor.fetchall():
            print(f"      {row['rating_range']}: {row['count']:,}")
    
    def clean(self):
        """Clean the database"""
        print("\n🧹 Starting cleaning process...")
        
        # Create output filename
        input_path = Path(self.input_file)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.output_file = input_path.parent / f"cleaned_{timestamp}_{input_path.name}"
        
        # Copy original file
        print(f"   Creating cleaned database: {self.output_file.name}")
        shutil.copy2(self.input_file, self.output_file)
        
        # Connect to cleaned database
        clean_conn = sqlite3.connect(self.output_file)
        cursor = clean_conn.cursor()
        
        # Step 1: Remove invalid entries
        print("\n   Step 1: Removing invalid entries...")
        cursor.execute("""
            DELETE FROM players_all
            WHERE player_name IS NULL 
               OR player_name = ''
               OR position IS NULL
               OR position = ''
               OR overall_rating IS NULL
               OR overall_rating < 40
        """)
        self.stats['invalid_removed'] = cursor.rowcount
        print(f"   ✓ Removed {self.stats['invalid_removed']:,} invalid entries")
        
        # Step 2: Remove duplicates (keep highest rated)
        print("\n   Step 2: Removing duplicates...")
        cursor.execute("""
            DELETE FROM players_all
            WHERE rowid NOT IN (
                SELECT MIN(rowid)
                FROM players_all
                GROUP BY player_name, position, nationality
                HAVING overall_rating = MAX(overall_rating)
            )
        """)
        self.stats['duplicates_removed'] = cursor.rowcount
        print(f"   ✓ Removed {self.stats['duplicates_removed']:,} duplicate entries")
        
        # Step 3: Normalize data
        print("\n   Step 3: Normalizing data...")
        
        # Trim whitespace
        cursor.execute("""
            UPDATE players_all
            SET player_name = TRIM(player_name),
                position = TRIM(position),
                team_name = TRIM(team_name),
                nationality = TRIM(nationality)
        """)
        
        # Standardize positions
        position_mapping = {
            'LWB': 'LB',
            'RWB': 'RB',
            'LW': 'LWF',
            'RW': 'RWF',
            'ST': 'CF',
            'CAM': 'AMF',
            'CDM': 'DMF',
            'CM': 'CMF'
        }
        
        for old_pos, new_pos in position_mapping.items():
            cursor.execute("""
                UPDATE players_all
                SET position = ?
                WHERE position = ?
            """, (new_pos, old_pos))
        
        print("   ✓ Data normalized")
        
        # Step 4: Vacuum database
        print("\n   Step 4: Optimizing database...")
        cursor.execute("VACUUM")
        print("   ✓ Database optimized")
        
        # Get final count
        cursor.execute("SELECT COUNT(*) FROM players_all")
        self.stats['cleaned_count'] = cursor.fetchone()[0]
        self.stats['total_removed'] = self.stats['original_count'] - self.stats['cleaned_count']
        
        clean_conn.commit()
        clean_conn.close()
        
        print("\n✓ Cleaning complete!")
    
    def show_summary(self):
        """Show cleaning summary"""
        print("\n" + "="*60)
        print("📊 CLEANING SUMMARY")
        print("="*60)
        print(f"Original players:     {self.stats['original_count']:>10,}")
        print(f"Invalid removed:      {self.stats['invalid_removed']:>10,}")
        print(f"Duplicates removed:   {self.stats['duplicates_removed']:>10,}")
        print(f"Total removed:        {self.stats['total_removed']:>10,}")
        print(f"Final player count:   {self.stats['cleaned_count']:>10,}")
        
        if self.stats['original_count'] > 0:
            reduction = (self.stats['total_removed'] / self.stats['original_count']) * 100
            print(f"Reduction:            {reduction:>10.1f}%")
        
        print("="*60)
        
        if self.output_file:
            original_size = os.path.getsize(self.input_file) / (1024 * 1024)
            cleaned_size = os.path.getsize(self.output_file) / (1024 * 1024)
            print(f"\nOriginal file size:   {original_size:>10.2f} MB")
            print(f"Cleaned file size:    {cleaned_size:>10.2f} MB")
            print(f"Size reduction:       {original_size - cleaned_size:>10.2f} MB")
            print(f"\n💾 Cleaned database saved to:")
            print(f"   {self.output_file}")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def run(self):
        """Run the complete cleaning process"""
        try:
            self.connect()
            self.analyze()
            
            # Ask for confirmation
            print("\n" + "="*60)
            response = input("Proceed with cleaning? (yes/no): ").strip().lower()
            if response not in ['yes', 'y']:
                print("❌ Cleaning cancelled")
                return False
            
            self.clean()
            self.show_summary()
            return True
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.close()


def main():
    print("="*60)
    print("⚽ eFootball Database Cleaner")
    print("="*60)
    
    # Get input file
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = input("\nEnter database file path: ").strip()
    
    # Validate file
    if not os.path.exists(input_file):
        print(f"❌ Error: File not found: {input_file}")
        return 1
    
    if not input_file.endswith('.db'):
        print("⚠️  Warning: File doesn't have .db extension")
        response = input("Continue anyway? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            return 1
    
    # Run cleaner
    cleaner = DatabaseCleaner(input_file)
    success = cleaner.run()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
