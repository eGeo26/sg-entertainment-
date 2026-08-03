"use client"
// app/(admin)/admin/notifications/page.tsx

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  subscribeToBookingEvents,
  markEventDelivered,
  catchUpMissedEvents,
  type SyncEvent,
} from "@/lib/realtimeBookings"

interface WebhookEvent {
  id: string
  source: string
  eventId: string
  eventType: string
  bookingRef: string | null
  processedAt: string
  payload: Record<string, unknown>
}

export default function NotificationsWebhookPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)

  // Realtime subscription refs
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const isMountedRef = useRef(true)

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/notifications")
      if (!res.ok) throw new Error("Failed to load notifications log")
      const data = await res.json()
      setEvents(data.events)
    } catch (err) {
      console.error(err)
      toast.error("Could not fetch webhook integration logs")
    } finally {
      setLoading(false)
    }
  }

  // Handle sync events from realtime subscription
  const handleSyncEvent = async (event: SyncEvent) => {
    console.log("[Notifications] Received sync event:", event.event_type, event.booking_code)
    
    // Refresh events when we receive a webhook event
    if (event.event_type === "webhook_received" || event.event_type === "transaction.success") {
      await fetchEvents()
      
      // Show toast notification for new webhooks
      if (event.event_type === "webhook_received") {
        const payload = event.payload as any
        toast.success(`New webhook: ${payload?.Data?.Status || "Unknown status"}`)
      } else if (event.event_type === "transaction.success") {
        toast.success(`Payment confirmed: ${event.booking_code}`)
      }
    }

    // Mark event as delivered
    try {
      await markEventDelivered(event.id)
    } catch (err) {
      console.error("[Notifications] Failed to mark event as delivered:", err)
    }
  }

  useEffect(() => {
    fetchEvents()

    // Subscribe to realtime webhook events
    async function setupRealtime() {
      // Clean up any existing subscription before creating a new one
      if (unsubscribeRef.current) {
        console.log("[Notifications] Cleaning up previous subscription before creating new one")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // First, catch up on any missed events
      try {
        await catchUpMissedEvents(handleSyncEvent)
      } catch (err) {
        console.error("[Notifications] Failed to catch up on missed events:", err)
      }

      // Only subscribe if component is still mounted
      if (isMountedRef.current) {
        unsubscribeRef.current = subscribeToBookingEvents(handleSyncEvent)
      }
    }

    setupRealtime()

    return () => {
      console.log("[Notifications] Component unmounting, cleaning up subscription")
      isMountedRef.current = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  const filteredEvents = events.filter(
    (e) =>
      e.eventType.toLowerCase().includes(search.toLowerCase()) ||
      e.eventId.toLowerCase().includes(search.toLowerCase()) ||
      (e.bookingRef && e.bookingRef.toLowerCase().includes(search.toLowerCase())) ||
      e.source.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Integration Logs</h1>
        <p className="text-xs text-white/40 mt-1.5">
          Inspect webhook payloads from Hubtel to audit system automation
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event, ID, source, or reference..."
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2.5 pl-9 text-white text-xs focus:outline-none focus:border-white/50"
          />
          <svg
            className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Events Log List */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-medium tracking-wider text-white/40 uppercase bg-white/[0.01]">
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Event ID</th>
                <th className="px-6 py-4">Booking Reference</th>
                <th className="px-6 py-4">Processed Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-3.5 bg-white/10 rounded w-5/6" />
                    </td>
                  </tr>
                ))
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-semibold">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase ${
                          e.source === "hubtel"
                            ? "bg-[#3AC6F4]/10 text-[#3AC6F4]"
                            : e.source === "meta" || e.source === "whatsapp"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {e.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white/85">
                      {e.eventType}
                    </td>
                    <td className="px-6 py-4 font-mono text-white/50 text-[11px]">
                      {e.eventId}
                    </td>
                    <td className="px-6 py-4 font-mono text-white/50 text-[11px]">
                      {e.bookingRef ?? <span className="text-white/20 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-white/60">
                      {formatDate(e.processedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/5 rounded-lg font-semibold transition-all"
                      >
                        View Payload
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/30 text-sm">
                    No integration events logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-white uppercase flex items-center gap-2">
                  <span>Webhook Payload:</span>
                  <span className="text-xs font-mono font-normal text-white/40">{selectedEvent.eventType}</span>
                </h3>
                <p className="text-[10px] text-white/30 font-mono mt-0.5">Log ID: {selectedEvent.id}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-black/30 font-mono text-xs text-white/80 leading-relaxed flex-1">
              <pre className="whitespace-pre-wrap select-all">
                {JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>

            <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01] shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedEvent.payload, null, 2))
                  toast.success("Payload copied to clipboard")
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl uppercase tracking-wider transition-all"
              >
                Copy Payload
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 font-semibold rounded-xl uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
