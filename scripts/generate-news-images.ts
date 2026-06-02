/**
 * Generate images for existing news
 */

import { generateImagesForExistingNews } from '../lib/news/image-generator';

async function main() {
  console.log('🎨 Generating images for existing news articles...\n');
  await generateImagesForExistingNews();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
