# Fix NextAuth v5 imports in all API routes

$files = @(
    "app/api/admin/rounds/route.ts",
    "app/api/admin/rounds/[id]/route.ts",
    "app/api/admin/rounds/[id]/start/route.ts",
    "app/api/admin/rounds/[id]/finalize/route.ts",
    "app/api/admin/tiebreakers/route.ts",
    "app/api/admin/tiebreakers/[id]/route.ts",
    "app/api/admin/bulk-rounds/route.ts",
    "app/api/admin/bulk-tiebreakers/route.ts",
    "app/api/auction/rounds/[id]/route.ts",
    "app/api/auction/rounds/[id]/bids/route.ts",
    "app/api/auction/rounds/[id]/my-bids/route.ts",
    "app/api/team/bulk-rounds/[id]/select/route.ts",
    "app/api/team/bulk-rounds/[id]/my-selections/route.ts",
    "app/api/team/bulk-tiebreakers/[id]/route.ts",
    "app/api/team/bulk-tiebreakers/[id]/bid/route.ts",
    "app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts",
    "app/api/tiebreakers/[id]/route.ts",
    "app/api/tiebreakers/[id]/bid/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..."
        
        $content = Get-Content $file -Raw
        
        # Remove getServerSession import line
        $content = $content -replace "import \{ getServerSession \} from 'next-auth';\r?\n", ""
        
        # Replace authOptions import with auth
        $content = $content -replace "import \{ authOptions \} from '@/lib/auth';", "import { auth } from '@/lib/auth';"
        
        # Replace getServerSession(authOptions) with auth()
        $content = $content -replace "await getServerSession\(authOptions\)", "await auth()"
        
        Set-Content $file -Value $content -NoNewline
        
        Write-Host "Fixed $file" -ForegroundColor Green
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nAll files fixed!" -ForegroundColor Green
