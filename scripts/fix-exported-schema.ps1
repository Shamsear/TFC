# Read the SQL file
$content = Get-Content "scripts/exported-schema.sql" -Raw

# Step 1: Fix ENUM types - wrap in DO blocks
$content = $content -replace 'CREATE TYPE "(\w+)" AS ENUM \(([^)]+)\);', 'DO $$ BEGIN CREATE TYPE "$1" AS ENUM ($2); EXCEPTION WHEN duplicate_object THEN null; END $$;'

# Step 2: Add IF NOT EXISTS to CREATE TABLE
$content = $content -replace 'CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "'

# Step 3: Add IF NOT EXISTS to CREATE INDEX (with quotes)
$content = $content -replace 'CREATE INDEX "', 'CREATE INDEX IF NOT EXISTS "'
$content = $content -replace 'CREATE UNIQUE INDEX "', 'CREATE UNIQUE INDEX IF NOT EXISTS "'

# Step 4: Add IF NOT EXISTS to CREATE INDEX (without quotes)
$content = $content -replace '(?m)^CREATE INDEX ([a-zA-Z_])', 'CREATE INDEX IF NOT EXISTS $1'
$content = $content -replace '(?m)^CREATE UNIQUE INDEX ([a-zA-Z_])', 'CREATE UNIQUE INDEX IF NOT EXISTS $1'

# Step 5: Fix any double IF NOT EXISTS
$content = $content -replace 'IF NOT EXISTS IF NOT EXISTS', 'IF NOT EXISTS'

# Step 6: Wrap ALTER TABLE ADD CONSTRAINT in DO blocks
$pattern = '(?m)^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+?);$'
$content = [regex]::Replace($content, $pattern, {
    param($match)
    $table = $match.Groups[1].Value
    $constraint = $match.Groups[2].Value
    $definition = $match.Groups[3].Value
    
    "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '$constraint') THEN ALTER TABLE `"$table`" ADD CONSTRAINT `"$constraint`" $definition; END IF; END `$`$;"
})

# Save the modified content
Set-Content "scripts/exported-schema.sql" -Value $content -NoNewline

Write-Host "Successfully fixed exported-schema.sql"
