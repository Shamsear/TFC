const fs = require('fs');
const path = require('path');

const files = [
  'app/api/admin/rounds/[id]/route.ts',
  'app/api/admin/rounds/[id]/finalize/route.ts',
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
    
    // Remove getServerSession import
    content = content.replace(/import \{ getServerSession \} from 'next-auth';\r?\n/g, '');
    
    // Replace authOptions import with auth
    content = content.replace(/import \{ authOptions \} from '@\/lib\/auth';/g, "import { auth } from '@/lib/auth';");
    
    // Replace getServerSession(authOptions) with auth()
    content = content.replace(/await getServerSession\(authOptions\)/g, 'await auth()');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed: ${file}`);
    fixed++;
  } catch (err) {
    console.error(`✗ Error fixing ${file}:`, err.message);
  }
});

console.log(`\nFixed ${fixed}/${files.length} files`);
