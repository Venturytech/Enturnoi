"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Scissors, Flower2, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight,
  Clock, Users, CalendarDays, Check, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, cardShadow, type BusinessType } from "@/lib/theme";

type Business = { id: string; name: string; type: BusinessType; logo_url: string | null; address: string | null };
type Staff = { id: string; name: string; specialty: string | null };
type ServiceOption = { business_service_id: string; service_name: string; price: number; duration_minutes: number };
type QueueInfo = { staff_id: string; present_count: number; scheduled_count: number; total_minutes: number };
type Identity = { clientId: string; name: string; phone: string };

const STORAGE_PREFIX = "enturnoi:client:";

function getIdentity(slug: string): Identity | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_PREFIX + slug);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveIdentity(slug: string, identity: Identity) {
  localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(identity));
}
function forgetIdentity(slug: string) {
  localStorage.removeItem(STORAGE_PREFIX + slug);
}

const TIME_SLOTS = [
  "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30",
  "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30",
];
function slotTo24(slot: string) {
  const [hStr, m] = slot.split(":");
  let h = parseInt(hStr, 10);
  if (h !== 12 && h < 8) h += 12;
  return `${String(h).padStart(2, "0")}:${m}:00`;
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
  const supabase = createClient();
  const theme = getTheme(business.type);
  const isBarber = business.type === "barber";

  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [stored, setStored] = useState<Identity | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [view, setView] = useState<"list" | "detail" | "schedule" | "confirmed">("list");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [queue, setQueue] = useState<Record<string, QueueInfo>>({});
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState<{ date: string; time: string; staff: string; service: string; price: number } | null>(null);

  useEffect(() => {
    setStored(getIdentity(slug));
    setCheckedStorage(true);
  }, [slug]);

  useEffect(() => {
    if (!identity) return;
    Promise.all([
      supabase.rpc("get_business_staff_by_slug", { p_slug: slug }),
      supabase.rpc("get_business_services_by_slug", { p_slug: slug }),
      supabase.rpc("get_staff_queue_today", { p_slug: slug }),
    ]).then(([s, sv, q]) => {
      setStaff(s.data ?? []);
      setServices(sv.data ?? []);
      const map: Record<string, QueueInfo> = {};
      (q.data ?? []).forEach((row: QueueInfo) => (map[row.staff_id] = row));
      setQueue(map);
    });
  }, [identity, slug]);

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
            onBack={() => setView("list")}
            onSchedule={() => setView("schedule")}
          />
        )}
        {view === "schedule" && (
          <ScheduleFuture
            theme={theme}
            staffList={staff}
            services={services}
            preselectedStaff={selectedStaff}
            slug={slug}
            clientId={identity.clientId}
            onBack={() => setView(selectedStaff ? "detail" : "list")}
            onDone={(summary) => {
              setLastConfirmed(summary);
              setSelectedStaff(null);
              setView("confirmed");
            }}
          />
        )}
        {view === "confirmed" && lastConfirmed && (
          <Confirmed theme={theme} summary={lastConfirmed} onBack={() => setView("list")} />
        )}
        {view === "list" && (
          <BarberList
            theme={theme}
            isBarber={isBarber}
            business={business}
            staff={staff}
            queue={queue}
            onSelect={(s) => {
              setSelectedStaff(s);
              setView("detail");
            }}
            onScheduleFuture={() => {
              setSelectedStaff(null);
              setView("schedule");
            }}
          />
        )}
      </div>
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
  theme, isBarber, business, staff, queue, onSelect, onScheduleFuture,
}: {
  theme: ReturnType<typeof getTheme>;
  isBarber: boolean;
  business: Business;
  staff: Staff[];
  queue: Record<string, QueueInfo>;
  onSelect: (s: Staff) => void;
  onScheduleFuture: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
          ) : isBarber ? (
            <Scissors className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
          ) : (
            <Flower2 className="w-4 h-4" style={{ color: theme.buttonText }} strokeWidth={2.5} />
          )}
        </div>
        <span className="font-display text-lg" style={{ color: theme.textPrimary }}>{business.name}</span>
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
  theme, staffMember, info, onBack, onSchedule,
}: {
  theme: ReturnType<typeof getTheme>;
  staffMember: Staff;
  info: QueueInfo | undefined;
  onBack: () => void;
  onSchedule: () => void;
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

      <p className="font-body text-xs mb-6" style={{ color: theme.textMuted }}>{total} en cola en total</p>

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

      <button onClick={onSchedule} className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-4" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`, color: theme.buttonText }}>
        Agendar con {staffMember.name.split(" ")[0]}
      </button>
    </>
  );
}

// ---------------------------------------------------------------
// Agendar cita futura: Día → Barbero (si no venía preseleccionado) →
// Horario (según disponibilidad real de ESE barbero) → Servicio → Confirmar
// ---------------------------------------------------------------
function ScheduleFuture({
  theme, staffList, services, preselectedStaff, slug, clientId, onBack, onDone,
}: {
  theme: ReturnType<typeof getTheme>;
  staffList: Staff[];
  services: ServiceOption[];
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
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => buildScheduleDays(10), []);

  useEffect(() => {
    if (step !== 3 || !staffMember || !date) return;
    setLoadingSlots(true);
    Promise.all([
      supabase.rpc("get_staff_blocked_slots", { p_staff_id: staffMember.id, p_date: date.key }),
      supabase.rpc("get_staff_appointments_for_day", { p_staff_id: staffMember.id, p_date: date.key }),
    ]).then(([blockedRes, apptRes]) => {
      const blocked = new Set<string>(blockedRes.data ?? []);
      const taken = new Set<string>((apptRes.data ?? []).map((a: any) => a.appt_time.slice(0, 5)));
      const free = TIME_SLOTS.filter((slot) => !blocked.has(slot) && !taken.has(slotTo24(slot).slice(0, 5)));
      setAvailableSlots(free);
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
      p_time: slotTo24(time),
    });
    setSubmitting(false);
    if (error || !data) {
      setError(error?.message?.includes("disponible") ? "Ese horario ya no está disponible, elige otro." : "No se pudo agendar, intenta de nuevo.");
      return;
    }
    onDone({ date: `${date.label}, ${date.num}`, time, staff: staffMember.name, service: service.service_name, price: service.price });
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
          {loadingSlots ? (
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>Buscando horarios...</p>
          ) : availableSlots.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
              <p className="font-body text-sm" style={{ color: theme.textMuted }}>No hay horarios libres ese día. Prueba otra fecha.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button key={slot} onClick={() => pickTime(slot)} className="font-body text-sm font-medium py-3.5 rounded-lg" style={{ background: theme.chipBg, color: theme.accentRing }}>
                  {slot}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 4 && date && staffMember && time && (
        <>
          <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¿Qué servicio quieres?</h1>
          <p className="font-body text-sm mb-5" style={{ color: theme.textMuted }}>{date.label}, {date.num} · {time} · con {staffMember.name.split(" ")[0]}</p>
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
            <Row label="Hora" value={time} theme={theme} />
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
  summary: { date: string; time: string; staff: string; service: string; price: number };
  onBack: () => void;
}) {
  return (
    <div className="text-center pt-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(63,191,127,0.16)" }}>
        <Check className="w-7 h-7" style={{ color: theme.green }} />
      </div>
      <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>¡Cita confirmada!</h1>
      <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>Te esperamos con {summary.staff.split(" ")[0]}.</p>
      <div className="rounded-2xl p-5 space-y-3 mb-6 text-left" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
        <Row label="Servicio" value={summary.service} theme={theme} />
        <Row label="Barbero" value={summary.staff} theme={theme} />
        <Row label="Fecha" value={summary.date} theme={theme} />
        <Row label="Hora" value={summary.time} theme={theme} />
        <div className="h-px" style={{ background: theme.divider }} />
        <Row label="Total" value={`RD$${summary.price}`} theme={theme} bold />
      </div>
      <button onClick={onBack} className="font-body w-full py-3.5 rounded-xl font-semibold" style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}>
        Volver al inicio
      </button>
    </div>
  );
}
