# EnTurnoApp — Estado del proyecto (memoria para Claude)

> Este archivo se lee automáticamente al inicio de cada sesión de Claude Code.
> Resume qué es el proyecto, cómo está montado, qué está hecho y qué falta.
> Mantenerlo actualizado tras cada avance importante.

## Qué es
Plataforma **multi-tenant** de reservas para **barberías y salones** (nombre visible:
**EnTurnoApp**). Cada negocio (barbería/salón) se registra, gestiona su staff, servicios,
citas y disponibilidad; sus clientes finales agendan por un link de invitación sin contraseña.
Hay un Panel Maestro para el dueño de la plataforma (superadmin).

Los prototipos visuales originales están en `/screens` (React). Se están migrando **pantalla
por pantalla** a la app real, **conservando su diseño y su lógica**, sin datos falsos.

## Stack y despliegue
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**.
- **Supabase**: base de datos (Postgres), autenticación y almacenamiento.
- **Vercel**: despliegue. **Push a `main` → Vercel publica solo.**
- Repo: `Venturytech/Enturnoi`. Se trabaja directamente en **`main`** (decisión del dueño).
- URL en producción: **https://enturnoi-venturytech.vercel.app** (acceso público, sin login de Vercel).
- Idioma de la interfaz: **español**.

## Datos de infraestructura
- Supabase project ref: `jtjpaigxmepqwehyjijd` (URL `https://jtjpaigxmepqwehyjijd.supabase.co`).
- Conexión: se lee de env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  con **respaldo embebido** en `lib/supabase/config.ts` (la clave `anon` es pública por diseño;
  la seguridad la da el RLS). Las env vars NO están puestas en Vercel: se usa el respaldo del código.
- Storage: bucket público **`logos`** (con políticas de subida para autenticados).
- Vercel: `ssoProtection` desactivado (app pública). Node 24.
- Claude puede leer/escribir Supabase y Vercel por sus conectores MCP (deben estar enlazados
  a la cuenta del dueño en claude.ai → Conectores).

## Base de datos (Supabase)
SQL fuente en `supabase/` (`migrations/0001_schema.sql`, `0002_rls.sql`, `seed.sql`, y
`setup.sql` = todo junto para pegar en el SQL Editor). Tablas:
`profiles`, `businesses`, `staff`, `services_catalog` (catálogo global sembrado),
`business_services`, `clients`, `client_business`, `appointments`, `staff_availability`.
RLS activo: cada negocio ve solo lo suyo; superadmin/admin ven todo; el cliente final lee por
funciones públicas (`get_business_by_slug`, `register_client`). Trigger `on_auth_user_created`
crea el `profiles` al registrarse.

## Roles
1. **Superadministrador** (nosotros) + **Administración** → Panel Maestro.
2. **Cliente (negocio)** → dueño de barbería/salón, login con correo+contraseña.
3. **Cliente final** → sin login; entra por `link /r/<invite_slug>`, da nombre+teléfono.

## HECHO ✅
- Proyecto Next.js + Tailwind + TS que compila y despliega.
- Tema barbería/salón unificado en `lib/theme.ts` (una sola fuente).
- Esquema completo + RLS + seed del catálogo aplicados en Supabase.
- **Login** (`/login`) y **Registro de negocio** (`/register`) reales (Supabase Auth).
- Middleware de sesión + rutas protegidas; **`/dashboard`** (stub que saluda con el nombre).
- **Onboarding / Crear negocio** (`/onboarding`) migrado de `CreateBusiness.jsx`: carga el
  catálogo real, guarda negocio + servicios con precio, genera `invite_slug`, **sube el logo**
  al bucket, y redirige al panel.

## PENDIENTE (roadmap, pantalla por pantalla) 🔜
Migrar de `/screens` a rutas reales conectadas:
- **OperationsDashboard.jsx → `/dashboard` real**: métricas, "notificar disponibilidad",
  citas de hoy con **cotejo por gesto** (mantener presionado = atendido, arrastrar = no llegó),
  calendario de disponibilidad embebido, y reportes. (Hoy `/dashboard` es un stub.)
- **AvailabilityCalendar.jsx**: guardar bloqueos en `staff_availability`.
- **AdminPanel.jsx → `/admin`**: lista de negocios, activar/suspender/eliminar (solo superadmin).
- **ClientSignup.jsx → `/r/[slug]`**: registro del cliente con la marca del negocio.
- **BarberQueue.jsx → `/r/[slug]/turnos`**: cola en tiempo real + agendar cita futura.
- **BookAppointment.jsx**: flujo de agendar (servicio→fecha→hora→confirmar), guarda en `appointments`.
- **Gestión de staff**: hoy solo se guarda `staff_count`; falta crear/editar barberos con nombre.

## DECISIONES / NOTAS ABIERTAS
- Al crear negocio se marca **`status = 'active'`** para poder probar el flujo completo. Cuando
  exista el Panel Maestro, cambiar a **`'pending'`** + aprobación del superadmin.
- **Confirmación de correo** en Supabase: si está activada, el registro pide confirmar por email;
  para pruebas se recomienda apagar "Confirm email" (Authentication → Sign In/Providers → Email).
- **Notificaciones reales** ("barbero disponible ahora", recordatorios): backend pendiente
  (WhatsApp/Twilio + email de respaldo). En prototipo solo se simula.
- **Modelo de negocio**: suscripción mensual fija; falta definir el monto y conectar con `status`.

## Convenciones al trabajar
- Conservar diseño y lógica de los prototipos; nada de nombres/datos inventados.
- Cada cambio: `npm run build` local para validar, luego commit y push a `main` (despliega solo).
- Interfaz y mensajes en español.
