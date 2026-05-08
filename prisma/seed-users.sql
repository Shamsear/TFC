-- Turf Cats - Insert Admin Users Only
-- Run this in your Neon SQL Editor

-- Delete existing admin users if they exist (optional)
DELETE FROM "users" WHERE email IN ('superadmin@turfcats.com', 'subadmin@turfcats.com');

-- Insert admin users with correct password hashes
-- Passwords: superadmin123 and subadmin123
INSERT INTO "users" ("id", "email", "name", "role", "passwordHash", "createdAt", "updatedAt") VALUES
('cm7x1a2b3c4d5e6f7g8h9i0j1', 'superadmin@turfcats.com', 'Super Admin', 'SUPER_ADMIN', '$2b$12$nX9AgEOairKr3lIP2mTiceJLt4Jajxep0loSkWko.slwzMa1fwE02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm7x2b3c4d5e6f7g8h9i0j1k2', 'subadmin@turfcats.com', 'Sub Admin', 'SUB_ADMIN', '$2b$12$c.ivK5k3OEHDYO7SBgbAverhHd1Q6LW2evcifqzgb2NUJ/UmU/acO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Verify the users were created
SELECT email, name, role, "createdAt" FROM "users" WHERE email IN ('superadmin@turfcats.com', 'subadmin@turfcats.com');

-- Success message
SELECT 'Admin users created successfully!' AS status;
SELECT 'Super Admin: superadmin@turfcats.com / superadmin123' AS credentials;
SELECT 'Sub Admin: subadmin@turfcats.com / subadmin123' AS credentials;
