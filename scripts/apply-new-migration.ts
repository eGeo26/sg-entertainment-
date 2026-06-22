// scripts/apply-new-migration.ts
// Run this script to apply the is_admin_message column migration to your database

import { createServiceClient } from "../lib/supabase"
import * as fs from "fs"
import * as path from "path"

async function applyNewMigration() {
  const supabase = createServiceClient()

  console.log("Applying migration: Add is_admin_message column to booking_status_history table...")

  try {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/005_add_is_admin_message_to_history.sql"),
      "utf8"
    )

    const { error: alterError } = await (supabase as any).rpc('exec_sql', {
      sql: migrationSql
    })

    if (alterError) {
      console.error("Migration failed:", alterError)
      process.exit(1)
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

applyNewMigration()
