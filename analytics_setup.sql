-- ---------------------------------------------------------------------
-- TABELA PARA RASTREAR VISITAS (PAGE VIEWS)
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id bigserial primary key,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_source_idx on public.page_views(source);

-- RPC pública para registrar visita (visitante anônimo)
create or replace function public.register_page_view(p_source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.page_views(source)
  values (left(coalesce(p_source, 'direto'), 40));
end;
$$;

grant execute on function public.register_page_view(text) to anon, authenticated;

-- ROW LEVEL SECURITY PARA PAGE_VIEWS
alter table public.page_views enable row level security;

drop policy if exists "views_admin_read" on public.page_views;
create policy "views_admin_read" on public.page_views
  for select using (public.is_admin());
