-- Santa Cecilia Awards 2026 | esquema inicial
-- No almacenar DNI: la identidad se verifica mediante Supabase Auth + censo autorizado.
create extension if not exists pgcrypto;

create table if not exists public.sca_settings (
 id integer primary key default 1 check (id = 1),
 voting_open boolean not null default false,
 results_published boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.sca_settings(id) values (1) on conflict(id) do nothing;

create table if not exists public.sca_awards (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text,
 slug text not null unique,
 display_order integer not null default 100,
 featured boolean not null default false,
 published boolean not null default false,
 image_url text,
 created_at timestamptz not null default now()
);

create table if not exists public.sca_nominees (
 id uuid primary key default gen_random_uuid(),
 award_id uuid not null references public.sca_awards(id) on delete cascade,
 name text not null,
 description text,
 photo_url text,
 video_url text,
 display_order integer not null default 100,
 published boolean not null default false,
 created_at timestamptz not null default now(),
 unique(id,award_id)
);

create table if not exists public.sca_voters (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.sca_votes (
 id uuid primary key default gen_random_uuid(),
 voter_id uuid not null references public.sca_voters(user_id),
 award_id uuid not null references public.sca_awards(id),
 nominee_id uuid not null,
 created_at timestamptz not null default now(),
 unique(voter_id,award_id),
 foreign key(nominee_id,award_id) references public.sca_nominees(id,award_id)
);

alter table public.sca_settings enable row level security;
alter table public.sca_awards enable row level security;
alter table public.sca_nominees enable row level security;
alter table public.sca_voters enable row level security;
alter table public.sca_votes enable row level security;

-- Denegar todas las operaciones por defecto; conceder solo las imprescindibles.
revoke all on public.sca_settings, public.sca_awards, public.sca_nominees, public.sca_voters, public.sca_votes from anon, authenticated;
grant select on public.sca_settings, public.sca_awards, public.sca_nominees to anon, authenticated;
grant select on public.sca_voters to authenticated;
grant insert on public.sca_votes to authenticated;

create policy "Public can read gala settings" on public.sca_settings
 for select to anon, authenticated using(true);
create policy "Public can read published awards" on public.sca_awards
 for select to anon, authenticated using(published = true);
create policy "Public can read published nominees" on public.sca_nominees
 for select to anon, authenticated using(
 published = true and exists (
  select 1 from public.sca_awards a where a.id = award_id and a.published = true
 )
);
create policy "Voters only see own eligibility" on public.sca_voters
 for select to authenticated using(user_id = (select auth.uid()));
create policy "One authorized vote per category while open" on public.sca_votes
 for insert to authenticated with check(
  voter_id = (select auth.uid())
  and exists(select 1 from public.sca_voters v where v.user_id=(select auth.uid()) and v.enabled)
  and exists(select 1 from public.sca_settings s where s.id=1 and s.voting_open)
  and exists(select 1 from public.sca_awards a where a.id=award_id and a.published)
  and exists(select 1 from public.sca_nominees n where n.id=nominee_id and n.award_id=award_id and n.published)
 );
-- Deliberadamente: ninguna política SELECT para votos; las papeletas nunca son públicas.
-- Resultados: consultar solo desde administración segura tras el cierre y publicación.
insert into public.sca_awards(title,description,slug,display_order,featured,published)
 values
 ('El Guante de Mickey','Premio principal de la gala','guante-de-mickey',1,true,false),
 ('Cachorro del Año','Segundo gran galardón','cachorro-del-ano',2,false,false)
 on conflict(slug) do nothing;
