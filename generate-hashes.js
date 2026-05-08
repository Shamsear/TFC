const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('Generating bcrypt hashes...\n');
  
  const superAdminPassword = 'superadmin123';
  const subAdminPassword = 'subadmin123';
  
  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
  const subAdminHash = await bcrypt.hash(subAdminPassword, 12);
  
  console.log('Super Admin Password:', superAdminPassword);
  console.log('Super Admin Hash:', superAdminHash);
  console.log('\nSub Admin Password:', subAdminPassword);
  console.log('Sub Admin Hash:', subAdminHash);
  
  console.log('\n--- SQL Script ---\n');
  console.log(`-- Delete existing admin users if they exist
DELETE FROM "users" WHERE email IN ('superadmin@turfcats.com', 'subadmin@turfcats.com');

-- Insert admin users with correct password hashes
INSERT INTO "users" ("id", "email", "name", "role", "passwordHash", "createdAt", "updatedAt") VALUES
('cm7x1a2b3c4d5e6f7g8h9i0j1', 'superadmin@turfcats.com', 'Super Admin', 'SUPER_ADMIN', '${superAdminHash}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm7x2b3c4d5e6f7g8h9i0j1k2', 'subadmin@turfcats.com', 'Sub Admin', 'SUB_ADMIN', '${subAdminHash}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Verify the users were created
SELECT email, name, role, "createdAt" FROM "users" WHERE email IN ('superadmin@turfcats.com', 'subadmin@turfcats.com');`);
}

generateHashes().catch(console.error);
