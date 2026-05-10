const fs = require('fs');

const files = [
  'app/api/team/bulk-tiebreakers/[id]/bid/route.ts',
  'app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts',
  'app/api/team/bulk-tiebreakers/[id]/route.ts'
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find pattern: const someVar = parseInt(params.id) or params.id usage
    // Replace with: const { id } = await params; const someVar = parseInt(id)
    
    // Pattern 1: const tiebreakerId = parseInt(params.id);
    if (content.includes('parseInt(params.id)')) {
      content = content.replace(
        /const (\w+) = parseInt\(params\.id\);/g,
        'const { id } = await params;\n    const $1 = parseInt(id);'
      );
    }
    
    // Pattern 2: Direct params.id usage
    content = content.replace(/params\.id/g, 'id');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed: ${file}`);
  } catch (err) {
    console.error(`✗ Error fixing ${file}:`, err.message);
  }
});

console.log('\nDone!');
