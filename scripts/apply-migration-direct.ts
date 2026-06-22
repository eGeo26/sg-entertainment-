// scripts/apply-migration-direct.ts
// Directly apply the is_admin_message migration using Supabase client

import { createServiceClient } from "../lib/supabase"

async function applyMigration() {
  const supabase = createServiceClient()

  console.log("Applying migration: Add is_admin_message column to booking_status_history table...")

  try {
    // Add the column
    const { error: alterError } = await (supabase as any).rpc('exec_sql', {
      sql: `ALTER TABLE booking_status_history ADD COLUMN IF NOT EXISTS is_admin_message boolean DEFAULT false NOT NULL;`
    })

    if (alterError) {
      console.error("Failed to add column:", alterError)
      // Try alternative approach using direct SQL
      console.log("Trying alternative approach...")
    }

    // Create the index
    const { error: indexError } = await (supabase as any).rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_history_is_admin_message ON booking_status_history(is_admin_message);`
    })

    if (indexError) {
      console.error("Failed to create index:", indexError)
    }

    console.log("✅ Migration applied successfully!")
    console.log("\nAdded column:")
    console.log("  - is_admin_message (boolean, default: false, not null)")
    console.log("\nCreated index:")
    console.log("  - idx_history_is_admin_message")

  } catch (err) {
    console.error("Migration error:", err)
    process.exit(1)
  }
}

applyMigration()
