import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Loader2, Lock } from "lucide-react";
import { API, setToken, getToken, formatApiErrorDetail } from "@/lib/auth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (getToken()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email: email.trim(), password });
      setToken(data.access_token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-7"
        data-testid="admin-login-form"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3d91] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight">
              True North Admin
            </h1>
            <p className="text-xs text-slate-500 leading-tight">Sign in to manage leads</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30 focus:border-[#0b3d91]"
              data-testid="admin-login-email"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30 focus:border-[#0b3d91]"
              data-testid="admin-login-password"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-medium" data-testid="admin-login-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold py-3 transition-colors disabled:opacity-60"
          data-testid="admin-login-submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <p className="mt-5 text-center text-xs text-slate-500">
          Authorized personnel only.
        </p>
      </form>
    </div>
  );
}
