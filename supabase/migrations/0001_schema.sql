-- =============================================================
-- Enturnoi · Esquema base (Fase 1)
-- Plataforma multi-tenant de reservas para barberías y salones.
-- Traduce el "Modelo de datos" del README a tablas reales.
-- =============================================================

-- Tipos enumerados ------------------------------------------------
create type business_type as enum ('barber', 'salon');
create type business_status as enum ('active', 'pending', 'suspended');
create type platform_role as enum ('superadmin', 'admin', 'owner');
create type appointment_status as enum ('present', 'scheduled', 'attended', 'no_show');

-- Perfiles --------------------------------------------------------
-- Extiende auth.users con el rol dentro de la plataforma.
-- 'superadmin'/'admin' = nosotros (Panel Maestro). 'owner' = dueño de negocio.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        platform_role not null default 'owner',
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Negocios --------------------------------------------------------
create table businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references profiles (id) on delete set null,
  name         text not null,
  type         business_type not null,
  logo_url     text,
  phone        text,
  address      text,
  staff_count  int not null default 1 check (staff_count >= 0),
  invite_slug  text not null unique,
  status       business_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index businesses_owner_idx on businesses (owner_id);
create index businesses_status_idx on businesses (status);

-- Staff (barberos / estilistas) -----------------------------------
-- Sin login propio; los administra el dueño del negocio.
create table staff (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  name         text not null,
  specialty    text,
  created_at   timestamptz not null default now()
);
create index staff_business_idx on staff (business_id);

-- Catálogo GLOBAL de servicios ------------------------------------
-- Fijo, definido por la plataforma (no por el negocio). Se carga en seed.sql.
create table services_catalog (
  id          uuid primary key default gen_random_uuid(),
  type        business_type not null,
  category    text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (type, category, name)
);

-- Servicios que ofrece cada negocio -------------------------------
-- El negocio asocia servicios del catálogo global y pone su precio/duración.
create table business_services (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses (id) on delete cascade,
  catalog_service_id  uuid not null references services_catalog (id) on delete restrict,
  price               numeric(10,2) not null default 0 check (price >= 0),
  duration_minutes    int not null default 30 check (duration_minutes > 0),
  created_at          timestamptz not null default now(),
  unique (business_id, catalog_service_id)
);
create index business_services_business_idx on business_services (business_id);

-- Clientes finales (GLOBAL, por teléfono) -------------------------
create table clients (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Vínculo cliente <-> negocio -------------------------------------
-- Se crea SOLO al registrarse por el link de invitación del negocio.
create table client_business (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  business_id  uuid not null references businesses (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (client_id, business_id)
);
create index client_business_business_idx on client_business (business_id);

-- Citas -----------------------------------------------------------
create table appointments (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references businesses (id) on delete cascade,
  staff_id             uuid references staff (id) on delete set null,
  client_id            uuid references clients (id) on delete set null,
  business_service_id  uuid references business_services (id) on delete set null,
  appt_date            date not null,
  appt_time            time not null,
  status               appointment_status not null default 'scheduled',
  price                numeric(10,2) not null default 0 check (price >= 0),
  created_at           timestamptz not null default now()
);
create index appointments_business_date_idx on appointments (business_id, appt_date);
create index appointments_staff_idx on appointments (staff_id);

-- Disponibilidad del staff ----------------------------------------
-- Un registro por (staff, día) con la lista de horarios bloqueados ("HH:MM").
create table staff_availability (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid not null references staff (id) on delete cascade,
  day            date not null,
  blocked_slots  text[] not null default '{}',
  updated_at     timestamptz not null default now(),
  unique (staff_id, day)
);
create index staff_availability_staff_idx on staff_availability (staff_id);

-- Alta automática de perfil al crear un usuario en Auth -----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'owner')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
