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

function getVisitorId() {
  let vid = localStorage.getItem('visitor_id');
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem('visitor_id', vid);
  }
  return vid;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  if (/tablet/i.test(ua)) device = 'Tablet';
  
  let browser = 'Outro';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  
  let os = 'Outro';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('like Mac')) os = 'iOS';
  
  return {
    device,
    browser: `${os} · ${browser}`
  };
}

export function registerClick(productId: string, source: string): void {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const { device, browser } = getDeviceInfo();
    void fetch(url + '/rest/v1/rpc/register_click', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({ 
        p_product_id: productId, 
        p_source: source,
        p_visitor_id: getVisitorId(),
        p_device: device,
        p_browser: browser,
        p_referrer: document.referrer || 'Direto',
        p_pathname: window.location.pathname
      }),
    }).catch(() => undefined);
  } catch {}
}

export function registerPageView(source: string): void {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const { device, browser } = getDeviceInfo();
    void fetch(url + '/rest/v1/rpc/register_page_view', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({ 
        p_source: source,
        p_visitor_id: getVisitorId(),
        p_device: device,
        p_browser: browser,
        p_referrer: document.referrer || 'Direto',
        p_pathname: window.location.pathname
      }),
    }).catch(() => undefined);
  } catch {}
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
  const { data, error } = await supabase
    .from('product_clicks')
    .select('source')
    .gte('created_at', since)
    .limit(10000);
  if (error) throw error;
  const map = new Map<string, number>();
  (data as { source: string | null }[]).forEach((row) => {
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
  
  const [viewsRes, clicksRes] = await Promise.all([
    supabase.from('page_views').select('source').gte('created_at', since).limit(10000),
    supabase.from('product_clicks').select('source').gte('created_at', since).limit(10000)
  ]);
  
  if (viewsRes.error) throw viewsRes.error;
  if (clicksRes.error) throw clicksRes.error;
  
  const map = new Map<string, { views: number; clicks: number }>();
  
  ;(viewsRes.data as { source: string | null }[]).forEach(row => {
    const key = row.source || 'direto';
    if (!map.has(key)) map.set(key, { views: 0, clicks: 0 });
    map.get(key)!.views++;
  });
  
  ;(clicksRes.data as { source: string | null }[]).forEach(row => {
    const key = row.source || 'direto';
    if (!map.has(key)) map.set(key, { views: 0, clicks: 0 });
    map.get(key)!.clicks++;
  });
  
  return [...map.entries()]
    .map(([source, stats]) => ({ source, views: stats.views, clicks: stats.clicks }))
    .sort((a, b) => b.views - a.views);
}

export async function fetchAnalyticsEvents(limit = 100): Promise<import('../types').AnalyticsEvent[]> {
  const [viewsRes, clicksRes] = await Promise.all([
    supabase.from('page_views').select('id, source, created_at, visitor_id, device, browser, referrer, pathname').order('created_at', { ascending: false }).limit(limit),
    supabase.from('product_clicks').select('id, source, created_at, visitor_id, device, browser, referrer, pathname, products(title, code)').order('created_at', { ascending: false }).limit(limit)
  ]);
  
  const events: import('../types').AnalyticsEvent[] = [];
  
  if (viewsRes.data) {
    viewsRes.data.forEach(v => {
      events.push({
        id: 'v_' + v.id,
        type: 'visit',
        source: v.source || 'direto',
        createdAt: v.created_at,
        visitorId: v.visitor_id,
        device: v.device,
        browser: v.browser,
        referrer: v.referrer,
        pathname: v.pathname
      });
    });
  }
  
  if (clicksRes.data) {
    clicksRes.data.forEach((c: any) => {
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
        pathname: c.pathname
      });
    });
  }
  
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}


