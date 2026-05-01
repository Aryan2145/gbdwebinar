import { useState, useEffect, useRef, FormEvent } from "react";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, CheckCircle2, Phone, ArrowRight, Loader2,
  ShieldCheck, Mail, MapPin,
} from "lucide-react";

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inp =
  "w-full px-4 py-3 rounded-xl bg-white border border-[#D5D2CB] focus:ring-2 focus:ring-[#C8A043] focus:border-[#C8A043] transition-all outline-none text-sm text-gray-800";

const LAYERS_COUNT = 5;

type Session = { id: number; label: string; date_str: string; time_str: string; starts_at: string | null };

const getDayName = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long" });
};

export default function Home() {
  // ── Sessions ──────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: Session[]) => {
        setSessions(data);
        if (data.length > 0) setSelectedSession(data[0].id);
      })
      .catch(() => {});
  }, []);

  // ── Payment form ─────────────────────────────────────────────────────────
  const [payName, setPayName] = useState("");
  const [payWhatsapp, setPayWhatsapp] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [payCompany, setPayCompany] = useState("");
  const [payDesignation, setPayDesignation] = useState("");
  const [payIndustry, setPayIndustry] = useState("");
  const [payQuantity, setPayQuantity] = useState(1);
  const [additionalNames, setAdditionalNames] = useState<string[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState("");

  // ── Clarity Call form ─────────────────────────────────────────────────────
  const [callName, setCallName] = useState("");
  const [callCompany, setCallCompany] = useState("");
  const [callWhatsapp, setCallWhatsapp] = useState("");
  const [callEmail, setCallEmail] = useState("");
  const [callWebsite, setCallWebsite] = useState("");
  const [callRevenue, setCallRevenue] = useState("");
  const [callLoading, setCallLoading] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [callError, setCallError] = useState("");

  // ── Framework layer ───────────────────────────────────────────────────────
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const layerRefs = useRef<(HTMLDivElement | null)[]>(Array(LAYERS_COUNT).fill(null));
  const ratiosRef = useRef<number[]>(Array(LAYERS_COUNT).fill(0));

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile) { setActiveLayer(null); return; }
    ratiosRef.current = Array(LAYERS_COUNT).fill(0);
    const observers: IntersectionObserver[] = [];
    layerRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          ratiosRef.current[i] = entry.intersectionRatio;
          const max = Math.max(...ratiosRef.current);
          if (max > 0.2) setActiveLayer(ratiosRef.current.indexOf(max));
        },
        {
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
          rootMargin: "-15% 0px -15% 0px",
        }
      );
      obs.observe(ref);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [isMobile]);

  const scrollToApply = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPayError("");
    if (!payName.trim()) { setPayError("Please enter your full name."); return; }
    if (!payCompany.trim()) { setPayError("Please enter your company name."); return; }
    if (!payDesignation.trim()) { setPayError("Please enter your designation."); return; }
    if (payWhatsapp.replace(/\D/g, "").length < 10) {
      setPayError("Please enter a valid 10-digit WhatsApp number."); return;
    }
    if (!payEmail.includes("@")) { setPayError("Please enter a valid email address."); return; }
    if (!selectedSession) { setPayError("Please choose a session date."); return; }
    if (payQuantity > 1) {
      const missing = additionalNames.slice(0, payQuantity - 1).some((n) => !n.trim());
      if (missing) { setPayError("Please enter names for all attendees."); return; }
    }

    setPayLoading(true);
    const ok = await loadRazorpay();
    if (!ok) {
      setPayError("Could not load payment gateway. Check your internet connection.");
      setPayLoading(false); return;
    }

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payName, whatsapp: payWhatsapp, email: payEmail, quantity: payQuantity }),
      });
      const order = await res.json();
      if (!res.ok) { setPayError(order.error || "Failed to create order."); setPayLoading(false); return; }

      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "RGB India",
        description: "Growth by Design — Webinar Registration",
        order_id: order.orderId,
        prefill: { name: payName, email: payEmail, contact: payWhatsapp },
        theme: { color: "#0D3535" },
        handler: async (response: any) => {
          const verify = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              name: payName,
              whatsapp: payWhatsapp,
              email: payEmail,
              company: payCompany,
              designation: payDesignation,
              industry: payIndustry,
              session_id: selectedSession,
              quantity: payQuantity,
              additional_names: additionalNames.slice(0, payQuantity - 1).filter(Boolean),
            }),
          });
          const data = await verify.json();
          if (data.success) { setPaySuccess(true); }
          else { setPayError("Payment received but verification failed. Call us: 90-330-50-300."); }
          setPayLoading(false);
        },
        modal: { ondismiss: () => setPayLoading(false) },
      });
      rzp.on("payment.failed", (r: any) => {
        setPayError(r.error?.description || "Payment failed. Please try again.");
        setPayLoading(false);
        fetch("/api/payment-failed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: r.error?.metadata?.order_id,
            razorpay_payment_id: r.error?.metadata?.payment_id,
            name: payName, whatsapp: payWhatsapp, email: payEmail,
            company: payCompany, designation: payDesignation,
            industry: payIndustry, session_id: selectedSession,
          }),
        }).catch(() => {});
      });
      rzp.open();
    } catch {
      setPayError("Something went wrong. Please try again.");
      setPayLoading(false);
    }
  };

  const handleCallSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCallError("");
    if (!callName.trim()) { setCallError("Please enter your full name."); return; }
    if (callWhatsapp.replace(/\D/g, "").length < 10) {
      setCallError("Please enter a valid WhatsApp number."); return;
    }
    if (!callEmail.includes("@")) { setCallError("Please enter a valid email address."); return; }
    if (!callRevenue) { setCallError("Please select a revenue range."); return; }

    setCallLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setCallSuccess(true);
    setCallLoading(false);
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const problems = [
    { title: "Growth feels slower than effort", points: ["Working all day, but growth not matching effort", "Sales not growing as expected", "Margins shrinking while costs keep increasing"] },
    { title: "Too much pressure on the owner", points: ["Too much dependency on you for decisions", "Most important work still depends on you", "If you step away, work slows down"] },
    { title: "Team is present, ownership is missing", points: ["Constant follow-ups required to get work done", "Team does not take ownership", "Right people are difficult to find and retain"] },
    { title: "Market pressure keeps increasing", points: ["Too much competition, discounting, and credit pressure", "Customers demand more, margins reduce further"] },
    { title: "Cashflow remains under stress", points: ["Payments keep getting delayed", "Cash gets locked in debtors, inventory, and underutilised assets", "Cashflow becomes tight and unpredictable"] },
    { title: "Life starts taking a back seat", points: ["Very little time for family", "Very little time for personal growth", "Very little time to step back and think"] },
  ];

  const layers = [
    { num: "01", title: "Transforming Leadership", desc: "The owner moves from daily doing to higher-value leadership", points: ["Strategic Thinking", "Better Planning", "Mentoring Next-Line Leaders", "Building Stronger Customer And Supplier Relationships", "Adopting Better Technology", "Self, Family, And Contribution To Society"], close: "A stronger leader builds a stronger business" },
    { num: "02", title: "Transforming Teams", desc: "Teams begin to work with clarity, ownership, and responsibility", points: ["Clear Roles", "Stronger Accountability", "Better Decision-Making At The Right Level", "Smoother Execution", "Reduced Dependency On The Owner"], close: "People take ownership. Work moves with strength" },
    { num: "03", title: "Transforming Culture", desc: "Culture becomes the force that aligns the entire organisation", points: ["Connects Vision, Strategy, People, Systems, Execution", "Culture Of Growth And Happiness", "Culture Of Contribution And Excellence", "The whole organisation moves in one direction"], close: "The whole organisation moves in one direction" },
    { num: "04", title: "Transforming Systems", desc: "Work begins to move through simple and powerful systems", points: ["Clearer Processes", "Smoother Execution", "Reduced Manual Effort", "Stronger Discipline", "Better Use Of AI And Technology", "Systems And Ecosystem Working Together"], close: "Systems create speed. Ecosystem creates scale" },
    { num: "05", title: "Transformation Data", desc: "Owners start seeing the business with greater clarity", points: ["Revenue And Profit Visibility", "Cashflow Tracking", "Team Performance Dashboards", "Business Movement At A Glance"], close: "Stronger instinct backed by visible data" },
  ];

  const outcomes = [
    { title: "Why growth stalls even when effort is high", points: ["The hidden bottlenecks that limit scale", "Why working harder is not always the answer"] },
    { title: "Why the owner becomes the biggest constraint", points: ["How dependency on you slows the business", "What changes when you step back strategically"] },
    { title: "The 5-layer Growth by Design framework", points: ["How each layer contributes to growth", "Why all five must work together"] },
    { title: "How teams can take genuine ownership", points: ["What prevents ownership today", "The shift that makes teams self-driven"] },
    { title: "Why cashflow stays under stress", points: ["Where money gets locked", "How to improve predictability"] },
    { title: "How AI and systems can reduce your effort", points: ["Where to start with systems", "How smart tools reduce your load"] },
  ];

  return (
    <>
      <Head>
        <title>Growth by Design — Webinar Registration</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Join Shri Rakesh Jain's live Growth by Design Masterclass. Register for ₹99. Limited seats." />
      </Head>

      <div className="min-h-screen bg-[#F8F7F4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-50 bg-[#0D3535]/95 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div style={{ fontFamily: "'Playfair Display', serif" }} className="text-white font-bold text-lg">
              Growth by <span className="text-[#C8A043]">Design</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="tel:+917878038514" className="hidden sm:flex items-center gap-1.5 text-white hover:text-[#C8A043] transition-colors text-sm">
                <Phone className="w-3.5 h-3.5" /> 78780 38514
              </a>
              <button
                onClick={scrollToRegister}
                className="px-4 py-2 bg-[#C8A043] text-[#0D3535] rounded-full font-semibold text-sm hover:bg-[#C8A043]/90 transition-all"
              >
                Register Now
              </button>
            </div>
          </div>
        </nav>

        {/* ── SECTION 0: PAYMENT / REGISTER ── */}
        <section id="register" className="bg-[#F8F7F4] border-b border-[#D5D2CB] py-10 md:py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-8 items-center">

              {/* Left: Info */}
              <div className="lg:col-span-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D3535] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8A043] animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wider uppercase">Live Webinar</span>
                </div>
                <h2
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-2xl md:text-3xl font-bold text-[#0D3535] mb-3 leading-snug"
                >
                  Your Business Is Growing, But Is It Still Depending Too Much on You?
                </h2>
                <h3 className="text-[#0D3535] text-base font-bold uppercase tracking-widest mb-3">
                  Growth by Design Masterclass
                </h3>
                <p className="text-gray-800 text-sm leading-relaxed mb-5">
                  A 60-minute live session with <b>Shri Rakesh Jain</b> for business owners who want <b>stronger revenue</b>, <b>better cash flow</b>, <b>responsible teams</b>, <b>reduced owner dependency</b>, and <b>more time with better control</b>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={scrollToRegister}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#C8A043] text-[#0D3535] border border-[#C8A043] hover:bg-[#C8A043]/90 transition-all"
                  >
                    ₹99 only
                  </button>
                  {sessions.length > 0 && (
                    <button
                      type="button"
                      onClick={scrollToRegister}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#0D3535] text-white border border-[#0D3535] hover:bg-[#0D3535]/90 transition-all"
                    >
                      {sessions.length} sessions available
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Form */}
              <div className="lg:col-span-3">
                <div className="bg-[#0D3535] rounded-2xl border border-white/20 shadow-xl p-6 md:p-8">
                  <AnimatePresence mode="wait">
                    {paySuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <div className="w-16 h-16 bg-[#C8A043]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-[#C8A043]" />
                        </div>
                        <h3
                          style={{ fontFamily: "'Playfair Display', serif" }}
                          className="text-2xl font-bold text-[#C8A043] mb-2"
                        >
                          You&apos;re Registered!
                        </h3>
                        <p className="text-white/70 text-sm mb-1">Your payment of <strong className="text-white">₹99</strong> is confirmed.</p>
                        <p className="text-white/70 text-sm mb-6">
                          Webinar access details will be sent to your WhatsApp number shortly.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C8A043]/20 border border-[#C8A043]/40 text-[#C8A043] text-xs font-semibold">
                          <ShieldCheck className="w-4 h-4" /> Payment Verified &amp; Confirmed
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="mb-5">
                          <div className="flex items-center justify-between mb-1">
                            <h3
                              style={{ fontFamily: "'Playfair Display', serif" }}
                              className="text-xl font-bold text-[#C8A043]"
                            >
                              Register Now
                            </h3>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8A043]">
                              <span className="text-[#0D3535] font-black text-sm">₹99 only</span>
                            </div>
                          </div>
                          <p className="text-white/60 text-xs">Secure payment via Razorpay. Details sent on WhatsApp.</p>
                        </div>

                        <form onSubmit={handlePaySubmit} className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Full Name <span className="text-[#C8A043]">*</span>
                              </label>
                              <input
                                value={payName}
                                onChange={(e) => setPayName(e.target.value)}
                                className={inp}
                                placeholder="Your full name"
                                autoComplete="name"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Company Name <span className="text-[#C8A043]">*</span>
                              </label>
                              <input
                                value={payCompany}
                                onChange={(e) => setPayCompany(e.target.value)}
                                className={inp}
                                placeholder="Your company"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Designation <span className="text-[#C8A043]">*</span>
                              </label>
                              <input
                                value={payDesignation}
                                onChange={(e) => setPayDesignation(e.target.value)}
                                className={inp}
                                placeholder="e.g. Managing Director"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Industry
                              </label>
                              <input
                                value={payIndustry}
                                onChange={(e) => setPayIndustry(e.target.value)}
                                className={inp}
                                placeholder="e.g. Manufacturing (optional)"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                WhatsApp Number <span className="text-[#C8A043]">*</span>
                              </label>
                              <input
                                value={payWhatsapp}
                                onChange={(e) => setPayWhatsapp(e.target.value)}
                                className={inp}
                                placeholder="+91 90000 00000"
                                inputMode="tel"
                                autoComplete="tel"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Email Address <span className="text-[#C8A043]">*</span>
                              </label>
                              <input
                                value={payEmail}
                                onChange={(e) => setPayEmail(e.target.value)}
                                type="email"
                                className={inp}
                                placeholder="you@company.com"
                                autoComplete="email"
                              />
                            </div>
                          </div>

                          {sessions.length > 0 && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                Choose Session <span className="text-[#C8A043]">*</span>
                              </label>
                              <select
                                value={selectedSession ?? ""}
                                onChange={(e) => setSelectedSession(Number(e.target.value))}
                                className={inp}
                              >
                                <option value="" disabled>Select a session</option>
                                {sessions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label} — {s.date_str}, {s.time_str}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Quantity */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                              Number of Tickets
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => {
                                    setPayQuantity(n);
                                    setAdditionalNames(Array(Math.max(0, n - 1)).fill(""));
                                  }}
                                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                                    payQuantity === n
                                      ? "bg-[#C8A043] text-[#0D3535]"
                                      : "bg-white/10 text-white hover:bg-white/20"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            {payQuantity > 1 && (
                              <p className="text-white/60 text-xs">Total: ₹{(payQuantity * 99).toLocaleString("en-IN")}</p>
                            )}
                          </div>

                          {/* Additional attendee names */}
                          {payQuantity > 1 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                  Attendee Names <span className="text-[#C8A043]">*</span>
                                </label>
                                <span className="text-xs font-bold text-[#C8A043]">
                                  {additionalNames.slice(0, payQuantity - 1).filter((n) => n.trim()).length + (payName.trim() ? 1 : 0)}
                                  <span className="text-white/40"> / {payQuantity} filled</span>
                                </span>
                              </div>
                              <p className="text-white/50 text-xs">{payName || "Attendee 1"} (you) + {payQuantity - 1} more</p>
                              <div className={payQuantity > 4 ? "space-y-2 max-h-48 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#C8A043_transparent]" : "space-y-2"}>
                                {Array.from({ length: payQuantity - 1 }).map((_, i) => (
                                  <input
                                    key={i}
                                    value={additionalNames[i] || ""}
                                    onChange={(e) => {
                                      const updated = [...additionalNames];
                                      updated[i] = e.target.value;
                                      setAdditionalNames(updated);
                                    }}
                                    className={inp}
                                    placeholder={`Attendee ${i + 2} full name`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {payError && (
                            <p className="text-red-300 text-xs bg-red-900/30 border border-red-400/30 rounded-lg px-3 py-2">
                              {payError}
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={payLoading}
                            className="w-full py-3.5 bg-[#C8A043] text-[#0D3535] rounded-xl font-bold text-base hover:bg-[#C8A043]/90 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 shadow-lg shadow-[#C8A043]/20 flex items-center justify-center gap-2"
                          >
                            {payLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                              <>Pay ₹{(payQuantity * 99).toLocaleString("en-IN")} &amp; Register {payQuantity > 1 ? `(${payQuantity} tickets)` : ""} <ArrowRight className="w-4 h-4" /></>
                            )}
                          </button>

                          <div className="flex items-center justify-center gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-white text-xs">
                              <ShieldCheck className="w-3.5 h-3.5" /> Secure payment
                            </div>
                            <div className="w-px h-3 bg-white/30" />
                            <div className="text-white text-xs">Powered by Razorpay</div>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 1: HERO ── */}
        <section className="relative pt-16 pb-0 bg-[#0D3535] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 items-end gap-0">

              {/* Left */}
              <FadeIn className="py-8 lg:py-10 pr-0 lg:pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C8A043] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D3535] animate-pulse" />
                  <span className="text-sm font-black text-[#0D3535] tracking-wide uppercase">
                    A 60-Minute Masterclass for Family Business Owners
                  </span>
                </div>

                <h1
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-5xl md:text-6xl font-bold text-white leading-tight mb-3"
                >
                  Growth by <span className="text-[#C8A043]">Design</span>
                </h1>
                <p
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-2xl lg:text-3xl font-semibold text-[#C8A043] mb-5 leading-tight"
                >
                  Free Your Business from Owner Dependency
                </p>

                <p className="text-white/90 text-base md:text-lg leading-relaxed mb-3 max-w-xl">
                  A 60-minute live session on building a business that grows without depending entirely on you —
                  with clarity, capable teams, and smart systems.
                </p>
                <p className="text-white text-sm md:text-base leading-relaxed mb-7 max-w-xl">
                  Clear frameworks, real strategies, and actionable thinking — designed for established Indian
                  family businesses.
                </p>

                <p className="text-white text-xs font-bold uppercase tracking-widest mb-3">
                  What Makes Growth by Design Powerful
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Right Philosophy", "Bold Vision", "Simplified Strategy", "Aligned Teams", "AI-Driven Systems", "Data-Backed Decisions"].map((p) => (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-full border border-[#C8A043]/40 bg-[#C8A043]/10 text-[#C8A043] text-xs font-semibold"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-white text-xs leading-relaxed mb-7 max-w-md">
                  This masterclass introduces these ideas. The full program goes deeper.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <button
                    onClick={scrollToRegister}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#C8A043] text-[#0D3535] rounded-full font-bold text-base shadow-lg hover:bg-[#C8A043]/90 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Register Now <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="tel:+917878038514"
                    className="inline-flex items-center gap-2 text-white hover:text-[#C8A043] transition-colors text-sm font-medium self-center"
                  >
                    <Phone className="w-4 h-4" /> 78780 38514
                  </a>
                </div>
              </FadeIn>

              {/* Right: Founder photo */}
              <FadeIn delay={0.15} className="flex justify-center lg:justify-end items-end pt-4 lg:pt-0">
                <div className="relative w-full max-w-sm lg:max-w-md xl:max-w-lg">
                  <div className="absolute -inset-8 bg-[#C8A043]/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
                  <img
                    src="/founder.png"
                    alt="Shri Rakesh Jain — Founder, RGB Business Growth Consulting"
                    className="relative z-10 w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                  />
                  <div className="absolute bottom-4 left-3 right-3 z-20 bg-[#0D3535]/85 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center">
                    <p className="text-[#C8A043] text-[11px] font-bold tracking-widest uppercase mb-1">Business Guru</p>
                    <p
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-white font-bold text-lg leading-tight"
                    >
                      Shri Rakesh Jain
                    </p>
                    <p className="text-white/75 text-xs mt-1 leading-snug">
                      Founder, RGB Business Growth Consulting
                    </p>
                  </div>
                </div>
              </FadeIn>

            </div>
          </div>
        </section>

        {/* ── SECTION 2: PROBLEMS ── */}
        <section className="py-12 bg-[#F8F7F4]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center mb-8">
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-3xl md:text-4xl font-bold text-[#0D3535]"
              >
                What most business owners experience
              </h2>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 [grid-auto-rows:1fr]">
              {problems.map((problem, i) => (
                <FadeIn key={i} delay={0.06 * i} className="h-full">
                  <div className="group bg-[#E8E5DF] border border-[#CCCAC3] rounded-2xl p-5 h-full hover:bg-[#0D3535] hover:border-[#0D3535] hover:shadow-lg transition-all duration-500 cursor-default">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-[#0D3535] group-hover:text-white text-sm leading-snug transition-colors duration-500">{problem.title}</h3>
                      <span className="text-[11px] font-black text-[#0D3535] group-hover:text-white shrink-0 mt-0.5 tabular-nums transition-colors duration-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {problem.points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-gray-800 group-hover:text-white/85 leading-snug transition-colors duration-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A043] shrink-0 mt-1.5" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: FRAMEWORK ── */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center mb-8">
              <p className="text-[#0D3535] text-xs font-bold uppercase tracking-widest mb-2">The Framework</p>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-3xl md:text-4xl font-bold text-[#0D3535] mb-2"
              >
                The Growth by Design Model
              </h2>
              <p className="text-base font-semibold text-gray-800 max-w-2xl mx-auto mb-1">
                Five layers that must work together for a business to grow by design
              </p>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                In this masterclass, we will walk through each layer and show how they connect to create
                a self-sustaining, growing business.
              </p>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {layers.map((layer, i) => {
                const isActive = activeLayer === i;
                return (
                  <FadeIn key={i} delay={0.08 * i} className="h-full">
                    <div
                      ref={(el) => { layerRefs.current[i] = el; }}
                      onMouseEnter={() => { if (!isMobile) setActiveLayer(i); }}
                      onMouseLeave={() => { if (!isMobile) setActiveLayer(null); }}
                      className={cn(
                        "group rounded-2xl p-5 h-full flex flex-col cursor-default border transition-all duration-500",
                        isActive
                          ? "bg-[#0D3535] border-[#0D3535] shadow-lg"
                          : "bg-[#E8E5DF] border-[#CCCAC3] hover:bg-[#0D3535] hover:border-[#0D3535] hover:shadow-lg"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("text-xs font-black transition-colors duration-500", isActive ? "text-white" : "text-[#0D3535] group-hover:text-white")}>{layer.num}</span>
                        <div className={cn(
                          "h-px flex-1 transition-colors duration-500",
                          isActive ? "bg-[#C8A043]/50" : "bg-[#0D3535]/40 group-hover:bg-[#C8A043]/50"
                        )} />
                      </div>
                      <h3 className={cn(
                        "font-bold text-sm leading-snug mb-1.5 transition-colors duration-500",
                        isActive ? "text-white" : "text-[#0D3535] group-hover:text-white"
                      )}>
                        {layer.title}
                      </h3>
                      <p className={cn(
                        "text-xs flex-1 mb-4 leading-relaxed transition-colors duration-500",
                        isActive ? "text-white/85" : "text-gray-800 group-hover:text-white/85"
                      )}>
                        {layer.desc}
                      </p>
                      <div className={cn(
                        "border-t pt-3 mt-auto transition-colors duration-500",
                        isActive ? "border-[#C8A043]/30" : "border-[#BDBAB2] group-hover:border-[#C8A043]/30"
                      )}>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors duration-500",
                          isActive ? "text-[#C8A043]" : "text-[#0D3535] group-hover:text-[#C8A043]"
                        )}>
                          The outcome
                        </p>
                        <p className={cn(
                          "text-sm font-semibold leading-snug transition-colors duration-500",
                          isActive ? "text-white" : "text-[#0D3535] group-hover:text-white"
                        )}>
                          {layer.close}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
            <FadeIn delay={0.5}>
              <p className="text-center text-gray-800 text-sm max-w-2xl mx-auto border-t border-[#D5D2CB] pt-5">
                In this masterclass, we will introduce how these five layers work together — and what it takes
                to get all of them moving in the right direction.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 4: WHY IT WORKS ── */}
        <section className="py-12 bg-[#F8F7F4]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center mb-8">
              <p className="text-[#0D3535] text-xs font-bold uppercase tracking-widest mb-2">The difference</p>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-3xl md:text-4xl font-bold text-[#0D3535] mb-2"
              >
                Strong Foundations. Modern Intelligence.
              </h2>
              <p className="text-sm text-gray-700 max-w-xl mx-auto">
                Growth by Design combines timeless Indian business wisdom with the best of modern tools and AI —
                so your growth is both strong and sustainable.
              </p>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <FadeIn delay={0.1}>
                <div className="group bg-[#E8E5DF] border border-[#CCCAC3] rounded-2xl p-6 h-full hover:bg-[#0D3535] hover:border-[#0D3535] hover:shadow-lg transition-all duration-500 cursor-default">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0D3535] group-hover:bg-[#C8A043] border border-[#0D3535] group-hover:border-[#C8A043] flex items-center justify-center shrink-0 transition-colors duration-500">
                      <span className="text-[#C8A043] group-hover:text-[#0D3535] font-bold text-base transition-colors duration-500">॥</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0D3535] group-hover:text-white text-base leading-snug transition-colors duration-500">
                        Ancient Indian Business Wisdom
                      </h3>
                      <p className="text-xs text-gray-800 group-hover:text-white/80 mt-1 transition-colors duration-500">
                        Built on principles that have created strong and respected businesses for generations
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {["Trust and long-term thinking", "Discipline and commitment", "Care for all stakeholders"].map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-gray-800 group-hover:text-white/85 transition-colors duration-500">
                        <span className="w-1 h-1 rounded-full bg-[#0D3535] group-hover:bg-[#C8A043] shrink-0 transition-colors duration-500" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-[#0D3535] group-hover:text-white font-semibold border-t border-[#C8C5BE] group-hover:border-white/20 pt-4 leading-relaxed transition-colors duration-500">
                    Ancient Indian Business Wisdom builds the foundation for strong and stable growth
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="group bg-[#E8E5DF] border border-[#CCCAC3] rounded-2xl p-6 h-full hover:bg-[#0D3535] hover:border-[#0D3535] hover:shadow-lg transition-all duration-500 cursor-default">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0D3535] group-hover:bg-[#C8A043] border border-[#0D3535] group-hover:border-[#C8A043] flex items-center justify-center shrink-0 transition-colors duration-500">
                      <span className="text-[#C8A043] group-hover:text-[#0D3535] font-bold text-base transition-colors duration-500">AI</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0D3535] group-hover:text-white text-base leading-snug transition-colors duration-500">
                        Latest AI-Driven Tools and Systems
                      </h3>
                      <p className="text-xs text-gray-800 group-hover:text-white/80 mt-1 transition-colors duration-500">Built to improve speed, visibility, and execution</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {["Faster execution with less effort", "Better visibility and decisions", "Intelligent automation where it helps"].map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-gray-800 group-hover:text-white/85 transition-colors duration-500">
                        <span className="w-1 h-1 rounded-full bg-[#0D3535] group-hover:bg-[#C8A043] shrink-0 transition-colors duration-500" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-[#0D3535] group-hover:text-white font-semibold border-t border-[#C8C5BE] group-hover:border-white/20 pt-4 leading-relaxed transition-colors duration-500">
                    Latest AI-Driven Tools and Systems strengthen execution and improve business speed
                  </p>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.3}>
              <div className="bg-[#0D3535] rounded-2xl px-8 py-6 text-center">
                <p className="text-[#C8A043] text-xs font-bold uppercase tracking-widest mb-3">Together</p>
                <div className="max-w-3xl mx-auto mb-4">
                  {/* Connector line with dots — hidden on mobile, shown sm+ */}
                  <div className="relative hidden sm:flex items-center justify-between mb-5 px-[12.5%]">
                    <div className="absolute inset-x-[12.5%] top-1/2 -translate-y-1/2 h-px bg-[#C8A043]/40" />
                    {[0,1,2,3].map((i) => (
                      <span key={i} className="relative w-2.5 h-2.5 rounded-full bg-[#C8A043] border-2 border-[#0D3535] z-10" />
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-left sm:text-center">
                    {[
                      "Strong philosophy gives direction",
                      "Modern tools improve execution",
                      "Systems and ecosystem start working together",
                      "Growth moves with greater clarity, speed, and focused effort",
                    ].map((line, i) => (
                      <div key={i} className="flex items-start sm:flex-col sm:items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A043] shrink-0 mt-2 sm:hidden" />
                        <p className="text-white/85 text-sm leading-relaxed">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-white font-semibold text-base mt-4 border-t border-white/10 pt-4">
                  Strong Foundations and Modern Intelligence create powerful growth
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 5: OUTCOMES ── */}
        <section className="py-12 bg-[#0D3535]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center mb-8">
              <p className="text-[#C8A043] text-xs font-bold uppercase tracking-widest mb-2">Masterclass outcomes</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                What This Masterclass Will Help You Understand
              </h2>
              <p className="text-white/75 text-sm max-w-2xl mx-auto">
                In 60 minutes, you will walk away with clarity on the real reasons growth stalls — and what it
                actually takes to change that.
              </p>
            </FadeIn>

            <div className="grid sm:grid-cols-2 gap-4 mb-7">
              {outcomes.map((outcome, i) => (
                <FadeIn key={i} delay={0.06 * i} className="h-full">
                  <div className="group bg-[#E8E5DF] border border-[#CCCAC3] rounded-2xl p-5 h-full hover:bg-[#C8A043] hover:border-[#C8A043] hover:shadow-lg transition-all duration-500 cursor-default">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-[#0D3535] text-sm leading-snug transition-colors duration-500">{outcome.title}</h3>
                      <span className="text-xs font-black text-[#0D3535] shrink-0 tabular-nums transition-colors duration-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {outcome.points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-gray-800 leading-relaxed transition-colors duration-500">
                          <span className="w-1 h-1 rounded-full bg-[#0D3535] group-hover:bg-[#0D3535] shrink-0 mt-1.5" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.5}>
              <p className="text-center text-white/90 text-base md:text-lg font-medium max-w-3xl mx-auto border-t border-white/10 pt-6">
                Clarity is the first step. This masterclass gives you that clarity.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 6: INTRO TO PROGRAM ── */}
        <section className="py-12 bg-[#F8F7F4]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FadeIn>
              <p className="text-[#0D3535] text-xs font-bold uppercase tracking-widest mb-3">Beyond the masterclass</p>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-3xl md:text-4xl font-bold text-[#0D3535] mb-4 leading-tight"
              >
                This Masterclass Is an Introduction to Growth by Design
              </h2>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-4 max-w-2xl mx-auto">
                Growth by Design is a structured 1-year business transformation program for established Indian family businesses.
                It works across all five layers — Leadership, Teams, Culture, Systems, and Data — to build a business that grows with clarity and purpose.
              </p>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6 max-w-2xl mx-auto">
                The full program offers <strong>personalised guidance</strong>, <strong>structured implementation</strong>, and a <strong>transformation journey built for your business specifically</strong>.
              </p>
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0D3535] border border-[#0D3535]">
                <span className="w-2 h-2 rounded-full bg-[#C8A043] shrink-0" />
                <p className="text-white text-sm font-semibold">
                  Start with the masterclass. Take the next step when you are ready.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 7: FINAL CTA ── */}
        <section id="apply" className="py-16 bg-[#0D3535]">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <FadeIn>
              <p className="text-[#C8A043] text-xs font-bold uppercase tracking-widest mb-3">Limited Seats</p>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight"
              >
                Join the Live Masterclass
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                {sessions.slice(0, 3).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSession(s.id);
                        document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`flex flex-col items-center px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 ${
                        selectedSession === s.id
                          ? "bg-[#C8A043] shadow-lg shadow-[#C8A043]/30"
                          : "bg-white hover:bg-[#F8F7F4]"
                      }`}
                    >
                      {getDayName(s.starts_at) && (
                        <span className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${selectedSession === s.id ? "text-[#0D3535]/60" : "text-gray-400"}`}>{getDayName(s.starts_at)}</span>
                      )}
                      <span className="font-bold text-sm text-[#0D3535]">{s.date_str}</span>
                      <span className={`text-xs font-bold mt-0.5 ${selectedSession === s.id ? "text-[#0D3535]/70" : "text-gray-500"}`}>{s.time_str}</span>
                    </button>
                    {i === 2 && sessions.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSession(sessions[3].id);
                          document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="flex flex-col items-center px-4 py-3 rounded-xl bg-[#164444] hover:bg-[#1d5252] transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <span className="text-[#C8A043] font-bold text-sm">+{sessions.length - 3} more</span>
                        <span className="text-white/50 text-xs mt-0.5">sessions</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-white text-sm mb-8 max-w-md mx-auto leading-relaxed">
                60 minutes with Shri Rakesh Jain. Live session. Webinar access details sent on WhatsApp after registration.
              </p>
              <button
                onClick={scrollToRegister}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#C8A043] text-[#0D3535] rounded-full font-bold text-base shadow-lg hover:bg-[#C8A043]/90 hover:-translate-y-0.5 transition-all duration-200"
              >
                Register Now <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-white/70 text-xs mt-6">
                Questions? Call us at{" "}
                <a href="tel:+917878038514" className="text-[#C8A043] hover:text-white transition-colors">
                  +91 78780 38514
                </a>
                {" "}or{" "}
                <a href="tel:+919033050200" className="text-[#C8A043] hover:text-white transition-colors">
                  +91 90330 50200
                </a>
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-[#0D3535] text-white py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

              <div className="space-y-6">
                <div className="flex flex-col leading-none">
                  <span className="text-white font-black text-3xl tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>RGB</span>
                  <span className="text-[#C8A043] text-xs font-bold uppercase tracking-widest mt-1">Business Growth Consulting</span>
                </div>
                <p className="text-white max-w-sm leading-relaxed text-sm">
                  We guide growth-minded business leaders in turning ambition into structured,
                  self-sustaining, and purposeful organizations.
                </p>
              </div>

              <div className="space-y-6">
                <h4
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-lg font-semibold text-white"
                >
                  Quick Links
                </h4>
                <ul className="space-y-3 text-white text-sm">
                  <li><a href="https://rgbindia.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8A043] transition-colors">Home</a></li>
                  <li><a href="https://rgbindia.com/about-us/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8A043] transition-colors">About RGB India</a></li>
                  <li><a href="https://rgbindia.com/programs/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8A043] transition-colors">Programs</a></li>
                  <li>
                    <button onClick={scrollToRegister} className="hover:text-[#C8A043] transition-colors">
                      Register for Webinar
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-6">
                <h4
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-lg font-semibold text-white"
                >
                  Get in Touch
                </h4>
                <ul className="space-y-4 text-white text-sm">
                  <li className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#C8A043] shrink-0 mt-0.5" />
                    <a href="mailto:contact@rgbindia.com" className="hover:text-white transition-colors">
                      contact@rgbindia.com
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#C8A043] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <a href="tel:+917878038514" className="hover:text-white transition-colors">
                        +91 78780 38514
                      </a>
                      <a href="tel:+919033050200" className="hover:text-white transition-colors">
                        +91 90330 50200
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#C8A043] shrink-0 mt-0.5" />
                    <a
                      href="https://maps.app.goo.gl/srpWKyhPBPEpvp817"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#C8A043] transition-colors"
                    >
                      804, Avadh Kontina, VIP Road, Vesu, Surat, 395007
                    </a>
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
              <p>© {new Date().getFullYear()} RGB India · Business Growth Consulting</p>
              <a href="https://rgbindia.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">rgbindia.com</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
