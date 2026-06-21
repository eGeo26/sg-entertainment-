// lib/realtimeBookings.ts
// Realtime subscription utility for admin booking sync events

import { createBrowserSupabaseClient } from "@/lib/supabase"

export interface SyncEvent {
  id: string
  event_type: string
  booking_id: string
  booking_code: string
  payload: any
  delivered: boolean
  delivery_attempts: number
  created_at: string
  delivered_at: string | null
}

export type BookingEventHandler = (event: SyncEvent) => void

/**
 * Subscribe to live booking sync events via Supabase Realtime
 * Call this once when the admin dashboard mounts
 * Returns a cleanup function that must be called on unmount
 */
export function subscribeToBookingEvents(onEvent: BookingEventHandler) {
  const supabase = createBrowserSupabaseClient()
  
  // Use a stable channel name - we ensure proper cleanup to avoid conflicts
  const channelName = "admin-booking-sync"
  
  console.log("[Realtime] Creating subscription for channel:", channelName)
  
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "sync_events" 
      },
      (payload) => {
        console.log("[Realtime] Received sync event:", payload.new)
        onEvent(payload.new as SyncEvent)
      }
    )
    .subscribe((status) => {
      console.log("[Realtime] Subscription status:", status, "for channel:", channelName)
    })

  // Return cleanup function that removes the channel
  return () => {
    console.log("[Realtime] Cleaning up subscription for channel:", channelName)
    supabase.removeChannel(channel)
  }
}

/**
 * Mark a sync event as delivered after the admin UI has processed it
 */
export async function markEventDelivered(eventId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  
  const { error } = await (supabase as any)
    .from("sync_events")
    .update({ 
      delivered: true, 
      delivered_at: new Date().toISOString() 
    })
    .eq("id", eventId)

  if (error) {
    console.error("[Realtime] Failed to mark event as delivered:", error)
    throw error
  }
}

/**
 * Catch-up mechanism: fetch all undelivered events that were missed
 * Call this on admin dashboard load (and optionally periodically while open)
 */
export async function catchUpMissedEvents(onEvent: BookingEventHandler): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  
  console.log("[Realtime] Catching up on missed events...")
  
  const { data: missed, error } = await supabase
    .from("sync_events")
    .select("*")
    .eq("delivered", false)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[Realtime] Failed to fetch missed events:", error)
    throw error
  }

  if (!missed || missed.length === 0) {
    console.log("[Realtime] No missed events to catch up on")
    return
  }

  console.log(`[Realtime] Found ${missed.length} missed events, processing...`)

  // Process each missed event
  for (const event of missed as SyncEvent[]) {
    try {
      // Call the event handler to render/process the event
      onEvent(event)
      
      // Mark as delivered
      await markEventDelivered(event.id)
      console.log(`[Realtime] Processed and marked delivered: ${event.id}`)
    } catch (err) {
      console.error(`[Realtime] Failed to process event ${event.id}:`, err)
      // Continue processing other events even if one fails
    }
  }

  console.log("[Realtime] Catch-up complete")
}

/**
 * Increment delivery attempt count for an event (useful for retry logic)
 */
export async function incrementDeliveryAttempts(eventId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  
  const { error } = await (supabase as any)
    .rpc("increment_delivery_attempts", { event_id: eventId })

  if (error) {
    console.error("[Realtime] Failed to increment delivery attempts:", error)
    throw error
  }
}

/**
 * Get events that need attention (high delivery attempts, not delivered)
 */
export async function getEventsNeedingAttention(maxAttempts: number = 5): Promise<SyncEvent[]> {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await (supabase as any)
    .from("sync_events")
    .select("*")
    .eq("delivered", false)
    .gte("delivery_attempts", maxAttempts)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Realtime] Failed to fetch events needing attention:", error)
    throw error
  }

  return (data || []) as SyncEvent[]
}
