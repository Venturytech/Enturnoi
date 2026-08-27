import { useState } from "react";
import { Scissors, ChevronLeft, ChevronRight, Clock, Users, CalendarDays, Check } from "lucide-react";

const BUSINESS = { name: "Corte & Cía", type: "barber" };

const BARBERS = [
  {
    id: 1,
    name: "Manuel Ortiz",
    specialty: "Fade y diseño",
    queue: [
      { id: "q1", service: "Corte fade", minutes: 25, status: "present" },
      { id: "q2", service: "Corte + barba", minutes: 35, status: "present" },
      { id: "q3", service: "Diseño de barba", minutes: 15, status: "scheduled" },
    ],
  },
  {
    id: 2,
    name: "Pedro Nolasco",
    specialty: "Cortes clásicos",
    queue: [
      { id: "q4", service: "Corte clásico", minutes: 20, status: "present" },
    ],
  },
  {
    id: 3,
    name: "Ana Lía",
    specialty: "Color y tratamientos",
    queue: [],
  },
];

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
  green: "#3FBF7F",
  yellow: "#E0A93B",
};

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function StatusDot({ status }) {
  const color = status === "present" ? theme.green : theme.yellow;
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />;
}

function BarberList({ onSelect, onScheduleFuture }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
        >
          <Scissors className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
        </div>
        <span className="font-display text-base" style={{ color: theme.textPrimary }}>
          {BUSINESS.name}
        </span>
      </div>

      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
        Elige tu barbero
      </h1>
      <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
        Toca uno para ver cuántos hay en su cola.
      </p>

      <div className="space-y-2.5">
        {BARBERS.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className="w-full rounded-2xl p-4 flex items-center gap-3 text-left"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-base shrink-0"
              style={{ background: theme.chipBg, color: theme.accentRing }}
            >
              {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {b.name}
              </p>
              <p className="font-body text-xs" style={{ color: theme.textMuted }}>
                {b.specialty}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {b.queue.length === 0 ? (
                <span
                  className="font-body text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: theme.chipBg, color: theme.accentRing }}
                >
                  <Users className="w-3 h-3" />
                  Libre
                </span>
              ) : (
                <>
                  <span
                    className="font-body text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{ background: "rgba(63,191,127,0.16)", color: theme.green }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.green }} />
                    {b.queue.filter((q) => q.status === "present").length} en la barbería
                  </span>
                  <div className="flex items-center gap-1.5">
                    {b.queue.some((q) => q.status === "scheduled") && (
                      <span className="font-body text-[11px]" style={{ color: theme.textMuted }}>
                        +{b.queue.filter((q) => q.status === "scheduled").length} con cita
                      </span>
                    )}
                    <span className="font-body text-[11px] font-medium" style={{ color: theme.textPrimary }}>
                      · {b.queue.length} en cola
                    </span>
                  </div>
                </>
              )}
              <ChevronRight className="w-4 h-4 mt-0.5" style={{ color: theme.textMuted }} />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onScheduleFuture}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-body font-semibold mt-5"
        style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}
      >
        <CalendarDays className="w-4 h-4" />
        Agendar cita futura
      </button>
    </>
  );
}

function QueueDetail({ barber, onBack }) {
  const present = barber.queue.filter((q) => q.status === "present").length;
  const scheduled = barber.queue.filter((q) => q.status === "scheduled").length;

  return (
    <>
      <button
        onClick={onBack}
        className="font-body flex items-center gap-1.5 text-sm font-medium mb-5"
        style={{ color: theme.accentRing }}
      >
        <ChevronLeft className="w-4 h-4" />
        Todos los barberos
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-base shrink-0"
          style={{ background: theme.chipBg, color: theme.accentRing }}
        >
          {barber.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h1 className="font-display text-xl" style={{ color: theme.textPrimary }}>
            {barber.name}
          </h1>
          <p className="font-body text-xs" style={{ color: theme.textMuted }}>
            {barber.specialty}
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden mt-4 mb-2 grid grid-cols-2"
        style={{ border: `1.5px solid ${theme.cardBorder}` }}
      >
        <div
          className="p-4 flex flex-col gap-2"
          style={{ background: "rgba(63,191,127,0.14)", borderRight: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: theme.green }} />
            <span className="font-body text-xs font-medium" style={{ color: theme.textPrimary }}>
              En la barbería
            </span>
          </div>
          <span className="font-display text-3xl" style={{ color: theme.green }}>
            {present}
          </span>
        </div>
        <div className="p-4 flex flex-col gap-2" style={{ background: "rgba(224,169,59,0.14)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: theme.yellow }} />
            <span className="font-body text-xs font-medium" style={{ color: theme.textPrimary }}>
              Con cita
            </span>
          </div>
          <span className="font-display text-3xl" style={{ color: theme.yellow }}>
            {scheduled}
          </span>
        </div>
      </div>

      <p className="font-body text-xs mb-6" style={{ color: theme.textMuted }}>
        {barber.queue.length} en cola en total
      </p>

      {barber.queue.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-body text-sm" style={{ color: theme.textMuted }}>
            {barber.name.split(" ")[0]} está libre ahora mismo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {barber.queue.map((q, i) => (
            <div
              key={q.id}
              className="rounded-xl p-3.5 flex items-center gap-3"
              style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center font-body text-xs font-semibold shrink-0"
                style={{ background: theme.chipBg, color: theme.accentRing }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                  {q.service}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" style={{ color: theme.textMuted }} />
                  <span className="font-body text-xs" style={{ color: theme.textMuted }}>~{q.minutes} min</span>
                </div>
              </div>
              <StatusDot status={q.status} />
            </div>
          ))}
        </div>
      )}

      {barber.queue.length > 0 && (
        <div
          className="rounded-2xl p-4 mt-4 flex items-center justify-between"
          style={{ background: theme.chipBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div>
            <p className="font-body text-xs" style={{ color: theme.textMuted }}>Próxima disponibilidad</p>
            <p className="font-display text-lg" style={{ color: theme.textPrimary }}>
              en {barber.queue.reduce((sum, q) => sum + q.minutes, 0)} min
            </p>
          </div>
          <span className="font-body text-sm font-medium" style={{ color: theme.accentRing }}>
            aprox. {formatTime(new Date(Date.now() + barber.queue.reduce((sum, q) => sum + q.minutes, 0) * 60000))}
          </span>
        </div>
      )}

      <button
        className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-4"
        style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}
      >
        Agendar con {barber.name.split(" ")[0]}
      </button>
    </>
  );
}

const SERVICES = [
  { id: "sv1", name: "Corte clásico", minutes: 20, price: 400 },
  { id: "sv2", name: "Corte fade", minutes: 25, price: 450 },
  { id: "sv3", name: "Corte + barba", minutes: 35, price: 800 },
  { id: "sv4", name: "Diseño de barba", minutes: 15, price: 350 },
];

// Cada barbero tiene su propia disponibilidad y su propio subconjunto de servicios,
// definidos por él mismo desde su calendario de Operaciones.
const BARBER_SCHEDULE = {
  1: {
    slots: ["9:00", "9:30", "10:30", "11:00", "11:30", "1:00", "1:30", "2:00", "2:30", "4:00"],
    serviceIds: ["sv2", "sv3", "sv4"],
  },
  2: {
    slots: ["9:30", "10:00", "10:30", "11:30", "12:00", "1:00", "2:30", "3:00", "3:30"],
    serviceIds: ["sv1", "sv2"],
  },
  3: {
    slots: ["9:00", "10:00", "10:30", "1:30", "2:00", "3:30", "4:00"],
    serviceIds: ["sv1"],
  },
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Simula qué días ya tienen citas registradas, solo como referencia visual
const DAYS_WITH_CITAS = new Set([1, 3, 4]);

function buildScheduleDays(count) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: i === 0 ? "Hoy" : DAY_LABELS[d.getDay()],
      num: d.getDate(),
      hasCitas: DAYS_WITH_CITAS.has(i),
    });
  }
  return days;
}

function ScheduleFuture({ onBack, onDone }) {
  const [step, setStep] = useState(1); // 1 día, 2 barbero, 3 horario, 4 corte, 5 confirmar
  const [date, setDate] = useState(null);
  const [barber, setBarber] = useState(null);
  const [time, setTime] = useState(null);
  const [service, setService] = useState(null);
  const days = buildScheduleDays(10);

  const goBack = () => (step === 1 ? onBack() : setStep(step - 1));

  const pickDate = (d) => { setDate(d); setStep(2); };
  const pickBarber = (b) => { setBarber(b); setStep(3); };
  const pickTime = (t) => { setTime(t); setStep(4); };
  const pickService = (s) => { setService(s); setStep(5); };

  const availSlots = barber ? BARBER_SCHEDULE[barber.id].slots : [];
  const availServices = barber ? SERVICES.filter((s) => BARBER_SCHEDULE[barber.id].serviceIds.includes(s.id)) : [];

  return (
    <>
      <button
        onClick={goBack}
        className="font-body flex items-center gap-1.5 text-sm font-medium mb-4"
        style={{ color: theme.accentRing }}
      >
        <ChevronLeft className="w-4 h-4" />
        {step === 1 ? "Todos los barberos" : "Atrás"}
      </button>

      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s <= step ? theme.accentRing : theme.cardBorder }} />
        ))}
      </div>

      {step === 1 && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            ¿Qué día?
          </h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
            Elige el día que te queda mejor.
          </p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {days.map((d) => (
              <button
                key={d.key}
                onClick={() => pickDate(d)}
                className="relative rounded-xl py-3.5 flex flex-col items-center"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                <span className="font-body text-[10px] uppercase" style={{ color: theme.textMuted }}>{d.label}</span>
                <span className="font-display text-base" style={{ color: theme.textPrimary }}>{d.num}</span>
                {d.hasCitas && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: theme.accentRing }} />
                )}
              </button>
            ))}
          </div>
          <p className="font-body text-[11px]" style={{ color: theme.textMuted }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: theme.accentRing }} />
            Días con citas ya agendadas
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            ¿Con quién?
          </h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
            {date.label}, {date.num} · cada barbero tiene su propia disponibilidad.
          </p>
          <div className="space-y-2">
            {BARBERS.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBarber(b)}
                className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm shrink-0"
                  style={{ background: theme.chipBg, color: theme.accentRing }}
                >
                  {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>{b.name}</p>
                  <p className="font-body text-xs" style={{ color: theme.textMuted }}>{b.specialty}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: theme.textMuted }} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            ¿A qué hora?
          </h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
            {date.label}, {date.num} · con {barber.name.split(" ")[0]}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {availSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => pickTime(slot)}
                className="font-body text-sm font-medium py-3.5 rounded-lg"
                style={{ background: theme.chipBg, color: theme.accentRing }}
              >
                {slot}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            ¿Qué corte quieres?
          </h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
            {date.label}, {date.num} · {time} · con {barber.name.split(" ")[0]}
          </p>
          <div className="space-y-2">
            {availServices.map((s) => (
              <button
                key={s.id}
                onClick={() => pickService(s)}
                className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
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
            ))}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h1 className="font-display text-2xl mb-5" style={{ color: theme.textPrimary }}>
            Confirma tu cita
          </h1>
          <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <Row label="Servicio" value={service.name} theme={theme} />
            <Row label="Barbero" value={barber.name} theme={theme} />
            <Row label="Fecha" value={`${date.label}, ${date.num}`} theme={theme} />
            <Row label="Hora" value={time} theme={theme} />
            <div className="h-px" style={{ background: theme.divider }} />
            <Row label="Total" value={`RD$${service.price}`} theme={theme} bold />
          </div>
          <button
            onClick={() => onDone(date, barber, time, service)}
            className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}
          >
            Confirmar cita
          </button>
        </>
      )}
    </>
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

export default function BarberQueue() {
  const [view, setView] = useState("list"); // 'list' | 'detail' | 'schedule'
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-8" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>
      <div className="w-full max-w-sm">
        {view === "detail" && <QueueDetail barber={selected} onBack={() => setView("list")} />}
        {view === "schedule" && (
          <ScheduleFuture
            onBack={() => setView("list")}
            onDone={() => setView("list")}
          />
        )}
        {view === "list" && (
          <BarberList onSelect={(b) => { setSelected(b); setView("detail"); }} onScheduleFuture={() => setView("schedule")} />
        )}
      </div>
    </div>
  );
}
