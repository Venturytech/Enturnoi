# Plataforma de reservas para barberías y salones (multi-tenant)

Este documento resume todo lo que definimos en el diseño/prototipo, para construir la versión
real en Next.js + Supabase + Vercel a partir de los componentes de referencia en `/screens`.

## Instrucción inicial sugerida para Claude Code

> Lee este README completo. Quiero que conviertas los componentes de `/screens` (que son
> prototipos visuales en React) en un proyecto Next.js real, conectado a Supabase (auth + base
> de datos) y desplegado en Vercel. Empecemos por el esquema de base de datos en Supabase según
> el modelo de datos de este documento, y luego migramos pantalla por pantalla.

## Stack

- Next.js (frontend + backend)
- Supabase (base de datos + autenticación)
- GitHub (repositorio)
- Vercel (despliegue)

## Roles del sistema

1. **Superadministrador** — dueño de la plataforma (nosotros).
2. **Administración** — staff con el mismo acceso al Panel Maestro.
3. **Cliente (negocio)** — dueño de una barbería o salón que se registra y paga por usar la
   plataforma. Gestiona todo su negocio (no hay login individual para barberos/estilistas).
4. Los **clientes finales** (quienes agendan cortes) NO tienen un rol de sistema — se registran
   solo a través del link de invitación de un negocio, sin contraseña.

## Modelo de datos (Supabase)

- `businesses` — id, name, type (`barber` | `salon`), logo_url, phone, address, staff_count,
  invite_slug (para el link único), created_at, status (`active` | `pending` | `suspended`).
- `staff` — id, business_id, name, specialty. Sin login propio; el dueño los administra.
- `services_catalog` — catálogo GLOBAL fijo, definido por nosotros (no por el negocio),
  agrupado por categoría y por tipo (`barber` / `salon`). Ver la lista completa usada en
  `CreateBusiness.jsx` (Cortes, Barba, Rostro y cejas, Cabello y color, Combos para barbería;
  Cabello, Color, Uñas, Rostro y piel, Spa y bienestar para salón).
- `business_services` — join table: business_id, catalog_service_id, price, duration_minutes.
  El negocio solo asocia del catálogo global y pone su propio precio/duración.
- `clients` — tabla GLOBAL de clientes finales, identificados por teléfono (único en toda la
  plataforma).
- `client_business` — join table: client_id, business_id. Se crea SOLO cuando alguien se
  registra por el link de invitación de ese negocio (nunca por búsqueda/directorio). Un mismo
  teléfono puede estar asociado a varios negocios si recibió varios links.
- `appointments` — id, business_id, staff_id, client_id, service_id, date, time, status
  (`present` = ya está físicamente en el local, `scheduled` = tiene cita pero no ha llegado,
  `attended` = cotejado como atendido, `no_show` = cotejado como no llegó), price.
- `staff_availability` — bloqueos de horario por barbero/estilista (día + rango de horas
  bloqueadas), lo que alimenta tanto el calendario de Operaciones como los horarios que ve el
  cliente al agendar.

## Lógica de negocio clave

- **Multi-tenant real**: cada negocio tiene su propio espacio, tema visual y catálogo asociado,
  pero toda la infraestructura es compartida.
- **Tema dinámico por tipo de negocio**: barbería = negro + dorado; salón = blanco + rosado
  (paletas completas en cada componente de `/screens`, objeto `theme`).
- **Onboarding del negocio** (`CreateBusiness.jsx`): nombre, logo (lo sube el dueño
  directamente), teléfono, dirección, cantidad de staff, y selección del catálogo global con
  precio propio. Al terminar se genera el link único.
- **Registro del cliente** (`ClientSignup.jsx`): solo nombre y teléfono, sin contraseña. Se
  muestra con la marca del negocio que envió el link (logo/nombre propios, no los nuestros).
- **Cola en tiempo real** (`BarberQueue.jsx`): el cliente ve, por barbero, cuántos están
  físicamente presentes (verde) vs. con cita sin llegar (amarillo), sin mostrar nombres de otros
  clientes — solo tipo de servicio y tiempo estimado. Incluye cálculo de "próxima disponibilidad"
  sumando duración de los servicios en cola.
- **Agendar cita** (`BookAppointment.jsx` y el flujo dentro de `BarberQueue.jsx`): orden del
  flujo es Día → Barbero → Horario (filtrado según disponibilidad real de ESE barbero) → Corte
  (filtrado según lo que ESE barbero ofrece) → Confirmar. Cada paso es pantalla completa, no
  scroll acumulado.
- **Check-in / cotejo diario** (dentro de `OperationsDashboard.jsx`): el dueño mantiene
  presionada una cita 1 segundo completo para marcarla "atendida" (barra verde de progreso), o
  la arrastra para marcarla "no llegó" (barra roja). Usa `setPointerCapture` para que el gesto no
  salte a otras filas si el dedo se mueve. La confirmación de "no llegó" solo se aplica al
  soltar pasado el umbral, no a mitad de camino.
- **Disponibilidad táctil** (`AvailabilityCalendar.jsx`, embebido también en
  `OperationsDashboard.jsx`): franja de días + grilla de horarios de 30 en 30 minutos, tocables
  para bloquear/abrir.
- **Reportes** (dentro de `OperationsDashboard.jsx`, componente `ReportView`): calendario hacia
  atrás, por día muestra clientes atendidos, total generado, y desglose por tipo de corte
  ordenado de mayor a menor ingreso.
- **Notificar disponibilidad** (pendiente de completar): el dueño puede avisar "Barbero X
  disponible ahora" a los clientes de ese negocio. Debe apagarse en cuanto el primer cliente
  tome el cupo (no por tiempo — eso es solo una simulación temporal en el prototipo).
- **Panel Maestro** (`AdminPanel.jsx`): solo para nosotros (Superadministrador/Administración).
  Lista de negocios con filtro por tipo, activar/suspender/eliminar — clave para el modelo de
  pago por uso. Tema negro/dorado propio, distinto del tema del negocio.

## Pendiente de decidir

- Modelo de negocio final: suscripción mensual fija (decidido) — falta definir monto y cómo se
  conecta con el estado `suspended` en `businesses`.
- Canal de confirmaciones/recordatorios: WhatsApp recomendado (vía API tipo Twilio), con email
  de respaldo.
- Notificación "barbero disponible ahora": falta implementar el backend (push real) — el
  prototipo solo simula el botón.

## Archivos en /screens

| Archivo | Qué es |
|---|---|
| `BarberLogin.jsx` | Login del dueño, tema dinámico según tipo de negocio elegido |
| `AdminPanel.jsx` | Panel Maestro (solo Superadministrador/Administración) |
| `CreateBusiness.jsx` | Onboarding: crear negocio, logo, catálogo global |
| `OperationsDashboard.jsx` | Pantalla principal del dueño: métricas, notificar disponibilidad, citas de hoy (con cotejo por gesto), calendario y reportes embebidos |
| `AvailabilityCalendar.jsx` | Versión standalone del calendario táctil de disponibilidad |
| `ClientSignup.jsx` | Registro del cliente al entrar por el link (marca del negocio) |
| `BarberQueue.jsx` | Lista de barberos + cola en tiempo real + flujo de agendar cita futura |
| `BookAppointment.jsx` | Flujo de agendar cita en pasos (servicio, fecha, hora, confirmar) |
