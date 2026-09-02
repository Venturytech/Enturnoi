"use client";

import { useEffect, useState } from "react";
import {
  Menu, Users, PauseCircle, CheckCircle2, XCircle, RefreshCw,
  Scissors, Flower2, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";

type BusinessRow = {
  id: string;
  name: string;
  type: "barber" | "salon";
  status: "active" | "pending" | "suspended";
  owner_name: string;
  owner_email: string;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "blue" | "amber" | "green" | "red" }) {
  const tones = {
    blue: { bar: "#E3B04B", chip: "#332813", iconColor: "#E3B04B" },
    amber: { bar: "#E0A93B", chip: "#3a2f18", iconColor: "#F0C567" },
    green: { bar: "#3FBF7F", chip: "#173a2a", iconColor: "#7BE3AB" },
    red: { bar: "#E1615E", chip: "#3a1c1c", iconColor: "#F19391" },
  }[tone];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#141210", border: "1px solid #29231a" }}>
      <div className="h-1" style={{ background: tones.bar }} />
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: tones.chip }}>
            <Icon className="w-4 h-4" style={{ color: tones.iconColor }} />
          </div>
          <span className="font-body text-sm" style={{ color: "#c4b89f" }}>{label}</span>
        </div>
        <span className="font-display text-2xl" style={{ color: "#F3EBDA" }}>{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BusinessRow["status"] }) {
  const map = {
    active: { text: "Activo", bg: "#173a2a", color: "#7BE3AB" },
    pending: { text: "Pendiente", bg: "#3a2f18", color: "#F0C567" },
    suspended: { text: "Suspendido", bg: "#3a1c1c", color: "#F19391" },
  }[status];
  return (
    <span className="font-body text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: map.bg, color: map.color }}>
      {map.text}
    </span>
  );
}

function BusinessCard({
  biz, onToggleStatus, onDelete, busy,
}: {
  biz: BusinessRow;
  onToggleStatus: (biz: BusinessRow) => void;
  onDelete: (biz: BusinessRow) => void;
  busy: boolean;
}) {
  const isBarber = biz.type === "barber";
  const typeColor = isBarber ? { from: "#C0293A", to: "#2C4A87" } : { from: "#E5AEC0", to: "#9B6B90" };

  return (
    <div className="rounded-2xl p-4" style={{ background: "#141210", border: "1px solid #29231a" }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${typeColor.from}, ${typeColor.to})` }}>
          {isBarber ? <Scissors className="w-4 h-4" style={{ color: "#F3EBDA" }} strokeWidth={2.5} /> : <Flower2 className="w-4 h-4" style={{ color: "#2c1f28" }} strokeWidth={2.5} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-base truncate" style={{ color: "#F3EBDA" }}>{biz.name}</h4>
            <StatusBadge status={biz.status} />
          </div>
          <p className="font-body text-xs mt-0.5" style={{ color: "#8a8072" }}>{biz.owner_name} · {biz.owner_email}</p>
          <p className="font-body text-[11px] mt-1 uppercase tracking-wide" style={{ color: "#6b6355" }}>
            {isBarber ? "Barbería" : "Salón de belleza"} · Registrado {formatDate(biz.created_at)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition" style={{ border: "1px solid #3a3222", color: "#c4b89f" }}>
          Ver detalle
        </button>
        <button
          onClick={() => onToggleStatus(biz)}
          disabled={busy}
          className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition disabled:opacity-40"
          style={{ border: "1px solid #4a3a1f", color: "#F0C567" }}
        >
          {biz.status === "suspended" ? "Activar" : "Suspender"}
        </button>
        <button
          onClick={() => onDelete(biz)}
          disabled={busy}
          className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition disabled:opacity-40"
          style={{ border: "1px solid #4a1f1f", color: "#F19391" }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function AdminPanelClient() {
  const supabase = createClient();
  const [filter, setFilter] = useState<"all" | "barber" | "salon">("all");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_list_businesses");
    setBusinesses(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(biz: BusinessRow) {
    setBusyId(biz.id);
    const nextStatus = biz.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("businesses").update({ status: nextStatus }).eq("id", biz.id);
    if (!error) {
      setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, status: nextStatus } : b)));
    }
    setBusyId(null);
  }

  async function deleteBusiness(biz: BusinessRow) {
    if (!confirm(`¿Eliminar "${biz.name}"? Esto no se puede deshacer.`)) return;
    setBusyId(biz.id);
    const { error } = await supabase.from("businesses").delete().eq("id", biz.id);
    if (!error) {
      setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
    }
    setBusyId(null);
  }

  const filtered = businesses.filter((b) => filter === "all" || b.type === filter);
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
          <button className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#141210", border: "1px solid #29231a" }}>
            <Menu className="w-4 h-4" style={{ color: "#c4b89f" }} />
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-semibold" style={{ background: "#C9962C", color: "#0A0806" }}>
            P
          </div>
          <span className="font-display text-base" style={{ color: "#F3EBDA" }}>Panel Maestro</span>
        </div>
        <form action={signOut}>
          <button className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg" style={{ border: "1px solid #29231a", color: "#c4b89f" }}>
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: "#C9962C" }}>ADMINISTRACIÓN PRINCIPAL</span>
        <h1 className="font-display text-2xl mt-1" style={{ color: "#F3EBDA" }}>Negocios registrados</h1>
        <p className="font-body text-sm mt-1" style={{ color: "#8a8072" }}>Gestiona las barberías y salones activos en la plataforma.</p>

        <button
          onClick={load}
          disabled={loading}
          className="font-body w-full flex items-center justify-center gap-2 mt-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ background: "#141210", border: "1px solid #29231a", color: "#c4b89f" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar datos
        </button>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <StatCard icon={Users} label="Negocios totales" value={counts.total} tone="blue" />
          <StatCard icon={PauseCircle} label="Pendientes" value={counts.pending} tone="amber" />
          <StatCard icon={CheckCircle2} label="Activos" value={counts.active} tone="green" />
          <StatCard icon={XCircle} label="Suspendidos" value={counts.suspended} tone="red" />
        </div>

        <div className="flex gap-2 mt-7 mb-4">
          {[
            { key: "all" as const, label: "Todos" },
            { key: "barber" as const, label: "Barbería" },
            { key: "salon" as const, label: "Salón" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="font-body text-xs font-medium px-4 py-2 rounded-full transition"
              style={{
                background: filter === tab.key ? "#C9962C" : "#141210",
                border: filter === tab.key ? "1px solid #C9962C" : "1px solid #29231a",
                color: filter === tab.key ? "#0A0806" : "#8a8072",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} onToggleStatus={toggleStatus} onDelete={deleteBusiness} busy={busyId === biz.id} />
          ))}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#141210", border: "1px solid #29231a" }}>
              <p className="font-body text-sm" style={{ color: "#8a8072" }}>No hay negocios en esta categoría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
