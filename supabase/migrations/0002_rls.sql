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
