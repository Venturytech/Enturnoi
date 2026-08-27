import { useState, useMemo } from "react";
import { Scissors, Flower2, Ban, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";

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
      isToday: i === 0 && startOffset === 0,
    });
  }
  return days;
}

export default function AvailabilityCalendar() {
  const [businessType] = useState("barber");
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [blockedBySlot, setBlockedBySlot] = useState({}); // { dateKey: Set(slotIndex) }
  const isBarber = businessType === "barber";

  const theme = isBarber
    ? {
        pageBg: "radial-gradient(circle at 50% 0%, #1a1610 0%, #0a0806 55%, #050403 100%)",
        cardBg: "#12100c",
        cardBorder: "#29231a",
        textPrimary: "#F3EBDA",
        textMuted: "#8a8072",
        divider: "#241f16",
        inputBg: "#0e0c09",
        inputBorder: "#2a2419",
        accentFrom: "#E3B04B",
        accentTo: "#B8862F",
        accentRing: "#C9962C",
        buttonText: "#161208",
        chipBg: "#332813",
        blockedBg: "#241a12",
        blockedText: "#6b6355",
      }
    : {
        pageBg: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #FBF3F5 55%, #F7E9ED 100%)",
        cardBg: "#FFFFFF",
        cardBorder: "#F0DCE2",
        textPrimary: "#3A2530",
        textMuted: "#9A7A87",
        divider: "#F0DCE2",
        inputBg: "#FDF8F9",
        inputBorder: "#EBD3DA",
        accentFrom: "#E7A6BC",
        accentTo: "#C77E9B",
        accentRing: "#D890A8",
        buttonText: "#FFFFFF",
        chipBg: "#F7DCE4",
        blockedBg: "#F5EAED",
        blockedText: "#C2A6AF",
      };

  const days = useMemo(() => buildDays(dayOffset, 7), [dayOffset]);
  const activeKey = selectedDate ?? days[0].key;
  const activeDay = days.find((d) => d.key === activeKey) ?? days[0];
  const blockedSet = blockedBySlot[activeKey] ?? new Set();
  const fullDayBlocked = blockedSet.size === TIME_SLOTS.length;

  const toggleSlot = (i) => {
    const next = new Set(blockedSet);
    next.has(i) ? next.delete(i) : next.add(i);
    setBlockedBySlot({ ...blockedBySlot, [activeKey]: next });
  };

  const blockFullDay = () => {
    setBlockedBySlot({ ...blockedBySlot, [activeKey]: new Set(TIME_SLOTS.map((_, i) => i)) });
  };

  const clearDay = () => {
    setBlockedBySlot({ ...blockedBySlot, [activeKey]: new Set() });
  };

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-8 transition-colors duration-300" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .slot-btn { transition: transform 0.08s ease, background 0.15s ease; }
        .slot-btn:active { transform: scale(0.93); }
      `}</style>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          {isBarber ? (
            <Scissors className="w-4 h-4" style={{ color: theme.accentRing }} />
          ) : (
            <Flower2 className="w-4 h-4" style={{ color: theme.accentRing }} />
          )}
          <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
            DISPONIBILIDAD
          </span>
        </div>
        <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
          Tus horarios
        </h1>
        <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
          Toca un horario para bloquearlo. Toca de nuevo para reabrirlo.
        </p>

        {/* Franja de días, deslizable con flechas */}
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
                  className="slot-btn rounded-xl py-2 flex flex-col items-center"
                  style={{
                    background: active ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.cardBg,
                    border: `1px solid ${active ? theme.accentRing : theme.cardBorder}`,
                  }}
                >
                  <span
                    className="font-body text-[10px] uppercase"
                    style={{ color: active ? theme.buttonText : theme.textMuted, opacity: active ? 0.85 : 1 }}
                  >
                    {d.label}
                  </span>
                  <span
                    className="font-display text-sm"
                    style={{ color: active ? theme.buttonText : theme.textPrimary }}
                  >
                    {d.num}
                  </span>
                  {dayBlocked && !active && (
                    <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: theme.blockedText }} />
                  )}
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

        {/* Acciones rápidas para el día seleccionado */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={blockFullDay}
            className="font-body flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl"
            style={{
              background: fullDayBlocked ? theme.blockedBg : theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              color: theme.textPrimary,
            }}
          >
            <Ban className="w-3.5 h-3.5" />
            {activeDay.isToday ? "No disponible hoy" : "Bloquear todo el día"}
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

        {/* Grilla táctil de horarios */}
        <div
          className="rounded-2xl p-4"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map((slot, i) => {
              const blocked = blockedSet.has(i);
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(i)}
                  className="slot-btn font-body text-xs font-medium py-3 rounded-lg"
                  style={{
                    background: blocked ? theme.blockedBg : theme.chipBg,
                    color: blocked ? theme.blockedText : theme.accentRing,
                    textDecoration: blocked ? "line-through" : "none",
                    border: `1px solid ${blocked ? theme.inputBorder : "transparent"}`,
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.divider}` }}>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: theme.chipBg }} />
              <span className="font-body text-xs" style={{ color: theme.textMuted }}>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: theme.blockedBg, border: `1px solid ${theme.inputBorder}` }} />
              <span className="font-body text-xs" style={{ color: theme.textMuted }}>Bloqueado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
