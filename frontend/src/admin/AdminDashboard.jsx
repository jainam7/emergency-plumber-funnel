import { useEffect, useState, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Loader2,
  LogOut,
  Phone,
  RefreshCw,
  Search,
  Inbox,
} from "lucide-react";
import { authAxios, getToken, clearToken, formatApiErrorDetail } from "@/lib/auth";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "booked", label: "Booked", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "lost", label: "Lost", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ value }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${opt.color}`}
    >
      {opt.label}
    </span>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();
  const hasToken = Boolean(getToken());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [meRes, leadsRes] = await Promise.all([
        authAxios.get("/auth/me"),
        authAxios.get("/leads"),
      ]);
      setUser(meRes.data);
      setLeads(leadsRes.data);
    } catch (err) {
      if (err?.response?.status !== 401) {
        setError(formatApiErrorDetail(err?.response?.data?.detail) || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  const stats = useMemo(() => {
    const counts = { all: leads.length, new: 0, contacted: 0, booked: 0, lost: 0 };
    leads.forEach((l) => {
      counts[l.status || "new"] = (counts[l.status || "new"] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const visible = useMemo(() => {
    return leads.filter((l) => {
      if (filter !== "all" && (l.status || "new") !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.issue?.toLowerCase().includes(q) ||
          l.source?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, filter, search]);

  if (!hasToken) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await authAxios.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearToken();
    navigate("/admin/login", { replace: true });
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const { data } = await authAxios.patch(`/leads/${id}/status`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: data.status } : l)));
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#0b3d91] truncate">
              True North · Leads
            </h1>
            {user && (
              <p className="text-xs text-slate-500 truncate" data-testid="admin-user-email">
                {user.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              data-testid="admin-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              data-testid="admin-logout"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-5">
          {[
            { key: "all", label: "Total" },
            ...STATUS_OPTIONS.map((s) => ({ key: s.value, label: s.label })),
          ].map((tile) => {
            const active = filter === tile.key;
            return (
              <button
                key={tile.key}
                onClick={() => setFilter(tile.key)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-[#0b3d91] bg-[#0b3d91] text-white"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                data-testid={`admin-filter-${tile.key}`}
              >
                <p className={`text-[10px] uppercase tracking-wider font-bold ${active ? "text-blue-200" : "text-slate-500"}`}>
                  {tile.label}
                </p>
                <p className={`text-2xl font-black tracking-tight ${active ? "text-white" : "text-slate-900"}`}>
                  {stats[tile.key] ?? 0}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, issue, source…"
            className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30 focus:border-[#0b3d91]"
            data-testid="admin-search"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 font-medium" data-testid="admin-error">
            {error}
          </p>
        )}

        {/* Table (desktop) / Cards (mobile) */}
        {loading && leads.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading leads…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500" data-testid="admin-empty">
            <Inbox className="h-8 w-8 mx-auto mb-3 text-slate-400" />
            <p className="font-semibold">No leads match.</p>
            <p className="text-sm">Try clearing filters or refreshing.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm" data-testid="admin-leads-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">When</th>
                    <th className="text-left px-4 py-3 font-bold">Name</th>
                    <th className="text-left px-4 py-3 font-bold">Phone</th>
                    <th className="text-left px-4 py-3 font-bold">Issue</th>
                    <th className="text-left px-4 py-3 font-bold">Source</th>
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                      data-testid={`admin-lead-row-${l.id}`}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(l.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{l.name}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`tel:${l.phone}`}
                          className="inline-flex items-center gap-1 text-[#0b3d91] font-semibold hover:text-[#ff6b00]"
                        >
                          <Phone className="h-3.5 w-3.5" /> {l.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-md">
                        <span className="line-clamp-2">{l.issue}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{l.source}</td>
                      <td className="px-4 py-3">
                        <select
                          value={l.status || "new"}
                          onChange={(e) => updateStatus(l.id, e.target.value)}
                          disabled={updatingId === l.id}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/30"
                          data-testid={`admin-lead-status-${l.id}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {visible.map((l) => (
                <div
                  key={l.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5"
                  data-testid={`admin-lead-card-${l.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{l.name}</p>
                      <a
                        href={`tel:${l.phone}`}
                        className="inline-flex items-center gap-1 text-sm text-[#0b3d91] font-semibold"
                      >
                        <Phone className="h-3.5 w-3.5" /> {l.phone}
                      </a>
                    </div>
                    <StatusBadge value={l.status || "new"} />
                  </div>
                  <p className="text-sm text-slate-700 mb-2 line-clamp-3">{l.issue}</p>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">{formatDate(l.created_at)}</span>
                    <select
                      value={l.status || "new"}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      disabled={updatingId === l.id}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                      data-testid={`admin-lead-status-mobile-${l.id}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-2 truncate">src: {l.source}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
