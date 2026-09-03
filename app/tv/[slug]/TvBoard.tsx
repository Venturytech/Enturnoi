"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Scissors, Flower2 } from "lucide-react";
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

  useEffect(() => {
    if (typeof window !== "undefined") setInviteUrl(`${window.location.origin}/r/${slug}`);
  }, [slug]);

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

  return (
    <div className="min-h-screen w-full" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        @keyframes tvPulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-10 py-5 sm:py-7" style={{ borderBottom: `2px solid ${theme.divider}` }}>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : isBarber ? (
              <Scissors className="w-8 h-8" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            ) : (
              <Flower2 className="w-8 h-8" style={{ color: theme.buttonText }} strokeWidth={2.5} />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl" style={{ color: theme.textPrimary }}>{business.name}</h1>
            <p className="font-body text-base capitalize" style={{ color: theme.textMuted }}>{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: theme.green, animation: pulse ? "none" : "tvPulse 2.4s ease-in-out infinite" }}
              />
              <span className="font-body text-sm font-medium tracking-wide" style={{ color: theme.textMuted }}>EN VIVO</span>
            </div>
            <span className="font-display text-2xl sm:text-4xl tabular-nums" style={{ color: theme.textPrimary }}>{timeStr}</span>
          </div>

          {inviteUrl && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-2 rounded-xl bg-white">
                <QRCodeCanvas value={inviteUrl} size={72} level="M" />
              </div>
              <span className="font-body text-[11px] font-medium tracking-wide text-center" style={{ color: theme.textMuted }}>Escanéame<br />para tu turno</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-10 py-6 sm:py-8">
        {staff.length === 0 ? (
          <p className="font-body text-xl text-center mt-20" style={{ color: theme.textMuted }}>
            Este negocio aún no tiene equipo configurado.
          </p>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {staff.map((s) => {
              const list = board[s.id] ?? [];
              return (
                <div key={s.id} className="rounded-3xl overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
                  <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}>
                    <h2 className="font-display text-2xl" style={{ color: theme.buttonText }}>{s.name}</h2>
                    <p className="font-body text-sm" style={{ color: theme.buttonText, opacity: 0.75 }}>
                      {list.length === 0 ? "Sin cola" : `${list.length} en espera`}
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    {list.length === 0 && (
                      <p className="font-body text-base text-center py-8" style={{ color: theme.textMuted }}>
                        Libre ahora
                      </p>
                    )}
                    {list.map((a, i) => (
                      <div
                        key={a.id}
                        className="rounded-2xl px-5 py-4 flex items-center justify-between"
                        style={{
                          background: a.status === "present" ? "rgba(63,191,127,0.14)" : theme.chipBg,
                          border: a.status === "present" ? "1.5px solid #3FBF7F" : `1px solid ${theme.cardBorder}`,
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-display text-xl truncate" style={{ color: theme.textPrimary }}>{a.client}</p>
                          <p className="font-body text-sm truncate" style={{ color: theme.textMuted }}>{a.service}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {a.status === "present" ? (
                            <span className="font-body text-sm font-bold px-3 py-1 rounded-full" style={{ background: "#3FBF7F", color: "#0A1F14" }}>
                              EN SILLA
                            </span>
                          ) : (
                            <span className="font-display text-lg" style={{ color: theme.accentRing }}>{a.time}</span>
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

        {staff.length > 0 && (
          <p className="font-body text-sm text-center mt-8" style={{ color: theme.textMuted }}>
            {totalWaiting} persona{totalWaiting === 1 ? "" : "s"} esperando en total
          </p>
        )}
      </div>
    </div>
  );
}
