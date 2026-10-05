import { supabase, STORAGE_BUCKET } from '../lib/supabase';
import type { Category, ClickBySource, Product, ProductInput } from '../types';

// ---------------------------------------------------------------- Vitrine
export async function fetchPublicCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  return { products: productsRes.data as Product[], categories: categoriesRes.data as Category[] };
}

// ---------------------------------------------------------------- Rastreamento

/** Gera UUID v4 mesmo em navegadores antigos / navegadores internos de apps. */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* segue para o fallback */
  }
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let memoryVisitorId: string | null = null;

/** ID anônimo do visitante. Nunca lança erro (storage pode estar bloqueado). */
function getVisitorId(): string {
  if (memoryVisitorId) return memoryVisitorId;
  try {
    let vid = localStorage.getItem('visitor_id');
    if (!vid) {
      vid = generateId();
      localStorage.setItem('visitor_id', vid);
    }
    memoryVisitorId = vid;
    return vid;
  } catch {
    memoryVisitorId = generateId();
    return memoryVisitorId;
  }
}

function getDeviceInfo(): { device: string; browser: string } {
  const ua = navigator.userAgent || '';

  // Dispositivo
  let device = 'Desktop';
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) device = 'Tablet';
  else if (/mobi|iphone|ipod|android/i.test(ua)) device = 'Mobile';

  // Sistema (ordem importa: Android contém "Linux", iOS contém "Mac OS X")
  let os = 'Outro';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Navegador / app (navegadores internos primeiro)
  let browser = 'Outro';
  if (/musical_ly|bytedancewebview|trill/i.test(ua)) browser = 'App TikTok';
  else if (/kwai/i.test(ua)) browser = 'App Kwai';
  else if (/instagram/i.test(ua)) browser = 'App Instagram';
  else if (/fban|fbav|fb_iab/i.test(ua)) browser = 'App Facebook';
  else if (/whatsapp/i.test(ua)) browser = 'App WhatsApp';
  else if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { device, browser: `${os} · ${browser}` };
}

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

/** Envia um evento para uma função RPC do Supabase sem travar a navegação. */
function sendTrackingEvent(rpc: 'register_click' | 'register_page_view', payload: Record<string, unknown>): void {
  if (isLocalhost()) return;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    console.warn('[rastreamento] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados no deploy.');
    return;
  }
  try {
    fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          console.error(`[rastreamento] ${rpc} falhou (HTTP ${response.status})`, detail);
        }
      })
      .catch((err) => console.error(`[rastreamento] ${rpc} erro de rede`, err));
  } catch (err) {
    console.error(`[rastreamento] ${rpc} exceção`, err);
  }
}

export function registerClick(productId: string, source: string, campaign: string | null = null): void {
  const { device, browser } = getDeviceInfo();
  sendTrackingEvent('register_click', {
    p_product_id: productId,
    p_source: source,
    p_visitor_id: getVisitorId(),
    p_device: device,
    p_browser: browser,
    p_referrer: document.referrer || 'Direto',
    p_pathname: window.location.pathname,
    p_campaign: campaign,
  });
}

export function registerPageView(source: string, campaign: string | null = null): void {
  const { device, browser } = getDeviceInfo();
  sendTrackingEvent('register_page_view', {
    p_source: source,
    p_visitor_id: getVisitorId(),
    p_device: device,
    p_browser: browser,
    p_referrer: document.referrer || 'Direto',
    p_pathname: window.location.pathname,
    p_campaign: campaign,
    p_query: window.location.search || null,
  });
}

/**
 * O Supabase devolve no máximo 1000 linhas por requisição (padrão do projeto).
 * Esta função busca em páginas até trazer tudo (com teto de segurança).
 */
async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 50000,
): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

// ---------------------------------------------------------------- Admin: produtos
export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(input).select().single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data, error } = await supabase.from('products').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', product.id);
  if (error) throw error;
  if (product.image_url) await deleteImage(product.image_url);
}

// ---------------------------------------------------------------- Admin: categorias
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(name: string, emoji: string, sortOrder: number): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, emoji: emoji || null, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------- Admin: cliques
export async function fetchClicksBySource(days = 30): Promise<ClickBySource[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const data = await fetchAllPages<{ source: string | null }>((from, to) =>
    supabase.from('product_clicks').select('source').gte('created_at', since).order('id').range(from, to),
  );
  const map = new Map<string, number>();
  data.forEach((row) => {
    const key = row.source || 'direto';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([source, total]) => ({ source, total })).sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------- Storage
export async function uploadImage(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return; // imagem externa, nÃ£o Ã© nossa
  const path = publicUrl.slice(index + marker.length);
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}



export async function fetchFunnelAnalytics(days = 30): Promise<import('../types').FunnelAnalytics[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  
  const [views, clicks] = await Promise.all([
    fetchAllPages<{ source: string | null }>((from, to) =>
      supabase.from('page_views').select('source').gte('created_at', since).order('id').range(from, to),
    ),
    fetchAllPages<{ source: string | null }>((from, to) =>
      supabase.from('product_clicks').select('source').gte('created_at', since).order('id').range(from, to),
    ),
  ]);
  
  const map = new Map<string, { views: number; clicks: number }>();
  
  views.forEach(row => {
    const key = row.source || 'direto';
    if (!map.has(key)) map.set(key, { views: 0, clicks: 0 });
    map.get(key)!.views++;
  });
  
  clicks.forEach(row => {
    const key = row.source || 'direto';
    if (!map.has(key)) map.set(key, { views: 0, clicks: 0 });
    map.get(key)!.clicks++;
  });
  
  return [...map.entries()]
    .map(([source, stats]) => ({ source, views: stats.views, clicks: stats.clicks }))
    .sort((a, b) => b.views - a.views);
}

export async function fetchAnalyticsEvents(days = 30, limit = 5000): Promise<import('../types').AnalyticsEvent[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [views, clicks] = await Promise.all([
    fetchAllPages<any>((from, to) =>
      supabase
        .from('page_views')
        .select('id, source, created_at, visitor_id, device, browser, referrer, pathname, campaign, query')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, to),
      limit,
    ),
    fetchAllPages<any>((from, to) =>
      supabase
        .from('product_clicks')
        .select('id, source, created_at, visitor_id, device, browser, referrer, pathname, campaign, products(title, code)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, to),
      limit,
    ),
  ]);
  
  const events: import('../types').AnalyticsEvent[] = [];
  
  views.forEach((v) => {
    events.push({
      id: 'v_' + v.id,
      type: 'visit',
      source: v.source || 'direto',
      createdAt: v.created_at,
      visitorId: v.visitor_id,
      device: v.device,
      browser: v.browser,
      referrer: v.referrer,
      pathname: v.pathname,
      campaign: v.campaign,
      query: v.query,
    });
  });
  
  clicks.forEach((c) => {
    const product = Array.isArray(c.products) ? c.products[0] : c.products;
    events.push({
      id: 'c_' + c.id,
      type: 'click',
      source: c.source || 'direto',
      createdAt: c.created_at,
      productName: product?.title,
      productCode: product?.code,
      visitorId: c.visitor_id,
      device: c.device,
      browser: c.browser,
      referrer: c.referrer,
      pathname: c.pathname,
      campaign: c.campaign,
    });
  });
  
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}


