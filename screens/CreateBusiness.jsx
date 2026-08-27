import { useState } from "react";
import {
  Scissors, Flower2, Upload, Plus, Minus, Check, ArrowRight, ChevronDown,
} from "lucide-react";

const CATALOG = {
  barber: [
    {
      category: "Cortes",
      items: ["Corte clásico", "Corte fade / degradado", "Corte a tijera", "Corte infantil", "Diseño de líneas / tribal", "Corte + lavado", "Corte a máquina completo"],
    },
    {
      category: "Barba",
      items: ["Arreglo de barba", "Diseño de barba", "Afeitado tradicional a navaja", "Perfilado de barba", "Tinte de barba"],
    },
    {
      category: "Rostro y cejas",
      items: ["Perfilado de cejas", "Limpieza facial", "Depilación de nariz y oídos", "Mascarilla facial"],
    },
    {
      category: "Cabello y color",
      items: ["Lavado + masaje capilar", "Tratamiento anticaída", "Hidratación capilar", "Tinte de cabello", "Alisado para hombre"],
    },
    {
      category: "Combos",
      items: ["Corte + barba", "Corte + barba + cejas", "Corte + tinte", "Paquete novio"],
    },
  ],
  salon: [
    {
      category: "Cabello",
      items: ["Corte de dama", "Corte y peinado", "Lavado y secado", "Alisado / keratina", "Extensiones de cabello", "Permanente / rizado", "Peinado de evento"],
    },
    {
      category: "Color",
      items: ["Coloración completa", "Mechas / balayage", "Retoque de raíz", "Tinte fantasía", "Matización / toner"],
    },
    {
      category: "Uñas",
      items: ["Manicure clásica", "Manicure en gel / semipermanente", "Pedicure", "Uñas acrílicas / esculpidas", "Nail art", "Retiro de esmaltado"],
    },
    {
      category: "Rostro y piel",
      items: ["Limpieza facial", "Tratamiento antiedad", "Depilación con cera (cejas, labio, piernas)", "Maquillaje social", "Maquillaje de novia"],
    },
    {
      category: "Spa y bienestar",
      items: ["Masaje relajante", "Exfoliación corporal", "Tratamiento capilar profundo", "Hidratación facial"],
    },
  ],
};

function TypeCard({ variant, active, onSelect }) {
  const isBarber = variant === "barber";
  const stripe = isBarber
    ? "repeating-linear-gradient(-45deg, #C0293A 0px, #C0293A 8px, #EDEAE1 8px, #EDEAE1 16px, #2C4A87 16px, #2C4A87 24px, #EDEAE1 24px, #EDEAE1 32px)"
    : "linear-gradient(90deg, #D9A3B0 0%, #C98FAE 30%, #A9799E 60%, #E7C9CE 100%)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-2xl p-5 flex-1 text-left transition"
      style={{
        background: "#12100c",
        border: active ? "1px solid #d8c9a3" : "1px solid #29231a",
        opacity: active ? 1 : 0.55,
      }}
    >
      <div className="h-1.5 w-full rounded-full mb-5" style={{ background: stripe }} />
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isBarber
              ? "linear-gradient(135deg, #C0293A 0%, #2C4A87 100%)"
              : "linear-gradient(135deg, #E5AEC0 0%, #9B6B90 100%)",
          }}
        >
          {isBarber ? (
            <Scissors className="w-5 h-5" style={{ color: "#F3EBDA" }} strokeWidth={2.5} />
          ) : (
            <Flower2 className="w-5 h-5" style={{ color: "#2c1f28" }} strokeWidth={2.5} />
          )}
        </div>
        <h3 className="font-display text-base" style={{ color: "#F3EBDA" }}>
          {isBarber ? "Barbería" : "Salón de belleza"}
        </h3>
      </div>
    </button>
  );
}

export default function CreateBusiness() {
  const [businessType, setBusinessType] = useState("barber");
  const [staffCount, setStaffCount] = useState(2);
  const [selected, setSelected] = useState(new Set());
  const [openCats, setOpenCats] = useState(new Set(["Cortes"]));
  const isBarber = businessType === "barber";

  const theme = isBarber
    ? {
        pageBg: "radial-gradient(circle at 50% 0%, #1a1610 0%, #0a0806 55%, #050403 100%)",
        cardBg: "#12100c",
        cardBorder: "#29231a",
        textPrimary: "#F3EBDA",
        textMuted: "#8a8072",
        labelColor: "#c4b89f",
        divider: "#241f16",
        inputBg: "#0e0c09",
        inputBorder: "#2a2419",
        accentFrom: "#E3B04B",
        accentTo: "#B8862F",
        accentRing: "#C9962C",
        buttonText: "#161208",
        chipActiveBg: "#332813",
      }
    : {
        pageBg: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #FBF3F5 55%, #F7E9ED 100%)",
        cardBg: "#FFFFFF",
        cardBorder: "#F0DCE2",
        textPrimary: "#3A2530",
        textMuted: "#9A7A87",
        labelColor: "#8A6472",
        divider: "#F0DCE2",
        inputBg: "#FDF8F9",
        inputBorder: "#EBD3DA",
        accentFrom: "#E7A6BC",
        accentTo: "#C77E9B",
        accentRing: "#D890A8",
        buttonText: "#FFFFFF",
        chipActiveBg: "#F7DCE4",
      };

  const catalog = CATALOG[businessType];

  const toggleItem = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const toggleCat = (cat) => {
    const next = new Set(openCats);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setOpenCats(next);
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-10 transition-colors duration-300"
      style={{ background: theme.pageBg }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        <span className="font-body text-[11px] font-semibold tracking-wider" style={{ color: theme.accentRing }}>
          OPERACIONES
        </span>
        <h1 className="font-display text-2xl mt-1" style={{ color: theme.textPrimary }}>
          Crea tu negocio
        </h1>
        <p className="font-body text-sm mt-1 mb-6" style={{ color: theme.textMuted }}>
          Elige el tipo de negocio para personalizar tu espacio.
        </p>

        <div className="flex gap-3 mb-7">
          <TypeCard variant="barber" active={isBarber} onSelect={() => { setBusinessType("barber"); setSelected(new Set()); setOpenCats(new Set(["Cortes"])); }} />
          <TypeCard variant="salon" active={!isBarber} onSelect={() => { setBusinessType("salon"); setSelected(new Set()); setOpenCats(new Set(["Cabello"])); }} />
        </div>

        <div
          className="rounded-3xl p-6 transition-colors duration-300"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: isBarber
              ? "0 30px 60px -20px rgba(0,0,0,0.6)"
              : "0 30px 60px -25px rgba(199,126,155,0.25)",
          }}
        >
          <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
            LOGO DEL NEGOCIO
          </label>
          <div
            className="mt-2 mb-6 rounded-xl flex flex-col items-center justify-center py-6 cursor-pointer"
            style={{ background: theme.inputBg, border: `1px dashed ${theme.inputBorder}` }}
          >
            <Upload className="w-5 h-5 mb-2" style={{ color: theme.textMuted }} />
            <span className="font-body text-xs" style={{ color: theme.textMuted }}>
              Subir imagen (PNG o JPG)
            </span>
          </div>

          <div className="mb-5">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              NOMBRE DEL NEGOCIO
            </label>
            <input
              placeholder="Ej. Corte & Cía"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="mb-5">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              TELÉFONO
            </label>
            <input
              placeholder="809 000 0000"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="mb-6">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              DIRECCIÓN
            </label>
            <input
              placeholder="Calle, sector, ciudad"
              className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
              style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
            />
          </div>

          <div className="h-px w-full mb-6" style={{ background: theme.divider }} />

          <div className="mb-6">
            <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
              {isBarber ? "CANTIDAD DE BARBEROS" : "CANTIDAD DE ESTILISTAS"}
            </label>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => setStaffCount(Math.max(1, staffCount - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              >
                <Minus className="w-4 h-4" style={{ color: theme.textPrimary }} />
              </button>
              <span className="font-display text-xl w-6 text-center" style={{ color: theme.textPrimary }}>
                {staffCount}
              </span>
              <button
                type="button"
                onClick={() => setStaffCount(staffCount + 1)}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              >
                <Plus className="w-4 h-4" style={{ color: theme.textPrimary }} />
              </button>
            </div>
          </div>

          <div className="h-px w-full mb-6" style={{ background: theme.divider }} />

          {/* Catálogo extenso agrupado por categoría */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                SERVICIOS QUE OFRECES
              </label>
              <span
                className="font-body text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: theme.chipActiveBg, color: theme.accentRing }}
              >
                {selected.size} elegidos
              </span>
            </div>
            <p className="font-body text-xs mt-1 mb-3" style={{ color: theme.textMuted }}>
              Marca todo lo que ofreces y define tu precio.
            </p>

            <div className="space-y-2">
              {catalog.map((group) => {
                const isOpen = openCats.has(group.category);
                return (
                  <div
                    key={group.category}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${theme.inputBorder}` }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCat(group.category)}
                      className="w-full flex items-center justify-between px-3 py-3"
                      style={{ background: theme.inputBg }}
                    >
                      <span className="font-body text-sm font-medium" style={{ color: theme.textPrimary }}>
                        {group.category}
                      </span>
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{
                          color: theme.textMuted,
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-2 space-y-1.5" style={{ background: theme.cardBg }}>
                        {group.items.map((item) => {
                          const key = `${group.category}-${item}`;
                          const active = selected.has(key);
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2"
                              style={{
                                background: active ? theme.chipActiveBg : "transparent",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleItem(key)}
                                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                style={{
                                  background: active ? theme.accentRing : "transparent",
                                  border: `1px solid ${active ? theme.accentRing : theme.inputBorder}`,
                                }}
                              >
                                {active && <Check className="w-3 h-3" style={{ color: theme.buttonText }} />}
                              </button>
                              <span className="font-body text-sm flex-1" style={{ color: theme.textPrimary }}>
                                {item}
                              </span>
                              {active && (
                                <input
                                  placeholder="RD$"
                                  className="font-body text-sm w-16 px-2 py-1 rounded-lg outline-none text-right"
                                  style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-8 transition"
            style={{
              background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
              color: theme.buttonText,
            }}
          >
            Crear negocio y generar mi link
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
