-- Migration: Disable payment simulation mode for production
-- This flips payment_simulation_mode from true to false to enable live Hubtel payments

UPDATE settings 
SET value = 'false' 
WHERE key = 'payment_simulation_mode';
