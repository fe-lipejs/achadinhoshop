-- =====================================================================
--  004 — MAPA DE ATENÇÃO (onde o visitante passa tempo e onde desiste)
--  Rode este arquivo INTEIRO no SQL Editor do Supabase.
--  É idempotente: pode rodar mais de uma vez sem problema.
--
--  Cada abertura da vitrine vira UMA linha em page_sessions, que o site
--  vai atualizando a cada ~10s enquanto a pessoa está na página
--  (e uma última vez quando ela sai / troca de aba).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabela de sessões de engajamento
-- ---------------------------------------------------------------------
create table if not exists public.page_sessions (
  id                text primary key,                 -- id da sessão (gerado no navegador)
  visitor_id        text,
  source            text,
  campaign          text,
  device            text,
  browser           text,
  pathname          text,
  viewport_h        integer,
  duration_ms       integer not null default 0,       -- tempo ATIVO (aba visível) na página
  max_scroll_pct    integer not null default 0,       -- até quantos % da página rolou
  catalog_load_ms   integer,                          -- quanto tempo os produtos levaram p/ aparecer
  products_total    integer not null default 0,       -- quantos produtos havia na lista
  products_seen     integer not null default 0,       -- quantos cards ficaram visíveis 0,8s+
  max_product_index integer not null default 0,       -- posição do produto mais fundo que viu
  product_opens     integer not null default 0,       -- abriu detalhes de produto
  buy_clicks        integer not null default 0,       -- clicou em "Ver na loja / Comprar"
  searches          integer not null default 0,
  filters           integer not null default 0,
  exit_section      text,                             -- onde estava na última atualização
  section_ms        jsonb not null default '{}'::jsonb,  -- tempo por seção { "topo": 1200, ... }
  product_dwell     jsonb not null default '{}'::jsonb,  -- tempo olhando cada produto { "12": 3400 }
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists page_sessions_created_idx on public.page_sessions(created_at desc);
create index if not exists page_sessions_device_idx  on public.page_sessions(device);

-- ---------------------------------------------------------------------
-- 2) Segurança: visitante só grava via função; só admin lê
-- ---------------------------------------------------------------------
alter table public.page_sessions enable row level security;

drop policy if exists "sessions_admin_read" on public.page_sessions;
create policy "sessions_admin_read" on public.page_sessions
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- 3) Remover versões antigas da função (evita conflito de overload)
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
       and p.proname = 'upsert_page_session'
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4) Função para criar/atualizar a sessão
--    Os valores enviados são ACUMULADOS no navegador, então usamos
--    greatest() — uma requisição atrasada nunca "volta" os números.
-- ---------------------------------------------------------------------
create function public.upsert_page_session(
  p_session_id        text,
  p_visitor_id        text    default null,
  p_source            text    default null,
  p_campaign          text    default null,
  p_device            text    default null,
  p_browser           text    default null,
  p_pathname          text    default null,
  p_viewport_h        integer default null,
  p_duration_ms       integer default 0,
  p_max_scroll_pct    integer default 0,
  p_catalog_load_ms   integer default null,
  p_products_total    integer default 0,
  p_products_seen     integer default 0,
  p_max_product_index integer default 0,
  p_product_opens     integer default 0,
  p_buy_clicks        integer default 0,
  p_searches          integer default 0,
  p_filters           integer default 0,
  p_exit_section      text    default null,
  p_section_ms        jsonb   default '{}'::jsonb,
  p_product_dwell     jsonb   default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section jsonb := case
    when jsonb_typeof(p_section_ms) = 'object' and pg_column_size(p_section_ms) < 2000 then p_section_ms
    else '{}'::jsonb end;
  v_dwell jsonb := case
    when jsonb_typeof(p_product_dwell) = 'object' and pg_column_size(p_product_dwell) < 8000 then p_product_dwell
    else '{}'::jsonb end;
  v_duration integer := least(greatest(coalesce(p_duration_ms, 0), 0), 86400000);
begin
  if p_session_id is null or length(p_session_id) < 8 or length(p_session_id) > 64 then
    return;
  end if;

  insert into public.page_sessions (
    id, visitor_id, source, campaign, device, browser, pathname, viewport_h,
    duration_ms, max_scroll_pct, catalog_load_ms, products_total, products_seen,
    max_product_index, product_opens, buy_clicks, searches, filters,
    exit_section, section_ms, product_dwell
  ) values (
    p_session_id,
    left(p_visitor_id, 64),
    left(coalesce(nullif(p_source, ''), 'direto'), 60),
    left(p_campaign, 120),
    left(p_device, 20),
    left(p_browser, 80),
    left(p_pathname, 200),
    least(greatest(coalesce(p_viewport_h, 0), 0), 10000),
    v_duration,
    least(greatest(coalesce(p_max_scroll_pct, 0), 0), 100),
    case when p_catalog_load_ms is null then null else least(greatest(p_catalog_load_ms, 0), 600000) end,
    least(greatest(coalesce(p_products_total, 0), 0), 100000),
    least(greatest(coalesce(p_products_seen, 0), 0), 100000),
    least(greatest(coalesce(p_max_product_index, 0), 0), 100000),
    least(greatest(coalesce(p_product_opens, 0), 0), 10000),
    least(greatest(coalesce(p_buy_clicks, 0), 0), 10000),
    least(greatest(coalesce(p_searches, 0), 0), 10000),
    least(greatest(coalesce(p_filters, 0), 0), 10000),
    left(p_exit_section, 40),
    v_section,
    v_dwell
  )
  on conflict (id) do update set
    duration_ms       = greatest(page_sessions.duration_ms,       excluded.duration_ms),
    max_scroll_pct    = greatest(page_sessions.max_scroll_pct,    excluded.max_scroll_pct),
    catalog_load_ms   = coalesce(page_sessions.catalog_load_ms,   excluded.catalog_load_ms),
    products_total    = greatest(page_sessions.products_total,    excluded.products_total),
    products_seen     = greatest(page_sessions.products_seen,     excluded.products_seen),
    max_product_index = greatest(page_sessions.max_product_index, excluded.max_product_index),
    product_opens     = greatest(page_sessions.product_opens,     excluded.product_opens),
    buy_clicks        = greatest(page_sessions.buy_clicks,        excluded.buy_clicks),
    searches          = greatest(page_sessions.searches,          excluded.searches),
    filters           = greatest(page_sessions.filters,           excluded.filters),
    viewport_h        = coalesce(nullif(excluded.viewport_h, 0),  page_sessions.viewport_h),
    exit_section      = case when excluded.duration_ms >= page_sessions.duration_ms
                             then excluded.exit_section else page_sessions.exit_section end,
    section_ms        = case when excluded.duration_ms >= page_sessions.duration_ms
                             then excluded.section_ms else page_sessions.section_ms end,
    product_dwell     = case when excluded.duration_ms >= page_sessions.duration_ms
                             then excluded.product_dwell else page_sessions.product_dwell end,
    updated_at        = now()
  where page_sessions.created_at > now() - interval '1 day';  -- sessões antigas não são reabertas
end;
$$;

grant execute on function public.upsert_page_session(
  text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  text, jsonb, jsonb
) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) Recarregar a API do Supabase
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
