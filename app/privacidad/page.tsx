import Link from "next/link";
import { getTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Política de privacidad — EnTurnoApp",
  description: "Cómo EnTurnoApp (Venturytech) usa y protege los datos de sus usuarios.",
};

// Página pública (sin login). Requerida por App Store y Google Play, y
// necesaria porque la app usa ubicación. El contacto sale del ajuste
// global contact_phone que el superadmin edita en el Panel Maestro.
export default async function PrivacidadPage() {
  const theme = getTheme("barber");
  const supabase = createClient();
  const { data: cp } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "contact_phone")
    .maybeSingle();
  const contactPhone = (cp?.value ?? "").trim();
  const waPhone = contactPhone.replace(/[^0-9]/g, "");

  const updated = "4 de septiembre de 2026";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-7">
      <h2 className="font-display text-xl mb-2" style={{ color: theme.textPrimary }}>{title}</h2>
      <div className="font-body text-sm leading-relaxed space-y-2" style={{ color: theme.textMuted }}>
        {children}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen w-full" style={{ background: theme.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="font-body text-sm" style={{ color: theme.accentRing }}>← Inicio</Link>

        <h1 className="font-display text-3xl mt-4 mb-1" style={{ color: theme.textPrimary }}>
          Política de privacidad
        </h1>
        <p className="font-body text-sm mb-8" style={{ color: theme.textMuted }}>
          EnTurnoApp — operada por Venturytech · Última actualización: {updated}
        </p>

        <Section title="Quiénes somos">
          <p>
            EnTurnoApp es una plataforma de reservas y gestión de turnos para barberías y
            salones, operada por Venturytech. Esta política explica qué datos recogemos,
            para qué los usamos y qué control tienes sobre ellos.
          </p>
        </Section>

        <Section title="Qué datos recogemos">
          <p>Según cómo uses la app, podemos recoger:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong style={{ color: theme.textPrimary }}>Datos de tu cuenta:</strong> tu nombre y tu número de teléfono. Tu PIN se guarda cifrado; nunca en texto plano.</li>
            <li><strong style={{ color: theme.textPrimary }}>Ubicación:</strong> solo si nos das permiso, para detectar cuando llegas a la barbería y ponerte en la cola automáticamente.</li>
            <li><strong style={{ color: theme.textPrimary }}>Uso del servicio:</strong> las barberías a las que te unes, tus turnos y reservas, y la fecha/hora de cada uno.</li>
          </ul>
          <p>Si eres dueño de un negocio, además guardamos los datos del negocio (nombre, teléfono, dirección, ubicación en el mapa, equipo y servicios) que tú mismo registras.</p>
        </Section>

        <Section title="Cómo usamos la ubicación">
          <p>
            La ubicación se usa con un único fin: <strong style={{ color: theme.textPrimary }}>saber
            cuándo llegas a la barbería para ponerte en la cola sin que tengas que hacer nada</strong>.
            Comparamos tu posición con la ubicación del local; si estás dentro del área del negocio,
            te agregamos a la cola.
          </p>
          <p>
            La app puede pedir permiso para usar la ubicación en segundo plano solo para poder
            detectar tu llegada aunque no la tengas abierta. <strong style={{ color: theme.textPrimary }}>No
            rastreamos tu recorrido</strong> ni guardamos un historial de tus movimientos, y no
            compartimos tu ubicación con terceros. Puedes desactivar el permiso en cualquier
            momento desde los ajustes de tu teléfono; la app seguirá funcionando y podrás ponerte
            en la cola manualmente.
          </p>
        </Section>

        <Section title="Con quién se comparte">
          <p>
            Tus datos de cuenta y tus turnos se comparten únicamente con la barbería o salón en
            el que te registras, para que pueda atenderte y gestionar su cola. <strong style={{ color: theme.textPrimary }}>No
            vendemos tus datos</strong> ni los cedemos con fines publicitarios.
          </p>
          <p>
            Usamos proveedores de infraestructura (alojamiento y base de datos) que procesan los
            datos por nuestra cuenta bajo acuerdos de confidencialidad.
          </p>
        </Section>

        <Section title="Notificaciones">
          <p>
            Si aceptas las notificaciones, las usamos para avisarte de cosas de tu turno (por
            ejemplo, cuando estás por ser atendido). Puedes desactivarlas desde los ajustes de tu
            teléfono.
          </p>
        </Section>

        <Section title="Cuánto tiempo guardamos tus datos">
          <p>
            Guardamos tus datos mientras tu cuenta esté activa y mientras sean necesarios para
            prestar el servicio. Puedes pedir que borremos tu cuenta y tus datos en cualquier
            momento.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes pedirnos acceder, corregir o borrar tus datos personales, o retirar los
            permisos que hayas dado. Para ejercer cualquiera de estos derechos, contáctanos por
            los medios de abajo.
          </p>
        </Section>

        <Section title="Menores de edad">
          <p>
            La app está pensada para uso general de clientes de barberías y salones. No recogemos
            de forma intencional datos de menores sin el consentimiento de su padre, madre o tutor.
          </p>
        </Section>

        <Section title="Cambios a esta política">
          <p>
            Podemos actualizar esta política cuando sea necesario. Publicaremos aquí la versión
            vigente con su fecha de actualización.
          </p>
        </Section>

        <Section title="Contacto">
          <p>Para dudas o solicitudes sobre tu privacidad, escríbenos:</p>
          {contactPhone ? (
            <p>
              WhatsApp / teléfono:{" "}
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: theme.accentRing }}
              >
                {contactPhone}
              </a>
            </p>
          ) : (
            <p>Venturytech (contacto disponible dentro de la app).</p>
          )}
          <p>Responsable: Venturytech.</p>
        </Section>

        <p className="font-body text-xs mt-8" style={{ color: theme.textMuted }}>
          © {new Date().getFullYear()} Venturytech · EnTurnoApp
        </p>
      </div>
    </main>
  );
}
