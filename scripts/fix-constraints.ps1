# Read the SQL file
$content = Get-Content "scripts/exported-schema.sql" -Raw

# Pattern to match ALTER TABLE ADD CONSTRAINT statements
$pattern = 'ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+?);'

# Replace each match with a DO block
$content = [regex]::Replace($content, $pattern, {
    param($match)
    $table = $match.Groups[1].Value
    $constraint = $match.Groups[2].Value
    $definition = $match.Groups[3].Value
    
    @"
DO `$`$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '$constraint') THEN
        ALTER TABLE "$table" ADD CONSTRAINT "$constraint" $definition;
    END IF;
END `$`$;
"@
})

# Save the modified content
Set-Content "scripts/exported-schema.sql" -Value $content

Write-Host "Fixed all ALTER TABLE ADD CONSTRAINT statements"
