import { useState } from "react";
import {
  Menu, Users, PauseCircle, CheckCircle2, XCircle, RefreshCw,
  Scissors, Flower2, LogOut,
} from "lucide-react";

const MOCK_BUSINESSES = [
  { id: 1, name: "Corte & Cía", owner: "Albert Duverge", email: "duvergegarciaa@gmail.com", type: "barber", registered: "18 ago 2026", status: "active" },
  { id: 2, name: "Bella Studio", owner: "Rafahelis Duverge", email: "rafahelisdemojica@gmail.com", type: "salon", registered: "16 ago 2026", status: "active" },
  { id: 3, name: "Estilo Norte", owner: "Caridad Puente", email: "caridad01@gmail.com", type: "barber", registered: "16 ago 2026", status: "pending" },
  { id: 4, name: "Glow Room", owner: "Marisol Peña", email: "marisolp@gmail.com", type: "salon", registered: "10 ago 2026", status: "suspended" },
];

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: { bar: "#E3B04B", chip: "#332813", iconColor: "#E3B04B" },
    amber: { bar: "#E0A93B", chip: "#3a2f18", iconColor: "#F0C567" },
    green: { bar: "#3FBF7F", chip: "#173a2a", iconColor: "#7BE3AB" },
    red: { bar: "#E1615E", chip: "#3a1c1c", iconColor: "#F19391" },
  }[tone];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#141210", border: "1px solid #29231a" }}
    >
      <div className="h-1" style={{ background: tones.bar }} />
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: tones.chip }}
          >
            <Icon className="w-4 h-4" style={{ color: tones.iconColor }} />
          </div>
          <span className="font-body text-sm" style={{ color: "#c4b89f" }}>{label}</span>
        </div>
        <span className="font-display text-2xl" style={{ color: "#F3EBDA" }}>{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { text: "Activo", bg: "#173a2a", color: "#7BE3AB" },
    pending: { text: "Pendiente", bg: "#3a2f18", color: "#F0C567" },
    suspended: { text: "Suspendido", bg: "#3a1c1c", color: "#F19391" },
  }[status];
  return (
    <span
      className="font-body text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: map.bg, color: map.color }}
    >
      {map.text}
    </span>
  );
}

function BusinessRow({ biz }) {
  const isBarber = biz.type === "barber";
  const typeColor = isBarber
    ? { from: "#C0293A", to: "#2C4A87" }
    : { from: "#E5AEC0", to: "#9B6B90" };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#141210", border: "1px solid #29231a" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${typeColor.from}, ${typeColor.to})` }}
        >
          {isBarber ? (
            <Scissors className="w-4 h-4" style={{ color: "#F3EBDA" }} strokeWidth={2.5} />
          ) : (
            <Flower2 className="w-4 h-4" style={{ color: "#2c1f28" }} strokeWidth={2.5} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-base truncate" style={{ color: "#F3EBDA" }}>
              {biz.name}
            </h4>
            <StatusBadge status={biz.status} />
          </div>
          <p className="font-body text-xs mt-0.5" style={{ color: "#8a8072" }}>
            {biz.owner} · {biz.email}
          </p>
          <p className="font-body text-[11px] mt-1 uppercase tracking-wide" style={{ color: "#6b6355" }}>
            {isBarber ? "Barbería" : "Salón de belleza"} · Registrado {biz.registered}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition"
          style={{ border: "1px solid #3a3222", color: "#c4b89f" }}
        >
          Ver detalle
        </button>
        <button
          className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition"
          style={{ border: "1px solid #4a3a1f", color: "#F0C567" }}
        >
          {biz.status === "suspended" ? "Activar" : "Suspender"}
        </button>
        <button
          className="font-body flex-1 text-xs font-medium py-2 rounded-lg transition"
          style={{ border: "1px solid #4a1f1f", color: "#F19391" }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [filter, setFilter] = useState("all");

  const filtered = MOCK_BUSINESSES.filter(
    (b) => filter === "all" || b.type === filter
  );

  const counts = {
    total: MOCK_BUSINESSES.length,
    pending: MOCK_BUSINESSES.filter((b) => b.status === "pending").length,
    active: MOCK_BUSINESSES.filter((b) => b.status === "active").length,
    suspended: MOCK_BUSINESSES.filter((b) => b.status === "suspended").length,
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "#0A0806" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid #241f16" }}
      >
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#141210", border: "1px solid #29231a" }}
          >
            <Menu className="w-4 h-4" style={{ color: "#c4b89f" }} />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-semibold"
            style={{ background: "#C9962C", color: "#0A0806" }}
          >
            P
          </div>
          <span className="font-display text-base" style={{ color: "#F3EBDA" }}>
            Panel Maestro
          </span>
        </div>
        <button
          className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
          style={{ border: "1px solid #29231a", color: "#c4b89f" }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: "#C9962C" }}>
          ADMINISTRACIÓN PRINCIPAL
        </span>
        <h1 className="font-display text-2xl mt-1" style={{ color: "#F3EBDA" }}>
          Negocios registrados
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: "#8a8072" }}>
          Gestiona las barberías y salones activos en la plataforma.
        </p>

        <button
          className="font-body w-full flex items-center justify-center gap-2 mt-5 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#141210", border: "1px solid #29231a", color: "#c4b89f" }}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar datos
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <StatCard icon={Users} label="Negocios totales" value={counts.total} tone="blue" />
          <StatCard icon={PauseCircle} label="Pendientes" value={counts.pending} tone="amber" />
          <StatCard icon={CheckCircle2} label="Activos" value={counts.active} tone="green" />
          <StatCard icon={XCircle} label="Suspendidos" value={counts.suspended} tone="red" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-7 mb-4">
          {[
            { key: "all", label: "Todos" },
            { key: "barber", label: "Barbería" },
            { key: "salon", label: "Salón" },
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

        {/* List */}
        <div className="space-y-3">
          {filtered.map((biz) => (
            <BusinessRow key={biz.id} biz={biz} />
          ))}
        </div>
      </div>
    </div>
  );
}
