import re

# Read the SQL file
with open('scripts/exported-schema.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Fix ENUM types
enum_pattern = r'CREATE TYPE "(\w+)" AS ENUM \(([^)]+)\);'
def replace_enum(match):
    enum_name = match.group(1)
    enum_values = match.group(2)
    return f'''DO $$ BEGIN
    CREATE TYPE "{enum_name}" AS ENUM ({enum_values});
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;'''

content = re.sub(enum_pattern, replace_enum, content)

# Step 2: Add IF NOT EXISTS to CREATE TABLE
content = re.sub(r'CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "', content)

# Step 3: Add IF NOT EXISTS to CREATE INDEX (with quotes)
content = re.sub(r'CREATE INDEX "', 'CREATE INDEX IF NOT EXISTS "', content)
content = re.sub(r'CREATE UNIQUE INDEX "', 'CREATE UNIQUE INDEX IF NOT EXISTS "', content)

# Step 4: Add IF NOT EXISTS to CREATE INDEX (without quotes)
content = re.sub(r'^CREATE INDEX ([a-zA-Z_])', r'CREATE INDEX IF NOT EXISTS \1', content, flags=re.MULTILINE)
content = re.sub(r'^CREATE UNIQUE INDEX ([a-zA-Z_])', r'CREATE UNIQUE INDEX IF NOT EXISTS \1', content, flags=re.MULTILINE)

# Step 5: Fix any double IF NOT EXISTS
content = re.sub(r'IF NOT EXISTS IF NOT EXISTS', 'IF NOT EXISTS', content)

# Step 6: Wrap ALTER TABLE ADD CONSTRAINT in DO blocks
constraint_pattern = r'ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+?);'
def replace_constraint(match):
    table = match.group(1)
    constraint = match.group(2)
    definition = match.group(3)
    return f'''DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{constraint}') THEN
        ALTER TABLE "{table}" ADD CONSTRAINT "{constraint}" {definition};
    END IF;
END $$;'''

content = re.sub(constraint_pattern, replace_constraint, content)

# Save the modified content
with open('scripts/exported-schema.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed all constraints in exported-schema.sql")
