-- Check which tables exist in the public schema
-- Run this first to see what tables are missing

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
