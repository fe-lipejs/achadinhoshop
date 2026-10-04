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