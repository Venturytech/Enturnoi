// ---------------------------------------------------------------
// Horario de atención del negocio.
// Los slots se manejan internamente como "HH:MM" en 24h (ej. "08:00",
// "20:30") y se muestran al usuario con am/pm. Así no hay ambigüedad
// entre 8 de la mañana y 8 de la noche.
// ---------------------------------------------------------------
export type BusinessHours = {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM" 24h
  breakStart: string | null;
  breakEnd: string | null;
};

export const DEFAULT_HOURS: BusinessHours = {
  open: "08:00",
  close: "20:00",
  breakStart: null,
  breakEnd: null,
};

// "HH:MM:SS" o "HH:MM" -> "HH:MM"
function norm(t: string | null | undefined): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

// Arma el horario a partir de lo que viene del negocio (columnas time,
// que llegan como "HH:MM:SS"). Si falta apertura/cierre, usa el default.
export function hoursFromBusiness(b: {
  open_time?: string | null;
  close_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
}): BusinessHours {
  return {
    open: norm(b.open_time) ?? DEFAULT_HOURS.open,
    close: norm(b.close_time) ?? DEFAULT_HOURS.close,
    breakStart: norm(b.break_start),
    breakEnd: norm(b.break_end),
  };
}

export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

// "HH:MM" 24h -> "8:00 am" / "8:30 pm"
export function displayHm(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Genera los slots de 30 min entre apertura y cierre, saltando el
// horario de descanso. Devuelve claves "HH:MM" en 24h.
export function buildDaySlots(h: BusinessHours): string[] {
  const open = hmToMin(h.open);
  const close = hmToMin(h.close);
  const bs = h.breakStart ? hmToMin(h.breakStart) : null;
  const be = h.breakEnd ? hmToMin(h.breakEnd) : null;
  const slots: string[] = [];
  for (let t = open; t < close; t += 30) {
    if (bs !== null && be !== null && t >= bs && t < be) continue;
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    slots.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return slots;
}

// Opciones "HH:MM" cada 30 min (00:00–23:30) para los selectores.
export const HALF_HOUR_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hh = Math.floor(i / 2);
  const mm = i % 2 === 0 ? "00" : "30";
  return `${String(hh).padStart(2, "0")}:${mm}`;
});
