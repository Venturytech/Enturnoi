# CLAUDE.md — EnTurnoApp (Enturnoi / "Tuturno" en Supabase)

Este archivo es el contexto que CUALQUIER sesión de Claude debe leer ANTES de
tocar nada. Sustituye a la memoria de conversación (que no persiste) por hechos
verificables contra el código y la base de datos reales.

## Regla de oro
**Ningún cambio cuenta como "hecho" hasta que está en GitHub Y en producción
(Vercel).** Guardar en el sandbox de una conversación NO es subirlo. Ya se
perdió trabajo por iterar sin subir a git. Al terminar cada sesión:
1. `git push` a `main` (Vercel publica solo).
2. Verificar en Vercel que el último deploy de `main` quedó `READY`.
3. Actualizar este archivo.

**No borrar ni recrear el esquema de Supabase.** La base de datos avanzada ya
está viva con negocios y clientes reales. No existe `supabase/setup.sql` (se
eliminó por peligroso). Cambios de BD: por migración puntual, nunca drop masivo.

## Qué es
Plataforma multi-tenant de reservas para barberías y salones en RD. Cada negocio
tiene su espacio con su marca; el cliente final siente que es la app de SU
negocio. William es el superadmin de la plataforma.

## Stack y accesos
- **Next.js 14** (App Router) + TypeScript + Tailwind.
- **Supabase** project ref `jtjpaigxmepqwehyjijd` (visible "Tuturno").
- **Vercel** team `Venturytech` (`team_7PPowuyGoOkVAExw6gGVPfjI`), proyecto
  `enturnoi` (`prj_AaVlAdW85kcBpAd8QHVKAKZSOwl4`).
- Repo GitHub `Venturytech/Enturnoi`, rama de trabajo **`main`**.
- Producción: **https://enturnoi-venturytech.vercel.app** (público, sin login Vercel).
- Conexión Supabase: env vars con respaldo embebido en `lib/supabase/config.ts`
  (la clave `anon` es pública por diseño; la seguridad la da el RLS).

## Roles
1. **Plataforma (William)** — superadmin, ve el Panel Maestro (`/admin`).
2. **Dueño de negocio** — email+contraseña (Supabase Auth); gestiona su
   `/dashboard`, crea el negocio en `/onboarding`.
3. **Barbero/estilista** — SIN login; lo administra el dueño.
4. **Cliente final** — entra por el link `/r/<invite_slug>`; se identifica con
   nombre+teléfono (guardado en el dispositivo). No hay contraseña de cliente.

## Estructura del código (rescatada y en producción)
- `app/login`, `app/register`, `app/auth/actions.ts` — auth del dueño.
- `app/onboarding` + `components/OnboardingForm.tsx` — crea negocio, equipo
  (con nombres reales), servicios con precio, sube logo, genera `invite_slug`.
- `app/dashboard` + `app/dashboard/OperationsPanel.tsx` — panel del dueño:
  métricas compactas + accesos en cuadrícula (una sola vista), citas de hoy con
  cotejo por gesto (mantener=atendido, arrastrar=no llegó), calendario de
  disponibilidad por staff, reporte de ingresos, link y pantalla TV. Vista
  "Editar negocio" (SettingsView): edita nombre/teléfono/dirección/logo del
  negocio y gestiona el equipo (agregar, renombrar, especialidad, quitar y
  subir foto de cada barbero). Escribe directo a Supabase (RLS del dueño).
- `app/admin` + `AdminPanelClient.tsx` — Panel Maestro (solo superadmin/admin).
- `app/r/[slug]` + `ClientFlow.tsx` — flujo del cliente: registro, cola en vivo
  por barbero, agendar cita futura (día→barbero→hora→servicio→confirmar).
- `app/tv/[slug]` + `TvBoard.tsx` — pantalla para TV con la cola en tiempo real.
- `lib/supabase/{client,server,middleware,config}.ts`, `lib/theme.ts`,
  `components/BrandTypeCards.tsx`, `middleware.ts`.

## Base de datos (tablas reales)
`staff` tiene `photo_url` (foto/logo del barbero, subida al bucket `logos`
bajo prefijo `staff/`). `businesses` tiene `phone` y `address`.
`profiles`, `businesses`, `staff`, `services_catalog`, `business_services`,
`clients` (con `password_hash` de pgcrypto), `client_business`, `appointments`,
`staff_availability`, `availability_alerts`.
RPCs usadas por el front (deben existir): `get_business_by_slug`,
`register_client`, `admin_list_businesses`, `get_business_staff_by_slug`,
`get_business_services_by_slug`, `get_staff_queue_today`,
`get_staff_blocked_slots`, `get_staff_appointments_for_day`, `book_appointment`,
`get_business_board_today`. (También existen client_login/client_register/
queue_counts de una iteración previa.)
Nota: pgcrypto vive en schema `extensions`; funciones con `crypt`/`gen_salt`
necesitan `set search_path = public, extensions`.
Storage: bucket público `logos`.

## Historia importante (para no repetir errores)
La versión avanzada se construyó en una sesión de Claude en el celular y se
desplegó DIRECTO a Vercel (deploy 5VJ6…), sin subirla nunca a git. En paralelo,
otra sesión (esta, en la web) construyó una versión SIMPLE y la subió a `main`,
lo que hizo que Vercel publicara la simple encima. Se rescató el código avanzado
COPIÁNDOLO archivo por archivo desde la pestaña "Source" del deploy en Vercel, y
se subió a `main` (commit `4ef468f`). Moraleja: **siempre subir a git.**

## Pendiente / notas
- Disponibilidad real por hueco horario (hoy sólo se evita choque exacto).
- Notificaciones reales (push/WhatsApp) — sólo simuladas.
- Suspensión de dueño por falta de pago: manual, no afecta al cliente final.
- Modelo: suscripción mensual (monto por definir).

## Convenciones
- Conservar diseño y lógica de los prototipos de `/screens`; sin datos falsos.
- Cada cambio: `npm run build` local, luego commit + push a `main`.
- Interfaz en español.
