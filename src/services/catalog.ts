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

export function registerClick(productId: string, source: string): void {
  // fire-and-forget com keepalive: a requisição continua mesmo quando a página
  // navega para a Shopee / Mercado Livre, sem atrasar o redirecionamento.
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    void fetch(`${url}/rest/v1/rpc/register_click`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_product_id: productId, p_source: source }),
    }).catch(() => undefined);
  } catch {
    // nunca bloquear a compra por causa da métrica
  }
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
  if (index === -1) return; // imagem externa, não é nossa
  const path = publicUrl.slice(index + marker.length);
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
