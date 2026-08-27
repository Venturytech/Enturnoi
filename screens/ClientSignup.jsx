import { useState } from "react";
import { Scissors, Flower2, ArrowRight, ShieldCheck } from "lucide-react";

// En producción, este bloque vendría resuelto por el link (ej. tuapp.com/r/corte-y-cia-x7f2)
const BUSINESS = {
  name: "Corte & Cía",
  type: "barber", // o "salon"
  tagline: "Barbería · Santo Domingo",
};

export default function ClientSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const isBarber = BUSINESS.type === "barber";

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
        chipBg: "#332813",
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
        chipBg: "#F7DCE4",
      };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{ background: theme.pageBg }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Logo grande del negocio: esto es lo primero que ve el cliente, es SU app */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})` }}
          >
            {isBarber ? (
              <Scissors className="w-9 h-9" style={{ color: theme.buttonText }} strokeWidth={2.2} />
            ) : (
              <Flower2 className="w-9 h-9" style={{ color: theme.buttonText }} strokeWidth={2.2} />
            )}
          </div>
          <h1 className="font-display text-2xl" style={{ color: theme.textPrimary }}>
            {BUSINESS.name}
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: theme.textMuted }}>
            {BUSINESS.tagline}
          </p>
        </div>

        <div
          className="rounded-3xl p-6"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: isBarber
              ? "0 30px 60px -20px rgba(0,0,0,0.6)"
              : "0 30px 60px -25px rgba(199,126,155,0.25)",
          }}
        >
          <h2 className="font-display text-xl mb-1" style={{ color: theme.textPrimary }}>
            Reserva tu cita
          </h2>
          <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
            {BUSINESS.name} te invitó a agendar directo desde aquí.
          </p>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                NOMBRE COMPLETO
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                NÚMERO DE TELÉFONO
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="809 000 0000"
                type="tel"
                className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
              />
              <p className="font-body text-xs mt-2" style={{ color: theme.textMuted }}>
                Lo usamos para confirmar tu cita y avisarte si algo cambia.
              </p>
            </div>

            <button
              type="submit"
              className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-2"
              style={{
                background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
                color: theme.buttonText,
              }}
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-2 justify-center mt-5">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme.textMuted }} />
            <p className="font-body text-xs" style={{ color: theme.textMuted }}>
              Tus datos solo se comparten con {BUSINESS.name}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
