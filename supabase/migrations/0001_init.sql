-- =====================================================================
--  RDC SAINT KITTS · Esquema inicial de Supabase
-- =====================================================================
--  Cómo aplicarlo:
--    Opción A (recomendada la primera vez)
--      Panel de Supabase → SQL Editor → New query → pegar todo → Run.
--    Opción B (con la CLI)
--      supabase link --project-ref <ref> && supabase db push
--
--  Es idempotente: se puede volver a ejecutar sin romper nada.
--
--  ---------------------------------------------------------------
--  PRINCIPIO DE SEGURIDAD DE ESTE ESQUEMA
--  ---------------------------------------------------------------
--  La tabla `bookings` guarda nombre, teléfono y correo de
--  pacientes. Por eso NO tiene ninguna política que permita al
--  público leerla NI escribirla.
--
--  Las reservas no entran por PostgREST. Entran por la Edge
--  Function `book`, que valida del lado del servidor y escribe con
--  la service_role key (que salta RLS). Así el navegador nunca
--  tiene permiso de escritura sobre datos de pacientes, y toda
--  reserva pasa sí o sí por la validación y el freno anti-spam.
--
--  Con RLS activada y sin políticas, el resultado por defecto es
--  "nadie puede hacer nada". Es el punto de partida correcto.
-- =====================================================================


-- =====================================================================
--  0. EXTENSIONES
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()


-- =====================================================================
--  1. PERSONAL AUTORIZADO
-- =====================================================================
--  Ser usuario de Supabase Auth NO basta para entrar al panel: hay
--  que estar además en esta tabla. Son dos cosas distintas a
--  propósito. Si algún día se habilita el registro público por
--  error, un desconocido tendría cuenta pero seguiría sin ver una
--  sola reserva.
--
--  Para dar de alta a alguien: crear el usuario en
--  Authentication → Users y luego insertar aquí su user_id.
-- =====================================================================

create table if not exists public.staff (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.staff enable row level security;

-- SECURITY DEFINER a propósito: la política de una tabla no puede
-- consultar esa misma tabla sin recursión infinita. La función
-- rompe el ciclo. `search_path` fijo para que nadie pueda
-- redirigirla a un esquema falso.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff where user_id = auth.uid()
  );
$$;

revoke execute on function public.is_staff() from public;

-- Solo `authenticated`. anon NO la necesita, y es importante que no
-- la tenga: cualquier funcion ejecutable por anon queda expuesta en
-- /rest/v1/rpc/<nombre>, y el linter de Supabase lo marca con razon.
--
-- Para que anon no la necesite, las politicas de lectura de `posts` y
-- `banners` estan partidas por rol (ver mas abajo): la de anon dice
-- "published = true" a secas, sin llamar a ninguna funcion. Postgres
-- evalua la expresion de una politica con los permisos de quien
-- consulta, asi que una politica compartida entre anon y authenticated
-- que invoque is_staff() obliga a conceder EXECUTE a anon.
grant execute on function public.is_staff() to authenticated;

drop policy if exists "staff se ven entre ellos" on public.staff;
create policy "staff se ven entre ellos"
  on public.staff for select
  to authenticated
  using (public.is_staff());


-- =====================================================================
--  2. RESERVAS
-- =====================================================================

-- Código legible para el paciente y el personal: RDC-2026-00042.
-- El uuid sigue siendo la llave real; esto es solo para humanos.
create sequence if not exists public.booking_ref_seq;

create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text unique not null
                        default 'RDC-' || to_char(now(), 'YYYY') || '-'
                             || lpad(nextval('public.booking_ref_seq')::text, 5, '0'),

  full_name           text not null check (length(trim(full_name)) >= 3),
  phone               text not null,
  email               text not null,
  modality            text not null,
  preferred_date      date not null,
  preferred_time      text not null,
  notes               text,

  status              text not null default 'Pendiente'
                        check (status in ('Pendiente', 'Confirmada', 'Cancelada')),

  -- Un booleano por canal, no uno solo. Si el correo sale y el
  -- WhatsApp falla, el personal necesita verlo en el panel; con un
  -- único "notified" esa información se pierde.
  notified_email      boolean not null default false,
  notified_whatsapp   boolean not null default false,
  notified_calendar   boolean not null default false,
  calendar_event_id   text,
  notify_error        text,

  -- Solo para el freno anti-spam. No se muestra en el panel.
  source_ip           text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_status_idx     on public.bookings (status);
create index if not exists bookings_date_idx       on public.bookings (preferred_date);
-- Índice del freno anti-spam: se consulta por correo dentro de una ventana corta.
create index if not exists bookings_email_created_idx on public.bookings (email, created_at desc);

alter table public.bookings enable row level security;

-- Sin política de INSERT. Ni pública ni autenticada.
-- Las reservas entran únicamente por la Edge Function `book`.
drop policy if exists "personal lee reservas"     on public.bookings;
drop policy if exists "personal edita reservas"   on public.bookings;
drop policy if exists "personal borra reservas"   on public.bookings;

create policy "personal lee reservas"
  on public.bookings for select
  to authenticated
  using (public.is_staff());

create policy "personal edita reservas"
  on public.bookings for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "personal borra reservas"
  on public.bookings for delete
  to authenticated
  using (public.is_staff());


-- =====================================================================
--  3. PUBLICACIONES  (sección "Studies & Work")
-- =====================================================================

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null default current_date,
  excerpt     text,

  -- Ruta dentro del bucket `posts` de Storage, para las fotos que
  -- el personal sube arrastrando. `image_url` queda para enlazar
  -- una imagen externa sin subirla.
  image_path  text,
  image_url   text,

  link        text,
  -- Color de acento de la tarjeta en el sitio. Lo elige quien
  -- escribe la publicación, desde el panel.
  accent_color text not null default '#2dd4bf',
  published   boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (published, date desc);

alter table public.posts enable row level security;

drop policy if exists "publicaciones publicadas son públicas" on public.posts;
drop policy if exists "personal ve todas las publicaciones"   on public.posts;
drop policy if exists "personal gestiona publicaciones"       on public.posts;

-- Una politica de lectura por rol, no una compartida. La de anon no
-- invoca ninguna funcion, y por eso anon no necesita EXECUTE sobre
-- is_staff(). Ver la nota junto a esa funcion.
create policy "publicaciones publicadas son públicas"
  on public.posts for select
  to anon
  using (published = true);

create policy "personal ve todas las publicaciones"
  on public.posts for select
  to authenticated
  using (published = true or public.is_staff());

create policy "personal gestiona publicaciones"
  on public.posts for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =====================================================================
--  4. BANNERS  (carrusel de la portada)
-- =====================================================================

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_path  text,
  image_url   text,
  caption     text,
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists banners_active_idx on public.banners (active, sort);

alter table public.banners enable row level security;

drop policy if exists "banners activos son públicos" on public.banners;
drop policy if exists "personal ve todos los banners" on public.banners;
drop policy if exists "personal gestiona banners"    on public.banners;

create policy "banners activos son públicos"
  on public.banners for select
  to anon
  using (active = true);

create policy "personal ve todos los banners"
  on public.banners for select
  to authenticated
  using (active = true or public.is_staff());

create policy "personal gestiona banners"
  on public.banners for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =====================================================================
--  5. TEXTOS EDITABLES
-- =====================================================================
--  Una sola fila, siempre id = 1. El CHECK lo garantiza: cualquier
--  intento de insertar una segunda fila falla.
-- =====================================================================

create table if not exists public.site_content (
  id             smallint primary key default 1 check (id = 1),
  hero_title     text,
  hero_subtitle  text,
  promo_text     text,
  updated_at     timestamptz not null default now()
);

insert into public.site_content (id) values (1) on conflict (id) do nothing;

alter table public.site_content enable row level security;

drop policy if exists "textos son públicos"      on public.site_content;
drop policy if exists "personal edita textos"    on public.site_content;

create policy "textos son públicos"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "personal edita textos"
  on public.site_content for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =====================================================================
--  6. KEEPALIVE  (anti-pausa del plan gratuito)
-- =====================================================================
--  Supabase pausa los proyectos del plan gratuito cuando ve poca
--  actividad en una ventana de 7 días, y lo que cuenta son
--  peticiones de usuario contra la base de datos.
--
--  Por eso el ping NO puede vivir dentro de Supabase:
--    · pg_cron es actividad interna, no una petición de usuario
--    · y si el proyecto llegara a pausarse, pg_cron se detiene con
--      él, así que no podría despertarlo nunca
--
--  El ping lo dispara GitHub Actions desde fuera. Ver
--  .github/workflows/supabase-keepalive.yml
--
--  Esta tabla no crece: es una sola fila que se actualiza. Sirve
--  también de registro: si last_ping tiene tres semanas, el cron
--  está roto y hay que mirarlo antes de que el proyecto se pause.
-- =====================================================================

create table if not exists public.keepalive (
  id          smallint primary key default 1 check (id = 1),
  last_ping   timestamptz not null default now(),
  ping_count  bigint not null default 0
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

-- RLS activada y sin ninguna política: la tabla es inalcanzable
-- desde la API. Solo se toca a través de la función de abajo.
alter table public.keepalive enable row level security;

create or replace function public.ping()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t timestamptz;
begin
  update public.keepalive
     set last_ping  = now(),
         ping_count = ping_count + 1
   where id = 1
  returning last_ping into t;

  return t;
end;
$$;

-- Ejecutable por anon a propósito: el cron se autentica solo con
-- la anon key, que es pública por diseño. Lo único que puede hacer
-- quien la use es actualizar una marca de tiempo. No lee ni escribe
-- nada más, y la tabla no crece por muchas veces que se llame.
revoke execute on function public.ping() from public;
grant  execute on function public.ping() to anon, authenticated;


-- =====================================================================
--  7. updated_at AUTOMÁTICO
-- =====================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_touch     on public.bookings;
drop trigger if exists posts_touch        on public.posts;
drop trigger if exists banners_touch      on public.banners;
drop trigger if exists site_content_touch on public.site_content;

create trigger bookings_touch     before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger posts_touch        before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger banners_touch      before update on public.banners
  for each row execute function public.touch_updated_at();
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();


-- =====================================================================
--  8. STORAGE  (fotos que el personal sube arrastrando)
-- =====================================================================
--  Buckets públicos de lectura: son fotos que salen en el sitio, no
--  hay nada que ocultar. Subir, reemplazar y borrar queda reservado
--  al personal.
--
--  Nota: las imágenes de estudios que se publiquen aquí tienen que
--  ir SIN la franja de datos DICOM (nombre, fecha de nacimiento,
--  número de estudio). Eso lo revisa la persona que sube, no hay
--  forma de comprobarlo automáticamente.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true), ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "fotos del sitio son públicas"  on storage.objects;
drop policy if exists "personal sube fotos"           on storage.objects;
drop policy if exists "personal reemplaza fotos"      on storage.objects;
drop policy if exists "personal borra fotos"          on storage.objects;

create policy "fotos del sitio son públicas"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('posts', 'banners'));

create policy "personal sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('posts', 'banners') and public.is_staff());

create policy "personal reemplaza fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('posts', 'banners') and public.is_staff());

create policy "personal borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('posts', 'banners') and public.is_staff());


-- =====================================================================
--  9. COMPROBACIÓN
-- =====================================================================
--  Al terminar deberías ver rowsecurity = true en las cinco tablas.
--  Si alguna sale en false, algo no se aplicó: no sigas.
--
--    select tablename, rowsecurity
--      from pg_tables
--     where schemaname = 'public'
--       and tablename in ('bookings','posts','banners','site_content','keepalive','staff');
--
--  Y esta consulta debe devolver CERO filas. Si devuelve alguna,
--  hay una política que deja a cualquiera tocar las reservas:
--
--    select polname from pg_policy
--     where polrelid = 'public.bookings'::regclass
--       and 'anon' = any (select rolname from pg_roles where oid = any (polroles));
-- =====================================================================
