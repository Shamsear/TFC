import re

# Read the SQL file
with open('scripts/exported-schema.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Fix ENUM types - look for CREATE TYPE lines
    if line.strip().startswith('CREATE TYPE "') and 'AS ENUM' in line:
        match = re.match(r'CREATE TYPE "(\w+)" AS ENUM \(([^)]+)\);', line.strip())
        if match:
            enum_name = match.group(1)
            enum_values = match.group(2)
            output.append(f'DO $$ BEGIN\n')
            output.append(f'    CREATE TYPE "{enum_name}" AS ENUM ({enum_values});\n')
            output.append(f'EXCEPTION\n')
            output.append(f'    WHEN duplicate_object THEN null;\n')
            output.append(f'END $$;\n')
            i += 1
            continue
    
    # Fix CREATE TABLE
    if line.strip().startswith('CREATE TABLE "') and 'IF NOT EXISTS' not in line:
        line = line.replace('CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "')
    
    # Fix CREATE INDEX
    if line.strip().startswith('CREATE INDEX ') and 'IF NOT EXISTS' not in line:
        line = line.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ', 1)
    
    # Fix CREATE UNIQUE INDEX
    if line.strip().startswith('CREATE UNIQUE INDEX ') and 'IF NOT EXISTS' not in line:
        line = line.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ', 1)
    
    # Fix ALTER TABLE ADD CONSTRAINT
    if line.strip().startswith('ALTER TABLE "') and 'ADD CONSTRAINT' in line:
        match = re.match(r'ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+);', line.strip())
        if match:
            table = match.group(1)
            constraint = match.group(2)
            definition = match.group(3)
            output.append(f'DO $$ BEGIN\n')
            output.append(f'    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = \'{constraint}\') THEN\n')
            output.append(f'        ALTER TABLE "{table}" ADD CONSTRAINT "{constraint}" {definition};\n')
            output.append(f'    END IF;\n')
            output.append(f'END $$;\n')
            i += 1
            continue
    
    output.append(line)
    i += 1

# Save the modified content
with open('scripts/exported-schema.sql', 'w', encoding='utf-8') as f:
    f.writelines(output)

print("Successfully fixed exported-schema.sql")
