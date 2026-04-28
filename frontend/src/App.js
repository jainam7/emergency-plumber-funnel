import { useState, useEffect } from "react";
import "@/App.css";
import {
  Phone,
  ShieldCheck,
  Award,
  Star,
  Droplets,
  Flame,
  Wrench,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import LeadFormModal from "@/components/LeadFormModal";
import ChatWidget, { triggerChat } from "@/components/ChatWidget";

const PHONE_DISPLAY = "(403) 555-0199";
const PHONE_HREF = "tel:+14035550199";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1732395805034-e0bf859665e5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwbHVtYmVyJTIwcG9ydHJhaXQlMjBzbWlsaW5nfGVufDB8fHx8MTc3NzM5MjU1Mnww&ixlib=rb-4.1.0&q=85";

const services = [
  {
    icon: Droplets,
    title: "Emergency Leaks & Bursts",
    desc: "Burst pipes, slab leaks, flooded basements — we're on-site fast with the right gear to stop the water now.",
    image:
      "https://images.pexels.com/photos/15206136/pexels-photo-15206136.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    testid: "service-card-leaks",
  },
  {
    icon: Flame,
    title: "Water Heater Repair & Install",
    desc: "Tank or tankless, gas or electric — same-day diagnosis and upfront pricing on every Calgary install.",
    image:
      "https://images.unsplash.com/photo-1620653713380-7a34b773fef8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHx3YXRlciUyMGhlYXRlciUyMHJlcGFpciUyMHBsdW1iaW5nfGVufDB8fHx8MTc3NzM5MjU1Mnww&ixlib=rb-4.1.0&q=85",
    testid: "service-card-water-heater",
  },
  {
    icon: Wrench,
    title: "Drain Cleaning & Unclogging",
    desc: "Hydro-jetting, snaking, camera inspections — we clear the clog and keep it from coming back.",
    image:
      "https://images.unsplash.com/photo-1676210134190-3f2c0d5cf58d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwxfHxwbHVtYmVyJTIwZml4aW5nJTIwa2l0Y2hlbiUyMHNpbmslMjBwaXBlfGVufDB8fHx8MTc3NzM5MjU1Mnww&ixlib=rb-4.1.0&q=85",
    testid: "service-card-drain",
  },
];

const trustSignals = [
  { icon: ShieldCheck, label: "Fully Licensed & Insured" },
  { icon: Award, label: "A+ BBB Rating" },
  { icon: Star, label: "500+ 5-Star Local Reviews" },
];

function Navbar({ onOpenLead }) {
  return (
    <nav
      className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
        <a
          href="#top"
          className="text-lg sm:text-2xl font-black tracking-tighter text-[#0b3d91] hover:opacity-80 transition-opacity"
          data-testid="nav-logo"
        >
          True North Plumbing
        </a>

        <div className="flex items-center gap-2 sm:gap-4">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-red-600 font-bold text-sm tracking-wide uppercase"
            data-testid="nav-emergency-label"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            24/7 Emergency Service
          </span>
          <a
            href={PHONE_HREF}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-extrabold text-sm sm:text-base tracking-tight transition-colors"
            data-testid="nav-phone-link"
          >
            <Phone className="h-4 w-4" />
            {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onOpenLead }) {
  return (
    <section
      id="top"
      className="relative bg-[#0b3d91] overflow-hidden hero-glow"
      data-testid="hero-section"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
        <div className="order-2 lg:order-1">
          <div
            className="float-in inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-300 backdrop-blur-sm border border-white/10 mb-5"
            data-testid="hero-eyebrow"
          >
            <Clock className="h-3.5 w-3.5" />
            Average dispatch in 38 minutes across Calgary
          </div>

          <h1
            className="float-in delay-1 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[1.05] mb-5"
            data-testid="hero-h1"
          >
            Calgary's Most Reliable{" "}
            <span className="text-[#ff6b00]">Emergency Plumbers.</span>
          </h1>

          <p
            className="float-in delay-2 text-lg sm:text-xl font-medium text-slate-200 max-w-xl mb-8 leading-relaxed"
            data-testid="hero-h2"
          >
            Fast dispatch. Upfront pricing. No mess left behind.
          </p>

          <div className="float-in delay-3 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={() => onOpenLead("hero_cta")}
              className="ai-chat-trigger cta-pulse inline-flex items-center justify-center gap-2 bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold text-base sm:text-lg tracking-wide rounded-md px-7 py-5 sm:px-9 sm:py-6 transition-colors duration-200"
              data-testid="hero-cta-button"
            >
              Get an Instant Estimate
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 text-white font-semibold tracking-wide rounded-md px-5 py-4 sm:py-5 border border-white/20 hover:bg-white/5 transition-colors"
              data-testid="hero-call-button"
            >
              <Phone className="h-4 w-4" />
              Call {PHONE_DISPLAY}
            </a>
          </div>

          <div
            className="float-in delay-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300"
            data-testid="hero-mini-trust"
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-orange-400" /> No after-hours surcharge
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-orange-400" /> Up-front quotes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-400" /> Calgary & area
            </span>
          </div>
        </div>

        <div className="order-1 lg:order-2 relative">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 float-in">
            <img
              src={HERO_IMAGE}
              alt="Smiling licensed Calgary plumber in uniform"
              className="w-full h-[280px] sm:h-[380px] lg:h-[520px] object-cover"
              loading="eager"
              data-testid="hero-image"
            />
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 bg-white/95 backdrop-blur rounded-xl p-4 flex items-center gap-3 shadow-xl">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900 leading-tight">
                  Rated 4.9/5
                </p>
                <p className="text-slate-600 text-xs leading-tight">
                  by 500+ Calgary homeowners
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBanner() {
  return (
    <section
      className="bg-slate-50 border-b border-slate-200"
      data-testid="trust-banner"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
          {trustSignals.map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="flex items-center justify-center sm:justify-start gap-3 text-slate-800"
              data-testid={`trust-signal-${i}`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b3d91]/10 text-[#0b3d91] shrink-0">
                <Icon className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <span className="font-bold tracking-tight text-base">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ onOpenLead }) {
  return (
    <section className="bg-white py-20 sm:py-24" data-testid="services-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-[#ff6b00] mb-3">
            Our services
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-tight"
            data-testid="services-heading"
          >
            Calgary's Top-Rated Plumbing Services
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Whatever's leaking, broken, or backed up — we handle it. Same day, every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map(({ icon: Icon, title, desc, image, testid }) => (
            <article
              key={title}
              className="service-card bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
              data-testid={testid}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#0b3d91] text-white shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed flex-1">
                  {desc}
                </p>
                <button
                  onClick={() => onOpenLead(`service_card_${testid.replace("service-card-", "")}`)}
                  className="ai-chat-trigger mt-5 inline-flex items-center gap-1.5 text-[#0b3d91] font-bold text-sm hover:text-[#ff6b00] transition-colors group"
                  data-testid={`${testid}-cta`}
                >
                  Get a quote
                  <ArrowRight className="h-4 w-4 service-arrow" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onOpenLead }) {
  return (
    <section
      className="bg-[#0b3d91] py-20 sm:py-24 text-center relative overflow-hidden"
      data-testid="final-cta-section"
    >
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#ff6b00]/20 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
      />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 relative z-10">
        <h2
          className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-tight mb-5"
          data-testid="final-cta-heading"
        >
          Need a Plumber Right Now?
        </h2>
        <p className="text-slate-200 text-base sm:text-lg max-w-xl mx-auto mb-9">
          Live dispatch 24/7 across Calgary. We'll be at your door, often within the hour.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <button
            onClick={() => onOpenLead("final_cta")}
            className="ai-chat-trigger cta-pulse inline-flex items-center justify-center gap-2 bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold text-lg tracking-wide rounded-md px-9 py-6 transition-colors duration-200"
            data-testid="final-cta-button"
          >
            Get an Instant Estimate
            <ArrowRight className="h-5 w-5" />
          </button>
          <a
            href={PHONE_HREF}
            className="inline-flex items-center justify-center gap-2 text-white font-semibold tracking-wide rounded-md px-6 py-5 border border-white/20 hover:bg-white/5 transition-colors"
            data-testid="final-cta-phone"
          >
            <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="bg-slate-950 text-slate-400 py-10"
      data-testid="footer"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-white font-extrabold tracking-tighter text-lg">
            True North Plumbing
          </p>
          <p className="text-sm mt-1">
            Serving the Greater Calgary Area. Licensed Master Plumbers. Copyright 2026.
          </p>
        </div>
        <a
          href={PHONE_HREF}
          className="inline-flex items-center gap-2 text-red-400 font-bold hover:text-red-300 transition-colors"
          data-testid="footer-phone"
        >
          <Phone className="h-4 w-4" />
          {PHONE_DISPLAY}
        </a>
      </div>
    </footer>
  );
}

function App() {
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSource, setLeadSource] = useState("hero_cta");

  // All orange .ai-chat-trigger CTAs route to the scripted chat widget.
  // (LeadFormModal kept available as a programmatic fallback.)
  const openLead = (source = "hero_cta") => {
    triggerChat(source);
  };

  // Pre-fetch base API on mount (sanity ping, non-blocking)
  useEffect(() => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/`;
    fetch(url).catch(() => {});
  }, []);

  return (
    <div className="App" data-testid="app-root">
      <Navbar onOpenLead={openLead} />
      <Hero onOpenLead={openLead} />
      <TrustBanner />
      <Services onOpenLead={openLead} />
      <FinalCTA onOpenLead={openLead} />
      <Footer />

      <LeadFormModal
        open={leadOpen}
        onOpenChange={setLeadOpen}
        source={leadSource}
      />

      <ChatWidget />
    </div>
  );
}

export default App;
