"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Scissors, Flower2, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight,
  Clock, Users, CalendarDays, Check, Lock, Smartphone, Apple, Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, cardShadow, type BusinessType } from "@/lib/theme";
import { appDownloadCta } from "@/lib/appStore";
import { hoursFromBusiness, buildDaySlots, displayHm, hmToMin, type BusinessHours } from "@/lib/hours";

type Business = {
  id: string;
  name: string;
  type: BusinessType;
  logo_url: string | null;
  address: string | null;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
};
type Staff = { id: string; name: string; specialty: string | null };
type ServiceOption = { business_service_id: string; service_name: string; price: number; duration_minutes: number };
type QueueInfo = { staff_id: string; present_count: number; scheduled_count: number; total_minutes: number };
type Identity = { clientId: string; name: string; phone: string };
type ClientBusiness = { id: string; name: string; type: BusinessType; logo_url: string | null; invite_slug: string };
type Summary = { kind: "future" | "walkin"; date?: string; time?: string; staff: string; service: string; price: number };
type MyQueueEntry = {
  appt_id: string;
  staff_id: string;
  staff_name: string;
  service_name: string | null;
  appt_time: string;
  status: "present" | "scheduled";
  queue_position: number;
  total_in_queue: number;
};

function apptTimeToDisplay(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Una sola cuenta de cliente para TODAS las barberías (número + PIN).
// El cliente se liga a cada barbería por su link/QR; aquí solo guardamos
// quién es en el dispositivo.
const STORAGE_KEY = "enturnoi:client";
const LEGACY_PREFIX = "enturnoi:client:";
const UNLOCK_KEY = "enturnoi:unlocked";

function getIdentity(slug: string): Identity | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  // Migración desde el formato viejo por-barbería (enturnoi:client:<slug>)
  const legacy = localStorage.getItem(LEGACY_PREFIX + slug);
  if (legacy) {
    try {
      const idn = JSON.parse(legacy) as Identity;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(idn));
      return idn;
    } catch { /* ignore */ }
  }
  return null;
}
function saveIdentity(_slug: string, identity: Identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
function forgetIdentity(_slug: string) {
  localStorage.removeItem(STORAGE_KEY);
  try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
}
// "Desbloqueado" en esta sesión del navegador: tras poner el PIN una vez,
// el cliente puede moverse entre sus barberías sin re-teclearlo.
function markUnlocked(clientId: string) {
  try { sessionStorage.setItem(UNLOCK_KEY, clientId); } catch { /* ignore */ }
}
function isUnlocked(clientId: string): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(UNLOCK_KEY) === clientId; } catch { return false; }
}

function formatTime(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function buildScheduleDays(count: number) {
  const days = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({ key: d.toISOString().slice(0, 10), label: i === 0 ? "Hoy" : DAY_LABELS[d.getDay()], num: d.getDate() });
  }
  return days;
}

export default function ClientFlow({ slug, business }: { slug: string; business: Business }) {
  const supabase = useRef(createClient()).current;
  const theme = getTheme(business.type);
  const isBarber = business.type === "barber";
  const hours = useMemo<BusinessHours>(() => hoursFromBusiness(business), [business]);

  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [stored, setStored] = useState<Identity | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [view, setView] = useState<"list" | "detail" | "schedule" | "walkin" | "confirmed" | "mybiz">("list");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [queue, setQueue] = useState<Record<string, QueueInfo>>({});
  const [myQueue, setMyQueue] = useState<MyQueueEntry[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<ClientBusiness[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState<Summary | null>(null);

  useEffect(() => {
    const idn = getIdentity(slug);
    setStored(idn);
    // Si ya puso el PIN en esta sesión del navegador, entra directo
    // (para moverse entre sus barberías sin re-teclearlo).
    if (idn && isUnlocked(idn.clientId)) setIdentityState(idn);
    setCheckedStorage(true);
  }, [slug]);

  async function loadData() {
    if (!identity) return;
    const [s, sv, q, mq] = await Promise.all([
      supabase.rpc("get_business_staff_by_slug", { p_slug: slug }),
      supabase.rpc("get_business_services_by_slug", { p_slug: slug }),
      supabase.rpc("get_staff_queue_today", { p_slug: slug }),
      supabase.rpc("get_client_queue_today", { p_slug: slug, p_client_id: identity.clientId }),
    ]);
    setStaff(s.data ?? []);
    setServices(sv.data ?? []);
    const map: Record<string, QueueInfo> = {};
    (q.data ?? []).forEach((row: QueueInfo) => (map[row.staff_id] = row));
    setQueue(map);
    setMyQueue((mq.data ?? []) as MyQueueEntry[]);
  }

  // Al entrar (por link/QR) queda ligado a ESTA barbería, y cargamos la
  // lista de "Mis barberías". Ligarse solo ocurre por link/QR: no hay
  // forma de buscar una barbería dentro de la app.
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    (async () => {
      await supabase.rpc("client_join_business", { p_client_id: identity.clientId, p_slug: slug });
      const { data } = await supabase.rpc("get_client_businesses", { p_client_id: identity.clientId });
      if (!cancelled) setMyBusinesses((data ?? []) as ClientBusiness[]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, slug]);

  // Carga inicial + se mantiene al día: realtime sobre las citas del
  // negocio y un refresco de respaldo cada 15s (por si el realtime cae).
  useEffect(() => {
    if (!identity) return;
    loadData();
    const channel = supabase
      .channel(`client-queue-${business.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `business_id=eq.${business.id}` },
        () => loadData(),
      )
      .subscribe();
    const poll = setInterval(loadData, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, slug, business.id]);

  if (!checkedStorage) return null;

  // Puerta de acceso con PIN: registro la primera vez, luego solo PIN.
  if (!identity) {
    return (
      <ClientGate
        theme={theme}
        isBarber={isBarber}
        business={business}
        slug={slug}
        stored={stored}
        onAuthed={(idn) => {
          saveIdentity(slug, idn);
          markUnlocked(idn.clientId);
          setStored(idn);
          setIdentityState(idn);
        }}
        onForget={() => {
          forgetIdentity(slug);
          setStored(null);
        }}
      />
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
        {view === "detail" && selectedStaff && (
          <QueueDetail
            theme={theme}
            staffMember={selectedStaff}
            info={queue[selectedStaff.id]}
            myEntries={myQueue.filter((e) => e.staff_id === selectedStaff.id)}
            onBack={() => setView("list")}
            onSchedule={() => setView("schedule")}
            onWalkin={() => setView("walkin")}
          />
        )}
        {view === "walkin" && selectedStaff && (
          <WalkinFlow
            theme={theme}
            staffMember={selectedStaff}
            services={services}
            slug={slug}
            clientId={identity.clientId}
            onBack={() => setView("detail")}
            onDone={(summary) => {
              setLastConfirmed(summary);
              setView("confirmed");
              loadData();
            }}
          />
        )}
        {view === "schedule" && (
          <ScheduleFuture
            theme={theme}
            staffList={staff}
            services={services}
            hours={hours}
            preselectedStaff={selectedStaff}
            slug={slug}
            clientId={identity.clientId}
            onBack={() => setView(selectedStaff ? "detail" : "list")}
            onDone={(summary) => {
              setLastConfirmed({ kind: "future", ...summary });
              setSelectedStaff(null);
              setView("confirmed");
              loadData();
            }}
          />
        )}
        {view === "confirmed" && lastConfirmed && (
          <Confirmed theme={theme} summary={lastConfirmed} onBack={() => setView("list")} />
        )}
        {view === "mybiz" && (
          <MyBusinesses
            theme={theme}
            businesses={myBusinesses}
            currentSlug={slug}
            clientName={identity.name}
            onBack={() => setView("list")}
            onForget={() => {
              forgetIdentity(slug);
              setStored(null);
              setIdentityState(null);
              setView("list");
            }}
          />
        )}
        {view === "list" && (
          <>
            <BarberList
              theme={theme}
              isBarber={isBarber}
              business={business}
              staff={staff}
              queue={queue}
              myCount={myBusinesses.length}
              onOpenMyBiz={() => setView("mybiz")}
              onSelect={(s) => {
                setSelectedStaff(s);
                setView("detail");
              }}
              onScheduleFuture={() => {
                setSelectedStaff(null);
                setView("schedule");
              }}
            />
            <AppDownloadCta theme={theme} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// "Mis barberías": el cliente ve todas las barberías a las que
// pertenece y salta entre ellas. Para unirse a una nueva, abre su
// link o código QR (no se puede buscar dentro de la app).
// ---------------------------------------------------------------
function MyBusinesses({
  theme, businesses, currentSlug, clientName, onBack, onForget,
}: {
  theme: ReturnType<typeof getTheme>;
  businesses: ClientBusiness[];
  currentSlug: string;
  clientName: string;
  onBack: () => void;
  onForget: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-4 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Mis barberías</h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
        Hola {clientName.split(" ")[0]}. Aquí están las barberías a las que perteneces. Para unirte a una nueva, abre su link o su código QR.
      </p>

      <div className="space-y-2">
        {businesses.map((b) => {
          const here = b.invite_slug === currentSlug;
          const barber = b.type === "barber";
          return (
            <a
              key={b.id}
              href={`/r/${b.invite_slug}`}
              className="w-full flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: theme.cardBg, border: `1px solid ${here ? theme.accentRing : theme.cardBorder}` }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                ) : barber ? (
                  <Scissors className="w-5 h-5" style={{ color: theme.buttonText }} strokeWidth={2.5} />
                ) : (
                  <Flower2 className="w-5 h-5" style={{ color: theme.buttonText }} strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>{b.name}</p>
                <p className="font-body text-xs" style={{ color: here ? theme.accentRing : theme.textMuted }}>
                  {here ? "Estás aquí" : (barber ? "Barbería" : "Salón")}
                </p>
              </div>
              {!here && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: theme.textMuted }} />}
            </a>
          );
        })}
        {businesses.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Aún no perteneces a ninguna barbería.</p>
          </div>
        )}
      </div>

      <button
        onClick={onForget}
        className="font-body w-full text-sm font-medium py-3 rounded-xl mt-6"
        style={{ color: theme.textMuted, border: `1px solid ${theme.cardBorder}` }}
      >
        Cerrar sesión en este dispositivo
      </button>
    </div>
  );
}

// ---------------------------------------------------------------
// Descarga de la app (iOS / Android). El botón se MUESTRA para ver
// cómo queda, pero por ahora NO lleva a ningún lado (la app aún no
// existe). Cuando se agreguen los links reales en lib/appStore.ts,
// el botón empezará a abrir la tienda correcta según el dispositivo.
// Para ocultarlo por completo: APP_STORE.enabled = false.
// ---------------------------------------------------------------
const APP_DOWNLOADED_KEY = "enturnoi:app-descargada";

function AppDownloadCta({ theme }: { theme: ReturnType<typeof getTheme> }) {
  const [cta, setCta] = useState<{ platform: "ios" | "android" | "other"; url: string } | null>(null);
  // Una vez que el cliente toca "Descarga la app", lo recordamos en su
  // dispositivo y el botón no le vuelve a salir.
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(APP_DOWNLOADED_KEY) === "1") setDownloaded(true);
    } catch {
      /* almacenamiento bloqueado: mostramos el botón normalmente */
    }
    setCta(appDownloadCta());
  }, []);

  function markDownloaded() {
    try {
      localStorage.setItem(APP_DOWNLOADED_KEY, "1");
    } catch {
      /* si no se puede guardar, al menos se oculta en esta sesión */
    }
    setDownloaded(true);
  }

  if (!cta || downloaded) return null;

  const isIos = cta.platform === "ios";
  const label = isIos
    ? "Descarga la app en App Store"
    : cta.platform === "android"
      ? "Descarga la app en Google Play"
      : "Descarga nuestra app";
  const icon = isIos ? <Apple className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;
  const className =
    "font-body w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-xl font-semibold";
  const style = { background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` };

  // Con link real -> abre la tienda y se marca como descargada. Sin link
  // (modo prueba) -> se ve igual pero solo la marca como descargada.
  if (cta.url) {
    return (
      <a href={cta.url} target="_blank" rel="noopener noreferrer" onClick={markDownloaded} className={className} style={style}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={markDownloaded} className={className} style={style}>
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------
// Aviso "estás en la cola": le muestra al cliente en su propio
// teléfono que ya está en la fila y en qué puesto va (#N de M),
// tanto para walk-in (present) como para cita de hoy (scheduled).
// ---------------------------------------------------------------
function MyQueueBanner({ myQueue, theme }: { myQueue: MyQueueEntry[]; theme: ReturnType<typeof getTheme> }) {
  return (
    <div className="mb-5 space-y-2">
      {myQueue.map((e) => {
        const isNext = e.queue_position === 1;
        const isPresent = e.status === "present";
        const ahead = e.queue_position - 1;
        return (
          <div key={e.appt_id} className="rounded-2xl p-4" style={{ background: "rgba(63,191,127,0.12)", border: "1px solid #3FBF7F" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-body text-[11px] font-semibold tracking-wider" style={{ color: "#3FBF7F" }}>ESTÁS EN LA COLA</p>
                <p className="font-display text-lg truncate" style={{ color: theme.textPrimary }}>{e.staff_name}</p>
                <p className="font-body text-xs truncate" style={{ color: theme.textMuted }}>
                  {(e.service_name ?? "Servicio")}{!isPresent && e.appt_time ? ` · ${apptTimeToDisplay(e.appt_time)}` : ""}
                </p>
              </div>
              <div className="text-center shrink-0 rounded-xl px-3 py-2" style={{ background: theme.chipBg }}>
                <p className="font-display text-2xl leading-none" style={{ color: theme.textPrimary }}>#{e.queue_position}</p>
                <p className="font-body text-[10px] mt-1" style={{ color: theme.textMuted }}>de {e.total_in_queue}</p>
              </div>
            </div>
            <p className="font-body text-xs mt-2 font-semibold" style={{ color: "#3FBF7F" }}>
              {isNext
                ? "¡Eres el próximo! Prepárate 💈"
                : `Hay ${ahead} ${ahead === 1 ? "persona" : "personas"} antes que tú`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// Puerta de acceso del cliente con PIN de 4 dígitos.
//  - Dispositivo reconocido -> solo PIN (desbloquear).
//  - Primera vez -> nombre + teléfono + PIN + confirmar.
//  - Otro dispositivo / ya tengo cuenta -> teléfono + PIN.
// Usa las RPC ya existentes: client_register, client_login,
// client_join_business.
// ---------------------------------------------------------------
function ClientGate({
  theme, isBarber, business, slug, stored, onAuthed, onForget,
}: {
  theme: ReturnType<typeof getTheme>;
  isBarber: boolean;
  business: Business;
  slug: string;
  stored: Identity | null;
  onAuthed: (identity: Identity) => void;
  onForget: () => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<"unlock" | "register" | "login">(stored ? "unlock" : "register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const onlyDigits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

  async function ensureJoined(clientId: string) {
    await supabase.rpc("client_join_business", { p_client_id: clientId, p_slug: slug });
  }

  async function doUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!stored) return;
    if (pin.length !== 4) return setError("El PIN es de 4 dígitos.");
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("client_login", { p_phone: stored.phone, p_password: pin });
    setLoading(false);
    const row = data?.[0];
    if (error || !row) {
      setError("PIN incorrecto. Intenta de nuevo.");
      return;
    }
    await ensureJoined(row.id);
    onAuthed({ clientId: row.id, name: row.name, phone: stored.phone });
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return setError("Escribe tu nombre y tu número.");
    if (pin.length !== 4) return setError("El PIN debe ser de 4 dígitos.");
    if (pin !== pin2) return setError("Los PIN no coinciden.");
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("client_register", {
      p_slug: slug,
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_password: pin,
    });
    setLoading(false);
    if (error || !data) {
      setError(
        error?.message?.includes("ya tiene una cuenta")
          ? "Ese número ya tiene cuenta. Entra con tu PIN."
          : "No pudimos registrarte, intenta de nuevo.",
      );
      if (error?.message?.includes("ya tiene una cuenta")) {
        setMode("login");
        setPin("");
        setPin2("");
      }
      return;
    }
    onAuthed({ clientId: data as string, name: name.trim(), phone: phone.trim() });
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return setError("Escribe tu número.");
    if (pin.length !== 4) return setError("El PIN es de 4 dígitos.");
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("client_login", { p_phone: phone.trim(), p_password: pin });
    setLoading(false);
    const row = data?.[0];
    if (error || !row) {
      setError("Teléfono o PIN incorrectos.");
      return;
    }
    await ensureJoined(row.id);
    onAuthed({ clientId: row.id, name: row.name, phone: phone.trim() });
  }

  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary };
  const pinInputClass = "font-display w-full mt-2 px-4 py-3 rounded-xl outline-none text-center text-2xl tracking-[0.5em]";

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>
      <div className="w-full max-w-sm">
        {/* Marca del negocio */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : isBarber ? (
              <Scissors className="w-9 h-9" style={{ color: theme.buttonText }} strokeWidth={2.2} />
            ) : (
              <Flower2 className="w-9 h-9" style={{ color: theme.buttonText }} strokeWidth={2.2} />
            )}
          </div>
          <h1 className="font-display text-2xl" style={{ color: theme.textPrimary }}>{business.name}</h1>
          {business.address && <p className="font-body text-sm mt-1" style={{ color: theme.textMuted }}>{business.address}</p>}
        </div>

        <div className="rounded-3xl p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: cardShadow(business.type) }}>
          {/* ---------- DESBLOQUEAR (dispositivo reconocido) ---------- */}
          {mode === "unlock" && stored && (
            <form onSubmit={doUnlock}>
              <h2 className="font-display text-xl mb-1" style={{ color: theme.textPrimary }}>
                Hola de nuevo, {stored.name.split(" ")[0]}
              </h2>
              <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
                Escribe tu PIN de 4 dígitos para entrar.
              </p>

              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>PIN</label>
              <input
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(onlyDigits(e.target.value, 4))}
                placeholder="••••"
                className={pinInputClass}
                style={inputStyle}
              />

              {error && <p className="font-body text-xs mt-3" style={{ color: "#F19391" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-5 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}
              >
                {loading ? "Entrando..." : "Entrar"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center justify-between mt-5">
                <button type="button" onClick={() => { setShowRecovery(true); setError(null); }} className="font-body text-xs" style={{ color: theme.accentRing }}>
                  ¿Olvidaste tu PIN?
                </button>
                <button
                  type="button"
                  onClick={() => { onForget(); setMode("login"); setPin(""); setError(null); }}
                  className="font-body text-xs"
                  style={{ color: theme.textMuted }}
                >
                  Usar otro número
                </button>
              </div>
            </form>
          )}

          {/* ---------- REGISTRO (primera vez) ---------- */}
          {mode === "register" && (
            <form onSubmit={doRegister}>
              <h2 className="font-display text-xl mb-1" style={{ color: theme.textPrimary }}>Reserva tu cita</h2>
              <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
                {business.name} te invitó a agendar. Crea tu PIN una vez y listo.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>NOMBRE COMPLETO</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre y apellido"
                    className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>NÚMERO DE TELÉFONO</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="809 000 0000" type="tel"
                    className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none" style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>PIN (4 díg.)</label>
                    <input inputMode="numeric" value={pin} onChange={(e) => setPin(onlyDigits(e.target.value, 4))} placeholder="••••"
                      className="font-display w-full mt-2 px-3 py-3 rounded-xl outline-none text-center text-xl tracking-[0.3em]" style={inputStyle} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>CONFIRMAR</label>
                    <input inputMode="numeric" value={pin2} onChange={(e) => setPin2(onlyDigits(e.target.value, 4))} placeholder="••••"
                      className="font-display w-full mt-2 px-3 py-3 rounded-xl outline-none text-center text-xl tracking-[0.3em]" style={inputStyle} />
                  </div>
                </div>
              </div>

              <p className="font-body text-xs mt-3" style={{ color: theme.textMuted }}>
                Con tu número y PIN entras la próxima vez sin escribir todo de nuevo.
              </p>
              {error && <p className="font-body text-xs mt-3" style={{ color: "#F19391" }}>{error}</p>}

              <button type="submit" disabled={loading}
                className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-4 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
                {loading ? "Creando..." : "Crear mi PIN y continuar"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="font-body text-xs text-center mt-5" style={{ color: theme.textMuted }}>
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(null); setPin(""); setPin2(""); }} style={{ color: theme.accentRing }}>
                  Entra con tu PIN
                </button>
              </p>
            </form>
          )}

          {/* ---------- LOGIN (otro dispositivo / ya tengo cuenta) ---------- */}
          {mode === "login" && (
            <form onSubmit={doLogin}>
              <h2 className="font-display text-xl mb-1" style={{ color: theme.textPrimary }}>Entrar con tu PIN</h2>
              <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
                Escribe tu número y tu PIN de 4 dígitos.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>NÚMERO DE TELÉFONO</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="809 000 0000" type="tel"
                    className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>PIN</label>
                  <input inputMode="numeric" value={pin} onChange={(e) => setPin(onlyDigits(e.target.value, 4))} placeholder="••••"
                    className={pinInputClass} style={inputStyle} />
                </div>
              </div>

              {error && <p className="font-body text-xs mt-3" style={{ color: "#F19391" }}>{error}</p>}

              <button type="submit" disabled={loading || pin.length !== 4}
                className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-5 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
                {loading ? "Entrando..." : "Entrar"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center justify-between mt-5">
                <button type="button" onClick={() => { setShowRecovery(true); setError(null); }} className="font-body text-xs" style={{ color: theme.accentRing }}>
                  ¿Olvidaste tu PIN?
                </button>
                <button type="button" onClick={() => { setMode("register"); setError(null); setPin(""); }} className="font-body text-xs" style={{ color: theme.textMuted }}>
                  Soy nuevo
                </button>
              </div>
            </form>
          )}

          {/* Recuperación por SMS (pendiente de programar) */}
          {showRecovery && (
            <div className="mt-5 rounded-xl p-4" style={{ background: theme.chipBg, border: `1px solid ${theme.cardBorder}` }}>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5" style={{ color: theme.accentRing }} />
                <span className="font-body text-xs font-semibold" style={{ color: theme.textPrimary }}>Recuperar PIN</span>
              </div>
              <p className="font-body text-xs" style={{ color: theme.textMuted }}>
                La recuperación por SMS estará disponible pronto. Por ahora, pídele al negocio que te ayude a restablecerlo.
              </p>
              <button type="button" onClick={() => setShowRecovery(false)} className="font-body text-xs mt-2" style={{ color: theme.accentRing }}>
                Entendido
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 justify-center mt-6">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme.textMuted }} />
            <p className="font-body text-xs" style={{ color: theme.textMuted }}>Tus datos solo se comparten con {business.name}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Lista de barberos con su cola en tiempo real
// ---------------------------------------------------------------
function BarberList({
  theme, isBarber, business, staff, queue, myCount, onOpenMyBiz, onSelect, onScheduleFuture,
}: {
  theme: ReturnType<typeof getTheme>;
  isBarber: boolean;
  business: Business;
  staff: Staff[];
  queue: Record<string, QueueInfo>;
  myCount: number;
  onOpenMyBiz: () => void;
  onSelect: (s: Staff) => void;
  onScheduleFuture: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
          ) : isBarber ? (
            <Scissors className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
          ) : (
            <Flower2 className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
          )}
        </div>
        <span className="font-display text-lg flex-1 min-w-0 truncate" style={{ color: theme.textPrimary }}>{business.name}</span>
        <button
          onClick={onOpenMyBiz}
          className="font-body flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full shrink-0 shadow-md"
          style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}
        >
          <Store className="w-3.5 h-3.5" strokeWidth={2.5} />
          Mis {isBarber ? "barberías" : "salones"}
          {myCount > 1 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: theme.buttonText, color: theme.accentRing }}>
              {myCount}
            </span>
          )}
        </button>
      </div>

      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Elige tu barbero</h1>
      <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>Toca uno para ver cuántos hay en su cola.</p>

      <div className="space-y-2.5">
        {staff.map((s) => {
          const info = queue[s.id];
          const total = (info?.present_count ?? 0) + (info?.scheduled_count ?? 0);
          return (
            <button key={s.id} onClick={() => onSelect(s)} className="w-full rounded-2xl p-4 flex items-center gap-3 text-left" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-base shrink-0" style={{ background: theme.chipBg, color: theme.accentRing }}>
                {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold" style={{ color: theme.textPrimary }}>{s.name}</p>
                <p className="font-body text-xs" style={{ color: theme.textMuted }}>{s.specialty ?? " "}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {total === 0 ? (
                  <span className="font-body text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: theme.chipBg, color: theme.accentRing }}>
                    <Users className="w-3 h-3" />
                    Libre
                  </span>
                ) : (
                  <>
                    <span className="font-body text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: "rgba(63,191,127,0.16)", color: theme.green }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.green }} />
                      {info?.present_count ?? 0} en el local
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(info?.scheduled_count ?? 0) > 0 && (
                        <span className="font-body text-[11px]" style={{ color: theme.textMuted }}>+{info?.scheduled_count} con cita</span>
                      )}
                      <span className="font-body text-[11px] font-medium" style={{ color: theme.textPrimary }}>· {total} en cola</span>
                    </div>
                  </>
                )}
                <ChevronRight className="w-4 h-4 mt-0.5" style={{ color: theme.textMuted }} />
              </div>
            </button>
          );
        })}
        {staff.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Este negocio aún no tiene barberos configurados.</p>
          </div>
        )}
      </div>

      <button onClick={onScheduleFuture} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-body font-semibold mt-5" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
        <CalendarDays className="w-4 h-4" />
        Agendar cita futura
      </button>
    </>
  );
}

function QueueDetail({
  theme, staffMember, info, myEntries, onBack, onSchedule, onWalkin,
}: {
  theme: ReturnType<typeof getTheme>;
  staffMember: Staff;
  info: QueueInfo | undefined;
  myEntries: MyQueueEntry[];
  onBack: () => void;
  onSchedule: () => void;
  onWalkin: () => void;
}) {
  const present = info?.present_count ?? 0;
  const scheduled = info?.scheduled_count ?? 0;
  const totalMinutes = info?.total_minutes ?? 0;
  const total = present + scheduled;

  return (
    <>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-5 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Todos los barberos
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-base shrink-0" style={{ background: theme.chipBg, color: theme.accentRing }}>
          {staffMember.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h1 className="font-display text-xl" style={{ color: theme.textPrimary }}>{staffMember.name}</h1>
          <p className="font-body text-xs" style={{ color: theme.textMuted }}>{staffMember.specialty ?? " "}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden mt-4 mb-2 grid grid-cols-2" style={{ border: `1.5px solid ${theme.cardBorder}` }}>
        <div className="p-4 flex flex-col gap-2" style={{ background: "rgba(63,191,127,0.14)", borderRight: `1px solid ${theme.cardBorder}` }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: theme.green }} />
            <span className="font-body text-xs font-medium" style={{ color: theme.textPrimary }}>En el local</span>
          </div>
          <span className="font-display text-3xl" style={{ color: theme.green }}>{present}</span>
        </div>
        <div className="p-4 flex flex-col gap-2" style={{ background: "rgba(224,169,59,0.14)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: theme.yellow }} />
            <span className="font-body text-xs font-medium" style={{ color: theme.textPrimary }}>Con cita</span>
          </div>
          <span className="font-display text-3xl" style={{ color: theme.yellow }}>{scheduled}</span>
        </div>
      </div>

      <p className="font-body text-xs mb-4" style={{ color: theme.textMuted }}>{total} en cola en total</p>

      {myEntries.length > 0 && <MyQueueBanner myQueue={myEntries} theme={theme} />}

      {total === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          <p className="font-body text-sm" style={{ color: theme.textMuted }}>{staffMember.name.split(" ")[0]} está libre ahora mismo.</p>
        </div>
      ) : (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: theme.chipBg, border: `1px solid ${theme.cardBorder}` }}>
          <div>
            <p className="font-body text-xs" style={{ color: theme.textMuted }}>Próxima disponibilidad</p>
            <p className="font-display text-lg" style={{ color: theme.textPrimary }}>en {totalMinutes} min</p>
          </div>
          <span className="font-body text-sm font-medium" style={{ color: theme.accentRing }}>
            aprox. {formatTime(new Date(Date.now() + totalMinutes * 60000))}
          </span>
        </div>
      )}

      <button onClick={onWalkin} className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-4" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
        <Users className="w-4 h-4" />
        Ponerme en la cola ahora
      </button>
      <button onClick={onSchedule} className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-3" style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}>
        <CalendarDays className="w-4 h-4" />
        Agendar cita futura
      </button>
    </>
  );
}

// ---------------------------------------------------------------
// Agendar cita futura: Día → Barbero (si no venía preseleccionado) →
// Horario (según disponibilidad real de ESE barbero) → Servicio → Confirmar
// ---------------------------------------------------------------
function ScheduleFuture({
  theme, staffList, services, hours, preselectedStaff, slug, clientId, onBack, onDone,
}: {
  theme: ReturnType<typeof getTheme>;
  staffList: Staff[];
  services: ServiceOption[];
  hours: BusinessHours;
  preselectedStaff: Staff | null;
  slug: string;
  clientId: string;
  onBack: () => void;
  onDone: (summary: { date: string; time: string; staff: string; service: string; price: number }) => void;
}) {
  const supabase = createClient();
  const [step, setStep] = useState(1); // 1 día, 2 barbero, 3 horario, 4 servicio, 5 confirmar
  const [date, setDate] = useState<{ key: string; label: string; num: number } | null>(null);
  const [staffMember, setStaffMember] = useState<Staff | null>(preselectedStaff);
  const [time, setTime] = useState<string | null>(null);
  const [service, setService] = useState<ServiceOption | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [takenSet, setTakenSet] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => buildScheduleDays(10), []);
  const slots = useMemo(() => buildDaySlots(hours), [hours]);

  useEffect(() => {
    if (step !== 3 || !staffMember || !date) return;
    setLoadingSlots(true);
    Promise.all([
      supabase.rpc("get_staff_blocked_slots", { p_staff_id: staffMember.id, p_date: date.key }),
      supabase.rpc("get_staff_appointments_for_day", { p_staff_id: staffMember.id, p_date: date.key }),
    ]).then(([blockedRes, apptRes]) => {
      setBlockedSet(new Set<string>(blockedRes.data ?? []));
      setTakenSet(new Set<string>((apptRes.data ?? []).map((a: any) => a.appt_time.slice(0, 5))));
      setLoadingSlots(false);
    });
  }, [step, staffMember, date]);

  const goBack = () => {
    if (step === 1) return onBack();
    if (step === 2) return setStep(1);
    if (step === 3) return setStep(preselectedStaff ? 1 : 2);
    setStep(step - 1);
  };

  const pickDate = (d: { key: string; label: string; num: number }) => {
    setDate(d);
    setStep(preselectedStaff ? 3 : 2);
  };
  const pickStaff = (s: Staff) => { setStaffMember(s); setStep(3); };
  const pickTime = (t: string) => { setTime(t); setStep(4); };
  const pickService = (s: ServiceOption) => { setService(s); setStep(5); };

  async function confirm() {
    if (!date || !staffMember || !time || !service) return;
    setSubmitting(true);
    setError(null);
    const { data, error } = await supabase.rpc("book_appointment", {
      p_slug: slug,
      p_client_id: clientId,
      p_staff_id: staffMember.id,
      p_business_service_id: service.business_service_id,
      p_date: date.key,
      p_time: `${time}:00`,
    });
    setSubmitting(false);
    if (error || !data) {
      setError(error?.message?.includes("disponible") ? "Ese horario ya no está disponible, elige otro." : "No se pudo agendar, intenta de nuevo.");
      return;
    }
    onDone({ date: `${date.label}, ${date.num}`, time: displayHm(time), staff: staffMember.name, service: service.service_name, price: service.price });
  }

  return (
    <>
      <button
        onClick={goBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-4 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        {step === 1 ? "Volver" : "Atrás"}
      </button>

      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s <= step ? theme.accentRing : theme.cardBorder }} />
        ))}
      </div>

      {error && <p className="font-body text-xs mb-4" style={{ color: "#F19391" }}>{error}</p>}

      {step === 1 && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¿Qué día?</h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>Elige el día que te queda mejor.</p>
          <div className="grid grid-cols-4 gap-2">
            {days.map((d) => (
              <button key={d.key} onClick={() => pickDate(d)} className="rounded-xl py-3.5 flex flex-col items-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <span className="font-body text-[10px] uppercase" style={{ color: theme.textMuted }}>{d.label}</span>
                <span className="font-display text-base" style={{ color: theme.textPrimary }}>{d.num}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && date && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¿Con quién?</h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>{date.label}, {date.num} · cada barbero tiene su propia disponibilidad.</p>
          <div className="space-y-2">
            {staffList.map((s) => (
              <button key={s.id} onClick={() => pickStaff(s)} className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm shrink-0" style={{ background: theme.chipBg, color: theme.accentRing }}>
                  {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>{s.name}</p>
                  <p className="font-body text-xs" style={{ color: theme.textMuted }}>{s.specialty ?? " "}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: theme.textMuted }} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && date && staffMember && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¿A qué hora?</h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>{date.label}, {date.num} · con {staffMember.name.split(" ")[0]}</p>
          {(() => {
            const todayKey = new Date().toISOString().slice(0, 10);
            const isToday = date.key === todayKey;
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            const isDisabled = (slot: string) =>
              blockedSet.has(slot) ||
              takenSet.has(slot) ||
              (isToday && hmToMin(slot) <= nowMin);
            const anyFree = slots.some((s) => !isDisabled(s));

            if (loadingSlots) {
              return <p className="font-body text-sm" style={{ color: theme.textMuted }}>Buscando horarios...</p>;
            }
            if (!anyFree) {
              return (
                <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                  <p className="font-body text-sm" style={{ color: theme.textMuted }}>No hay horarios libres ese día. Prueba otra fecha.</p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const disabled = isDisabled(slot);
                  return (
                    <button
                      key={slot}
                      disabled={disabled}
                      onClick={() => !disabled && pickTime(slot)}
                      className="font-body text-sm font-medium py-3.5 rounded-lg"
                      style={{
                        background: disabled ? theme.inputBg : theme.chipBg,
                        color: disabled ? theme.textMuted : theme.accentRing,
                        textDecoration: disabled ? "line-through" : "none",
                        opacity: disabled ? 0.45 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {displayHm(slot)}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {step === 4 && date && staffMember && time && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¿Qué servicio quieres?</h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>{date.label}, {date.num} · {displayHm(time)} · con {staffMember.name.split(" ")[0]}</p>
          <div className="space-y-2">
            {services.map((s) => (
              <button key={s.business_service_id} onClick={() => pickService(s)} className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                <div className="flex-1">
                  <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>{s.service_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" style={{ color: theme.textMuted }} />
                    <span className="font-body text-xs" style={{ color: theme.textMuted }}>~{s.duration_minutes} min</span>
                  </div>
                </div>
                <span className="font-display text-base" style={{ color: theme.accentRing }}>RD${s.price}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 5 && date && staffMember && time && service && (
        <>
          <h1 className="font-display text-2xl mb-5" style={{ color: theme.textPrimary }}>Confirma tu cita</h1>
          <div className="rounded-2xl p-5 space-y-3 mb-6" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <Row label="Servicio" value={service.service_name} theme={theme} />
            <Row label="Barbero" value={staffMember.name} theme={theme} />
            <Row label="Fecha" value={`${date.label}, ${date.num}`} theme={theme} />
            <Row label="Hora" value={displayHm(time)} theme={theme} />
            <div className="h-px" style={{ background: theme.divider }} />
            <Row label="Total" value={`RD$${service.price}`} theme={theme} bold />
          </div>
          <button onClick={confirm} disabled={submitting} className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
            {submitting ? "Agendando..." : "Confirmar cita"}
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------
// Ponerse en la cola AHORA (walk-in): elige servicio y entra de último.
// ---------------------------------------------------------------
function WalkinFlow({
  theme, staffMember, services, slug, clientId, onBack, onDone,
}: {
  theme: ReturnType<typeof getTheme>;
  staffMember: Staff;
  services: ServiceOption[];
  slug: string;
  clientId: string;
  onBack: () => void;
  onDone: (summary: Summary) => void;
}) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(service: ServiceOption) {
    setSubmitting(true);
    setError(null);
    const { data, error } = await supabase.rpc("queue_join_walkin", {
      p_slug: slug,
      p_staff_id: staffMember.id,
      p_client_id: clientId,
      p_business_service_id: service.business_service_id,
    });
    setSubmitting(false);
    if (error || !data) {
      setError("No se pudo poner en la cola, intenta de nuevo.");
      return;
    }
    onDone({ kind: "walkin", staff: staffMember.name, service: service.service_name, price: service.price });
  }

  return (
    <>
      <button
        onClick={onBack}
        className="font-body inline-flex items-center gap-1.5 text-sm font-medium mb-4 px-3 py-1.5 rounded-full"
        style={{ color: theme.accentRing, border: `1px solid ${theme.accentRing}` }}
      >
        <ChevronLeft className="w-4 h-4" />
        Atrás
      </button>

      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>Ponerte en la cola</h1>
      <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>
        Con {staffMember.name.split(" ")[0]} · elige tu servicio y quedas de último en la cola.
      </p>

      {error && <p className="font-body text-xs mb-4" style={{ color: "#F19391" }}>{error}</p>}

      <div className="space-y-2">
        {services.map((s) => (
          <button
            key={s.business_service_id}
            disabled={submitting}
            onClick={() => join(s)}
            className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left disabled:opacity-50"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div className="flex-1">
              <p className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>{s.service_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" style={{ color: theme.textMuted }} />
                <span className="font-body text-xs" style={{ color: theme.textMuted }}>~{s.duration_minutes} min</span>
              </div>
            </div>
            <span className="font-display text-base" style={{ color: theme.accentRing }}>RD${s.price}</span>
          </button>
        ))}
        {services.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Este negocio aún no tiene servicios configurados.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value, theme, bold }: { label: string; value: string; theme: ReturnType<typeof getTheme>; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-body text-sm" style={{ color: theme.textMuted }}>{label}</span>
      <span className={`font-body text-sm ${bold ? "font-semibold" : ""}`} style={{ color: bold ? theme.accentRing : theme.textPrimary }}>{value}</span>
    </div>
  );
}

function Confirmed({
  theme, summary, onBack,
}: {
  theme: ReturnType<typeof getTheme>;
  summary: Summary;
  onBack: () => void;
}) {
  const isWalkin = summary.kind === "walkin";
  return (
    <div className="text-center pt-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(63,191,127,0.16)" }}>
        <Check className="w-7 h-7" style={{ color: theme.green }} />
      </div>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
        {isWalkin ? "¡Estás en la cola!" : "¡Cita confirmada!"}
      </h1>
      <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
        {isWalkin
          ? `Quedaste en la cola de ${summary.staff.split(" ")[0]}. Te atienden por orden de llegada.`
          : `Te esperamos con ${summary.staff.split(" ")[0]}.`}
      </p>
      <div className="rounded-2xl p-5 space-y-3 mb-6 text-left" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <Row label="Servicio" value={summary.service} theme={theme} />
        <Row label="Barbero" value={summary.staff} theme={theme} />
        {!isWalkin && summary.date && <Row label="Fecha" value={summary.date} theme={theme} />}
        {!isWalkin && summary.time && <Row label="Hora" value={summary.time} theme={theme} />}
        <div className="h-px" style={{ background: theme.divider }} />
        <Row label="Total" value={`RD$${summary.price}`} theme={theme} bold />
      </div>
      <button onClick={onBack} className="font-body w-full py-3.5 rounded-xl font-semibold" style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}>
        Volver al inicio
      </button>
    </div>
  );
}
