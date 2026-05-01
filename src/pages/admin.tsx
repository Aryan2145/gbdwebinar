import { useState, useEffect, FormEvent } from "react";
import Head from "next/head";
import { LogOut, RefreshCw, Users, IndianRupee, CalendarDays, Plus, ToggleLeft, ToggleRight } from "lucide-react";

type Registration = {
  id: number;
  name: string;
  company: string | null;
  designation: string | null;
  industry: string | null;
  whatsapp: string;
  email: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  payment_status: string;
  quantity: number;
  additional_names: string | null;
  created_at: string;
  session_label: string | null;
  session_date: string | null;
  session_time: string | null;
};

type Session = {
  id: number;
  label: string;
  date_str: string;
  time_str: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export default function AdminPage() {
  const [view, setView] = useState<"loading" | "login" | "dashboard">("loading");
  const [activeTab, setActiveTab] = useState<"registrations" | "sessions">("registrations");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "failed">("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  // New session form
  const [newLabel, setNewLabel] = useState("");
  const [newDatePicker, setNewDatePicker] = useState("");
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");
  const [addingSession, setAddingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const dateToWords = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  const dayName = (iso: string) => {
    if (!iso) return "";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" });
  };

  const timeOfDay = (t: string) => {
    if (!t) return "";
    const h = parseInt(t.split(":")[0], 10);
    if (h >= 5 && h < 12) return "Morning";
    if (h >= 12 && h < 17) return "Afternoon";
    if (h >= 17 && h < 20) return "Evening";
    return "Night";
  };

  const to12h = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const buildTimeStr = () => {
    if (!newTimeStart) return "";
    if (!newTimeEnd) return `${to12h(newTimeStart)} IST`;
    return `${to12h(newTimeStart)} - ${to12h(newTimeEnd)} IST`;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [regRes, sessRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/sessions"),
      ]);
      if (regRes.status === 401) { setView("login"); setRefreshing(false); return; }
      const [regData, sessData] = await Promise.all([regRes.json(), sessRes.json()]);
      setRegistrations(regData);
      setSessions(Array.isArray(sessData) ? sessData : []);
      setView("dashboard");
    } catch {
      setView("login");
    }
    setRefreshing(false);
  };

  const toggleSession = async (id: number, is_active: boolean) => {
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } catch {}
  };

  const addSession = async (e: FormEvent) => {
    e.preventDefault();
    setSessionError("");
    const time_str = buildTimeStr();
    if (!newDatePicker || !newTimeStart || !newLabel.trim()) {
      setSessionError("Date, start time, and label are required.");
      return;
    }
    const starts_at_check = new Date(`${newDatePicker}T${newTimeStart}:00+05:30`);
    if (starts_at_check < new Date()) {
      setSessionError("Start time is in the past. Please choose a future date and time.");
      return;
    }
    const date_str = dateToWords(newDatePicker);
    const label = newLabel.trim();
    const starts_at = newTimeStart ? `${newDatePicker}T${newTimeStart}:00+05:30` : null;
    const ends_at = newTimeEnd ? `${newDatePicker}T${newTimeEnd}:00+05:30` : null;
    setAddingSession(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, date_str, time_str, starts_at, ends_at }),
      });
      if (res.ok) {
        const created = await res.json();
        setSessions((prev) => [...prev, created]);
        setNewLabel(""); setNewDatePicker(""); setNewTimeStart(""); setNewTimeEnd("");
      } else {
        setSessionError("Failed to add session.");
      }
    } catch {
      setSessionError("Network error.");
    }
    setAddingSession(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoginLoading(false);
    if (!res.ok) { setLoginError("Invalid password. Try again."); return; }
    await fetchData();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setView("login");
    setRegistrations([]);
    setPassword("");
  };

  const paidRegistrations = registrations.filter((r) => r.payment_status === "paid");
  const failedRegistrations = registrations.filter((r) => r.payment_status === "failed");
  const paidWhatsapps = new Set(paidRegistrations.map((r) => r.whatsapp));
  const trulyLostRegistrations = failedRegistrations.filter((r) => !paidWhatsapps.has(r.whatsapp));
  const totalRevenue = paidRegistrations.reduce((sum, r) => sum + r.amount, 0) / 100;
  const lostRevenue = trulyLostRegistrations.reduce((sum, r) => sum + r.amount, 0) / 100;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0D3535] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <>
        <Head><title>Admin Login — RGB India</title></Head>
        <div className="min-h-screen bg-[#0D3535] flex items-center justify-center px-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>

          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <p style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-2xl font-bold text-white">RGB <span className="text-[#C8A043]">India</span></p>
              <p className="text-white/50 text-sm mt-1">Admin Access</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-lg font-bold text-[#0D3535] mb-5">Sign in to Dashboard</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  className="w-full px-4 py-3 rounded-xl border border-[#D5D2CB] focus:ring-2 focus:ring-[#C8A043] focus:border-[#C8A043] outline-none text-sm"
                />
                {loginError && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-[#0D3535] text-white rounded-xl font-bold text-sm hover:bg-[#0D3535]/90 transition-all disabled:opacity-60"
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Admin Dashboard — RGB India</title></Head>
      <div className="min-h-screen bg-[#F8F7F4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div className="bg-[#0D3535] px-4 pt-4 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-white font-bold text-lg">
                  RGB <span className="text-[#C8A043]">India</span> — Admin
                </p>
                <p className="text-white/50 text-xs mt-0.5">Webinar Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1">
              {(["registrations", "sessions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? "bg-[#F8F7F4] text-[#0D3535]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab === "registrations" ? (
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Registrations</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Sessions</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">

          {activeTab === "registrations" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Total</p>
                  <p className="text-3xl font-bold text-[#0D3535]">{registrations.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Paid</p>
                  <p className="text-3xl font-bold text-green-600">{paidRegistrations.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-500">{failedRegistrations.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Revenue</p>
                  <p className="text-3xl font-bold text-[#C8A043]">₹{totalRevenue.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Lost Revenue</p>
                  <p className="text-3xl font-bold text-red-400">₹{lostRevenue.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, company, designation, industry or WhatsApp..."
                  className="w-full px-4 py-2.5 pl-10 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043] bg-white text-[#0D3535]"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043] bg-white text-[#0D3535]"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  value={filterSession}
                  onChange={(e) => setFilterSession(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043] bg-white text-[#0D3535]"
                >
                  <option value="all">All Sessions</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.label}>{s.label} — {s.date_str}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#D5D2CB] bg-white focus-within:ring-2 focus-within:ring-[#C8A043]">
                  <span className="text-xs text-gray-600 whitespace-nowrap font-medium">Registered on</span>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="text-sm outline-none text-[#0D3535] bg-transparent"
                  />
                </div>
                {(search || filterStatus !== "all" || filterSession !== "all" || filterDate) && (
                  <button
                    onClick={() => { setSearch(""); setFilterStatus("all"); setFilterSession("all"); setFilterDate(""); }}
                    className="px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors bg-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Registrations Table */}
              <div className="bg-white rounded-2xl border border-[#D5D2CB] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#F0EEE9] flex items-center justify-between">
                  <h2 className="font-bold text-[#0D3535] text-sm">All Registrations</h2>
                  <span className="text-xs text-gray-400">
                    {registrations.filter((r) => {
                      const q = search.trim().toLowerCase();
                      if (filterStatus !== "all" && r.payment_status !== filterStatus) return false;
                      if (filterSession !== "all" && r.session_label !== filterSession) return false;
                      if (filterDate) { const d = new Date(r.created_at).toISOString().split("T")[0]; if (d !== filterDate) return false; }
                      if (q) { const h = [r.name, r.company, r.designation, r.industry, r.whatsapp].join(" ").toLowerCase(); if (!h.includes(q)) return false; }
                      return true;
                    }).length} shown · {registrations.length} total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0D3535]">
                      <tr>
                        {["#", "Name", "Company", "Designation", "Industry", "WhatsApp", "Email", "Session", "Status", "Payment ID", "Date"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8F7F4]">
                      {(() => {
                        const q = search.trim().toLowerCase();
                        const highlight = (text: string | null) => {
                          if (!text) return <span>—</span>;
                          if (!q) return <span>{text}</span>;
                          const idx = text.toLowerCase().indexOf(q);
                          if (idx === -1) return <span>{text}</span>;
                          return (
                            <span>
                              {text.slice(0, idx)}
                              <mark className="bg-[#C8A043]/30 text-[#0D3535] rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
                              {text.slice(idx + q.length)}
                            </span>
                          );
                        };
                        const filtered = registrations.filter((r) => {
                          if (filterStatus !== "all" && r.payment_status !== filterStatus) return false;
                          if (filterSession !== "all" && r.session_label !== filterSession) return false;
                          if (filterDate) {
                            const regDate = new Date(r.created_at).toISOString().split("T")[0];
                            if (regDate !== filterDate) return false;
                          }
                          if (q) {
                            const haystack = [r.name, r.company, r.designation, r.industry, r.whatsapp].join(" ").toLowerCase();
                            if (!haystack.includes(q)) return false;
                          }
                          return true;
                        });
                        if (filtered.length === 0) return (
                          <tr>
                            <td colSpan={11} className="px-4 py-12 text-center text-gray-400 text-sm">
                              No registrations match the selected filters
                            </td>
                          </tr>
                        );
                        return filtered.map((r, i) => (
                          <tr key={r.id} className="hover:bg-[#FAFAF8] transition-colors text-sm text-[#0D3535]">
                            <td className="px-4 py-3">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{highlight(r.name)}</span>
                                {r.quantity > 1 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#0D3535]/10 text-[#0D3535] font-bold shrink-0">×{r.quantity}</span>
                                )}
                              </div>
                              {r.additional_names && (() => {
                                try {
                                  const names: string[] = JSON.parse(r.additional_names);
                                  return <p className="text-xs text-gray-400 mt-0.5">{names.join(", ")}</p>;
                                } catch { return null; }
                              })()}
                            </td>
                            <td className="px-4 py-3">{highlight(r.company)}</td>
                            <td className="px-4 py-3">{highlight(r.designation)}</td>
                            <td className="px-4 py-3">{highlight(r.industry)}</td>
                            <td className="px-4 py-3">
                              <a href={`tel:${r.whatsapp}`} className="hover:text-[#C8A043] transition-colors">
                                {highlight(r.whatsapp)}
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              <a href={`mailto:${r.email}`} className="hover:text-[#C8A043] transition-colors">
                                {r.email}
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              {r.session_label ? (
                                <div>
                                  <p className="font-semibold">{r.session_label}</p>
                                  <p className="text-xs mt-0.5">{r.session_date}</p>
                                </div>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                r.payment_status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}>
                                {r.payment_status === "paid" ? "Paid" : "Failed"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">{r.razorpay_payment_id || "—"}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "sessions" && (
            <div className="space-y-6">
              {/* Add Session */}
              <div className="bg-white rounded-2xl border border-[#D5D2CB] p-6 shadow-sm">
                <h2 className="font-bold text-[#0D3535] text-sm mb-4">Add New Session</h2>
                <form onSubmit={addSession} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={newDatePicker}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDatePicker(val);
                        if (val && newTimeStart) {
                          setNewLabel(`${dayName(val)} ${timeOfDay(newTimeStart)}`);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043]"
                    />
                    {newDatePicker && (
                      <p className="text-xs text-[#0D3535] mt-1 font-medium">{dateToWords(newDatePicker)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Start Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={newTimeStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTimeStart(val);
                        if (val) {
                          const [h, m] = val.split(":").map(Number);
                          const end = new Date(0, 0, 0, h, m + 60);
                          setNewTimeEnd(`${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`);
                          const day = newDatePicker ? dayName(newDatePicker) : "";
                          setNewLabel(`${day}${day ? " " : ""}${timeOfDay(val)}`);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043]"
                    />
                    {newTimeStart && (
                      <p className="text-xs text-[#0D3535] mt-1 font-medium">{to12h(newTimeStart)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      End Time <span className="text-gray-300">(optional)</span>
                    </label>
                    <input
                      type="time"
                      value={newTimeEnd}
                      onChange={(e) => setNewTimeEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043]"
                    />
                    {newTimeEnd && (
                      <p className="text-xs text-[#0D3535] mt-1 font-medium">{to12h(newTimeEnd)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Label <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Sunday Morning"
                      className="w-full px-3 py-2 rounded-xl border border-[#D5D2CB] text-sm outline-none focus:ring-2 focus:ring-[#C8A043]"
                    />
                  </div>
                  {(newDatePicker || newTimeStart) && (
                    <div className="sm:col-span-2 lg:col-span-4 px-4 py-3 bg-[#F8F7F4] rounded-xl border border-[#D5D2CB] text-sm text-[#0D3535]">
                      <span className="font-bold">Preview: </span>
                      {[newLabel.trim(), dateToWords(newDatePicker), buildTimeStr()].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {sessionError && (
                    <p className="sm:col-span-2 lg:col-span-4 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {sessionError}
                    </p>
                  )}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <button
                      type="submit"
                      disabled={addingSession}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#0D3535] text-white rounded-xl font-semibold text-sm hover:bg-[#0D3535]/90 transition-all disabled:opacity-60"
                    >
                      <Plus className="w-4 h-4" /> {addingSession ? "Adding..." : "Add Session"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Sessions List */}
              <div className="bg-white rounded-2xl border border-[#D5D2CB] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#F0EEE9]">
                  <h2 className="font-bold text-[#0D3535] text-sm">All Sessions</h2>
                </div>
                {sessions.length === 0 ? (
                  <p className="px-5 py-10 text-center text-gray-400 text-sm">No sessions yet</p>
                ) : (
                  <div className="divide-y divide-[#F8F7F4]">
                    {sessions.map((s) => {
                      const expired = s.ends_at ? new Date(s.ends_at) < new Date() : false;
                      return (
                        <div key={s.id} className={`px-5 py-4 flex items-center justify-between ${expired ? "opacity-50" : ""}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#0D3535] text-sm">{s.label}</p>
                              {expired && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Expired</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{s.date_str} · {s.time_str}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {registrations.filter((r) => r.session_label === s.label).length} registrations
                            </p>
                          </div>
                          <button
                            onClick={() => toggleSession(s.id, !s.is_active)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              s.is_active && !expired
                                ? "bg-[#0D3535]/10 text-[#0D3535] hover:bg-red-50 hover:text-red-600"
                                : "bg-gray-100 text-gray-400 hover:bg-[#0D3535]/10 hover:text-[#0D3535]"
                            }`}
                          >
                            {s.is_active && !expired ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {s.is_active && !expired ? "Active" : "Inactive"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
