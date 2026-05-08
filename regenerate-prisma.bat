@echo off
echo Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Regenerating Prisma client...
call npx prisma generate
echo Done! You can now restart your dev server with: npm run dev
pause
