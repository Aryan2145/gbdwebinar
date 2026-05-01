import { useState, useEffect, FormEvent } from "react";
import Head from "next/head";
import { LogOut, RefreshCw, Users, IndianRupee } from "lucide-react";

type Registration = {
  id: number;
  name: string;
  company: string | null;
  whatsapp: string;
  email: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  created_at: string;
};

export default function AdminPage() {
  const [view, setView] = useState<"loading" | "login" | "dashboard">("loading");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/registrations");
      if (res.status === 401) { setView("login"); setRefreshing(false); return; }
      const data = await res.json();
      setRegistrations(data);
      setView("dashboard");
    } catch {
      setView("login");
    }
    setRefreshing(false);
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

  const totalRevenue = registrations.reduce((sum, r) => sum + r.amount, 0) / 100;

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
        <div className="bg-[#0D3535] px-4 py-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-white font-bold text-lg">
                RGB <span className="text-[#C8A043]">India</span> — Admin
              </p>
              <p className="text-white/50 text-xs mt-0.5">Webinar Registrations</p>
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
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0D3535]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0D3535]" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Registrations</p>
                <p className="text-3xl font-bold text-[#0D3535]">{registrations.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#D5D2CB] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#C8A043]/15 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-[#C8A043]" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Revenue</p>
                <p className="text-3xl font-bold text-[#C8A043]">₹{totalRevenue.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#D5D2CB] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#F0EEE9] flex items-center justify-between">
              <h2 className="font-bold text-[#0D3535] text-sm">All Registrations</h2>
              <span className="text-xs text-gray-400">{registrations.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F7F4]">
                  <tr>
                    {["#", "Name", "Company", "WhatsApp", "Email", "Payment ID", "Date"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-[#F0EEE9]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8F7F4]">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No registrations yet
                      </td>
                    </tr>
                  ) : (
                    registrations.map((r, i) => (
                      <tr key={r.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-[#0D3535]">{r.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.company || "—"}</td>
                        <td className="px-4 py-3">
                          <a href={`tel:${r.whatsapp}`} className="text-[#0D3535] hover:text-[#C8A043] transition-colors font-medium">
                            {r.whatsapp}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${r.email}`} className="text-[#0D3535] hover:text-[#C8A043] transition-colors">
                            {r.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.razorpay_payment_id || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
