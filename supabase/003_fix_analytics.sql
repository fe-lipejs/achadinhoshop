-- =====================================================================
--  003 — CORREÇÃO DO RASTREAMENTO (visitas + cliques)
--  Rode este arquivo INTEIRO no SQL Editor do Supabase.
--  Pode rodar quantas vezes quiser: ele é idempotente.
--
--  Problema corrigido: existiam DUAS versões de register_page_view e
--  DUAS de register_click (uma com visitor_id uuid, outra com text).
--  O Supabase (PostgREST) não conseguia escolher entre elas e respondia
--  HTTP 300 / PGRST203 para TODA visita e TODO clique => nada era salvo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Apagar TODAS as versões (overloads) das funções de rastreamento
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('register_page_view', 'register_click')
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) Tabela de visitas
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id bigserial primary key,
  source text,
  created_at timestamptz not null default now()
);

alter table public.page_views add column if not exists visitor_id text;
alter table public.page_views add column if not exists device     text;
alter table public.page_views add column if not exists browser    text;
alter table public.page_views add column if not exists referrer   text;
alter table public.page_views add column if not exists pathname   text;
alter table public.page_views add column if not exists campaign   text;
alter table public.page_views add column if not exists query      text;

-- visitor_id como TEXT (aceita qualquer formato; evita erro de cast uuid)
alter table public.page_views alter column visitor_id type text using visitor_id::text;

create index if not exists page_views_created_idx on public.page_views(created_at desc);
create index if not exists page_views_source_idx  on public.page_views(source);

-- ---------------------------------------------------------------------
-- 3) Tabela de cliques (já criada no 001) — garantir colunas extras
-- ---------------------------------------------------------------------
alter table public.product_clicks add column if not exists visitor_id text;
alter table public.product_clicks add column if not exists device     text;
alter table public.product_clicks add column if not exists browser    text;
alter table public.product_clicks add column if not exists referrer   text;
alter table public.product_clicks add column if not exists pathname   text;
alter table public.product_clicks add column if not exists campaign   text;

alter table public.product_clicks alter column visitor_id type text using visitor_id::text;

create index if not exists product_clicks_created_idx on public.product_clicks(created_at desc);

-- ---------------------------------------------------------------------
-- 4) Segurança (RLS): visitante NÃO lê nem escreve direto nas tabelas.
--    Ele só registra via funções abaixo. Só admin lê.
-- ---------------------------------------------------------------------
alter table public.page_views     enable row level security;
alter table public.product_clicks enable row level security;

-- remove políticas abertas criadas por engano anteriormente
drop policy if exists "Permitir inserção anônima em page_views"            on public.page_views;
drop policy if exists "Permitir leitura para autenticados em page_views"   on public.page_views;
drop policy if exists "Permitir inserção anônima em product_clicks"        on public.product_clicks;
drop policy if exists "Permitir leitura para autenticados em product_clicks" on public.product_clicks;

drop policy if exists "views_admin_read" on public.page_views;
create policy "views_admin_read" on public.page_views
  for select using (public.is_admin());

drop policy if exists "clicks_admin_read" on public.product_clicks;
create policy "clicks_admin_read" on public.product_clicks
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- 5) Função ÚNICA para registrar visita
-- ---------------------------------------------------------------------
create function public.register_page_view(
  p_source     text default null,
  p_visitor_id text default null,
  p_device     text default null,
  p_browser    text default null,
  p_referrer   text default null,
  p_pathname   text default null,
  p_campaign   text default null,
  p_query      text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.page_views (source, visitor_id, device, browser, referrer, pathname, campaign, query)
  values (
    left(coalesce(nullif(p_source, ''), 'direto'), 60),
    left(p_visitor_id, 64),
    left(p_device, 20),
    left(p_browser, 80),
    left(p_referrer, 500),
    left(p_pathname, 200),
    left(p_campaign, 120),
    left(p_query, 1000)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6) Função ÚNICA para registrar clique em produto
-- ---------------------------------------------------------------------
create function public.register_click(
  p_product_id uuid,
  p_source     text default null,
  p_visitor_id text default null,
  p_device     text default null,
  p_browser    text default null,
  p_referrer   text default null,
  p_pathname   text default null,
  p_campaign   text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set clicks = clicks + 1
   where id = p_product_id;

  -- só grava o log se o produto existe (evita erro de chave estrangeira)
  if found then
    insert into public.product_clicks (product_id, source, visitor_id, device, browser, referrer, pathname, campaign)
    values (
      p_product_id,
      left(coalesce(nullif(p_source, ''), 'direto'), 60),
      left(p_visitor_id, 64),
      left(p_device, 20),
      left(p_browser, 80),
      left(p_referrer, 500),
      left(p_pathname, 200),
      left(p_campaign, 120)
    );
  end if;
end;
$$;

grant execute on function public.register_page_view(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.register_click(uuid, text, text, text, text, text, text, text)     to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) Avisar a API do Supabase para recarregar as funções na hora
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
