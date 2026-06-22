// scripts/apply-migration.ts
// Run this script to apply the status columns migration to your database

import { createServiceClient } from "../lib/supabase"

async function applyMigration() {
  const supabase = createServiceClient()

  console.log("Applying migration: Add status columns to bookings table...")

  try {
    // Add columns to bookings table
    const { error: alterError } = await (supabase as any).rpc('exec_sql', {
      sql: `
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS status_received boolean DEFAULT true,
          ADD COLUMN IF NOT EXISTS status_received_at timestamptz DEFAULT now(),
          ADD COLUMN IF NOT EXISTS status_payment boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS status_payment_at timestamptz,
          ADD COLUMN IF NOT EXISTS status_reviewed boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS status_reviewed_at timestamptz,
          ADD COLUMN IF NOT EXISTS status_confirmed boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS status_confirmed_at timestamptz;

        CREATE INDEX IF NOT EXISTS idx_bookings_status_received ON bookings(status_received);
        CREATE INDEX IF NOT EXISTS idx_bookings_status_payment ON bookings(status_payment);
        CREATE INDEX IF NOT EXISTS idx_bookings_status_reviewed ON bookings(status_reviewed);
        CREATE INDEX IF NOT EXISTS idx_bookings_status_confirmed ON bookings(status_confirmed);
      `
    })

    if (alterError) {
      console.error("Migration failed:", alterError)
      process.exit(1)
    }

    console.log("✅ Migration applied successfully!")
    console.log("\nAdded columns:")
    console.log("  - status_received (boolean, default: true)")
    console.log("  - status_received_at (timestamptz, default: now())")
    console.log("  - status_payment (boolean, default: false)")
    console.log("  - status_payment_at (timestamptz)")
    console.log("  - status_reviewed (boolean, default: false)")
    console.log("  - status_reviewed_at (timestamptz)")
    console.log("  - status_confirmed (boolean, default: false)")
    console.log("  - status_confirmed_at (timestamptz)")
    console.log("\nCreated indexes for performance on all status columns.")

  } catch (err) {
    console.error("Migration error:", err)
    process.exit(1)
  }
}

applyMigration()
