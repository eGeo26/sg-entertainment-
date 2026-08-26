// scripts/apply-extensions-migration.ts
// Run this script to apply the booking extensions columns migration (016) to your database

import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

import { createServiceClient } from "../lib/supabase"
import * as fs from "fs"

async function applyExtensionsMigration() {
  const supabase = createServiceClient()

  console.log("Applying migration: Add booking extension columns to bookings table (016)...")

  try {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/016_add_extension_columns.sql"),
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
    console.log("\nAdded columns:")
    console.log("  - extension_hours (integer, nullable)")
    console.log("  - extension_amount (integer, nullable)")
    console.log("  - extended_at (timestamptz, nullable)")
    console.log("\nCreated indexes for performance query optimization.")

  } catch (err) {
    console.error("Migration error:", err)
    process.exit(1)
  }
}

applyExtensionsMigration()
