"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, cardShadow, type BusinessType } from "@/lib/theme";
import BrandTypeCards from "@/components/BrandTypeCards";

export default function RegisterPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("barber");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isBarber = businessType === "barber";
  const theme = getTheme(businessType);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: fullName, business_type: businessType } },
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("already registered")
            ? "Ese correo ya tiene una cuenta. Inicia sesión."
            : error.message,
        );
        return;
      }
      // Si la confirmación por correo está desactivada, ya hay sesión → onboarding.
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setInfo("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
      }
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 transition-colors duration-300"
      style={{ background: theme.pageBg }}
    >
      <div className="w-full max-w-sm">
        <BrandTypeCards value={businessType} onChange={setBusinessType} />

        <div
          className="rounded-3xl p-8 transition-colors duration-300"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: cardShadow(businessType) }}
        >
          <div className="mb-1">
            <span className="font-body text-[11px] font-semibold tracking-wider uppercase" style={{ color: theme.tag }}>
              {isBarber ? "Barbería" : "Salón de belleza"}
            </span>
          </div>

          <div className="h-px w-full mb-7" style={{ background: theme.divider }} />

          <h2 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
            Registrar mi negocio
          </h2>
          <p className="font-body text-sm mb-7" style={{ color: theme.textMuted }}>
            Crea tu cuenta para empezar a gestionar tu negocio.
          </p>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                TU NOMBRE
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellido"
                className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none transition"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                CORREO ELECTRÓNICO
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunegocio@correo.com"
                className="font-body w-full mt-2 px-4 py-3 rounded-xl outline-none transition"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
              />
            </div>

            <div>
              <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                CONTRASEÑA
              </label>
              <div className="relative mt-2">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="font-body w-full px-4 py-3 pr-11 rounded-xl outline-none transition"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
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

            {error && <p className="font-body text-xs" style={{ color: "#F19391" }}>{error}</p>}
            {info && <p className="font-body text-xs" style={{ color: theme.green }}>{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="font-body w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-2 transition"
              style={{
                background: `linear-gradient(135deg, ${theme.accentFrom} 0%, ${theme.accentTo} 100%)`,
                color: theme.buttonText,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creando…" : "Crear cuenta"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="font-body text-xs text-center mt-6" style={{ color: theme.textMuted }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: theme.accentRing }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
