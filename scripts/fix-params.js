const fs = require('fs');

const files = [
  'app/api/admin/rounds/[id]/route.ts',
  'app/api/admin/rounds/[id]/start/route.ts',
  'app/api/admin/tiebreakers/[id]/route.ts',
  'app/api/auction/rounds/[id]/route.ts',
  'app/api/auction/rounds/[id]/bids/route.ts',
  'app/api/auction/rounds/[id]/my-bids/route.ts',
  'app/api/team/bulk-rounds/[id]/my-selections/route.ts',
  'app/api/team/bulk-rounds/[id]/select/route.ts',
  'app/api/team/bulk-tiebreakers/[id]/route.ts',
  'app/api/team/bulk-tiebreakers/[id]/bid/route.ts',
  'app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts',
  'app/api/tiebreakers/[id]/route.ts',
  'app/api/tiebreakers/[id]/bid/route.ts'
];

let fixed = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix params type from { params: { id: string } } to { params: Promise<{ id: string }> }
    content = content.replace(
      /\{ params \}: \{ params: \{ id: string \} \}/g,
      '{ params }: { params: Promise<{ id: string }> }'
    );
    
    // Fix params.id access - add await and destructure
    // Pattern: const someVar = params.id;
    content = content.replace(
      /const (\w+) = params\.id;/g,
      'const { id: $1 } = await params;'
    );
    
    // Pattern: params.id used directly in code
    // This is trickier, we need to handle it case by case
    // For now, let's just handle the common pattern where it's assigned first
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed: ${file}`);
    fixed++;
  } catch (err) {
    console.error(`✗ Error fixing ${file}:`, err.message);
  }
});

console.log(`\nFixed ${fixed}/${files.length} files`);
