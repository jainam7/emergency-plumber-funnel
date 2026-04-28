import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  MessageCircle,
  X,
  Phone,
  Send,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Droplets,
  Flame,
  Wrench,
  HelpCircle,
  Clock,
  CalendarDays,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PHONE_DISPLAY = "(403) 555-0199";
const PHONE_HREF = "tel:+14035550199";

const SERVICE_OPTIONS = [
  { id: "leak", label: "Emergency leak / burst pipe", Icon: Droplets },
  { id: "water_heater", label: "Water heater issue", Icon: Flame },
  { id: "drain", label: "Clogged drain", Icon: Wrench },
  { id: "other", label: "Something else", Icon: HelpCircle },
];

const URGENCY_OPTIONS = [
  { id: "now", label: "Right now — emergency", tag: "urgent" },
  { id: "today", label: "Today if possible", tag: "soon" },
  { id: "week", label: "This week is fine", tag: "scheduled" },
];

const initialMessages = [
  {
    from: "bot",
    text:
      "Hi! I'm True North's dispatch assistant. I'll grab a few quick details and have a licensed Calgary plumber call you back fast.",
  },
  { from: "bot", text: "First — what's going on?" },
];

// Custom event so any button with class .ai-chat-trigger can open chat
export const CHAT_OPEN_EVENT = "tnp:open-chat";

export const triggerChat = (source = "ai_chat_trigger") => {
  window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT, { detail: { source } }));
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("service");
  const [messages, setMessages] = useState(initialMessages);
  const [data, setData] = useState({
    service: null,
    urgency: null,
    name: "",
    phone: "",
    details: "",
    source: "chat_widget",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const pushBot = (text) =>
    setMessages((m) => [...m, { from: "bot", text }]);
  const pushUser = (text) =>
    setMessages((m) => [...m, { from: "user", text }]);

  // Show typing indicator briefly, then push the bot message
  const botReply = (text, delay = 700) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushBot(text);
    }, delay);
  };

  const resetChat = () => {
    setStep("service");
    setMessages(initialMessages);
    setData({
      service: null,
      urgency: null,
      name: "",
      phone: "",
      details: "",
      source: "chat_widget",
    });
    setError("");
    setLoading(false);
  };

  // Listen for global open events from .ai-chat-trigger buttons
  useEffect(() => {
    const handler = (e) => {
      const source = e?.detail?.source || "ai_chat_trigger";
      setData((d) => ({ ...d, source }));
      setOpen(true);
    };
    window.addEventListener(CHAT_OPEN_EVENT, handler);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, handler);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, step, typing]);

  // Focus input when text-step opens
  useEffect(() => {
    if (open && (step === "name" || step === "phone" || step === "details")) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step, open]);

  const handleServicePick = (option) => {
    pushUser(option.label);
    setData((d) => ({ ...d, service: option.id }));
    setStep("urgency");
    botReply("Got it. How soon do you need someone on-site?");
  };

  const handleUrgencyPick = (option) => {
    pushUser(option.label);
    setData((d) => ({ ...d, urgency: option.id }));
    setStep("name");
    botReply(
      option.id === "now"
        ? "Understood — flagging as urgent. What's your name?"
        : "Perfect. What's your name?"
    );
  };

  const handleSubmitName = (e) => {
    e?.preventDefault?.();
    const name = data.name.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    pushUser(name);
    setStep("phone");
    botReply(`Thanks ${name}. What's the best phone number to reach you?`);
  };

  const handleSubmitPhone = (e) => {
    e?.preventDefault?.();
    const phone = data.phone.trim();
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    pushUser(phone);
    setStep("details");
    botReply("Last bit — any extra details about the issue? (e.g., where it's leaking, when it started)");
  };

  const handleSubmitDetails = async (e) => {
    e?.preventDefault?.();
    const details = data.details.trim();
    if (!details) {
      setError("Please describe the issue briefly.");
      return;
    }
    setError("");
    pushUser(details);
    setStep("submitting");
    setLoading(true);

    const serviceLabel =
      SERVICE_OPTIONS.find((s) => s.id === data.service)?.label || "General";
    const urgencyLabel =
      URGENCY_OPTIONS.find((u) => u.id === data.urgency)?.label || "Flexible";

    const issueComposed = `[${serviceLabel}] [${urgencyLabel}] ${details}`;

    try {
      await axios.post(`${API}/leads`, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        issue: issueComposed,
        source: `${data.source}:${data.service}`,
      });
      setStep("done");
      pushBot(
        `Thanks ${data.name.trim()}! A True North plumber will call ${data.phone.trim()} shortly.${
          data.urgency === "now" ? " Marked as URGENT — expect a call within minutes." : ""
        }`
      );
    } catch (err) {
      console.error(err);
      setStep("details");
      setError(
        "Something went wrong saving your request. Please call us at " + PHONE_DISPLAY + "."
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError("");
    if (step === "urgency") {
      setStep("service");
    } else if (step === "name") {
      setStep("urgency");
    } else if (step === "phone") {
      setStep("name");
    } else if (step === "details") {
      setStep("phone");
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating bubble — strictly bottom-right, single fixed element in that corner */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        data-testid="chat-bubble"
        className={`fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6b00] text-white shadow-[0_10px_30px_rgba(255,107,0,0.45)] hover:bg-[#e66000] hover:shadow-[0_14px_36px_rgba(255,107,0,0.6)] transition-all duration-200 ${
          open ? "rotate-90" : ""
        }`}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-600 border-2 border-white" />
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-24 sm:right-5 z-[59] flex flex-col bg-white shadow-2xl border border-slate-200 sm:rounded-2xl overflow-hidden w-full sm:w-[380px] h-[80vh] sm:h-[560px] animate-[float-in_0.25s_ease-out]"
          data-testid="chat-panel"
          role="dialog"
          aria-label="Chat with True North dispatch"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 bg-[#0b3d91] text-white px-4 py-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">True North Dispatch</p>
                <p className="text-xs text-slate-200 leading-tight flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  Online · 24/7
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={PHONE_HREF}
                title="Call now"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-bold transition-colors"
                data-testid="chat-header-call"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
              <button
                onClick={handleClose}
                aria-label="Close chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                data-testid="chat-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3"
            data-testid="chat-messages"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    m.from === "user"
                      ? "bg-[#0b3d91] text-white rounded-br-sm"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start" data-testid="chat-typing">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm flex items-center gap-1">
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                </div>
              </div>
            )}

            {/* Step controls inline at bottom of message stream */}
            {step === "service" && (
              <div className="grid grid-cols-1 gap-2 pt-1" data-testid="chat-step-service">
                {SERVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleServicePick(opt)}
                    className="flex items-center gap-2.5 w-full text-left rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 hover:border-[#0b3d91] hover:bg-[#0b3d91]/5 transition-colors"
                    data-testid={`chat-service-${opt.id}`}
                  >
                    <opt.Icon className="h-4 w-4 text-[#0b3d91] shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {step === "urgency" && (
              <div className="grid grid-cols-1 gap-2 pt-1" data-testid="chat-step-urgency">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUrgencyPick(opt)}
                    className={`flex items-center gap-2.5 w-full text-left rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors ${
                      opt.id === "now"
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-slate-200 bg-white text-slate-800 hover:border-[#0b3d91] hover:bg-[#0b3d91]/5"
                    }`}
                    data-testid={`chat-urgency-${opt.id}`}
                  >
                    {opt.id === "now" ? (
                      <Clock className="h-4 w-4 shrink-0" />
                    ) : (
                      <CalendarDays className="h-4 w-4 text-[#0b3d91] shrink-0" />
                    )}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {step === "submitting" && (
              <div className="flex items-center gap-2 text-slate-600 text-sm pt-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Sending your request…
              </div>
            )}

            {step === "done" && (
              <div className="pt-2 space-y-3" data-testid="chat-step-done">
                <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" /> Request received
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={PHONE_HREF}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b3d91] px-4 py-3 text-white font-bold hover:bg-[#082c6c] transition-colors"
                    data-testid="chat-done-call"
                  >
                    <Phone className="h-4 w-4" /> Call {PHONE_DISPLAY}
                  </a>
                  <button
                    onClick={resetChat}
                    className="text-sm text-slate-600 hover:text-slate-900 font-semibold"
                    data-testid="chat-restart"
                  >
                    Start a new request
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom input area for text steps */}
          {(step === "name" || step === "phone" || step === "details") && (
            <form
              onSubmit={
                step === "name"
                  ? handleSubmitName
                  : step === "phone"
                  ? handleSubmitPhone
                  : handleSubmitDetails
              }
              className="border-t border-slate-200 bg-white px-3 py-3 space-y-2 shrink-0"
              data-testid={`chat-step-${step}`}
            >
              {error && (
                <p className="text-xs text-red-600 font-medium" data-testid="chat-error">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Back"
                  data-testid="chat-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {step === "details" ? (
                  <textarea
                    ref={inputRef}
                    value={data.details}
                    onChange={(e) => setData((d) => ({ ...d, details: e.target.value }))}
                    placeholder="Describe the issue…"
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30 focus:border-[#0b3d91]"
                    data-testid="chat-input-details"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitDetails(e);
                      }
                    }}
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type={step === "phone" ? "tel" : "text"}
                    inputMode={step === "phone" ? "tel" : "text"}
                    autoComplete={step === "phone" ? "tel" : "name"}
                    value={step === "phone" ? data.phone : data.name}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        [step === "phone" ? "phone" : "name"]: e.target.value,
                      }))
                    }
                    placeholder={
                      step === "phone" ? "(403) 555-0199" : "Your name"
                    }
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30 focus:border-[#0b3d91]"
                    data-testid={`chat-input-${step}`}
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ff6b00] text-white hover:bg-[#e66000] transition-colors disabled:opacity-60"
                  aria-label="Send"
                  data-testid="chat-send"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              <a
                href={PHONE_HREF}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0b3d91] hover:text-[#ff6b00] transition-colors"
                data-testid="chat-footer-call"
              >
                <Phone className="h-3 w-3" /> Or call now: {PHONE_DISPLAY}
              </a>
            </form>
          )}

          {/* Persistent call CTA when in choice/done steps and on small screens */}
          {(step === "service" || step === "urgency" || step === "done") && (
            <div className="border-t border-slate-200 bg-white px-3 py-2 shrink-0">
              <a
                href={PHONE_HREF}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0b3d91] hover:text-[#ff6b00] transition-colors"
                data-testid="chat-persistent-call"
              >
                <Phone className="h-3 w-3" /> Or call now: {PHONE_DISPLAY}
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
