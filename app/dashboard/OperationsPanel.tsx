"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Scissors, Flower2, Users, CalendarClock, LogOut,
  CalendarDays, ChevronLeft, ChevronRight, Ban, CheckCheck,
  Bell, BarChart3, DollarSign, Share2, Check as CheckIcon, Tv,
  Settings, Plus, Trash2, ImagePlus, Loader2, Save, UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, type BusinessType, type Theme } from "@/lib/theme";
import { signOut } from "@/app/auth/actions";

// ---------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------
type Business = { id: string; name: string; type: BusinessType; status: string; logo_url: string | null; invite_slug: string; phone: string | null; address: string | null };
type Staff = { id: string; name: string; specialty: string | null; photo_url: string | null };

type RawAppointment = {
  id: string;
  appt_time: string; // "HH:MM:SS"
  price: number;
  status: string;
  staff: { id: string; name: string } | null;
  client: { name: string } | null;
  business_service: { catalog: { name: string } | null } | null;
};

type ViewAppointment = {
  id: string;
  client: string;
  service: string;
  staff: string;
  time: string;
  price: number;
};

function toDisplayTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function toViewAppointment(a: RawAppointment): ViewAppointment {
  return {
    id: a.id,
    client: a.client?.name ?? "Cliente",
    service: a.business_service?.catalog?.name ?? "Servicio",
    staff: a.staff?.name ?? "—",
    time: toDisplayTime(a.appt_time),
    price: Number(a.price),
  };
}

// ---------------------------------------------------------------
// Tarjeta de cita: mantener presionado = atendido, arrastrar = no llegó.
// (Lógica de gesto tomada tal cual del prototipo — usa setPointerCapture
// para que el gesto no salte de fila si el dedo se mueve.)
// ---------------------------------------------------------------
const HOLD_MS = 1000;
const DRAG_THRESHOLD = 110;
const STILL_THRESHOLD = 20;

function AppointmentCard({
  appt,
  theme,
  onResolve,
}: {
  appt: ViewAppointment;
  theme: Theme;
  onResolve: (id: string, attended: boolean) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [exit, setExit] = useState<null | "attended" | "noshow">(null);
  const startX = useRef(0);
  const startT = useRef(0);
  const raf = useRef<number | null>(null);
  const dragging = useRef(false);
  const resolvedRef = useRef(false);
  const pointerId = useRef<number | null>(null);

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

  const finish = (type: "attended" | "noshow") => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopLoop();
    setExit(type);
    setTimeout(() => onResolve(appt.id, type === "attended"), 280);
  };

  const onDown = (e: React.PointerEvent) => {
    if (resolvedRef.current) return;
    pointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startT.current = performance.now();
    dragging.current = false;
    setProgress(0);
    setDragX(0);
    raf.current = requestAnimationFrame(loop);
  };

  const onMove = (e: React.PointerEvent) => {
    if (resolvedRef.current || e.pointerId !== pointerId.current) return;
    const delta = e.clientX - startX.current;
    if (!dragging.current && Math.abs(delta) > STILL_THRESHOLD) {
      dragging.current = true;
      stopLoop();
      setProgress(0);
    }
    if (dragging.current) setDragX(delta);
  };

  const onUp = (e: React.PointerEvent) => {
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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "#1c3a2c", width: `${progress}%`, transition: progress === 0 ? "width 0.15s ease" : "none" }}
      />
      {dragging.current && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "#3a1c1c", width: `${dragPct}%`, marginLeft: dragX < 0 ? "auto" : 0 }}
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
          <p className="font-body text-sm font-medium truncate" style={{ color: theme.textPrimary }}>{appt.client}</p>
          <p className="font-body text-xs truncate" style={{ color: theme.textMuted }}>
            {appt.service} · con {appt.staff}
          </p>
        </div>
        {showGreenLabel ? (
          <span className="font-body text-xs font-semibold shrink-0" style={{ color: "#7BE3AB", opacity: Math.min(1, (progress - 45) / 30) }}>
            {progress >= 100 ? "Atendido ✓" : "Atendido…"}
          </span>
        ) : showRedLabel ? (
          <span className="font-body text-xs font-semibold shrink-0" style={{ color: "#F19391", opacity: Math.min(1, (dragPct - 45) / 30) }}>
            {dragPct >= 100 ? "No llegó ✓" : "No llegó…"}
          </span>
        ) : (
          <span className="font-body text-xs font-medium shrink-0" style={{ color: theme.textPrimary }}>{appt.time}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Calendario de disponibilidad, por barbero/estilista, real en Supabase
// ---------------------------------------------------------------
const TIME_SLOTS = [
  "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30",
  "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30",
];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildDays(startOffset: number, count: number) {
  const days = [];
  const base = new Date();
  base.setDate(base.getDate() + startOffset);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({ key: d.toISOString().slice(0, 10), label: DAY_LABELS[d.getDay()], num: d.getDate() });
  }
  return days;
}

function CalendarView({ theme, staff, onBack }: { theme: Theme; staff: Staff[]; onBack: () => void }) {
  const supabase = createClient();
  const [activeStaffId, setActiveStaffId] = useState(staff[0]?.id ?? "");
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [dayMarks, setDayMarks] = useState<Record<string, boolean>>({});

  const days = useMemo(() => buildDays(dayOffset, 7), [dayOffset]);
  const activeKey = selectedDate ?? days[0].key;

  // Carga la disponibilidad guardada al cambiar de barbero o de día
  useEffect(() => {
    if (!activeStaffId) return;
    supabase
      .from("staff_availability")
      .select("blocked_slots")
      .eq("staff_id", activeStaffId)
      .eq("day", activeKey)
      .maybeSingle()
      .then(({ data }) => setBlockedSet(new Set(data?.blocked_slots ?? [])));
  }, [activeStaffId, activeKey]);

  async function persist(next: Set<string>) {
    setBlockedSet(next);
    setDayMarks((prev) => ({ ...prev, [activeKey]: next.size === TIME_SLOTS.length }));
    await supabase
      .from("staff_availability")
      .upsert(
        { staff_id: activeStaffId, day: activeKey, blocked_slots: Array.from(next) },
        { onConflict: "staff_id,day" }
      );
  }

  const toggleSlot = (slot: string) => {
    const next = new Set(blockedSet);
    next.has(slot) ? next.delete(slot) : next.add(slot);
    persist(next);
  };
  const blockFullDay = () => persist(new Set(TIME_SLOTS));
  const clearDay = () => persist(new Set());

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-5 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>DISPONIBILIDAD</span>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Horarios del equipo</h1>
      <p className="font-body text-sm mb-4" style={{ color: theme.textMuted }}>Elige quién, luego toca un horario para bloquearlo.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStaffId(s.id)}
            className="font-body text-xs font-medium px-3 py-2 rounded-full shrink-0"
            style={{
              background: activeStaffId === s.id ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.chipBg,
              color: activeStaffId === s.id ? theme.buttonText : theme.accentRing,
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setDayOffset(Math.max(0, dayOffset - 7))} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <ChevronLeft className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const active = d.key === activeKey;
            const fullyBlocked = dayMarks[d.key];
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
                <span className="font-body text-[10px] uppercase" style={{ color: active ? theme.buttonText : theme.textMuted }}>{d.label}</span>
                <span className="font-display text-sm" style={{ color: active ? theme.buttonText : theme.textPrimary }}>{d.num}</span>
                {fullyBlocked && !active && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: theme.textMuted }} />}
              </button>
            );
          })}
        </div>
        <button onClick={() => setDayOffset(dayOffset + 7)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <ChevronRight className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={blockFullDay} className="font-body flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}>
          <Ban className="w-3.5 h-3.5" />
          Bloquear todo el día
        </button>
        <button onClick={clearDay} className="font-body flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}>
          <CheckCheck className="w-3.5 h-3.5" />
          Abrir todo el día
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot) => {
            const blocked = blockedSet.has(slot);
            return (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                className="font-body text-xs font-medium py-3 rounded-lg"
                style={{ background: blocked ? "#241a12" : theme.chipBg, color: blocked ? theme.textMuted : theme.accentRing, textDecoration: blocked ? "line-through" : "none" }}
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

// ---------------------------------------------------------------
// Reporte real: citas atendidas por día, desglosadas por servicio
// ---------------------------------------------------------------
const REPORT_DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildPastDays(count: number) {
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

type ReportData = { clients: number; total: number; breakdown: { service: string; count: number; subtotal: number }[] };

function ReportView({ theme, businessId, onBack }: { theme: Theme; businessId: string; onBack: () => void }) {
  const supabase = createClient();
  const [selected, setSelected] = useState(0);
  const [data, setData] = useState<ReportData | null>(null);
  const days = useMemo(() => buildPastDays(14), []);

  useEffect(() => {
    const dateKey = days.find((d) => d.offset === selected)!.key;
    supabase
      .from("appointments")
      .select(
        `id, price, client_id, business_service:business_service_id ( catalog:catalog_service_id ( name ) )`
      )
      .eq("business_id", businessId)
      .eq("appt_date", dateKey)
      .eq("status", "attended")
      .then(({ data: rows }) => {
        if (!rows || rows.length === 0) {
          setData(null);
          return;
        }
        const clients = new Set(rows.map((r: any) => r.client_id)).size;
        const total = rows.reduce((sum: number, r: any) => sum + Number(r.price), 0);
        const byService = new Map<string, { count: number; subtotal: number }>();
        rows.forEach((r: any) => {
          const name = r.business_service?.catalog?.name ?? "Otro";
          const prev = byService.get(name) ?? { count: 0, subtotal: 0 };
          byService.set(name, { count: prev.count + 1, subtotal: prev.subtotal + Number(r.price) });
        });
        setData({
          clients,
          total,
          breakdown: Array.from(byService.entries()).map(([service, v]) => ({ service, ...v })),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, businessId]);

  const maxSubtotal = data ? Math.max(...data.breakdown.map((b) => b.subtotal)) : 0;

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-5 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>REPORTE</span>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Cómo te fue</h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>Elige un día para ver cuánto hiciste.</p>

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
              <span className="font-body text-[10px] uppercase" style={{ color: active ? theme.buttonText : theme.textMuted }}>{d.label}</span>
              <span className="font-display text-sm" style={{ color: active ? theme.buttonText : theme.textPrimary }}>{d.num}</span>
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

          <h2 className="font-display text-lg mb-1" style={{ color: theme.textPrimary }}>Qué más rentó</h2>
          <p className="font-body text-xs mb-3" style={{ color: theme.textMuted }}>Tipos de servicio de ese día, de mayor a menor.</p>

          <div className="space-y-2">
            {data.breakdown.slice().sort((a, b) => b.subtotal - a.subtotal).map((b) => (
              <div key={b.service} className="rounded-xl p-3" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                    {b.service} <span style={{ color: theme.textMuted }}>· {b.count}</span>
                  </span>
                  <span className="font-body text-sm font-semibold" style={{ color: theme.accentRing }}>RD${b.subtotal}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: theme.divider }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${(b.subtotal / maxSubtotal) * 100}%`, background: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-body text-sm" style={{ color: theme.textMuted }}>Sin datos registrados ese día.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Pantalla propia de "Citas de hoy": pendientes + realizadas, sin
// mezclarse con el resto del panel.
// ---------------------------------------------------------------
function AppointmentsView({
  theme, businessId, today, appointments, onResolve, onBack,
}: {
  theme: Theme;
  businessId: string;
  today: string;
  appointments: ViewAppointment[];
  onResolve: (id: string, attended: boolean) => void;
  onBack: () => void;
}) {
  const supabase = createClient();
  const [attendedCount, setAttendedCount] = useState(0);

  useEffect(() => {
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("appt_date", today)
      .eq("status", "attended")
      .then(({ count }) => setAttendedCount(count ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments.length]);

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-5 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>CITAS</span>
      <h1 className="font-display text-2xl mb-4" style={{ color: theme.textPrimary }}>Citas de hoy</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-display text-2xl" style={{ color: theme.textPrimary }}>{appointments.length}</p>
          <p className="font-body text-xs" style={{ color: theme.textMuted }}>Pendientes</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-display text-2xl" style={{ color: "#3FBF7F" }}>{attendedCount}</p>
          <p className="font-body text-xs" style={{ color: theme.textMuted }}>Realizadas</p>
        </div>
      </div>

      <p className="font-body text-xs mb-3" style={{ color: theme.textMuted }}>
        Mantén presionado 1 segundo si el cliente llegó. Desliza a un lado si no llegó.
      </p>

      <div>
        {appointments.map((a) => (
          <AppointmentCard key={a.id} appt={a} theme={theme} onResolve={onResolve} />
        ))}
        {appointments.length === 0 && (
          <div className="rounded-xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Ya cotejaste todas las citas de hoy.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Avatar de miembro del equipo: foto si existe, si no las iniciales.
// ---------------------------------------------------------------
function initials(name: string) {
  return name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function StaffAvatar({ name, photoUrl, theme, size = 44 }: { name: string; photoUrl: string | null; theme: Theme; size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 overflow-hidden font-display"
      style={{ width: size, height: size, background: theme.chipBg, color: theme.accentRing, fontSize: size * 0.34 }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        name ? initials(name) : <UserRound style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Editar negocio: datos del negocio (nombre, teléfono, dirección,
// logo) y gestión del equipo (agregar, renombrar, foto, quitar).
// Todo real contra Supabase (RLS: el dueño manda en su negocio).
// ---------------------------------------------------------------
function SettingsView({
  theme,
  business,
  staff,
  onBack,
}: {
  theme: Theme;
  business: Business;
  staff: Staff[];
  onBack: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url);
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [team, setTeam] = useState<Staff[]>(staff);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(file: File, prefix: string): Promise<string | null> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${prefix}/${business.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (upErr) {
      setError("No se pudo subir la imagen: " + upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingLogo(true);
    const url = await uploadImage(file, "logos");
    if (url) setLogoUrl(url);
    setUploadingLogo(false);
  }

  async function saveBusiness() {
    setError(null);
    setSavingBiz(true);
    const { error: updErr } = await supabase
      .from("businesses")
      .update({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, logo_url: logoUrl })
      .eq("id", business.id);
    setSavingBiz(false);
    if (updErr) {
      setError("No se pudo guardar el negocio: " + updErr.message);
      return;
    }
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2500);
    router.refresh();
  }

  async function addStaff() {
    const n = newName.trim();
    if (!n) return;
    setError(null);
    setAddingStaff(true);
    const { data, error: insErr } = await supabase
      .from("staff")
      .insert({ business_id: business.id, name: n, specialty: newSpecialty.trim() || null })
      .select("id, name, specialty, photo_url")
      .single();
    setAddingStaff(false);
    if (insErr || !data) {
      setError("No se pudo agregar: " + (insErr?.message ?? "error"));
      return;
    }
    setTeam((prev) => [...prev, data as Staff]);
    setNewName("");
    setNewSpecialty("");
    router.refresh();
  }

  async function renameStaff(id: string, field: "name" | "specialty", value: string) {
    setTeam((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function persistStaff(id: string, field: "name" | "specialty", value: string) {
    await supabase.from("staff").update({ [field]: value.trim() || null }).eq("id", id);
    router.refresh();
  }

  async function onStaffPhoto(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusyId(id);
    const url = await uploadImage(file, "staff");
    if (url) {
      const { error: updErr } = await supabase.from("staff").update({ photo_url: url }).eq("id", id);
      if (!updErr) {
        setTeam((prev) => prev.map((s) => (s.id === id ? { ...s, photo_url: url } : s)));
        router.refresh();
      } else {
        setError("No se pudo guardar la foto: " + updErr.message);
      }
    }
    setBusyId(null);
  }

  async function removeStaff(id: string, sName: string) {
    if (!window.confirm(`¿Quitar a ${sName || "este miembro"} del equipo? Sus citas históricas se conservan.`)) return;
    setError(null);
    setBusyId(id);
    const { error: delErr } = await supabase.from("staff").delete().eq("id", id);
    setBusyId(null);
    if (delErr) {
      setError("No se pudo quitar: " + delErr.message);
      return;
    }
    setTeam((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  const inputStyle = {
    background: theme.chipBg,
    border: `1px solid ${theme.cardBorder}`,
    color: theme.textPrimary,
  } as const;

  return (
    <div>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-5 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a operaciones
      </button>

      <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>AJUSTES</span>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Editar negocio</h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>Cambia los datos, la imagen y tu equipo.</p>

      {error && (
        <div className="rounded-xl p-3 mb-4 font-body text-xs" style={{ background: "rgba(220,80,80,0.14)", border: "1px solid #C25B5B", color: "#F19391" }}>
          {error}
        </div>
      )}

      {/* Datos del negocio */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <div className="flex items-center gap-3 mb-4">
          <label className="relative cursor-pointer shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-6 h-6" style={{ color: theme.buttonText }} />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: theme.accentRing }}>
              {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: theme.buttonText }} /> : <ImagePlus className="w-3.5 h-3.5" style={{ color: theme.buttonText }} />}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={onLogoPick} />
          </label>
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>Logo del negocio</p>
            <p className="font-body text-xs" style={{ color: theme.textMuted }}>Toca la imagen para cambiarla</p>
          </div>
        </div>

        <label className="font-body text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none" style={inputStyle} />

        <label className="font-body text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Teléfono</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Ej. 809-000-0000" className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none" style={inputStyle} />

        <label className="font-body text-xs font-medium block mb-1" style={{ color: theme.textMuted }}>Dirección</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej. Calle 1, Santiago" className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-4 outline-none" style={inputStyle} />

        <button
          onClick={saveBusiness}
          disabled={savingBiz || !name.trim()}
          className="font-body w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold disabled:opacity-50"
          style={{ background: bizSaved ? "rgba(63,191,127,0.16)" : `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: bizSaved ? "#3FBF7F" : theme.buttonText, border: bizSaved ? "1px solid #3FBF7F" : "none" }}
        >
          {savingBiz ? <Loader2 className="w-4 h-4 animate-spin" /> : bizSaved ? <CheckIcon className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savingBiz ? "Guardando…" : bizSaved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      {/* Equipo */}
      <h2 className="font-display text-lg mb-1" style={{ color: theme.textPrimary }}>Tu equipo</h2>
      <p className="font-body text-xs mb-3" style={{ color: theme.textMuted }}>Toca la foto para subir su cara o logo. Los cambios se guardan solos.</p>

      <div className="space-y-2 mb-4">
        {team.map((s) => (
          <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <label className="relative cursor-pointer shrink-0">
              <StaffAvatar name={s.name} photoUrl={s.photo_url} theme={theme} size={48} />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: theme.accentRing }}>
                {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: theme.buttonText }} /> : <ImagePlus className="w-3 h-3" style={{ color: theme.buttonText }} />}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onStaffPhoto(s.id, e)} />
            </label>

            <div className="flex-1 min-w-0">
              <input
                value={s.name}
                onChange={(e) => renameStaff(s.id, "name", e.target.value)}
                onBlur={(e) => persistStaff(s.id, "name", e.target.value)}
                className="font-body w-full text-sm font-semibold rounded-lg px-2 py-1.5 mb-1 outline-none"
                style={inputStyle}
              />
              <input
                value={s.specialty ?? ""}
                onChange={(e) => renameStaff(s.id, "specialty", e.target.value)}
                onBlur={(e) => persistStaff(s.id, "specialty", e.target.value)}
                placeholder="Especialidad (opcional)"
                className="font-body w-full text-xs rounded-lg px-2 py-1.5 outline-none"
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => removeStaff(s.id, s.name)}
              disabled={busyId === s.id}
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40"
              style={{ background: theme.chipBg, color: "#F19391" }}
              aria-label="Quitar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {team.length === 0 && (
          <div className="rounded-2xl p-4 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Aún no tienes equipo. Agrega el primero abajo.</p>
          </div>
        )}
      </div>

      {/* Agregar nuevo */}
      <div className="rounded-2xl p-4" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <p className="font-body text-sm font-semibold mb-3" style={{ color: theme.textPrimary }}>Agregar al equipo</p>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del barbero/estilista" className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-2 outline-none" style={inputStyle} />
        <input value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} placeholder="Especialidad (opcional)" className="font-body w-full text-sm rounded-xl px-3 py-2.5 mb-3 outline-none" style={inputStyle} />
        <button
          onClick={addStaff}
          disabled={addingStaff || !newName.trim()}
          className="font-body w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold disabled:opacity-50"
          style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}
        >
          {addingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {addingStaff ? "Agregando…" : "Agregar"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Panel principal
// ---------------------------------------------------------------
export default function OperationsPanel({
  business,
  staff,
  initialAppointments,
  clientsRegistered,
  today,
}: {
  business: Business;
  staff: Staff[];
  initialAppointments: RawAppointment[];
  clientsRegistered: number;
  today: string;
}) {
  const supabase = createClient();
  const theme = getTheme(business.type);
  const isBarber = business.type === "barber";

  const [view, setView] = useState<"dashboard" | "calendar" | "report" | "appointments" | "settings">("dashboard");
  const [appointments, setAppointments] = useState<ViewAppointment[]>(initialAppointments.map(toViewAppointment));
  const [notified, setNotified] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tvCopied, setTvCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/r/${business.invite_slug}` : "";
  const tvUrl =
    typeof window !== "undefined" ? `${window.location.origin}/tv/${business.invite_slug}` : "";

  const shareLink = async () => {
    const message = `Reserva tu cita en ${business.name} aquí: ${inviteUrl}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Si el navegador bloquea el portapapeles, igual abrimos WhatsApp con el link.
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const copyTvLink = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setTvCopied(true);
      setTimeout(() => setTvCopied(false), 2500);
    } catch {
      // no-op
    }
  };

  const handleResolve = async (id: string, attended: boolean) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("appointments").update({ status: attended ? "attended" : "no_show" }).eq("id", id);
  };

  // Nota (README): "notificar disponibilidad" queda simulado por ahora —
  // falta el backend de push real; debe apagarse cuando el primer cliente
  // tome el cupo, no por tiempo.
  const notifyBarber = (name: string) => {
    setNotified(name);
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
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : isBarber ? (
              <Scissors className="w-5 h-5" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            ) : (
              <Flower2 className="w-5 h-5" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            )}
          </div>
          <span className="font-display text-xl truncate" style={{ color: theme.textPrimary }}>{business.name}</span>
        </div>
        <form action={signOut}>
          <button className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg shrink-0" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textMuted }}>
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </form>
      </div>

      <div className="px-5 py-6 max-w-sm mx-auto">
        {view === "calendar" ? (
          <CalendarView theme={theme} staff={staff} onBack={() => setView("dashboard")} />
        ) : view === "report" ? (
          <ReportView theme={theme} businessId={business.id} onBack={() => setView("dashboard")} />
        ) : view === "appointments" ? (
          <AppointmentsView
            theme={theme}
            businessId={business.id}
            today={today}
            appointments={appointments}
            onResolve={handleResolve}
            onBack={() => setView("dashboard")}
          />
        ) : view === "settings" ? (
          <SettingsView
            theme={theme}
            business={business}
            staff={staff}
            onBack={() => setView("dashboard")}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>OPERACIONES</span>
                <h1 className="font-display text-lg mt-0.5" style={{ color: theme.textPrimary }}>Tu negocio hoy</h1>
              </div>
              <button
                onClick={() => setView("settings")}
                className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg shrink-0"
                style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}
              >
                <Settings className="w-3.5 h-3.5" />
                Editar negocio
              </button>
            </div>

            {/* Métricas compactas en una sola fila para que quepa todo en una vista */}
            <div className="flex items-stretch rounded-2xl mt-4 overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex-1 flex items-center gap-2.5 px-4 py-3">
                <Users className="w-4 h-4 shrink-0" style={{ color: theme.accentRing }} />
                <div className="min-w-0">
                  <p className="font-display text-xl leading-none" style={{ color: theme.textPrimary }}>{clientsRegistered}</p>
                  <p className="font-body text-[11px] mt-0.5" style={{ color: theme.textMuted }}>Clientes</p>
                </div>
              </div>
              <div className="w-px my-3" style={{ background: theme.divider }} />
              <div className="flex-1 flex items-center gap-2.5 px-4 py-3">
                <CalendarClock className="w-4 h-4 shrink-0" style={{ color: theme.accentRing }} />
                <div className="min-w-0">
                  <p className="font-display text-xl leading-none" style={{ color: theme.textPrimary }}>{appointments.length}</p>
                  <p className="font-body text-[11px] mt-0.5" style={{ color: theme.textMuted }}>Citas hoy</p>
                </div>
              </div>
            </div>

            {/* Accesos en cuadrícula compacta: no crecen al sumar barberos */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                onClick={() => setView("appointments")}
                className="flex flex-col items-start gap-2 p-3 rounded-2xl text-left"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
                  <CalendarClock className="w-4 h-4" style={{ color: theme.buttonText }} />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>Citas de hoy</p>
                  <p className="font-body text-[11px]" style={{ color: theme.textMuted }}>{appointments.length} por cotejar</p>
                </div>
              </button>

              <button
                onClick={() => setView("calendar")}
                className="flex flex-col items-start gap-2 p-3 rounded-2xl text-left"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
                  <CalendarDays className="w-4 h-4" style={{ color: theme.buttonText }} />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>Calendario</p>
                  <p className="font-body text-[11px]" style={{ color: theme.textMuted }}>Disponibilidad</p>
                </div>
              </button>

              <button
                onClick={() => setView("report")}
                className="flex flex-col items-start gap-2 p-3 rounded-2xl text-left"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.chipBg }}>
                  <BarChart3 className="w-4 h-4" style={{ color: theme.accentRing }} />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>Reporte</p>
                  <p className="font-body text-[11px]" style={{ color: theme.textMuted }}>Ingresos por día</p>
                </div>
              </button>

              <button
                onClick={copyTvLink}
                className="flex flex-col items-start gap-2 p-3 rounded-2xl text-left"
                style={{ background: theme.cardBg, border: `1px solid ${tvCopied ? "#3FBF7F" : theme.cardBorder}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.chipBg }}>
                  <Tv className="w-4 h-4" style={{ color: theme.accentRing }} />
                </div>
                <div>
                  <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>Pantalla TV</p>
                  <p className="font-body text-[11px]" style={{ color: tvCopied ? "#3FBF7F" : theme.textMuted }}>{tvCopied ? "Link copiado ✓" : "Copiar link"}</p>
                </div>
              </button>
            </div>

            <button
              onClick={shareLink}
              className="font-body w-full flex items-center justify-center gap-2 mt-3 py-3.5 rounded-xl font-semibold"
              style={{
                background: linkCopied ? "rgba(63,191,127,0.16)" : `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
                color: linkCopied ? "#3FBF7F" : theme.buttonText,
                border: linkCopied ? "1px solid #3FBF7F" : "none",
              }}
            >
              {linkCopied ? <CheckIcon className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {linkCopied ? "Link copiado ✓" : "Compartir mi link"}
            </button>

            {staff.length > 0 && (
              <details className="rounded-2xl mt-3 group" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none">
                  <Bell className="w-3.5 h-3.5" style={{ color: theme.accentRing }} />
                  <span className="font-body text-xs font-medium flex-1" style={{ color: theme.textMuted }}>Notificar disponibilidad</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" style={{ color: theme.textMuted }} />
                </summary>
                <div className="space-y-2 px-4 pb-4">
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => notifyBarber(s.name)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: notified === s.name ? "rgba(63,191,127,0.14)" : theme.chipBg, border: `1px solid ${notified === s.name ? "#3FBF7F" : "transparent"}` }}
                    >
                      <span className="font-body text-sm" style={{ color: theme.textPrimary }}>{s.name} está libre ahora</span>
                      <span className="font-body text-xs font-semibold" style={{ color: notified === s.name ? "#3FBF7F" : theme.accentRing }}>
                        {notified === s.name ? "Enviada ✓" : "Notificar"}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
