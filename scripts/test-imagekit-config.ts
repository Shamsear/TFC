/**
 * Test ImageKit Configuration
 * Run: npx tsx scripts/test-imagekit-config.ts
 */

import ImageKit from 'imagekit';

async function testImageKitConfig() {
  console.log('🧪 Testing ImageKit Configuration...\n');

  // Check environment variables
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  console.log('Environment Variables:');
  console.log(`  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: ${publicKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  IMAGEKIT_PRIVATE_KEY: ${privateKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: ${urlEndpoint ? '✅ Set' : '❌ Missing'}`);
  console.log();

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.error('❌ ImageKit credentials are not properly configured!');
    console.log('\nMake sure your .env file contains:');
    console.log('  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_...');
    console.log('  IMAGEKIT_PRIVATE_KEY=private_...');
    console.log('  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tfc/');
    process.exit(1);
  }

  // Initialize ImageKit
  const imagekit = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });

  // Test authentication by listing files
  try {
    console.log('Testing ImageKit connection...');
    const files = await imagekit.listFiles({
      path: '/news-images',
      limit: 1,
    });

    console.log('✅ ImageKit connection successful!');
    console.log(`   Found ${files.length > 0 ? 'some' : 'no'} files in /news-images folder`);
    console.log();
    console.log('🎉 ImageKit is properly configured and ready to use!');
  } catch (error: any) {
    console.error('❌ ImageKit connection failed:');
    console.error(`   ${error.message || error}`);
    console.log();
    console.log('Possible issues:');
    console.log('  - Invalid API keys');
    console.log('  - Network connectivity issues');
    console.log('  - ImageKit account not active');
    process.exit(1);
  }
}

testImageKitConfig()
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
