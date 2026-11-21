"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Eye, Compass, Ticket, Sparkles, Plus, CheckCircle2 } from "lucide-react";
import type { Seat3D, VenueType } from "@/components/Venue3DScene";

// Load Three.js Canvas strictly on client side
const Venue3DScene = dynamic(() => import("@/components/Venue3DScene"), {
  ssr: false,
  loading: () => (
      <div className="w-full h-[540px] rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-sm text-zinc-400 font-mono">
        Initializing 3D Spatial Engine...
      </div>
  ),
});

const GATEWAY_URL = "http://localhost:8085";

interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  totalSeats: number;
  availableSeats: number;
  ticketPrice: number;
}

interface AuthSession {
  token: string;
  email: string;
  role: "USER" | "ORGANIZER";
}

interface BookingResult {
  bookingId: string;
  eventId: string;
  customerEmail: string;
  seatsBooked: number;
  totalAmount: number;
  status: string;
}

function inferVenueType(event?: EventItem): VenueType {
  if (!event) return "CINEMA";
  const text = `${event.title} ${event.venue} ${event.description}`.toLowerCase();
  if (text.includes("stadium") || text.includes("ipl") || text.includes("cricket") || text.includes("arena")) {
    return "STADIUM";
  }
  if (text.includes("auditorium") || text.includes("summit") || text.includes("devfest") || text.includes("symphony")) {
    return "AUDITORIUM";
  }
  return "CINEMA";
}

export default function SpatialTicketingPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>("");
  const [venueOverride, setVenueOverride] = useState<VenueType | null>(null);

  // Auth State
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("soham@frcrce.edu.in");
  const [password, setPassword] = useState("pass123");
  const [authError, setAuthError] = useState("");

  // 3D Seat & POV Sightline State
  const [selectedSeats, setSelectedSeats] = useState<Seat3D[]>([]);
  const [focusedSeat, setFocusedSeat] = useState<Seat3D | null>(null);
  const [povMode, setPovMode] = useState(false);

  // Booking & QR State
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking: BookingResult;
    seatLabels: string[];
  } | null>(null);

  // Organizer Create Event State
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeats, setNewSeats] = useState(120);
  const [newPrice, setNewPrice] = useState(599);

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];
  const currentVenueType: VenueType = venueOverride || inferVenueType(activeEvent);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/events`);
      if (res.ok) {
        const data: EventItem[] = await res.json();
        setEvents(data);
        if (data.length > 0 && !activeEventId) {
          setActiveEventId(data[data.length - 1].id);
        }
      }
    } catch (err) {
      console.error("Gateway unreachable:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || "Invalid credentials");
      return;
    }
    setSession(data);
  };

  const handleToggleSeat = (seat: Seat3D) => {
    setFocusedSeat(seat);
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      if (exists) {
        return prev.filter((s) => s.id !== seat.id);
      }
      return [...prev, seat];
    });
  };

  const handleConfirmBooking = async () => {
    if (!session) {
      setBookingError("Sign in first (top right) to authenticate your JWT.");
      return;
    }
    if (!activeEvent || selectedSeats.length === 0) return;

    setBookingLoading(true);
    setBookingError("");

    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          eventId: activeEvent.id,
          customerEmail: session.email,
          seats: selectedSeats.length,
        }),
      });

      if (!res.ok) {
        setBookingError(
            res.status === 409
                ? "Seat conflict! Someone just booked those seats."
                : `Gateway error (${res.status})`
        );
        return;
      }

      const booking: BookingResult = await res.json();
      const seatLabels = selectedSeats.map((s) => s.label);

      // Give RabbitMQ consumer 500ms to finish writing the QR PNG
      setTimeout(() => {
        setConfirmedBooking({ booking, seatLabels });
        setSelectedSeats([]);
        setPovMode(false);
        fetchEvents();
      }, 500);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || session.role !== "ORGANIZER") return;

    const res = await fetch(`${GATEWAY_URL}/api/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        title: newTitle,
        description: newDesc,
        venue: newVenue,
        eventDate: "2027-04-20T19:00:00",
        totalSeats: Number(newSeats),
        ticketPrice: Number(newPrice),
      }),
    });

    if (res.ok) {
      const created: EventItem = await res.json();
      setShowOrganizerModal(false);
      setNewTitle("");
      setNewVenue("");
      setNewDesc("");
      await fetchEvents();
      setActiveEventId(created.id);
      setVenueOverride(null);
    }
  };

  const totalCost = activeEvent
      ? selectedSeats.reduce(
          (acc, seat) => acc + Math.round(activeEvent.ticketPrice * seat.priceMultiplier),
          0
      )
      : 0;

  return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Top Glassmorphic Bar */}
        <nav className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-serif text-2xl tracking-tight leading-none">
                  Vanguard Spatial Tickets
                </h1>
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  3D SIGHTLINE ENGINE • GATEWAY :8085
                </p>
              </div>
            </div>

            {/* Auth Control */}
            {session ? (
                <div className="flex items-center gap-3">
                  {session.role === "ORGANIZER" && (
                      <button
                          onClick={() => setShowOrganizerModal(!showOrganizerModal)}
                          className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-medium text-xs px-3.5 py-2 rounded-lg transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Publish Event
                      </button>
                  )}
                  <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
                    <div>
                      <p className="text-xs font-medium">{session.email}</p>
                      <p className="text-[10px] font-mono text-emerald-400">
                        JWT • {session.role}
                      </p>
                    </div>
                    <button
                        onClick={() => setSession(null)}
                        className="text-xs text-zinc-400 hover:text-white underline ml-2"
                    >
                      Exit
                    </button>
                  </div>
                </div>
            ) : (
                <form onSubmit={handleLogin} className="flex flex-wrap items-center gap-2">
                  <button
                      type="button"
                      onClick={() => {
                        setEmail("soham@frcrce.edu.in");
                        setPassword("pass123");
                      }}
                      className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  >
                    User
                  </button>
                  <button
                      type="button"
                      onClick={() => {
                        setEmail("organizer@frcrce.edu.in");
                        setPassword("admin123");
                      }}
                      className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-amber-300"
                  >
                    Organizer
                  </button>
                  <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs w-44"
                  />
                  <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs w-24"
                  />
                  <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-xs px-4 py-1.5 rounded-lg transition"
                  >
                    Sign In
                  </button>
                  {authError && <span className="text-xs text-red-400">{authError}</span>}
                </form>
            )}
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Organizer Create Event Drawer */}
          {showOrganizerModal && session?.role === "ORGANIZER" && (
              <form
                  onSubmit={handleCreateEvent}
                  className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-6 gap-3"
              >
                <input
                    required
                    placeholder="Title (e.g. IMAX Interstellar)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <input
                    required
                    placeholder="Venue (Cinema / Auditorium / Stadium)"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <input
                    required
                    placeholder="Description"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
                <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-medium text-xs rounded-lg px-4 py-2"
                >
                  Create Event
                </button>
              </form>
          )}

          {/* Event Selector Strip */}
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {events.map((ev) => (
                  <button
                      key={ev.id}
                      onClick={() => {
                        setActiveEventId(ev.id);
                        setVenueOverride(null);
                        setSelectedSeats([]);
                        setFocusedSeat(null);
                        setPovMode(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-left border transition shrink-0 ${
                          activeEvent?.id === ev.id
                              ? "bg-zinc-900 border-emerald-500/60 text-white"
                              : "bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                      }`}
                  >
                    <p className="text-xs font-medium">{ev.title}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {ev.venue} • {ev.availableSeats} left
                    </p>
                  </button>
              ))}
            </div>

            {/* 3D Environment Switcher (Preview any event as Cinema, Auditorium, or Stadium) */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {(["CINEMA", "AUDITORIUM", "STADIUM"] as VenueType[]).map((type) => (
                  <button
                      key={type}
                      onClick={() => {
                        setVenueOverride(type);
                        setSelectedSeats([]);
                        setFocusedSeat(null);
                        setPovMode(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition ${
                          currentVenueType === type
                              ? "bg-zinc-800 text-emerald-400 font-medium"
                              : "text-zinc-400 hover:text-zinc-200"
                      }`}
                  >
                    {type}
                  </button>
              ))}
            </div>
          </section>

          {/* Main 3D Stage + Sightline Checkout Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Interactive 3D Viewport */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-3xl">
                    {activeEvent?.title || "Loading Event..."}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {activeEvent?.venue} — {activeEvent?.description}
                  </p>
                </div>

                {/* Camera Mode Toggle: Orbit vs First-Person Seat Sightline */}
                <div className="flex items-center gap-2">
                  <button
                      onClick={() => setPovMode(false)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
                          !povMode
                              ? "bg-zinc-100 text-zinc-950 border-white"
                              : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                      }`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Orbit Overview
                  </button>
                  <button
                      disabled={!focusedSeat}
                      onClick={() => setPovMode(true)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
                          povMode
                              ? "bg-sky-400 text-zinc-950 border-sky-300"
                              : "bg-zinc-900 text-sky-400 border-sky-500/30 hover:border-sky-400 disabled:opacity-40"
                      }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {focusedSeat
                        ? `View from Seat ${focusedSeat.label}`
                        : "Click a Seat for POV"}
                  </button>
                </div>
              </div>

              {activeEvent && (
                  <Venue3DScene
                      venueType={currentVenueType}
                      eventTitle={activeEvent.title}
                      availableSeats={activeEvent.availableSeats}
                      totalSeats={activeEvent.totalSeats}
                      selectedSeats={selectedSeats.map((s) => s.id)}
                      focusedSeat={focusedSeat}
                      povMode={povMode}
                      onToggleSeat={handleToggleSeat}
                  />
              )}
            </div>

            {/* Right Column: Live Sightline Telemetry & JWT Checkout */}
            <aside className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                Spatial Seat Telemetry
              </span>
                <h3 className="font-serif text-2xl mt-1">Your Seat Selection</h3>
              </div>

              {focusedSeat ? (
                  <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Inspecting Seat</span>
                      <span className="text-xs font-mono text-sky-400">
                    {focusedSeat.label} ({focusedSeat.section})
                  </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">3D Coordinates</span>
                      <span className="font-mono text-zinc-300">
                    X:{focusedSeat.position[0].toFixed(1)} Y:
                        {focusedSeat.position[1].toFixed(1)} Z:
                        {focusedSeat.position[2].toFixed(1)}
                  </span>
                    </div>
                    <button
                        onClick={() => setPovMode(!povMode)}
                        className="w-full mt-2 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium transition"
                    >
                      {povMode ? "Exit First-Person View" : "Step Into Seat POV"}
                    </button>
                  </div>
              ) : (
                  <p className="text-xs text-zinc-400 bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4">
                    Click any chair in the 3D {currentVenueType.toLowerCase()} to inspect its exact viewing angle and add it to your pass.
                  </p>
              )}

              {/* Selected Seats List */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Selected Seats ({selectedSeats.length})</span>
                  <span>Base: INR {activeEvent?.ticketPrice ?? 0}</span>
                </div>

                {selectedSeats.length === 0 ? (
                    <p className="text-xs font-mono text-zinc-600 py-3">
                      No seats locked yet.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSeats.map((s) => (
                          <span
                              key={s.id}
                              onClick={() => handleToggleSeat(s)}
                              className="cursor-pointer text-xs font-mono bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition"
                              title="Click to remove"
                          >
                      {s.label} • INR{" "}
                            {Math.round((activeEvent?.ticketPrice || 0) * s.priceMultiplier)}
                    </span>
                      ))}
                    </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Total Payable</span>
                <span className="text-2xl font-semibold font-mono">
                INR {totalCost}
              </span>
              </div>

              {bookingError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    {bookingError}
                  </p>
              )}

              <button
                  disabled={selectedSeats.length === 0 || bookingLoading}
                  onClick={handleConfirmBooking}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Ticket className="w-4 h-4" />
                {bookingLoading
                    ? "Reserving via Microservices..."
                    : `Confirm ${selectedSeats.length} Seat${selectedSeats.length === 1 ? "" : "s"}`}
              </button>

              {/* Live QR Ticket Pass from notification-service */}
              {confirmedBooking && (
                  <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>RabbitMQ QR Pass Ready</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400">
                      Seats: {confirmedBooking.seatLabels.join(", ")}
                    </p>
                    <div className="bg-white p-2.5 rounded-xl inline-block mx-auto">
                      <img
                          src={`${GATEWAY_URL}/api/v1/tickets/${confirmedBooking.booking.bookingId}/qr`}
                          alt="Live Ticket QR"
                          className="w-36 h-36 object-contain"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 break-all">
                      {confirmedBooking.booking.bookingId}
                    </p>
                  </div>
              )}
            </aside>
          </div>
        </main>
      </div>
  );
}