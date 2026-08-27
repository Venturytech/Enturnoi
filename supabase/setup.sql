-- =============================================================
-- Enturnoi · Instalación completa de la base de datos
-- Pega TODO este archivo en el SQL Editor de Supabase y dale RUN.
-- Contiene: esquema + seguridad (RLS) + catálogo de servicios.
-- =============================================================

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

-- =============================================================
-- Enturnoi · Seguridad por filas (RLS) + funciones de acceso
-- Regla clave: cada negocio solo ve SUS datos; el Panel Maestro
-- (superadmin/admin) lo ve todo; las pantallas del cliente final
-- leen datos públicos por medio de funciones controladas.
-- =============================================================

-- Helpers ---------------------------------------------------------
create or replace function is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('superadmin', 'admin')
  );
$$;

create or replace function owns_business(b_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from businesses
    where id = b_id and owner_id = auth.uid()
  );
$$;

-- Habilitar RLS en todas las tablas -------------------------------
alter table profiles           enable row level security;
alter table businesses         enable row level security;
alter table staff              enable row level security;
alter table services_catalog   enable row level security;
alter table business_services  enable row level security;
alter table clients            enable row level security;
alter table client_business    enable row level security;
alter table appointments       enable row level security;
alter table staff_availability enable row level security;

-- profiles: cada quien ve/edita el suyo; los admins ven todos -----
create policy profiles_self_select on profiles
  for select using (id = auth.uid() or is_platform_admin());
create policy profiles_self_update on profiles
  for update using (id = auth.uid());

-- businesses ------------------------------------------------------
create policy businesses_admin_all on businesses
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy businesses_owner_select on businesses
  for select using (owner_id = auth.uid());
create policy businesses_owner_insert on businesses
  for insert with check (owner_id = auth.uid());
create policy businesses_owner_update on businesses
  for update using (owner_id = auth.uid());

-- staff -----------------------------------------------------------
create policy staff_admin_all on staff
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy staff_owner_all on staff
  for all using (owns_business(business_id)) with check (owns_business(business_id));

-- services_catalog: catálogo global, lectura para autenticados ----
create policy catalog_read on services_catalog
  for select using (auth.role() = 'authenticated');
create policy catalog_admin_write on services_catalog
  for all using (is_platform_admin()) with check (is_platform_admin());

-- business_services ----------------------------------------------
create policy biz_services_admin_all on business_services
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy biz_services_owner_all on business_services
  for all using (owns_business(business_id)) with check (owns_business(business_id));

-- clients: los ve el admin; el dueño ve solo los suyos vía join ---
create policy clients_admin_all on clients
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy clients_owner_select on clients
  for select using (
    exists (
      select 1 from client_business cb
      where cb.client_id = clients.id and owns_business(cb.business_id)
    )
  );

-- client_business -------------------------------------------------
create policy client_business_admin_all on client_business
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy client_business_owner_select on client_business
  for select using (owns_business(business_id));

-- appointments ----------------------------------------------------
create policy appts_admin_all on appointments
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy appts_owner_all on appointments
  for all using (owns_business(business_id)) with check (owns_business(business_id));

-- staff_availability ---------------------------------------------
create policy avail_admin_all on staff_availability
  for all using (is_platform_admin()) with check (is_platform_admin());
create policy avail_owner_all on staff_availability
  for all using (
    exists (select 1 from staff s where s.id = staff_id and owns_business(s.business_id))
  ) with check (
    exists (select 1 from staff s where s.id = staff_id and owns_business(s.business_id))
  );

-- =============================================================
-- Acceso público del cliente final (sin login), controlado por
-- funciones SECURITY DEFINER que solo exponen lo necesario a
-- partir del invite_slug del negocio.
-- =============================================================

-- Marca del negocio a partir del slug del link de invitación.
create or replace function public.get_business_by_slug(p_slug text)
returns table (id uuid, name text, type business_type, logo_url text, address text)
language sql stable security definer set search_path = public
as $$
  select id, name, type, logo_url, address
  from businesses
  where invite_slug = p_slug and status = 'active';
$$;

-- Registro del cliente por el link (crea cliente global si no existe
-- y lo vincula al negocio). Devuelve el id del cliente.
create or replace function public.register_client(
  p_slug text, p_name text, p_phone text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
  v_client_id uuid;
begin
  select id into v_business_id
  from businesses where invite_slug = p_slug and status = 'active';
  if v_business_id is null then
    raise exception 'Negocio no encontrado o inactivo';
  end if;

  insert into clients (phone, name) values (p_phone, p_name)
  on conflict (phone) do update set name = excluded.name
  returning id into v_client_id;

  insert into client_business (client_id, business_id)
  values (v_client_id, v_business_id)
  on conflict (client_id, business_id) do nothing;

  return v_client_id;
end;
$$;

grant execute on function public.get_business_by_slug(text) to anon, authenticated;
grant execute on function public.register_client(text, text, text) to anon, authenticated;

-- =============================================================
-- Enturnoi · Semilla del catálogo GLOBAL de servicios
-- Fuente: CATALOG en screens/CreateBusiness.jsx (config real definida
-- por la plataforma, no datos de prueba). Idempotente.
-- =============================================================

insert into services_catalog (type, category, name) values
  -- Barbería · Cortes
  ('barber', 'Cortes', 'Corte clásico'),
  ('barber', 'Cortes', 'Corte fade / degradado'),
  ('barber', 'Cortes', 'Corte a tijera'),
  ('barber', 'Cortes', 'Corte infantil'),
  ('barber', 'Cortes', 'Diseño de líneas / tribal'),
  ('barber', 'Cortes', 'Corte + lavado'),
  ('barber', 'Cortes', 'Corte a máquina completo'),
  -- Barbería · Barba
  ('barber', 'Barba', 'Arreglo de barba'),
  ('barber', 'Barba', 'Diseño de barba'),
  ('barber', 'Barba', 'Afeitado tradicional a navaja'),
  ('barber', 'Barba', 'Perfilado de barba'),
  ('barber', 'Barba', 'Tinte de barba'),
  -- Barbería · Rostro y cejas
  ('barber', 'Rostro y cejas', 'Perfilado de cejas'),
  ('barber', 'Rostro y cejas', 'Limpieza facial'),
  ('barber', 'Rostro y cejas', 'Depilación de nariz y oídos'),
  ('barber', 'Rostro y cejas', 'Mascarilla facial'),
  -- Barbería · Cabello y color
  ('barber', 'Cabello y color', 'Lavado + masaje capilar'),
  ('barber', 'Cabello y color', 'Tratamiento anticaída'),
  ('barber', 'Cabello y color', 'Hidratación capilar'),
  ('barber', 'Cabello y color', 'Tinte de cabello'),
  ('barber', 'Cabello y color', 'Alisado para hombre'),
  -- Barbería · Combos
  ('barber', 'Combos', 'Corte + barba'),
  ('barber', 'Combos', 'Corte + barba + cejas'),
  ('barber', 'Combos', 'Corte + tinte'),
  ('barber', 'Combos', 'Paquete novio'),
  -- Salón · Cabello
  ('salon', 'Cabello', 'Corte de dama'),
  ('salon', 'Cabello', 'Corte y peinado'),
  ('salon', 'Cabello', 'Lavado y secado'),
  ('salon', 'Cabello', 'Alisado / keratina'),
  ('salon', 'Cabello', 'Extensiones de cabello'),
  ('salon', 'Cabello', 'Permanente / rizado'),
  ('salon', 'Cabello', 'Peinado de evento'),
  -- Salón · Color
  ('salon', 'Color', 'Coloración completa'),
  ('salon', 'Color', 'Mechas / balayage'),
  ('salon', 'Color', 'Retoque de raíz'),
  ('salon', 'Color', 'Tinte fantasía'),
  ('salon', 'Color', 'Matización / toner'),
  -- Salón · Uñas
  ('salon', 'Uñas', 'Manicure clásica'),
  ('salon', 'Uñas', 'Manicure en gel / semipermanente'),
  ('salon', 'Uñas', 'Pedicure'),
  ('salon', 'Uñas', 'Uñas acrílicas / esculpidas'),
  ('salon', 'Uñas', 'Nail art'),
  ('salon', 'Uñas', 'Retiro de esmaltado'),
  -- Salón · Rostro y piel
  ('salon', 'Rostro y piel', 'Limpieza facial'),
  ('salon', 'Rostro y piel', 'Tratamiento antiedad'),
  ('salon', 'Rostro y piel', 'Depilación con cera (cejas, labio, piernas)'),
  ('salon', 'Rostro y piel', 'Maquillaje social'),
  ('salon', 'Rostro y piel', 'Maquillaje de novia'),
  -- Salón · Spa y bienestar
  ('salon', 'Spa y bienestar', 'Masaje relajante'),
  ('salon', 'Spa y bienestar', 'Exfoliación corporal'),
  ('salon', 'Spa y bienestar', 'Tratamiento capilar profundo'),
  ('salon', 'Spa y bienestar', 'Hidratación facial')
on conflict (type, category, name) do nothing;
