-- =====================================================================
--  "QUIÉNES SOMOS" EDITABLE Y FOTOS DEL EQUIPO
-- =====================================================================
--  Hasta ahora el texto de "Quiénes somos" vivía en js/config.js, o
--  sea que cambiarlo era tocar código y publicar. Eso lo dejaba en
--  manos de quien sabe usar Git, y era justo el texto que la clínica
--  tiene que poder corregir sola: quién la dirige, qué equipos hay,
--  en cuánto se entregan los resultados.
--
--  Este archivo lo mueve a la base, junto al resto de lo que edita
--  el panel, y añade la tabla del equipo.
--
--  Se puede aplicar sobre una base que ya tenga parte hecha: todo va
--  con "if not exists". Ninguna sentencia borra datos.
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. TEXTO DE "QUIÉNES SOMOS"
-- ---------------------------------------------------------------------
--  Mismo criterio bilingüe que el resto de site_content: una columna
--  por idioma, y el español puede quedar vacío. El sitio cae al inglés
--  antes que enseñar un hueco.
--
--  El cuerpo y los apoyos van como texto plano, no como jsonb, porque
--  quien los escribe lo hace en un cuadro de texto normal:
--    · cuerpo  -> párrafos separados por una línea en blanco
--    · apoyos  -> uno por línea
--  Partirlos es cosa del navegador. Guardar aquí la estructura
--  obligaría a la clínica a escribir JSON, que es pedirle que no se
--  equivoque en una coma para que su web no se rompa.
-- ---------------------------------------------------------------------

alter table public.site_content
  add column if not exists about_heading     text,
  add column if not exists about_heading_es  text,
  add column if not exists about_body        text,
  add column if not exists about_body_es     text,
  add column if not exists about_pillars     text,
  add column if not exists about_pillars_es  text;


-- ---------------------------------------------------------------------
--  2. EQUIPO
-- ---------------------------------------------------------------------
--  Una fila por persona. El nombre es lo único obligatorio de verdad;
--  el cargo puede faltar mientras la clínica lo decide.
--
--  La foto se guarda como ruta dentro del bucket, no como URL: si el
--  proyecto cambia de dominio, las rutas siguen valiendo.
-- ---------------------------------------------------------------------

create table if not exists public.team (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  role        text,
  role_es     text,
  image_path  text,
  image_url   text,
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists team_active_idx on public.team (active, sort);

alter table public.team enable row level security;

drop policy if exists "equipo activo es público"    on public.team;
drop policy if exists "personal ve todo el equipo"  on public.team;
drop policy if exists "personal gestiona el equipo" on public.team;

create policy "equipo activo es público"
  on public.team for select
  to anon
  using (active = true);

create policy "personal ve todo el equipo"
  on public.team for select
  to authenticated
  using (active = true or public.is_staff());

create policy "personal gestiona el equipo"
  on public.team for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists team_touch on public.team;
create trigger team_touch before update on public.team
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
--  3. FOTOS DEL EQUIPO EN STORAGE
-- ---------------------------------------------------------------------
--  Bucket propio y no dentro de 'posts' para poder borrar las fotos
--  de una persona que se va sin tocar nada más.
--
--  Las políticas de storage se rehacen enteras porque son una sola
--  regla para todos los buckets: no se puede "añadir" 'team' sin
--  reescribirlas. Los nombres son los mismos que en 0001, así que
--  esto las sustituye en vez de duplicarlas.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team', 'team', true)
on conflict (id) do nothing;

drop policy if exists "fotos del sitio son públicas"  on storage.objects;
drop policy if exists "personal sube fotos"           on storage.objects;
drop policy if exists "personal reemplaza fotos"      on storage.objects;
drop policy if exists "personal borra fotos"          on storage.objects;

create policy "fotos del sitio son públicas"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('posts', 'banners', 'team'));

create policy "personal sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('posts', 'banners', 'team') and public.is_staff());

create policy "personal reemplaza fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('posts', 'banners', 'team') and public.is_staff());

create policy "personal borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('posts', 'banners', 'team') and public.is_staff());


-- ---------------------------------------------------------------------
--  4. COMPROBACIÓN
-- ---------------------------------------------------------------------
--    select column_name from information_schema.columns
--      where table_name = 'site_content' and column_name like 'about%';
--    -- deben salir seis
--
--    select rowsecurity from pg_tables where tablename = 'team';
--    -- debe salir true
-- ---------------------------------------------------------------------
