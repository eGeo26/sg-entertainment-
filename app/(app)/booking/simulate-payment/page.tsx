"use client"
// app/(app)/booking/simulate-payment/page.tsx

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

function SimulatePaymentContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bookingId = params.get("booking_id")
  const reference = params.get("reference")

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo")
  
  // MoMo form
  const [momoProvider, setMomoProvider] = useState("MTN")
  const [momoPhone, setMomoPhone] = useState("")
  
  // Card form
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  useEffect(() => {
    if (!bookingId) {
      toast.error("Invalid checkout session. Redirecting...")
      router.push("/booking")
      return
    }

    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`)
        if (!res.ok) throw new Error("Booking not found")
        const data = await res.json()
        setBooking(data)
        setMomoPhone(data.customerPhone || "")
      } catch (err) {
        console.error(err)
        toast.error("Could not retrieve checkout details")
        router.push("/booking")
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [bookingId, router])

  const handleSimulate = async (action: "SUCCESS" | "FAILED") => {
    setProcessing(true)
    toast.loading(action === "SUCCESS" ? "Authorizing transaction..." : "Cancelling checkout...", { id: "sim-toast" })
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      const res = await fetch("/api/bookings/simulate-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action }),
      })

      if (!res.ok) throw new Error("Callback processing failed")

      if (action === "SUCCESS") {
        toast.success("Payment authorized successfully!", { id: "sim-toast" })
        router.push(`/booking/success?reference=${reference}&booking_id=${bookingId}&simulated=true`)
      } else {
        toast.error("Transaction declined by cardholder / provider.", { id: "sim-toast" })
        router.push(`/booking/payment-failed?reference=${reference}`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Simulation error. Please try again.", { id: "sim-toast" })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm tracking-wider uppercase font-medium">Spawning payment gateway...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <span className="inline-block bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Sandbox Mode
        </span>
        <h1 className="text-xl font-bold text-white uppercase tracking-tight">S&amp;G Hubtel Secure Payment</h1>
        <p className="text-xs text-white/40 mt-1">Simulated Gateway for Hubtel Payments</p>
      </div>

      <div className="card bg-black/45 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        {/* Invoice Summary */}
        <div className="p-5 border-b border-white/5 bg-white/[0.01]">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total Amount</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                GHS {(booking?.amountGHS ?? 0).toFixed(2)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Ref ID</p>
              <p className="font-mono text-white/60 text-xs mt-0.5">{reference?.slice(0, 12) ?? "MOCK-REF"}</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-white/65 border-t border-white/5 pt-2">
            <span className="text-white/40 font-semibold uppercase text-[9px] tracking-wider block">Customer</span>
            {booking?.customerName || ""} ({booking?.customerEmail || ""})
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 border-b border-white/5 bg-white/[0.02]">
          <button
            onClick={() => setPaymentMethod("momo")}
            className={`py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              paymentMethod === "momo"
                ? "text-white border-white bg-white/5"
                : "text-white/45 border-transparent hover:text-white/70"
            }`}
          >
            Mobile Money
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={`py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              paymentMethod === "card"
                ? "text-white border-white bg-white/5"
                : "text-white/45 border-transparent hover:text-white/70"
            }`}
          >
            Credit/Debit Card
          </button>
        </div>

        <div className="p-5 space-y-4">
          {paymentMethod === "momo" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase tracking-wide">Network Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {["MTN", "Telecel", "AT"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMomoProvider(p)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        momoProvider === p
                          ? "bg-white/10 border-white/40 text-white"
                          : "bg-white/5 border-white/8 text-white/65 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase tracking-wide">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase tracking-wide">MoMo Wallet Pin (Optional)</label>
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase tracking-wide">Card Number</label>
                <input
                  type="text"
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/45 uppercase tracking-wide">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/45 uppercase tracking-wide">CVV</label>
                  <input
                    type="password"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-4 space-y-2.5">
            <button
              onClick={() => handleSimulate("SUCCESS")}
              disabled={processing}
              className="w-full flex items-center justify-center font-bold px-4 py-3 bg-studio-gold text-black hover:bg-studio-gold/90 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 select-none"
            >
              {processing ? "Authorizing..." : "Simulate Payment Success"}
            </button>

            <button
              onClick={() => handleSimulate("FAILED")}
              disabled={processing}
              className="w-full flex items-center justify-center font-semibold px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              Simulate Decline/Failure
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SimulatePaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm tracking-wider uppercase font-medium">Booting Sandbox...</p>
      </div>
    }>
      <SimulatePaymentContent />
    </Suspense>
  )
}
