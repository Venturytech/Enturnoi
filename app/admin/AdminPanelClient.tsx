"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, PauseCircle, CheckCircle2, XCircle, RefreshCw,
  Scissors, Flower2, LogOut, ChevronDown, Search,
  DollarSign, CalendarCheck, Home, Phone, Check as CheckIcon,
  Store, Settings, BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";

type Role = "superadmin" | "admin" | "owner";

type BusinessRow = {
  id: string;
  name: string;
  type: "barber" | "salon";
  status: "active" | "pending" | "suspended";
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_role: Role;
  created_at: string;
  clients_count: number;
  subscription_ends_at: string | null;
};

// Días que faltan para el vencimiento (negativo = ya venció).
function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function remainingText(d: number): string {
  if (d >= 30) { const m = Math.floor(d / 30); return `${m} mes${m === 1 ? "" : "es"} pago${m === 1 ? "" : "s"}`; }
  return `${d} día${d === 1 ? "" : "s"}`;
}

function subLabel(endsAt: string | null): { text: string; bg: string; color: string } {
  const d = daysLeft(endsAt);
  if (d === null) return { text: "Sin suscripción", bg: "#2a2318", color: "#8a8072" };
  if (d < 0) return { text: `Vencida hace ${-d}d`, bg: "#3a1c1c", color: "#F19391" };
  if (d === 0) return { text: "Vence hoy", bg: "#3a1c1c", color: "#F19391" };
  if (d <= 5) return { text: remainingText(d), bg: "#3a2f18", color: "#F0C567" };
  return { text: remainingText(d), bg: "#173a2a", color: "#7BE3AB" };
}

type Detail = {
  clients_count: number;
  attended_total: number;
  revenue_total: number;
  months_active: number;
  avg_monthly_attended: number;
  avg_monthly_revenue: number;
  month_attended: number;
  month_revenue: number;
};

type StatusFilter = "all" | "active" | "pending" | "suspended";

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function roleLabel(r: Role) {
  return r === "superadmin" ? "Superadmin" : r === "admin" ? "Admin" : "Dueño";
}

function StatCard({
  icon: Icon, label, value, tone, active, onClick,
}: {
  icon: any; label: string; value: number; tone: "blue" | "amber" | "green" | "red"; active: boolean; onClick: () => void;
}) {
  const tones = {
    blue: { bar: "#E3B04B", chip: "#332813", iconColor: "#E3B04B" },
    amber: { bar: "#E0A93B", chip: "#3a2f18", iconColor: "#F0C567" },
    green: { bar: "#3FBF7F", chip: "#173a2a", iconColor: "#7BE3AB" },
    red: { bar: "#E1615E", chip: "#3a1c1c", iconColor: "#F19391" },
  }[tone];
  return (
    <button onClick={onClick} className="text-left rounded-2xl overflow-hidden transition" style={{ background: "#141210", border: `1px solid ${active ? tones.bar : "#29231a"}`, boxShadow: active ? `0 0 0 1px ${tones.bar}` : "none" }}>
      <div className="h-1" style={{ background: tones.bar, opacity: active ? 1 : 0.5 }} />
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: tones.chip }}>
            <Icon className="w-4 h-4" style={{ color: tones.iconColor }} />
          </div>
          <span className="font-body text-sm" style={{ color: "#c4b89f" }}>{label}</span>
        </div>
        <span className="font-display text-2xl" style={{ color: "#F3EBDA" }}>{value}</span>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: BusinessRow["status"] }) {
  const map = {
    active: { text: "Activo", bg: "#173a2a", color: "#7BE3AB" },
    pending: { text: "Pendiente", bg: "#3a2f18", color: "#F0C567" },
    suspended: { text: "Suspendido", bg: "#3a1c1c", color: "#F19391" },
  }[status];
  return (
    <span className="font-body text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: map.bg, color: map.color }}>{map.text}</span>
  );
}

function BusinessCard({
  biz, busy, expanded, detail, currentUserId, isSuperadmin, onToggleStatus, onDelete, onToggleDetail, onChangeRole, onAddMonths, roleBusy, subBusy,
}: {
  biz: BusinessRow;
  busy: boolean;
  expanded: boolean;
  detail: Detail | "loading" | undefined;
  currentUserId: string;
  isSuperadmin: boolean;
  onToggleStatus: (biz: BusinessRow) => void;
  onDelete: (biz: BusinessRow) => void;
  onToggleDetail: (biz: BusinessRow) => void;
  onChangeRole: (userId: string, role: Role) => void;
  onAddMonths: (biz: BusinessRow, months: number) => void;
  roleBusy: boolean;
  subBusy: boolean;
}) {
  const isBarber = biz.type === "barber";
  const typeColor = isBarber ? { from: "#C0293A", to: "#2C4A87" } : { from: "#E5AEC0", to: "#9B6B90" };
  const isOwn = biz.owner_id === currentUserId;
  const sub = subLabel(biz.subscription_ends_at);

  return (
    <div className="rounded-2xl p-4" style={{ background: "#141210", border: "1px solid #29231a" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${typeColor.from}, ${typeColor.to})` }}>
          {isBarber ? <Scissors className="w-4 h-4" style={{ color: "#F3EBDA" }} strokeWidth={2.5} /> : <Flower2 className="w-4 h-4" style={{ color: "#2c1f28" }} strokeWidth={2.5} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-base truncate" style={{ color: "#F3EBDA" }}>{biz.name}</h4>
            <StatusBadge status={biz.status} />
          </div>
          <p className="font-body text-[11px] mt-0.5 truncate" style={{ color: "#8a8072" }}>{biz.owner_name} · {biz.owner_email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-body text-[10px] uppercase tracking-wide" style={{ color: "#6b6355" }}>
              {isBarber ? "Barbería" : "Salón"} · {formatDate(biz.created_at)}
            </span>
            <span className="font-body text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "#2a2318", color: "#c4b89f" }}>
              <Users className="w-2.5 h-2.5" /> {biz.clients_count} cliente{biz.clients_count === 1 ? "" : "s"}
            </span>
            <span className="font-body text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: sub.bg, color: sub.color }}>
              {sub.text}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => onToggleDetail(biz)} className="font-body flex-1 text-[11px] font-medium py-1.5 rounded-lg transition inline-flex items-center justify-center gap-1" style={{ border: "1px solid #3a3222", color: "#c4b89f" }}>
          Ver detalle
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button onClick={() => onToggleStatus(biz)} disabled={busy} className="font-body flex-1 text-[11px] font-medium py-1.5 rounded-lg transition disabled:opacity-40" style={{ border: "1px solid #4a3a1f", color: "#F0C567" }}>
          {biz.status === "active" ? "Suspender" : biz.status === "pending" ? "Aprobar" : "Activar"}
        </button>
        <button onClick={() => onDelete(biz)} disabled={busy} className="font-body flex-1 text-[11px] font-medium py-1.5 rounded-lg transition disabled:opacity-40" style={{ border: "1px solid #4a1f1f", color: "#F19391" }}>
          Eliminar
        </button>
      </div>

      {isOwn && (
        <Link href="/dashboard" className="font-body w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg text-[11px] font-semibold" style={{ background: "#332813", color: "#F0C567", border: "1px solid #4a3a1f" }}>
          <Home className="w-3.5 h-3.5" />
          Administrar mi negocio
        </Link>
      )}

      {expanded && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #29231a" }}>
          {detail === "loading" || detail === undefined ? (
            <p className="font-body text-xs" style={{ color: "#8a8072" }}>Cargando métricas…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3" style={{ background: "#0f0d0b", border: "1px solid #29231a" }}>
                  <Users className="w-3.5 h-3.5 mb-1.5" style={{ color: "#E3B04B" }} />
                  <p className="font-display text-lg leading-none" style={{ color: "#F3EBDA" }}>{detail.clients_count}</p>
                  <p className="font-body text-[10px] mt-1" style={{ color: "#8a8072" }}>Clientes</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "#0f0d0b", border: "1px solid #29231a" }}>
                  <CalendarCheck className="w-3.5 h-3.5 mb-1.5" style={{ color: "#7BE3AB" }} />
                  <p className="font-display text-lg leading-none" style={{ color: "#F3EBDA" }}>{detail.avg_monthly_attended}</p>
                  <p className="font-body text-[10px] mt-1" style={{ color: "#8a8072" }}>Atiende/mes</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "#0f0d0b", border: "1px solid #29231a" }}>
                  <DollarSign className="w-3.5 h-3.5 mb-1.5" style={{ color: "#F0C567" }} />
                  <p className="font-display text-lg leading-none" style={{ color: "#F3EBDA" }}>RD${detail.avg_monthly_revenue}</p>
                  <p className="font-body text-[10px] mt-1" style={{ color: "#8a8072" }}>Genera/mes</p>
                </div>
              </div>
              <p className="font-body text-[11px] mt-2" style={{ color: "#6b6355" }}>
                Este mes: {detail.month_attended} atendidos · RD${detail.month_revenue}. Total histórico: {detail.attended_total} atendidos · RD${detail.revenue_total}.
              </p>

              {/* Suscripción: vencimiento + sumar meses pagados */}
              <div className="mt-4 rounded-xl p-3" style={{ background: "#0f0d0b", border: "1px solid #29231a" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-body text-xs" style={{ color: "#c4b89f" }}>Suscripción</span>
                  <span className="font-body text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: sub.bg, color: sub.color }}>{sub.text}</span>
                </div>
                {biz.subscription_ends_at && (
                  <p className="font-body text-[11px] mb-2" style={{ color: "#6b6355" }}>
                    Vence el {new Date(biz.subscription_ends_at + "T00:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <p className="font-body text-[11px] mb-2" style={{ color: "#8a8072" }}>Cuando pague, súmale meses (reactiva y registra el pago):</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((m) => (
                    <button key={m} onClick={() => onAddMonths(biz, m)} disabled={subBusy} className="font-body flex-1 text-[11px] font-semibold py-1.5 rounded-lg disabled:opacity-40" style={{ background: "#332813", color: "#F0C567", border: "1px solid #4a3a1f" }}>
                      +{m} {m === 1 ? "mes" : "meses"}
                    </button>
                  ))}
                </div>
              </div>

              {isSuperadmin && (
                <div className="mt-4 rounded-xl p-3" style={{ background: "#0f0d0b", border: "1px solid #29231a" }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-body text-xs" style={{ color: "#c4b89f" }}>Rol del dueño</span>
                    <span className="font-body text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: biz.owner_role === "superadmin" ? "#332813" : biz.owner_role === "admin" ? "#173a2a" : "#2a2318", color: biz.owner_role === "superadmin" ? "#F0C567" : biz.owner_role === "admin" ? "#7BE3AB" : "#c4b89f" }}>
                      {roleLabel(biz.owner_role)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {biz.owner_role !== "superadmin" && (
                      <button onClick={() => onChangeRole(biz.owner_id, "superadmin")} disabled={roleBusy} className="font-body flex-1 text-[11px] font-medium py-1.5 rounded-lg disabled:opacity-40" style={{ border: "1px solid #4a3a1f", color: "#F0C567" }}>Hacer superadmin</button>
                    )}
                    {biz.owner_role !== "owner" && (
                      <button onClick={() => onChangeRole(biz.owner_id, "owner")} disabled={roleBusy} className="font-body flex-1 text-[11px] font-medium py-1.5 rounded-lg disabled:opacity-40" style={{ border: "1px solid #3a3222", color: "#c4b89f" }}>Quitar acceso admin</button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPanelClient({ isSuperadmin, currentUserId }: { isSuperadmin: boolean; currentUserId: string }) {
  const supabase = createClient();
  const [view, setView] = useState<"businesses" | "settings" | "report">("businesses");
  const [months, setMonths] = useState<{ month_start: string; total: number; payments: number }[]>([]);
  const [monthSearch, setMonthSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "barber" | "salon">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, Detail | "loading">>({});
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);

  const [contactPhone, setContactPhone] = useState("");
  const [price, setPrice] = useState("");
  const [trialDays, setTrialDays] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [revenue, setRevenue] = useState<{ month: number; all: number } | null>(null);
  const [subBusyId, setSubBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_list_businesses");
    setBusinesses((data ?? []) as BusinessRow[]);
    setLoading(false);
  }

  async function loadRevenue() {
    const { data } = await supabase.rpc("admin_revenue_summary");
    const r = data && data[0];
    if (r) setRevenue({ month: Number(r.month_total), all: Number(r.all_total) });
    const { data: mdata } = await supabase.rpc("admin_revenue_by_month");
    setMonths((mdata ?? []).map((m: any) => ({ month_start: m.month_start, total: Number(m.total), payments: m.payments })));
  }

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("key, value");
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setContactPhone(map["contact_phone"] ?? "");
    setPrice(map["subscription_price"] ?? "");
    setTrialDays(map["trial_days"] ?? "");
  }

  async function saveSettings() {
    setSavingSettings(true);
    const calls = [
      supabase.rpc("admin_set_setting", { p_key: "contact_phone", p_value: contactPhone.trim() }),
      supabase.rpc("admin_set_setting", { p_key: "subscription_price", p_value: (price.trim() || "0") }),
      supabase.rpc("admin_set_setting", { p_key: "trial_days", p_value: (trialDays.trim() || "14") }),
    ];
    const results = await Promise.all(calls);
    setSavingSettings(false);
    const err = results.find((r) => r.error);
    if (err?.error) { alert(err.error.message || "No se pudo guardar."); return; }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  }

  async function addMonths(biz: BusinessRow, months: number) {
    setSubBusyId(biz.id);
    const { data, error } = await supabase.rpc("admin_add_months", { p_business_id: biz.id, p_months: months });
    if (error) {
      alert(error.message || "No se pudo registrar el pago.");
    } else {
      const newEnd = data as unknown as string;
      setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, status: "active", subscription_ends_at: newEnd } : b)));
      loadRevenue();
    }
    setSubBusyId(null);
  }

  useEffect(() => {
    load();
    loadRevenue();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(biz: BusinessRow) {
    setBusyId(biz.id);
    if (biz.status === "pending") {
      // Aprobar: activa y le da el periodo de prueba.
      const { data, error } = await supabase.rpc("admin_grant_trial", { p_business_id: biz.id });
      if (!error) setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, status: "active", subscription_ends_at: data as unknown as string } : b)));
    } else {
      const nextStatus = biz.status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("businesses").update({ status: nextStatus }).eq("id", biz.id);
      if (!error) setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, status: nextStatus } : b)));
    }
    setBusyId(null);
  }

  async function deleteBusiness(biz: BusinessRow) {
    if (!confirm(`¿Eliminar "${biz.name}"? Esto no se puede deshacer.`)) return;
    setBusyId(biz.id);
    const { error } = await supabase.from("businesses").delete().eq("id", biz.id);
    if (!error) setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
    setBusyId(null);
  }

  async function toggleDetail(biz: BusinessRow) {
    if (expandedId === biz.id) { setExpandedId(null); return; }
    setExpandedId(biz.id);
    if (!detailById[biz.id]) {
      setDetailById((prev) => ({ ...prev, [biz.id]: "loading" }));
      const { data } = await supabase.rpc("admin_business_detail", { p_business_id: biz.id });
      const d = (data && data[0]) as Detail | undefined;
      if (d) setDetailById((prev) => ({ ...prev, [biz.id]: d }));
    }
  }

  async function changeRole(userId: string, role: Role) {
    setRoleBusyId(userId);
    const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
    if (error) {
      alert(error.message || "No se pudo cambiar el rol.");
    } else {
      setBusinesses((prev) => prev.map((b) => (b.owner_id === userId ? { ...b, owner_role: role } : b)));
    }
    setRoleBusyId(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = businesses.filter(
    (b) =>
      (typeFilter === "all" || b.type === typeFilter) &&
      (statusFilter === "all" || b.status === statusFilter) &&
      (q === "" || b.name.toLowerCase().includes(q) || b.owner_name.toLowerCase().includes(q) || b.owner_email.toLowerCase().includes(q)),
  );
  const counts = {
    total: businesses.length,
    pending: businesses.filter((b) => b.status === "pending").length,
    active: businesses.filter((b) => b.status === "active").length,
    suspended: businesses.filter((b) => b.status === "suspended").length,
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "#0A0806" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #241f16" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-semibold" style={{ background: "#C9962C", color: "#0A0806" }}>P</div>
          <span className="font-display text-base" style={{ color: "#F3EBDA" }}>Panel Maestro</span>
        </div>
        <form action={signOut}>
          <button className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg" style={{ border: "1px solid #29231a", color: "#c4b89f" }}>
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </form>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: "#C9962C" }}>ADMINISTRACIÓN PRINCIPAL</span>
        <h1 className="font-display text-2xl mt-1" style={{ color: "#F3EBDA" }}>Negocios registrados</h1>
        <p className="font-body text-sm mt-1" style={{ color: "#8a8072" }}>Gestiona las barberías y salones de la plataforma.</p>

        {/* 4 accesos */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={() => setView("businesses")} className="font-body flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: view === "businesses" ? "#C9962C" : "#141210", border: `1px solid ${view === "businesses" ? "#C9962C" : "#29231a"}`, color: view === "businesses" ? "#0A0806" : "#c4b89f" }}>
            <Store className="w-4 h-4" /> Negocios
          </button>
          <Link href="/dashboard" className="font-body flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#141210", border: "1px solid #29231a", color: "#c4b89f" }}>
            <Home className="w-4 h-4" /> Mi negocio
          </Link>
          <button onClick={() => setView("report")} className="font-body flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: view === "report" ? "#C9962C" : "#141210", border: `1px solid ${view === "report" ? "#C9962C" : "#29231a"}`, color: view === "report" ? "#0A0806" : "#c4b89f" }}>
            <BarChart3 className="w-4 h-4" /> Reporte
          </button>
          {isSuperadmin && (
            <button onClick={() => setView("settings")} className="font-body flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: view === "settings" ? "#C9962C" : "#141210", border: `1px solid ${view === "settings" ? "#C9962C" : "#29231a"}`, color: view === "settings" ? "#0A0806" : "#c4b89f" }}>
              <Settings className="w-4 h-4" /> Ajustes
            </button>
          )}
        </div>

        {/* Ajustes de la plataforma (pestaña, solo superadmin) */}
        {view === "settings" && isSuperadmin && (
          <div className="rounded-2xl p-4 mt-4" style={{ background: "#141210", border: "1px solid #29231a" }}>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-3.5 h-3.5" style={{ color: "#C9962C" }} />
              <span className="font-body text-xs font-medium" style={{ color: "#c4b89f" }}>Ajustes de la plataforma</span>
            </div>

            <label className="font-body text-[11px] block mb-1" style={{ color: "#8a8072" }}>Teléfono de contacto (lo ven los negocios suspendidos/en revisión)</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" placeholder="Ej. 809-000-0000" className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none" style={{ background: "#0f0d0b", border: "1px solid #29231a", color: "#F3EBDA" }} />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="font-body text-[11px] block mb-1" style={{ color: "#8a8072" }}>Precio mensual (RD$)</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="0" className="font-body w-full text-sm rounded-xl px-3 py-2.5 outline-none" style={{ background: "#0f0d0b", border: "1px solid #29231a", color: "#F3EBDA" }} />
              </div>
              <div>
                <label className="font-body text-[11px] block mb-1" style={{ color: "#8a8072" }}>Días de prueba</label>
                <input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} inputMode="numeric" placeholder="14" className="font-body w-full text-sm rounded-xl px-3 py-2.5 outline-none" style={{ background: "#0f0d0b", border: "1px solid #29231a", color: "#F3EBDA" }} />
              </div>
            </div>

            <button onClick={saveSettings} disabled={savingSettings} className="font-body w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: settingsSaved ? "#173a2a" : "#C9962C", color: settingsSaved ? "#7BE3AB" : "#0A0806" }}>
              {settingsSaved ? <CheckIcon className="w-4 h-4" /> : null}
              {savingSettings ? "Guardando…" : settingsSaved ? "Guardado ✓" : "Guardar ajustes"}
            </button>
          </div>
        )}

        {view === "businesses" && (<>
        <button onClick={load} disabled={loading} className="font-body w-full flex items-center justify-center gap-2 mt-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background: "#141210", border: "1px solid #29231a", color: "#c4b89f" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar datos
        </button>

        {/* Tarjetas-filtro por estado */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <StatCard icon={Users} label="Negocios totales" value={counts.total} tone="blue" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <StatCard icon={PauseCircle} label="Pendientes" value={counts.pending} tone="amber" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
          <StatCard icon={CheckCircle2} label="Activos" value={counts.active} tone="green" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
          <StatCard icon={XCircle} label="Suspendidos" value={counts.suspended} tone="red" active={statusFilter === "suspended"} onClick={() => setStatusFilter("suspended")} />
        </div>

        {/* Buscador por nombre del negocio / dueño / correo */}
        <div className="relative mt-5">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8072" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dueño o correo…"
            className="font-body w-full text-sm rounded-xl pl-9 pr-9 py-3 outline-none"
            style={{ background: "#141210", border: "1px solid #29231a", color: "#F3EBDA" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8072" }}>
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-4 mb-4">
          {[
            { key: "all" as const, label: "Todos" },
            { key: "barber" as const, label: "Barbería" },
            { key: "salon" as const, label: "Salón" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)} className="font-body text-xs font-medium px-4 py-2 rounded-full transition" style={{ background: typeFilter === t.key ? "#C9962C" : "#141210", border: typeFilter === t.key ? "1px solid #C9962C" : "1px solid #29231a", color: typeFilter === t.key ? "#0A0806" : "#8a8072" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((biz) => (
            <BusinessCard
              key={biz.id}
              biz={biz}
              busy={busyId === biz.id}
              expanded={expandedId === biz.id}
              detail={detailById[biz.id]}
              currentUserId={currentUserId}
              isSuperadmin={isSuperadmin}
              onToggleStatus={toggleStatus}
              onDelete={deleteBusiness}
              onToggleDetail={toggleDetail}
              onChangeRole={changeRole}
              onAddMonths={addMonths}
              roleBusy={roleBusyId === biz.owner_id}
              subBusy={subBusyId === biz.id}
            />
          ))}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#141210", border: "1px solid #29231a" }}>
              <p className="font-body text-sm" style={{ color: "#8a8072" }}>
                {q ? `No hay resultados para “${search}”.` : "No hay negocios con este filtro."}
              </p>
            </div>
          )}
        </div>
        </>)}

        {view === "report" && (
          <div className="mt-4">
            {/* Resumen grande */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "#141210", border: "1px solid #29231a" }}>
                <DollarSign className="w-4 h-4 mb-2" style={{ color: "#7BE3AB" }} />
                <p className="font-display text-2xl leading-none" style={{ color: "#F3EBDA" }}>RD${revenue?.month ?? 0}</p>
                <p className="font-body text-[11px] mt-1" style={{ color: "#8a8072" }}>Cobrado este mes</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#141210", border: "1px solid #29231a" }}>
                <BarChart3 className="w-4 h-4 mb-2" style={{ color: "#E3B04B" }} />
                <p className="font-display text-2xl leading-none" style={{ color: "#F3EBDA" }}>RD${revenue?.all ?? 0}</p>
                <p className="font-body text-[11px] mt-1" style={{ color: "#8a8072" }}>Total histórico</p>
              </div>
            </div>

            <button onClick={loadRevenue} className="font-body w-full flex items-center justify-center gap-2 mt-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#141210", border: "1px solid #29231a", color: "#c4b89f" }}>
              <RefreshCw className="w-4 h-4" /> Actualizar reporte
            </button>

            {/* Buscar mes */}
            <div className="relative mt-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8072" }} />
              <input value={monthSearch} onChange={(e) => setMonthSearch(e.target.value)} placeholder="Buscar mes (ej. septiembre, 2026)…" className="font-body w-full text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none" style={{ background: "#141210", border: "1px solid #29231a", color: "#F3EBDA" }} />
            </div>

            <h2 className="font-display text-lg mt-5 mb-2" style={{ color: "#F3EBDA" }}>Cobros por mes</h2>
            <div className="space-y-2">
              {months
                .map((m) => ({ ...m, label: new Date(m.month_start + "T00:00:00").toLocaleDateString("es-DO", { month: "long", year: "numeric" }) }))
                .filter((m) => monthSearch.trim() === "" || m.label.toLowerCase().includes(monthSearch.trim().toLowerCase()))
                .map((m) => (
                  <div key={m.month_start} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#141210", border: "1px solid #29231a" }}>
                    <div>
                      <p className="font-body text-sm capitalize" style={{ color: "#F3EBDA" }}>{m.label}</p>
                      <p className="font-body text-[11px]" style={{ color: "#8a8072" }}>{m.payments} pago{m.payments === 1 ? "" : "s"}</p>
                    </div>
                    <span className="font-display text-lg" style={{ color: "#7BE3AB" }}>RD${m.total}</span>
                  </div>
                ))}
              {months.length === 0 && (
                <div className="rounded-2xl p-6 text-center" style={{ background: "#141210", border: "1px solid #29231a" }}>
                  <p className="font-body text-sm" style={{ color: "#8a8072" }}>Aún no hay cobros registrados.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
