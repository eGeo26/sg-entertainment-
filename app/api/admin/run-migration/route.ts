// app/api/admin/run-migration/route.ts
// ONE-TIME migration endpoint: adds is_admin_message column to booking_status_history
// DELETE THIS FILE after migration is confirmed applied.
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  const steps: { step: string; success: boolean; error?: string }[] = []

  // Step 1: Add column
  try {
    const { error } = await (supabase as any).rpc("exec_sql", { sql: "" }).throwOnError()
    // exec_sql doesn't exist; use direct insert approach instead
    steps.push({ step: "exec_sql check", success: false, error: "exec_sql not available, using REST alter" })
  } catch {
    // expected
  }

  // Step 2: Use column-level operations to add the column via PostgREST workaround.
  // We insert a row with is_admin_message and catch the error to detect column state.
  // Actually best is direct: try a SELECT of the column to confirm, then if missing,
  // we must tell the user to run the SQL in the Supabase dashboard.

  // Check column existence
  const { error: checkError } = await (supabase as any)
    .from("booking_status_history")
    .select("is_admin_message")
    .limit(1)

  if (!checkError) {
    return NextResponse.json({
      message: "✅ Column is_admin_message already exists. Migration already applied.",
      steps
    })
  }

  return NextResponse.json({
    error: "Cannot apply migration automatically — exec_sql RPC not found.",
    resolution: "Please run this SQL manually in your Supabase SQL Editor:\n\nALTER TABLE booking_status_history ADD COLUMN IF NOT EXISTS is_admin_message boolean DEFAULT false NOT NULL;\nCREATE INDEX IF NOT EXISTS idx_history_is_admin_message ON booking_status_history(is_admin_message);",
    supabase_sql_editor: "https://supabase.com/dashboard/project/uiplmrkezvwurndlvitl/sql/new",
    sql: "ALTER TABLE booking_status_history ADD COLUMN IF NOT EXISTS is_admin_message boolean DEFAULT false NOT NULL;\nCREATE INDEX IF NOT EXISTS idx_history_is_admin_message ON booking_status_history(is_admin_message);"
  }, { status: 422 })
}
