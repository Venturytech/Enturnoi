import { useState } from "react";
import { Scissors, Flower2, Eye, EyeOff, ArrowRight } from "lucide-react";

function BrandPreview({ variant, active, onSelect }) {
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
        <div>
          <h3 className="font-display text-base leading-tight" style={{ color: "#F3EBDA" }}>
            {isBarber ? "Barbería" : "Salón de belleza"}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default function BarberLogin() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [businessType, setBusinessType] = useState("barber");
  const isBarber = businessType === "barber";

  // Tema completo de la pantalla, no solo el acento de las tarjetas.
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
        secondaryBorder: "#3a3222",
        secondaryText: "#E3D5B4",
        tag: "#D9A94A",
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
        secondaryBorder: "#EBD3DA",
        secondaryText: "#9A5D75",
        tag: "#C77E9B",
      };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 transition-colors duration-300"
      style={{ background: theme.pageBg }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Selector: los logos/tarjetas se quedan siempre igual */}
        <div className="flex gap-3 mb-6">
          <BrandPreview variant="barber" active={isBarber} onSelect={() => setBusinessType("barber")} />
          <BrandPreview variant="salon" active={!isBarber} onSelect={() => setBusinessType("salon")} />
        </div>

        <div
          className="rounded-3xl p-8 transition-colors duration-300"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: isBarber
              ? "0 30px 60px -20px rgba(0,0,0,0.6)"
              : "0 30px 60px -25px rgba(199,126,155,0.25)",
          }}
        >
          <div className="mb-1">
            <span
              className="font-body text-[11px] font-semibold tracking-wider uppercase"
              style={{ color: theme.tag }}
            >
              {isBarber ? "Barbería" : "Salón de belleza"}
            </span>
          </div>

          <div className="h-px w-full mb-7" style={{ background: theme.divider }} />

          <h2 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            Iniciar sesión
          </h2>
          <p className="font-body text-sm mb-7" style={{ color: theme.textMuted }}>
            Ingresa las credenciales de tu negocio.
          </p>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                CORREO ELECTRÓNICO
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunegocio@correo.com"
                className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none transition"
                style={{
                  background: theme.inputBg,
                  border: `1px solid ${theme.inputBorder}`,
                  color: theme.textPrimary,
                }}
                onFocus={(e) => (e.target.style.border = `1px solid ${theme.accentRing}`)}
                onBlur={(e) => (e.target.style.border = `1px solid ${theme.inputBorder}`)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                  CONTRASEÑA
                </label>
                <button type="button" className="font-body text-xs" style={{ color: theme.accentRing }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative mt-2">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="font-body w-full px-4 py-3 pr-11 rounded-xl outline-none transition"
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    color: theme.textPrimary,
                  }}
                  onFocus={(e) => (e.target.style.border = `1px solid ${theme.accentRing}`)}
                  onBlur={(e) => (e.target.style.border = `1px solid ${theme.inputBorder}`)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: theme.textMuted }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-2 transition"
              style={{
                background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
                color: theme.buttonText,
              }}
            >
              Iniciar sesión
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1" style={{ background: theme.divider }} />
            <span className="font-body text-xs" style={{ color: theme.textMuted }}>o</span>
            <div className="h-px flex-1" style={{ background: theme.divider }} />
          </div>

          <button
            className="font-body w-full py-3.5 rounded-xl font-medium transition"
            style={{
              background: "transparent",
              border: `1px solid ${theme.secondaryBorder}`,
              color: theme.secondaryText,
            }}
          >
            Registrar mi negocio
          </button>

          <p className="font-body text-xs text-center mt-6" style={{ color: theme.textMuted }}>
            Las cuentas nuevas requieren verificación antes de activarse.
          </p>
        </div>
      </div>
    </div>
  );
}
