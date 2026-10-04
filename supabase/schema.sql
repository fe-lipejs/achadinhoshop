-- =====================================================================
--  Vitrine de Afiliados — Schema Supabase
--  Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ADMINS: só usuários listados aqui podem editar a vitrine
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- CATEGORIAS
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code serial unique,                       -- número curto p/ citar no vídeo ("produto 12")
  title text not null,
  description text,
  image_url text,
  price numeric(12,2),
  old_price numeric(12,2),
  store text not null check (store in ('shopee','mercadolivre')),
  affiliate_url text not null,
  category_id uuid references public.categories(id) on delete set null,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  clicks int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campos visuais do card (estilo Mercado Livre / Shopee).
-- "add column if not exists" permite rodar de novo em um banco já criado.
alter table public.products add column if not exists highlight text;        -- mais_vendido | oferta | mais_buscado | lancamento
alter table public.products add column if not exists rating numeric(2,1);   -- 0.0 a 5.0
alter table public.products add column if not exists sold_label text;       -- ex: "+10mil vendidos"
alter table public.products add column if not exists free_shipping boolean not null default false;

alter table public.products drop constraint if exists products_highlight_check;
alter table public.products add constraint products_highlight_check
  check (highlight is null or highlight in ('mais_vendido','oferta','mais_buscado','lancamento'));

alter table public.products drop constraint if exists products_rating_check;
alter table public.products add constraint products_rating_check
  check (rating is null or (rating >= 0 and rating <= 5));

create index if not exists products_active_idx on public.products(active);
create index if not exists products_category_idx on public.products(category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- CLIQUES (com origem: tiktok, kwai, etc. via ?src=)
-- ---------------------------------------------------------------------
create table if not exists public.product_clicks (
  id bigserial primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists product_clicks_product_idx on public.product_clicks(product_id);

-- RPC pública para registrar clique (visitante anônimo não tem acesso direto às tabelas)
create or replace function public.register_click(p_product_id uuid, p_source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set clicks = clicks + 1
   where id = p_product_id and active = true;
  if found then
    insert into public.product_clicks(product_id, source)
    values (p_product_id, left(coalesce(p_source, 'direto'), 40));
  end if;
end;
$$;

grant execute on function public.register_click(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_clicks enable row level security;

-- admins: usuário pode ver se ele mesmo é admin
drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read" on public.admins
  for select using (user_id = auth.uid());

-- categorias: leitura pública, escrita só admin
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- produtos: público vê só ativos; admin vê e edita tudo
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (active = true or public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- cliques: só admin lê
drop policy if exists "clicks_admin_read" on public.product_clicks;
create policy "clicks_admin_read" on public.product_clicks
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- STORAGE: bucket público "produtos"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "produtos_public_read" on storage.objects;
create policy "produtos_public_read" on storage.objects
  for select using (bucket_id = 'produtos');

drop policy if exists "produtos_admin_insert" on storage.objects;
create policy "produtos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "produtos_admin_update" on storage.objects;
create policy "produtos_admin_update" on storage.objects
  for update using (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "produtos_admin_delete" on storage.objects;
create policy "produtos_admin_delete" on storage.objects
  for delete using (bucket_id = 'produtos' and public.is_admin());

-- ---------------------------------------------------------------------
-- DEPOIS DE CRIAR SEU USUÁRIO (Authentication > Users > Add user),
-- rode a linha abaixo trocando o e-mail:
--
-- insert into public.admins(user_id)
-- select id from auth.users where email = 'seu@email.com';
-- ---------------------------------------------------------------------
