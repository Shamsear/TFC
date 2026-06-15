const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const files = walkSync(path.join(__dirname, '..', 'app'));

const results = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Very basic check for findMany
  if (content.includes('findMany')) {
    // regex to find prisma.[model].findMany({ ... }) blocks roughly
    // This is hard to parse with regex, but we can look for "include:" and "take:" near findMany
    
    const lines = content.split('\n');
    let inFindMany = false;
    let hasTake = false;
    let hasInclude = false;
    let hasSelect = false;
    let currentFindManyStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('findMany(')) {
        inFindMany = true;
        hasTake = false;
        hasInclude = false;
        hasSelect = false;
        currentFindManyStart = i + 1;
      }
      
      if (inFindMany) {
        if (line.includes('take:')) hasTake = true;
        if (line.includes('include:')) hasInclude = true;
        if (line.includes('select:')) hasSelect = true;
        
        // Very basic heuristic to detect end of findMany call
        // If we see a line starting with '  })' or '})' we assume it's the end
        if (line.match(/^(\s*)\}\)/)) {
          inFindMany = false;
          
          if (!hasTake && hasInclude) {
            results.push({
              file: file.replace(__dirname, ''),
              line: currentFindManyStart,
              issue: 'Missing take + has include (High Data Transfer Risk)'
            });
          } else if (!hasTake) {
            // Check if it's a known small table (like seasons, windows)
            const isSmallTable = file.includes('seasons') || file.includes('windows') || content.includes('prisma.seasons.findMany') || content.includes('prisma.release_windows.findMany') || content.includes('prisma.swap_windows.findMany') || content.includes('prisma.tournaments.findMany');
            if (!isSmallTable) {
               results.push({
                 file: file.replace(__dirname, ''),
                 line: currentFindManyStart,
                 issue: 'Missing take (Unbounded query)'
               });
            }
          } else if (hasInclude) {
               results.push({
                 file: file.replace(__dirname, ''),
                 line: currentFindManyStart,
                 issue: 'Has include (Potential nested data bloat, even with take)'
               });
          }
        }
      }
    }
  }
}

fs.writeFileSync('scratch/network_analysis.json', JSON.stringify(results, null, 2));
console.log('Analysis complete. Found ' + results.length + ' potential issues.');
