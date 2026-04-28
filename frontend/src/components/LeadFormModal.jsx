import { useState } from "react";
import axios from "axios";
import { Loader2, CheckCircle2, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LeadFormModal = ({ open, onOpenChange, source = "hero_cta" }) => {
  const [form, setForm] = useState({ name: "", phone: "", issue: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const reset = () => {
    setForm({ name: "", phone: "", issue: "" });
    setSuccess(false);
    setError("");
    setLoading(false);
  };

  const handleClose = (next) => {
    onOpenChange(next);
    if (!next) {
      // small delay so user sees fade-out before reset
      setTimeout(reset, 250);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim() || !form.issue.trim()) {
      setError("Please fill in your name, phone, and issue so we can dispatch quickly.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/leads`, { ...form, source });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Something went wrong saving your request. Please call us at (403) 555-0199."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md border-slate-200"
        data-testid="lead-form-modal"
      >
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#0b3d91]">
                Get an Instant Estimate
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Tell us what's wrong. A licensed Calgary plumber will call you back fast — usually within 15 minutes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2" data-testid="lead-form">
              <div className="space-y-2">
                <Label htmlFor="lead-name" className="font-semibold text-slate-800">
                  Your Name
                </Label>
                <Input
                  id="lead-name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="John Smith"
                  autoComplete="name"
                  data-testid="lead-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone" className="font-semibold text-slate-800">
                  Phone Number
                </Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  placeholder="(403) 555-0199"
                  autoComplete="tel"
                  data-testid="lead-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-issue" className="font-semibold text-slate-800">
                  What's the issue?
                </Label>
                <Textarea
                  id="lead-issue"
                  value={form.issue}
                  onChange={handleChange("issue")}
                  placeholder="Burst pipe under kitchen sink, water everywhere..."
                  rows={4}
                  data-testid="lead-issue-input"
                />
              </div>

              {error && (
                <p
                  className="text-sm text-red-600 font-medium"
                  data-testid="lead-form-error"
                >
                  {error}
                </p>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                <a
                  href="tel:+14035550199"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  data-testid="lead-form-call-now"
                >
                  <Phone className="h-4 w-4" /> Call Instead
                </a>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold px-6 py-6 text-base rounded-md shadow-md disabled:opacity-70"
                  data-testid="lead-form-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…
                    </>
                  ) : (
                    "Request Estimate"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="py-8 text-center" data-testid="lead-form-success">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Request received!
            </h3>
            <p className="text-slate-600 mb-6">
              A True North plumber will call <span className="font-semibold">{form.phone || "you"}</span> shortly.
              Need it faster? Call us directly.
            </p>
            <a
              href="tel:+14035550199"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b3d91] px-6 py-3 text-white font-semibold hover:bg-[#082c6c] transition-colors"
              data-testid="lead-form-success-call"
            >
              <Phone className="h-4 w-4" /> (403) 555-0199
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormModal;
