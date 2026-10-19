import { useEffect, useState } from "react";
import Login from "./Login.jsx";
import {
  LayoutDashboard,
  Phone,
  CalendarDays,
  Bot,
  Menu,
  Bell,
  Search,
  PhoneCall,
  PhoneMissed,
  Clock,
  TrendingUp,
  MoreHorizontal,
  LogOut,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Call History", icon: Phone },
  { name: "Bookings", icon: CalendarDays },
  { name: "AI Agent Settings", icon: Bot },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const parts = token.split(".");
      if (parts.length < 2) return false;
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const parts = token.split(".");
      if (parts.length < 2) return;

      const payload = JSON.parse(atob(parts[1]));
      const remainingTime = payload.exp * 1000 - Date.now();

      const timer = setTimeout(handleLogout, Math.max(0, remainingTime));
      return () => clearTimeout(timer);
    } catch {
      // Ignore token parse failure in effect
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

function Dashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [agentEnabled, setAgentEnabled] = useState(true);

  const [retellAgentStatus, setRetellAgentStatus] = useState(null);
  const [retellStatusLoading, setRetellStatusLoading] = useState(true);

  const [averageCallTime, setAverageCallTime] = useState(null);
  const [answerRate, setAnswerRate] = useState(null);
  const [answerRateLoading, setAnswerRateLoading] = useState(true);

  const [customerSatisfaction, setCustomerSatisfaction] = useState(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [satisfactionLoading, setSatisfactionLoading] = useState(true);

  const [callRecords, setCallRecords] = useState([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [callsError, setCallsError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");

  const [dashboardStats, setDashboardStats] = useState({
    totalCalls: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [callActivity, setCallActivity] = useState([]);

  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    return "evening";
  });

  // Fetch Retell agent status
  const fetchRetellAgentStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/retell/agent-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setRetellAgentStatus(data.agent);
      }
    } catch (error) {
      console.error("Failed to fetch Retell agent status:", error);
    } finally {
      setRetellStatusLoading(false);
    }
  };

  // Fetch average call time
  const fetchAverageCallTime = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/dashboard/average-call-time`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAverageCallTime(data.averageCallTimeSeconds);
      }
    } catch (error) {
      console.error("Failed to fetch average call time:", error);
    }
  };

  // Fetch answer rate
  const fetchAnswerRate = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/dashboard/answer-rate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAnswerRate(data.answerRate);
      }
    } catch (error) {
      console.error("Failed to fetch answer rate:", error);
    } finally {
      setAnswerRateLoading(false);
    }
  };

  // Fetch customer satisfaction
  const fetchCustomerSatisfaction = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/dashboard/customer-satisfaction`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCustomerSatisfaction(data.satisfactionScore);
        setTotalRatings(data.totalRatings);
        setAverageRating(data.averageRating);
      }
    } catch (error) {
      console.error("Failed to fetch customer satisfaction:", error);
    } finally {
      setSatisfactionLoading(false);
    }
  };

  // Fetch call activity
  const fetchCallActivity = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/dashboard/call-activity`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        setCallActivity(data.activity || []);
      }
    } catch (error) {
      console.error("Failed to load call activity:", error);
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        setDashboardStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load dashboard statistics:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      setBookingsError("");

      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Could not load bookings");
      }

      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Bookings fetch failed:", error);
      setBookingsError(
        error instanceof Error ? error.message : "Could not refresh bookings."
      );
    } finally {
      setBookingsLoading(false);
    }
  };

  // Fetch calls
  const fetchCalls = async () => {
    try {
      setCallsLoading(true);
      setCallsError("");

      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/calls`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch calls");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Could not load calls");
      }

      setCallRecords(data.calls || []);
    } catch (error) {
      console.error("Calls fetch failed:", error);
      setCallsError("Could not load call history. Check your backend.");
    } finally {
      setCallsLoading(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId, status) => {
    try {
      setBookingsError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update booking");
      }

      setBookings((previousBookings) =>
        previousBookings.map((booking) =>
          booking._id === bookingId
            ? { ...booking, status: data.booking.status }
            : booking
        )
      );
    } catch (error) {
      setBookingsError(error.message || "Failed to update booking");
    }
  };

  // Run all fetches on Dashboard mount
  useEffect(() => {
    fetchRetellAgentStatus();
    fetchAverageCallTime();
    fetchAnswerRate();
    fetchCustomerSatisfaction();
    fetchCallActivity();
    fetchDashboardStats();
    fetchBookings();
    fetchCalls();
  }, []);

  const calls = callRecords
    .map((call, idx) => ({
      id: call._id || call.callId || `call-${idx}`,
      name: call.callerNumber || "Unknown caller",
      number: call.callerNumber || "Number unavailable",
      time: call.startTime
        ? new Date(call.startTime).toLocaleString("en-IN")
        : "Time unavailable",
      duration: `${Math.floor((call.duration || 0) / 60)}m ${
        (call.duration || 0) % 60
      }s`,
      status: call.callStatus || "unknown",
      summary: call.summary || "",
      transcript: call.transcript || "",
      customerRating: call.customerRating ?? null,
      customerFeedback: call.customerFeedback || "",
    }))
    .filter((call) =>
      `${call.name} ${call.number} ${call.summary}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "VD";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside
        className={`${
          sidebarOpen ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-5 md:block`}
      >
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
            <PhoneCall size={23} />
          </div>
          <div>
            <h1 className="font-bold">VoiceDesk AI</h1>
            <p className="text-xs text-slate-500">Receptionist platform</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>
        <nav className="space-y-2">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => {
                setActivePage(name);
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activePage === name
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={19} />
              {name}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-slate-900 p-4 text-white">
          <Bot size={24} className="mb-3 text-indigo-300" />
          <p className="font-semibold">Your AI receptionist</p>
          <p className="mt-1 text-xs text-slate-300">
            Ready to help manage calls.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                agentEnabled ? "bg-green-400" : "bg-slate-400"
              }`}
            />
            {agentEnabled ? "Agent enabled" : "Agent paused"}
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
        />
      )}

      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={23} />
            </button>
            <div>
              <p className="text-sm text-slate-500">
                Workspace / {activePage}
              </p>
              <h2 className="text-lg font-bold">{activePage}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Notifications"
              className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
            >
              <Bell size={19} />
            </button>

            <div
              title={user?.name || user?.email || "VoiceDesk User"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700"
            >
              {initials}
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="Log out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        <div className="p-5 md:p-8">
          {activePage === "Dashboard" && (
            <>
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    Good {greeting}
                    {user?.name ? `, ${user.name}` : ""}!
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Here's what's happening with your receptionist.
                  </p>
                </div>
                <button
                  onClick={() => setActivePage("Call History")}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <span className="flex items-center gap-2">
                    <PhoneCall size={17} /> View all calls
                  </span>
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total Calls",
                    value: statsLoading
                      ? "..."
                      : String(dashboardStats.totalCalls),
                    change: "Live data",
                    icon: PhoneCall,
                    color: "bg-indigo-50 text-indigo-600",
                  },
                  {
                    label: "Confirmed Bookings",
                    value: statsLoading
                      ? "..."
                      : String(dashboardStats.confirmedBookings),
                    change: "Live data",
                    icon: CalendarDays,
                    color: "bg-green-50 text-green-600",
                  },
                  {
                    label: "Pending Bookings",
                    value: statsLoading
                      ? "..."
                      : String(dashboardStats.pendingBookings),
                    change: "Live data",
                    icon: PhoneMissed,
                    color: "bg-orange-50 text-orange-600",
                  },
                  {
                    label: "Bookings Made",
                    value: statsLoading
                      ? "..."
                      : String(dashboardStats.totalBookings),
                    change: "Live data",
                    icon: CalendarDays,
                    color: "bg-purple-50 text-purple-600",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          {item.label}
                        </span>
                        <span className={`rounded-xl p-2.5 ${item.color}`}>
                          <Icon size={20} />
                        </span>
                      </div>
                      <p className="mt-4 text-3xl font-bold">{item.value}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp size={14} /> {item.change}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 grid gap-6 xl:grid-cols-3">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Call activity</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Live call volume from MongoDB
                      </p>
                    </div>
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                      This week
                    </button>
                  </div>
                  <div className="flex h-56 items-end justify-around gap-3 border-b border-slate-100 px-2">
                    {callActivity.map((item, idx) => (
                      <div
                        key={`${item.day}-${idx}`}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                      >
                        <div
                          title={`${item.calls} calls`}
                          className="w-full max-w-12 rounded-t-lg bg-indigo-500 transition hover:bg-indigo-700"
                          style={{
                            height: `${Math.max(
                              item.calls > 0 ? 12 : 0,
                              Math.min(item.calls * 20, 100)
                            )}%`,
                          }}
                        />
                        <span className="pb-2 text-xs text-slate-500">
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="font-bold">AI receptionist status</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Retell AI agent connection
                  </p>
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold">Receptionist</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {retellStatusLoading
                          ? "Checking Retell..."
                          : retellAgentStatus
                          ? `Connected: ${retellAgentStatus.name}`
                          : "Unable to connect to Retell"}
                      </p>
                    </div>
                    <button
                      disabled
                      aria-pressed={agentEnabled}
                      className={`relative h-7 w-12 rounded-full transition ${
                        agentEnabled ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                          agentEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Answer rate</span>
                      <b>
                        {answerRateLoading
                          ? "Loading..."
                          : answerRate === null
                          ? "N/A"
                          : `${answerRate}%`}
                      </b>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${answerRate ?? 0}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Average call time</span>
                      <b>
                        {averageCallTime === null
                          ? "Loading..."
                          : `${Math.floor(averageCallTime / 60)}m ${
                              averageCallTime % 60
                            }s`}
                      </b>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Average rating</span>
                      <b className="text-slate-800">
                        {satisfactionLoading
                          ? "Loading..."
                          : averageRating === null
                          ? "N/A"
                          : `${averageRating.toFixed(1)} / 5 ⭐`}
                      </b>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Customer satisfaction
                      </span>
                      <b>
                        {satisfactionLoading
                          ? "Loading..."
                          : customerSatisfaction === null
                          ? "N/A"
                          : `${customerSatisfaction}% (${totalRatings} ${
                              totalRatings === 1 ? "response" : "responses"
                            })`}
                      </b>
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Recent calls</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest customer interactions
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePage("Call History")}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View all
                  </button>
                </div>
                <CallTable calls={calls.slice(0, 3)} />
              </section>
            </>
          )}

          {activePage === "Bookings" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold">Bookings</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Reservations retrieved from your database.
                  </p>
                </div>

                <button
                  onClick={fetchBookings}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {bookingsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading bookings...
                </p>
              ) : bookingsError ? (
                <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {bookingsError}
                </div>
              ) : bookings.length === 0 ? (
                <p className="py-10 text-center text-slate-500">
                  No bookings found.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {bookings.map((booking, idx) => (
                    <div
                      key={booking._id || `booking-${idx}`}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                          <CalendarDays size={20} />
                        </div>

                        <div>
                          <p className="font-semibold">
                            {booking.customerName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {booking.phone}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Table for {booking.partySize}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {booking.bookingDate
                              ? new Date(booking.bookingDate).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    timeZone: "UTC",
                                  }
                                )
                              : "Date unavailable"}
                            {" · "}
                            {booking.bookingTime}
                          </p>
                          {booking.specialRequests && (
                            <p className="mt-1 text-xs text-slate-500">
                              Request: {booking.specialRequests}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            booking.status === "confirmed"
                              ? "bg-green-50 text-green-700"
                              : booking.status === "cancelled"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {booking.status}
                        </span>

                        {booking.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                updateBookingStatus(booking._id, "confirmed")
                              }
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() =>
                                updateBookingStatus(booking._id, "cancelled")
                              }
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 text-xs text-slate-400">
                These records are fetched from your Express API and MongoDB.
              </p>
            </section>
          )}

          {activePage === "Call History" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold">Call History</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Real calls retrieved from MongoDB.
                  </p>
                </div>

                <button
                  onClick={fetchCalls}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by caller, number or summary..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>

              {callsLoading ? (
                <p className="py-8 text-center text-slate-500">
                  Loading calls...
                </p>
              ) : callsError ? (
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {callsError}
                </p>
              ) : calls.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No calls found.
                </p>
              ) : (
                <CallTable calls={calls} />
              )}
            </section>
          )}

          {activePage === "AI Agent Settings" && (
            <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold">AI Agent Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your receptionist demo configuration.
              </p>
              <div className="mt-6 flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="font-semibold">Enable receptionist</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Toggle the demo agent status.
                  </p>
                </div>
                <button
                  onClick={() => setAgentEnabled(!agentEnabled)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    agentEnabled
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {agentEnabled ? "Enabled" : "Paused"}
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold">
                  Agent name
                </label>
                <input
                  defaultValue="VoiceDesk Receptionist"
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold">
                  Greeting message
                </label>
                <textarea
                  defaultValue="Hello! Thank you for calling. How may I help you today?"
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function CallTable({ calls }) {
  const [selectedCall, setSelectedCall] = useState(null);

  if (calls.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No matching calls found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-3 pr-4 font-medium">Caller</th>
            <th className="pb-3 pr-4 font-medium">Time</th>
            <th className="pb-3 pr-4 font-medium">Duration</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call, idx) => (
            <tr
              key={call.id || `${call.number}-${idx}`}
              className="border-b border-slate-50 last:border-0"
            >
              <td className="py-4 pr-4">
                <p className="font-semibold">{call.name}</p>
                <p className="mt-1 text-xs text-slate-400">{call.number}</p>
              </td>

              <td className="whitespace-nowrap py-4 pr-4 text-slate-500">
                {call.time}
              </td>

              <td className="whitespace-nowrap py-4 pr-4 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  {call.duration}
                </span>
              </td>

              <td className="py-4 pr-4">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                    call.status === "ended" || call.status === "Completed"
                      ? "bg-green-50 text-green-700"
                      : call.status === "in_progress" ||
                        call.status === "In Progress"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {call.status === "ended"
                    ? "Completed"
                    : call.status === "in_progress"
                    ? "In Progress"
                    : call.status}
                </span>
              </td>

              <td className="py-4">
                <button
                  aria-label={`More details for ${call.name}`}
                  onClick={() => setSelectedCall(call)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCall && (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Call Details
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedCall.number}
              </p>
            </div>

            <button
              onClick={() => setSelectedCall(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-5">
            <h4 className="font-semibold text-slate-700">AI Summary</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {selectedCall.summary || "No summary available for this call."}
            </p>
          </div>

          <div className="mt-5">
            <h4 className="font-semibold text-slate-700">Customer Feedback</h4>
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">
                Rating:{" "}
                {selectedCall.customerRating != null
                  ? `${selectedCall.customerRating}/5 ⭐`
                  : "No rating submitted yet"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {selectedCall.customerFeedback ||
                  "No customer comments available."}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="font-semibold text-slate-700">Transcript</h4>
            <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              {selectedCall.transcript ||
                "No transcript available for this call."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
