import { useState, useRef, useEffect, useMemo } from "react";
import {
  Scissors, Flower2, Users, CalendarClock, LogOut,
  CalendarDays, ChevronLeft, ChevronRight, Ban, CheckCheck,
  Bell, BarChart3, DollarSign,
} from "lucide-react";

const INITIAL_APPOINTMENTS = [
  { id: 1, client: "Junior Reyes", service: "Corte + barba", staff: "Manuel", time: "10:00 am", price: 800 },
  { id: 2, client: "Elvin Castillo", service: "Corte clásico", staff: "Pedro", time: "10:30 am", price: 400 },
  { id: 3, client: "Yeimi Sosa", service: "Coloración", staff: "Manuel", time: "11:15 am", price: 2200 },
  { id: 4, client: "Carlos Peña", service: "Diseño de barba", staff: "Pedro", time: "12:00 pm", price: 350 },
];

const HOLD_MS = 1000;
const DRAG_THRESHOLD = 110;
const STILL_THRESHOLD = 20;

function AppointmentCard({ appt, theme, onResolve }) {
  const [progress, setProgress] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [exit, setExit] = useState(null); // null | 'attended' | 'noshow'
  const startX = useRef(0);
  const startT = useRef(0);
  const raf = useRef(null);
  const dragging = useRef(false);
  const resolvedRef = useRef(false);
  const pointerId = useRef(null);

  const stopLoop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  const loop = () => {
    const elapsed = performance.now() - startT.current;
    const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
    setProgress(pct);
    if (pct >= 100) {
      finish("attended");
      return;
    }
    raf.current = requestAnimationFrame(loop);
  };

  const finish = (type) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopLoop();
    setExit(type);
    setTimeout(() => onResolve(appt.id, type === "attended"), 280);
  };

  const onDown = (e) => {
    if (resolvedRef.current) return;
    // Captura el puntero a ESTA fila, así el gesto no "salta" a otra fila
    // aunque el dedo/mouse se mueva por encima de las de al lado.
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);

    startX.current = e.clientX;
    startT.current = performance.now();
    dragging.current = false;
    setProgress(0);
    setDragX(0);
    raf.current = requestAnimationFrame(loop);
  };

  const onMove = (e) => {
    if (resolvedRef.current || e.pointerId !== pointerId.current) return;
    const delta = e.clientX - startX.current;

    if (!dragging.current && Math.abs(delta) > STILL_THRESHOLD) {
      dragging.current = true;
      stopLoop();
      setProgress(0);
    }

    if (dragging.current) {
      setDragX(delta);
      // Solo se llena la barra roja; la eliminación se confirma al soltar.
    }
  };

  const onUp = (e) => {
    if (resolvedRef.current || e.pointerId !== pointerId.current) return;
    stopLoop();
    const finalDragPct = Math.min(100, (Math.abs(dragX) / DRAG_THRESHOLD) * 100);
    if (dragging.current && finalDragPct >= 100) {
      finish("noshow");
    } else {
      setProgress(0);
      setDragX(0);
    }
    dragging.current = false;
  };

  useEffect(() => stopLoop, []);

  const exiting = exit !== null;
  const dragPct = Math.min(100, (Math.abs(dragX) / DRAG_THRESHOLD) * 100);
  const showGreenLabel = progress > 45 && !dragging.current;
  const showRedLabel = dragging.current && dragPct > 45;

  return (
    <div
      className="relative overflow-hidden select-none touch-none rounded-xl"
      style={{
        transition: exiting ? "opacity 0.28s ease, transform 0.28s ease, max-height 0.28s ease" : "transform 0.15s ease",
        opacity: exiting ? 0 : 1,
        transform: exiting
          ? `translateX(${exit === "attended" ? 40 : -40}px) scale(0.96)`
          : `translateX(${dragX}px) scale(${progress > 0 ? 1.015 : 1})`,
        maxHeight: exiting ? 0 : 100,
        marginBottom: exiting ? 0 : 8,
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Barra de progreso verde, se llena de izquierda a derecha al sostener */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "#1c3a2c",
          width: `${progress}%`,
          transition: progress === 0 ? "width 0.15s ease" : "none",
        }}
      />
      {/* Barra de progreso roja, se llena según cuánto arrastras */}
      {dragging.current && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "#3a1c1c",
            width: `${dragPct}%`,
            marginLeft: dragX < 0 ? "auto" : 0,
          }}
        />
      )}

      <div
        className="relative rounded-xl p-3 flex items-center gap-3"
        style={{ background: progress > 0 || dragging.current ? "transparent" : theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display text-sm"
          style={{ background: theme.chipBg, color: theme.accentRing }}
        >
          {appt.client.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-medium truncate" style={{ color: theme.textPrimary }}>
            {appt.client}
          </p>
          <p className="font-body text-xs truncate" style={{ color: theme.textMuted }}>
            {appt.service} · con {appt.staff}
          </p>
        </div>
        {showGreenLabel ? (
          <span
            className="font-body text-xs font-semibold shrink-0"
            style={{ color: "#7BE3AB", opacity: Math.min(1, (progress - 45) / 30) }}
          >
            {progress >= 100 ? "Atendido ✓" : "Atendido…"}
          </span>
        ) : showRedLabel ? (
          <span
            className="font-body text-xs font-semibold shrink-0"
            style={{ color: "#F19391", opacity: Math.min(1, (dragPct - 45) / 30) }}
          >
            {dragPct >= 100 ? "Eliminado ✓" : "Eliminado…"}
          </span>
        ) : (
          <span className="font-body text-xs font-medium shrink-0" style={{ color: theme.textPrimary }}>
            {appt.time}
          </span>
        )}
      </div>
    </div>
  );
}

const TIME_SLOTS = [
  "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30",
  "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30",
];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildDays(startOffset, count) {
  const days = [];
  const base = new Date();
  base.setDate(base.getDate() + startOffset);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: DAY_LABELS[d.getDay()],
      num: d.getDate(),
    });
  }
  return days;
}

function CalendarView({ theme, onBack }) {
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [blockedBySlot, setBlockedBySlot] = useState({});

  const days = useMemo(() => buildDays(dayOffset, 7), [dayOffset]);
  const activeKey = selectedDate ?? days[0].key;
  const blockedSet = blockedBySlot[activeKey] ?? new Set();
  const fullDayBlocked = blockedSet.size === TIME_SLOTS.length;

  const toggleSlot = (i) => {
    const next = new Set(blockedSet);
    next.has(i) ? next.delete(i) : next.add(i);
    setBlockedBySlot({ ...blockedBySlot, [activeKey]: next });
  };
  const blockFullDay = () => setBlockedBySlot({ ...blockedBySlot, [activeKey]: new Set(TIME_SLOTS.map((_, i) => i)) });
  const clearDay = () => setBlockedBySlot({ ...blockedBySlot, [activeKey]: new Set() });

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body flex items-center gap-1.5 text-sm font-medium mb-5"
        style={{ color: theme.accentRing }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
        DISPONIBILIDAD
      </span>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
        Tus horarios
      </h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
        Toca un horario para bloquearlo. Toca de nuevo para reabrirlo.
      </p>

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setDayOffset(Math.max(0, dayOffset - 7))}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const active = d.key === activeKey;
            const dayBlocked = blockedBySlot[d.key]?.size === TIME_SLOTS.length;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedDate(d.key)}
                className="rounded-xl py-2 flex flex-col items-center"
                style={{
                  background: active ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.cardBg,
                  border: `1px solid ${active ? theme.accentRing : theme.cardBorder}`,
                }}
              >
                <span className="font-body text-[10px] uppercase" style={{ color: active ? theme.buttonText : theme.textMuted }}>
                  {d.label}
                </span>
                <span className="font-display text-sm" style={{ color: active ? theme.buttonText : theme.textPrimary }}>
                  {d.num}
                </span>
                {dayBlocked && !active && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: theme.textMuted }} />}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setDayOffset(dayOffset + 7)}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={blockFullDay}
          className="font-body flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}
        >
          <Ban className="w-3.5 h-3.5" />
          Bloquear todo el día
        </button>
        <button
          onClick={clearDay}
          className="font-body flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Abrir todo el día
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot, i) => {
            const blocked = blockedSet.has(i);
            return (
              <button
                key={slot}
                onClick={() => toggleSlot(i)}
                className="font-body text-xs font-medium py-3 rounded-lg"
                style={{
                  background: blocked ? "#241a12" : theme.chipBg,
                  color: blocked ? theme.textMuted : theme.accentRing,
                  textDecoration: blocked ? "line-through" : "none",
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const REPORT_DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildPastDays(count) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: i === 0 ? "Hoy" : i === 1 ? "Ayer" : REPORT_DAY_LABELS[d.getDay()],
      num: d.getDate(),
      offset: i,
    });
  }
  return days;
}

// Datos de ejemplo; en producción vendrían del cotejo diario acumulado.
const REPORT_DATA = {
  0: { clients: 4, total: 3750, breakdown: [
    { service: "Coloración", count: 1, subtotal: 2200 },
    { service: "Corte + barba", count: 1, subtotal: 800 },
    { service: "Corte clásico", count: 1, subtotal: 400 },
    { service: "Diseño de barba", count: 1, subtotal: 350 },
  ]},
  1: { clients: 7, total: 3450, breakdown: [
    { service: "Corte fade", count: 3, subtotal: 1350 },
    { service: "Corte clásico", count: 3, subtotal: 1200 },
    { service: "Diseño de barba", count: 1, subtotal: 350 },
    { service: "Corte + barba", count: 1, subtotal: 800 }, // extra manual, no altera total base
  ]},
  2: { clients: 3, total: 1550, breakdown: [
    { service: "Corte fade", count: 2, subtotal: 900 },
    { service: "Corte clásico", count: 1, subtotal: 400 },
    { service: "Diseño de barba", count: 1, subtotal: 350 },
  ]},
  3: { clients: 5, total: 2650, breakdown: [
    { service: "Corte + barba", count: 2, subtotal: 1600 },
    { service: "Corte clásico", count: 2, subtotal: 800 },
    { service: "Diseño de barba", count: 1, subtotal: 350 },
  ]},
};

function ReportView({ theme, onBack }) {
  const [selected, setSelected] = useState(0);
  const days = buildPastDays(14);
  const data = REPORT_DATA[selected];
  const maxSubtotal = data ? Math.max(...data.breakdown.map((b) => b.subtotal)) : 0;

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body flex items-center gap-1.5 text-sm font-medium mb-5"
        style={{ color: theme.accentRing }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
        REPORTE
      </span>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
        Cómo te fue
      </h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
        Elige un día para ver cuánto hiciste.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: "none" }}>
        {days.map((d) => {
          const active = selected === d.offset;
          return (
            <button
              key={d.key}
              onClick={() => setSelected(d.offset)}
              className="rounded-xl py-2.5 px-3 flex flex-col items-center shrink-0"
              style={{
                background: active ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.cardBg,
                border: `1px solid ${active ? theme.accentRing : theme.cardBorder}`,
                minWidth: 56,
              }}
            >
              <span className="font-body text-[10px] uppercase" style={{ color: active ? theme.buttonText : theme.textMuted }}>
                {d.label}
              </span>
              <span className="font-display text-sm" style={{ color: active ? theme.buttonText : theme.textPrimary }}>
                {d.num}
              </span>
            </button>
          );
        })}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <Users className="w-4 h-4 mb-2" style={{ color: theme.accentRing }} />
              <p className="font-display text-2xl" style={{ color: theme.textPrimary }}>{data.clients}</p>
              <p className="font-body text-xs" style={{ color: theme.textMuted }}>Clientes atendidos</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <DollarSign className="w-4 h-4 mb-2" style={{ color: theme.accentRing }} />
              <p className="font-display text-2xl" style={{ color: theme.textPrimary }}>RD${data.total}</p>
              <p className="font-body text-xs" style={{ color: theme.textMuted }}>Total generado</p>
            </div>
          </div>

          <h2 className="font-display text-lg mb-1" style={{ color: theme.textPrimary }}>
            Qué más rentó
          </h2>
          <p className="font-body text-xs mb-3" style={{ color: theme.textMuted }}>
            Tipos de corte de ese día, de mayor a menor.
          </p>

          <div className="space-y-2">
            {data.breakdown
              .slice()
              .sort((a, b) => b.subtotal - a.subtotal)
              .map((b) => (
                <div key={b.service} className="rounded-xl p-3" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                      {b.service} <span style={{ color: theme.textMuted }}>· {b.count}</span>
                    </span>
                    <span className="font-body text-sm font-semibold" style={{ color: theme.accentRing }}>
                      RD${b.subtotal}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: theme.divider }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(b.subtotal / maxSubtotal) * 100}%`,
                        background: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-body text-sm" style={{ color: theme.textMuted }}>
            Sin datos registrados ese día.
          </p>
        </div>
      )}
    </div>
  );
}

export default function OperationsDashboard() {
  const [businessType] = useState("barber");
  const [view, setView] = useState("dashboard");
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [notified, setNotified] = useState(null);
  const isBarber = businessType === "barber";

  const theme = isBarber
    ? {
        pageBg: "radial-gradient(circle at 50% 0%, #1a1610 0%, #0a0806 55%, #050403 100%)",
        cardBg: "#12100c",
        cardBorder: "#29231a",
        textPrimary: "#F3EBDA",
        textMuted: "#8a8072",
        divider: "#241f16",
        accentFrom: "#E3B04B",
        accentTo: "#B8862F",
        accentRing: "#C9962C",
        buttonText: "#161208",
        chipBg: "#332813",
      }
    : {
        pageBg: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #FBF3F5 55%, #F7E9ED 100%)",
        cardBg: "#FFFFFF",
        cardBorder: "#F0DCE2",
        textPrimary: "#3A2530",
        textMuted: "#9A7A87",
        divider: "#F0DCE2",
        accentFrom: "#E7A6BC",
        accentTo: "#C77E9B",
        accentRing: "#D890A8",
        buttonText: "#FFFFFF",
        chipBg: "#F7DCE4",
      };

  const handleResolve = (id, attended) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const notifyBarber = (name) => {
    setNotified(name);
    // Simula que se "apaga sola" pasado un momento; en producción se apagaría
    // en cuanto el primer cliente tome el cupo, no por tiempo.
    setTimeout(() => setNotified((n) => (n === name ? null : n)), 3000);
  };

  return (
    <div className="min-h-screen w-full transition-colors duration-300" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.divider}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            {isBarber ? (
              <Scissors className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            ) : (
              <Flower2 className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            )}
          </div>
          <span className="font-display text-base" style={{ color: theme.textPrimary }}>
            {isBarber ? "Corte & Cía" : "Bella Studio"}
          </span>
        </div>
        <button
          className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
          style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textMuted }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir
        </button>
      </div>

      <div className="px-5 py-6 max-w-sm mx-auto">
        {view === "calendar" ? (
          <CalendarView theme={theme} onBack={() => setView("dashboard")} />
        ) : view === "report" ? (
          <ReportView theme={theme} onBack={() => setView("dashboard")} />
        ) : (
          <>
            <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
              OPERACIONES
            </span>
            <h1 className="font-display text-2xl mt-1" style={{ color: theme.textPrimary }}>
              Tu negocio hoy
            </h1>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <Users className="w-4 h-4 mb-2" style={{ color: theme.accentRing }} />
                <p className="font-display text-2xl" style={{ color: theme.textPrimary }}>132</p>
                <p className="font-body text-xs" style={{ color: theme.textMuted }}>Clientes registrados</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <CalendarClock className="w-4 h-4 mb-2" style={{ color: theme.accentRing }} />
                <p className="font-display text-2xl" style={{ color: theme.textPrimary }}>{INITIAL_APPOINTMENTS.length}</p>
                <p className="font-body text-xs" style={{ color: theme.textMuted }}>Citas agendadas hoy</p>
              </div>
            </div>

            <div className="rounded-2xl p-4 mt-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4" style={{ color: theme.accentRing }} />
                <span className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                  Notificar disponibilidad
                </span>
              </div>
              <div className="space-y-2">
                {["Manuel", "Pedro"].map((name) => (
                  <button
                    key={name}
                    onClick={() => notifyBarber(name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{
                      background: notified === name ? "rgba(63,191,127,0.14)" : theme.chipBg,
                      border: `1px solid ${notified === name ? "#3FBF7F" : "transparent"}`,
                    }}
                  >
                    <span className="font-body text-sm" style={{ color: theme.textPrimary }}>{name} está libre ahora</span>
                    <span className="font-body text-xs font-semibold" style={{ color: notified === name ? "#3FBF7F" : theme.accentRing }}>
                      {notified === name ? "Enviada ✓" : "Notificar"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-7 mb-3">
              <h2 className="font-display text-lg" style={{ color: theme.textPrimary }}>
                Citas de hoy
              </h2>
              <button
                onClick={() => setView("calendar")}
                className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: theme.chipBg, color: theme.accentRing }}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendario
              </button>
            </div>

            <p className="font-body text-xs mb-3" style={{ color: theme.textMuted }}>
              Mantén presionado 1 segundo si el cliente llegó. Desliza a un lado si no llegó.
            </p>

            <div>
              {appointments.map((a) => (
                <AppointmentCard key={a.id} appt={a} theme={theme} onResolve={handleResolve} />
              ))}
              {appointments.length === 0 && (
                <div className="rounded-xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                  <p className="font-body text-sm" style={{ color: theme.textMuted }}>
                    Ya cotejaste todas las citas de hoy.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setView("report")}
              className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-7"
              style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}
            >
              <BarChart3 className="w-4 h-4" />
              Reporte
            </button>
          </>
        )}
      </div>
    </div>
  );
}
