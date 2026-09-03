"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTheme, cardShadow, type BusinessType } from "@/lib/theme";
import BrandTypeCards from "@/components/BrandTypeCards";

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("barber");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBarber = businessType === "barber";
  const theme = getTheme(businessType);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        setError(
          error.message.toLowerCase().includes("email not confirmed")
            ? "Tu cuenta aún no está confirmada. Revisa tu correo."
            : "Correo o contraseña incorrectos.",
        );
        return;
      }
      // El superadmin/admin va directo al Panel Maestro; el dueño a su panel.
      let dest = "/dashboard";
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile && (profile.role === "superadmin" || profile.role === "admin")) dest = "/admin";
      }
      router.push(dest);
      router.refresh();
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
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: cardShadow(businessType),
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

          <form className="space-y-5" onSubmit={onSubmit}>
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
                onFocus={(e) => (e.target.style.border = `1px solid ${theme.accentRing}`)}
                onBlur={(e) => (e.target.style.border = `1px solid ${theme.inputBorder}`)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="font-body text-xs font-medium tracking-wide" style={{ color: theme.labelColor }}>
                  CONTRASEÑA
                </label>
              </div>
              <div className="relative mt-2">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="font-body w-full px-4 py-3 pr-11 rounded-xl outline-none transition"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary }}
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

            {error && (
              <p className="font-body text-xs" style={{ color: "#F19391" }}>
                {error}
              </p>
            )}

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
              {loading ? "Entrando…" : "Iniciar sesión"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1" style={{ background: theme.divider }} />
            <span className="font-body text-xs" style={{ color: theme.textMuted }}>o</span>
            <div className="h-px flex-1" style={{ background: theme.divider }} />
          </div>

          <Link
            href="/register"
            className="font-body w-full block text-center py-3.5 rounded-xl font-medium transition"
            style={{ background: "transparent", border: `1px solid ${theme.secondaryBorder}`, color: theme.secondaryText }}
          >
            Registrar mi negocio
          </Link>

          <p className="font-body text-xs text-center mt-6" style={{ color: theme.textMuted }}>
            Las cuentas nuevas requieren verificación antes de activarse.
          </p>
        </div>
      </div>
    </div>
  );
}
