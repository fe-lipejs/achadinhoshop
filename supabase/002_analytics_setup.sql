-- ---------------------------------------------------------------------
-- TABELA PARA RASTREAR VISITAS (PAGE VIEWS)
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id bigserial primary key,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_source_idx on public.page_views(source);

-- Função substituída pela versão com mais parâmetros abaixo.

-- ROW LEVEL SECURITY PARA PAGE_VIEWS
alter table public.page_views enable row level security;

drop policy if exists "views_admin_read" on public.page_views;
create policy "views_admin_read" on public.page_views
  for select using (public.is_admin());

ALTER TABLE public.page_views 
ADD COLUMN IF NOT EXISTS visitor_id UUID,
ADD COLUMN IF NOT EXISTS device TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS pathname TEXT;

ALTER TABLE public.product_clicks
ADD COLUMN IF NOT EXISTS visitor_id UUID,
ADD COLUMN IF NOT EXISTS device TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS pathname TEXT;

-- Drop old functions to prevent ambiguous overload errors in PostgREST
DROP FUNCTION IF EXISTS public.register_page_view(text);
DROP FUNCTION IF EXISTS public.register_click(uuid, text);

CREATE OR REPLACE FUNCTION public.register_page_view(
  p_source text,
  p_visitor_id uuid DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_pathname text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.page_views (source, visitor_id, device, browser, referrer, pathname)
  VALUES (p_source, p_visitor_id, p_device, p_browser, p_referrer, p_pathname);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.register_click(
  p_product_id uuid,
  p_source text,
  p_visitor_id uuid DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_pathname text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.product_clicks (product_id, source, visitor_id, device, browser, referrer, pathname)
  VALUES (p_product_id, p_source, p_visitor_id, p_device, p_browser, p_referrer, p_pathname);
  
  UPDATE public.products
  SET clicks = clicks + 1
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_page_view(text, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_click(uuid, text, uuid, text, text, text, text) TO anon, authenticated;
