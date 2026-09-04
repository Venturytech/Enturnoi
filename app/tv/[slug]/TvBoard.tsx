"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Scissors, Flower2, Maximize, Minimize } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, type BusinessType } from "@/lib/theme";

type Business = { id: string; name: string; type: BusinessType; logo_url: string | null; address: string | null };
type Staff = { id: string; name: string; specialty: string | null };

type BoardRow = {
  business_id: string;
  staff_id: string;
  staff_name: string;
  appt_id: string | null;
  client_name: string | null;
  service_name: string | null;
  appt_time: string | null;
  status: string | null;
};

type BoardAppt = {
  id: string;
  client: string;
  service: string;
  time: string;
  status: "scheduled" | "present";
};

function toDisplayTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function firstNameLastInitial(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export default function TvBoard({ slug, business, staff }: { slug: string; business: Business; staff: Staff[] }) {
  const supabase = useRef(createClient()).current;
  const theme = getTheme(business.type);
  const isBarber = business.type === "barber";

  const [board, setBoard] = useState<Record<string, BoardAppt[]>>({});
  const [now, setNow] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isFs, setIsFs] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setInviteUrl(`${window.location.origin}/r/${slug}`);
  }, [slug]);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFs() {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* algunos navegadores/TVs bloquean pantalla completa; se ignora */
    }
  }

  async function loadBoard() {
    const { data } = await supabase.rpc("get_business_board_today", { p_slug: slug });
    const rows = (data ?? []) as BoardRow[];
    const grouped: Record<string, BoardAppt[]> = {};
    for (const s of staff) grouped[s.id] = [];
    for (const row of rows) {
      if (!row.appt_id || !row.appt_time) continue;
      if (row.status !== "scheduled" && row.status !== "present") continue;
      if (!grouped[row.staff_id]) grouped[row.staff_id] = [];
      grouped[row.staff_id].push({
        id: row.appt_id,
        client: firstNameLastInitial(row.client_name ?? "Cliente"),
        service: row.service_name ?? "Servicio",
        time: toDisplayTime(row.appt_time),
        status: row.status as "scheduled" | "present",
      });
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    setBoard(grouped);
    setPulse(true);
    setTimeout(() => setPulse(false), 900);
  }

  useEffect(() => {
    loadBoard();

    const channel = supabase
      .channel(`tv-board-${business.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `business_id=eq.${business.id}` },
        () => loadBoard(),
      )
      .subscribe();

    // Refresco de respaldo cada 20s, por si el realtime se cae en la TV.
    const poll = setInterval(loadBoard, 20000);
    const clock = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, slug]);

  const totalWaiting = useMemo(
    () => Object.values(board).reduce((sum, list) => sum + list.length, 0),
    [board],
  );

  const timeStr = now.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });

  const count = staff.length;
  // Cuando hay 6 barberos o menos, repartimos en una sola fila de columnas
  // iguales que llenan el alto. Con más, dejamos que fluya en varias filas.
  const cols = Math.min(count, 6);
  const gridStyle: CSSProperties =
    count <= 6
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr" }
      : { gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" };

  // Los tamaños se escalan con el número de columnas para que 1-2 barberos se
  // vean grandes y 5-6 sigan cabiendo. clamp() lo ajusta al ancho real de TV.
  const big = cols <= 2;
  const nameSize = big ? "clamp(1.4rem, 2.4vw, 2.4rem)" : "clamp(1rem, 1.5vw, 1.6rem)";
  const clientSize = big ? "clamp(1.1rem, 1.7vw, 1.7rem)" : "clamp(0.95rem, 1.15vw, 1.3rem)";
  const svcSize = big ? "clamp(0.8rem, 1vw, 1.05rem)" : "clamp(0.72rem, 0.85vw, 0.95rem)";
  const timeSize = big ? "clamp(1rem, 1.4vw, 1.5rem)" : "clamp(0.85rem, 1vw, 1.2rem)";

  return (
    <div
      ref={rootRef}
      className="h-[100dvh] w-full flex flex-col overflow-hidden font-body"
      style={{ background: theme.pageBg }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        @keyframes tvPulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
        .tv-scroll::-webkit-scrollbar { width: 0; height: 0; }
        .tv-scroll { scrollbar-width: none; }
      `}</style>

      {/* Header: compacto para dejar el máximo alto a la cola */}
      <div
        className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3 sm:py-4 shrink-0"
        style={{ borderBottom: `2px solid ${theme.divider}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : isBarber ? (
              <Scissors className="w-6 h-6" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            ) : (
              <Flower2 className="w-6 h-6" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0">
            <h1
              className="font-display truncate"
              style={{ color: theme.textPrimary, fontSize: "clamp(1.25rem, 2vw, 2rem)" }}
            >
              {business.name}
            </h1>
            <p className="font-body text-sm capitalize truncate" style={{ color: theme.textMuted }}>{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: theme.green, animation: pulse ? "none" : "tvPulse 2.4s ease-in-out infinite" }}
              />
              <span className="font-body text-xs font-medium tracking-wide" style={{ color: theme.textMuted }}>EN VIVO</span>
            </div>
            <span
              className="font-display tabular-nums"
              style={{ color: theme.textPrimary, fontSize: "clamp(1.4rem, 2.2vw, 2.4rem)" }}
            >
              {timeStr}
            </span>
          </div>

          {inviteUrl && (
            <div className="hidden sm:flex flex-col items-center gap-1">
              <div className="p-1.5 rounded-lg bg-white">
                <QRCodeCanvas value={inviteUrl} size={56} level="M" />
              </div>
              <span className="font-body text-[10px] font-medium tracking-wide text-center" style={{ color: theme.textMuted }}>Escanéame</span>
            </div>
          )}

          <button
            onClick={toggleFs}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: theme.chipBg, border: `1px solid ${theme.cardBorder}`, color: theme.accentRing }}
            title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFs ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tablero: llena el alto restante; cada columna tiene su propio scroll */}
      <div className="flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-5">
        {staff.length === 0 ? (
          <p className="font-body text-xl text-center mt-20" style={{ color: theme.textMuted }}>
            Este negocio aún no tiene equipo configurado.
          </p>
        ) : (
          <div className="grid gap-3 sm:gap-4 h-full min-h-0" style={gridStyle}>
            {staff.map((s) => {
              const list = board[s.id] ?? [];
              return (
                <div
                  key={s.id}
                  className="rounded-2xl overflow-hidden flex flex-col min-h-0"
                  style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
                >
                  <div
                    className="px-4 py-3 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
                  >
                    <h2 className="font-display truncate" style={{ color: theme.buttonText, fontSize: nameSize }}>{s.name}</h2>
                    <p className="font-body text-xs sm:text-sm" style={{ color: theme.buttonText, opacity: 0.8 }}>
                      {list.length === 0 ? "Sin cola" : `${list.length} en espera`}
                    </p>
                  </div>

                  <div className="tv-scroll flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                    {list.length === 0 && (
                      <p className="font-body text-base text-center py-8" style={{ color: theme.textMuted }}>
                        Libre ahora
                      </p>
                    )}
                    {list.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                        style={{
                          background: a.status === "present" ? "rgba(63,191,127,0.14)" : theme.chipBg,
                          border: a.status === "present" ? "1.5px solid #3FBF7F" : `1px solid ${theme.cardBorder}`,
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-display truncate" style={{ color: theme.textPrimary, fontSize: clientSize }}>{a.client}</p>
                          <p className="font-body truncate" style={{ color: theme.textMuted, fontSize: svcSize }}>{a.service}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {a.status === "present" ? (
                            <span className="font-body text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "#3FBF7F", color: "#0A1F14" }}>
                              EN SILLA
                            </span>
                          ) : (
                            <span className="font-display" style={{ color: theme.accentRing, fontSize: timeSize }}>{a.time}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {staff.length > 0 && (
        <p className="font-body text-xs sm:text-sm text-center py-2 shrink-0" style={{ color: theme.textMuted }}>
          {totalWaiting} persona{totalWaiting === 1 ? "" : "s"} esperando en total
        </p>
      )}
    </div>
  );
}
