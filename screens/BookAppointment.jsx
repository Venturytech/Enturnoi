import { useState, useMemo } from "react";
import {
  ChevronLeft, Clock, Check, Scissors, CalendarCheck,
} from "lucide-react";

const BARBER = { name: "Manuel Ortiz", specialty: "Fade y diseño" };

const SERVICES = [
  { id: "s1", name: "Corte clásico", minutes: 20, price: 400 },
  { id: "s2", name: "Corte fade", minutes: 25, price: 450 },
  { id: "s3", name: "Corte + barba", minutes: 35, price: 800 },
  { id: "s4", name: "Diseño de barba", minutes: 15, price: 350 },
  { id: "s5", name: "Afeitado tradicional", minutes: 30, price: 500 },
];

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const TIME_SLOTS = [
  "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "1:00", "1:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30",
];
// Simula horarios ya ocupados por otras citas para ese barbero
const TAKEN_SLOTS = new Set(["10:00", "10:30", "2:00"]);

function buildDays(count) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: i === 0 ? "Hoy" : DAY_LABELS[d.getDay()],
      num: d.getDate(),
    });
  }
  return days;
}

const theme = {
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
};

export default function BookAppointment() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const days = useMemo(() => buildDays(7), []);
  const activeDate = date ?? days[0];

  const stepValid = { 1: !!service, 2: !!activeDate, 3: !!time }[step] ?? true;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  if (confirmed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-10" style={{ background: theme.pageBg }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
          .font-display { font-family: 'Fraunces', serif; }
          .font-body { font-family: 'Inter', sans-serif; }
        `}</style>
        <div className="w-full max-w-sm text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            <Check className="w-7 h-7" style={{ color: theme.buttonText }} strokeWidth={3} />
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: theme.textPrimary }}>
            ¡Cita confirmada!
          </h1>
          <p className="font-body text-sm mb-8" style={{ color: theme.textMuted }}>
            Te esperamos con {BARBER.name.split(" ")[0]}.
          </p>
          <div className="rounded-2xl p-5 text-left space-y-3" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <Row label="Servicio" value={service.name} theme={theme} />
            <Row label="Barbero" value={BARBER.name} theme={theme} />
            <Row label="Fecha" value={`${activeDate.label}, ${activeDate.num}`} theme={theme} />
            <Row label="Hora" value={time} theme={theme} />
            <div className="h-px" style={{ background: theme.divider }} />
            <Row label="Total" value={`RD$${service.price}`} theme={theme} bold />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-8" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        <button
          onClick={back}
          className="font-body flex items-center gap-1.5 text-sm font-medium mb-4"
          style={{ color: theme.accentRing, visibility: step === 1 ? "hidden" : "visible" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Atrás
        </button>

        {/* Progreso */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s <= step ? theme.accentRing : theme.cardBorder }} />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Scissors className="w-3.5 h-3.5" style={{ color: theme.accentRing }} />
          <span className="font-body text-xs font-medium" style={{ color: theme.textMuted }}>
            Con {BARBER.name}
          </span>
        </div>

        {step === 1 && (
          <>
            <h1 className="font-display text-2xl mb-5" style={{ color: theme.textPrimary }}>
              Elige tu servicio
            </h1>
            <div className="space-y-2">
              {SERVICES.map((s) => {
                const active = service?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setService(s)}
                    className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
                    style={{
                      background: active ? theme.chipBg : theme.cardBg,
                      border: `1px solid ${active ? theme.accentRing : theme.cardBorder}`,
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>{s.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" style={{ color: theme.textMuted }} />
                        <span className="font-body text-xs" style={{ color: theme.textMuted }}>~{s.minutes} min</span>
                      </div>
                    </div>
                    <span className="font-display text-base" style={{ color: theme.accentRing }}>RD${s.price}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-2xl mb-5" style={{ color: theme.textPrimary }}>
              Elige la fecha
            </h1>
            <div className="grid grid-cols-4 gap-2">
              {days.map((d) => {
                const active = activeDate.key === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDate(d)}
                    className="rounded-xl py-3 flex flex-col items-center"
                    style={{
                      background: active ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.cardBg,
                      border: `1px solid ${active ? theme.accentRing : theme.cardBorder}`,
                    }}
                  >
                    <span className="font-body text-[10px] uppercase" style={{ color: active ? theme.buttonText : theme.textMuted }}>
                      {d.label}
                    </span>
                    <span className="font-display text-base" style={{ color: active ? theme.buttonText : theme.textPrimary }}>
                      {d.num}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
              Elige la hora
            </h1>
            <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
              {activeDate.label}, {activeDate.num} · {service.name}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const taken = TAKEN_SLOTS.has(slot);
                const active = time === slot;
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => setTime(slot)}
                    className="font-body text-sm font-medium py-3 rounded-lg"
                    style={{
                      background: taken ? "#1a1712" : active ? theme.accentRing : theme.chipBg,
                      color: taken ? theme.textMuted : active ? theme.buttonText : theme.accentRing,
                      textDecoration: taken ? "line-through" : "none",
                      opacity: taken ? 0.5 : 1,
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-display text-2xl mb-5" style={{ color: theme.textPrimary }}>
              Confirma tu cita
            </h1>
            <div className="rounded-2xl p-5 space-y-3" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <Row label="Servicio" value={service.name} theme={theme} />
              <Row label="Barbero" value={BARBER.name} theme={theme} />
              <Row label="Fecha" value={`${activeDate.label}, ${activeDate.num}`} theme={theme} />
              <Row label="Hora" value={time} theme={theme} />
              <div className="h-px" style={{ background: theme.divider }} />
              <Row label="Total" value={`RD$${service.price}`} theme={theme} bold />
            </div>
          </>
        )}

        <button
          onClick={step === 4 ? () => setConfirmed(true) : next}
          disabled={!stepValid}
          className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-6"
          style={{
            background: stepValid ? `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` : theme.chipBg,
            color: stepValid ? theme.buttonText : theme.textMuted,
          }}
        >
          {step === 4 ? (
            <>
              <CalendarCheck className="w-4 h-4" />
              Confirmar cita
            </>
          ) : (
            "Continuar"
          )}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, theme, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-body text-sm" style={{ color: theme.textMuted }}>{label}</span>
      <span className={`font-body text-sm ${bold ? "font-semibold" : ""}`} style={{ color: bold ? theme.accentRing : theme.textPrimary }}>
        {value}
      </span>
    </div>
  );
}
