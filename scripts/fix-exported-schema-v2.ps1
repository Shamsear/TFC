# Read the SQL file line by line
$lines = Get-Content "scripts/exported-schema.sql"
$output = @()
$inConstraints = $false

foreach ($line in $lines) {
    # Check if we're in the constraints section
    if ($line -match '^-- Foreign Key Constraints' -or $line -match '^-- Unique Constraints') {
        $inConstraints = $true
        $output += $line
        continue
    }
    
    # If we hit another section marker, we're done with constraints
    if ($line -match '^--' -and $inConstraints -and $line -notmatch 'Constraint') {
        $inConstraints = $false
    }
    
    # Wrap ALTER TABLE ADD CONSTRAINT statements
    if ($line -match '^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+);$') {
        $table = $matches[1]
        $constraint = $matches[2]
        $definition = $matches[3]
        
        $output += "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '$constraint') THEN ALTER TABLE `"$table`" ADD CONSTRAINT `"$constraint`" $definition; END IF; END `$`$;"
    }
    else {
        $output += $line
    }
}

# Save the modified content
$output | Set-Content "scripts/exported-schema-fixed.sql"

Write-Host "Created scripts/exported-schema-fixed.sql"
