export type Store = 'shopee' | 'mercadolivre';

export type Highlight = 'mais_vendido' | 'oferta' | 'mais_buscado' | 'lancamento';

export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  created_at?: string;
}

export interface Product {
  id: string;
  code: number;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  old_price: number | null;
  store: Store;
  affiliate_url: string;
  category_id: string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
  clicks: number;
  highlight: Highlight | null;
  rating: number | null;
  sold_label: string | null;
  free_shipping: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ProductInput = Omit<Product, 'id' | 'code' | 'clicks' | 'created_at' | 'updated_at'>;

export interface ClickBySource {
  source: string;
  total: number;
}

export interface FunnelAnalytics {
  source: string;
  views: number;
  clicks: number;
}

export interface AnalyticsEvent {
  id: string;
  type: 'visit' | 'click';
  source: string;
  createdAt: string;
  productName?: string;
  productCode?: number;
  visitorId?: string;
  device?: string;
  browser?: string;
  referrer?: string;
  pathname?: string;
  campaign?: string | null;
  query?: string | null;
}

/** Seções rastreadas na vitrine para o mapa de atenção. */
export type EngagementSection = 'carregando' | 'topo' | 'filtros' | 'produtos' | 'rodape' | 'produto_aberto';

/** Uma abertura da vitrine (linha de page_sessions). */
export interface EngagementSession {
  id: string;
  visitor_id: string | null;
  source: string | null;
  device: string | null;
  browser: string | null;
  viewport_h: number | null;
  duration_ms: number;
  max_scroll_pct: number;
  catalog_load_ms: number | null;
  products_total: number;
  products_seen: number;
  max_product_index: number;
  product_opens: number;
  buy_clicks: number;
  searches: number;
  filters: number;
  exit_section: string | null;
  section_ms: Record<string, number>;
  product_dwell: Record<string, number>;
  created_at: string;
}