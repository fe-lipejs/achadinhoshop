import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ExternalLink,
  ImageOff,
  LogOut,
  MousePointerClick,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { Category, Product } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { STORE_NAME, formatPrice, normalize } from '../lib/utils';
import { deleteProduct, fetchAllProducts, fetchCategories, updateProduct } from '../services/catalog';
import { StoreBadge } from '../components/StoreBadge';
import { ProductForm } from '../components/admin/ProductForm';
import { CategoriesPanel } from '../components/admin/CategoriesPanel';
import { ClicksPanel } from '../components/admin/ClicksPanel';

type Tab = 'products' | 'categories' | 'clicks';

export default function AdminPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentTab = location.pathname.includes('/analytics') ? 'clicks' : 'products';
  const [tab, setTab] = useState<Tab>(currentTab as Tab);
  
  useEffect(() => {
    if (location.pathname.includes('/analytics')) {
      setTab('clicks');
    } else {
      setTab((prev) => (prev === 'clicks' ? 'products' : prev));
    }
  }, [location.pathname]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'clicks') {
      navigate('/admin/analytics');
    } else {
      navigate('/admin');
    }
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined = fechado
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchAllProducts(), fetchCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim().replace(/^#/, ''));
    if (!q) return products;
    return products.filter((p) => String(p.code) === q || normalize(p.title).includes(q));
  }, [products, query]);

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.active).length,
      featured: products.filter((p) => p.featured).length,
      clicks: products.reduce((sum, p) => sum + p.clicks, 0),
    }),
    [products],
  );

  if (authLoading) {
    return (
      <div className="auth-page">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />;

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  function handleSaved(saved: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    notify(editing ? 'Produto atualizado' : 'Produto adicionado');
    setEditing(undefined);
  }

  async function toggle(product: Product, field: 'active' | 'featured') {
    try {
      const saved = await updateProduct(product.id, { [field]: !product[field] });
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar.');
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Excluir "${product.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteProduct(product);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      notify('Produto excluído');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  }

  return (
    <div>
      <header className="admin-header">
        <div className="container">
          <span className="brand">
            <span className="brand-logo">
              <ShoppingBag size={18} color="#fff" />
            </span>
            <span>
              {STORE_NAME} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>/ admin</span>
            </span>
          </span>
          <div className="admin-actions">
            <a className="btn btn-sm btn-ghost" id="admin-view-store" href="/" target="_blank" rel="noopener">
              <ExternalLink size={15} /> <span className="hide-sm">Ver vitrine</span>
            </a>
            <button
              type="button"
              id="admin-logout"
              className="btn btn-sm btn-icon"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        <div className="stats">
          <div className="stat">
            <div className="label">
              <Package size={15} /> Produtos
            </div>
            <div className="value">{stats.total}</div>
          </div>
          <div className="stat" style={{ animationDelay: '60ms' }}>
            <div className="label">
              <Eye size={15} /> Visíveis
            </div>
            <div className="value">{stats.active}</div>
          </div>
          <div className="stat" style={{ animationDelay: '120ms' }}>
            <div className="label">
              <Sparkles size={15} /> Destaques
            </div>
            <div className="value">{stats.featured}</div>
          </div>
          <div className="stat" style={{ animationDelay: '180ms' }}>
            <div className="label">
              <MousePointerClick size={15} /> Cliques
            </div>
            <div className="value gradient-text">{stats.clicks}</div>
          </div>
        </div>

        <div className="tabs" role="tablist">
          <button
            type="button"
            id="tab-products"
            className={`tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => handleTabChange('products')}
          >
            Produtos
          </button>
          <button
            type="button"
            id="tab-categories"
            className={`tab ${tab === 'categories' ? 'active' : ''}`}
            onClick={() => handleTabChange('categories')}
          >
            Categorias
          </button>
          <button
            type="button"
            id="tab-clicks"
            className={`tab ${tab === 'clicks' ? 'active' : ''}`}
            onClick={() => handleTabChange('clicks')}
          >
            Cliques
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {tab === 'products' && (
          <section className="panel">
            <div className="panel-head">
              <h2>Produtos</h2>
              <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end', minWidth: 260 }}>
                <div className="search" style={{ margin: 0, flex: 1, maxWidth: 320 }}>
                  <Search size={16} />
                  <input
                    id="admin-search"
                    type="search"
                    placeholder="Buscar nome ou #nº"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ padding: '10px 14px 10px 42px', fontSize: '0.9rem' }}
                  />
                </div>
                <button type="button" id="admin-new-product" className="btn btn-primary" onClick={() => setEditing(null)}>
                  <Plus size={16} /> Novo
                </button>
              </div>
            </div>

            {loading ? (
              <p className="hint">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <Package size={36} />
                <h3>{products.length === 0 ? 'Nenhum produto ainda' : 'Nada encontrado'}</h3>
                <p>{products.length === 0 ? 'Clique em "Novo" e cole seu primeiro link de afiliado.' : 'Tente outra busca.'}</p>
              </div>
            ) : (
              <div className="admin-list">
                {filtered.map((p) => (
                  <div key={p.id} className={`admin-row ${p.active ? '' : 'inactive'}`}>
                    <div className="thumb">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" loading="lazy" />
                      ) : (
                        <div className="media-placeholder">
                          <ImageOff size={18} />
                        </div>
                      )}
                    </div>
                    <div className="meta">
                      <strong>
                        #{p.code} · {p.title}
                      </strong>
                      <div className="sub">
                        <StoreBadge store={p.store} />
                        {p.price !== null && <span>{formatPrice(p.price)}</span>}
                        {categoryName(p.category_id) && <span>· {categoryName(p.category_id)}</span>}
                        <span>
                          · <MousePointerClick size={12} style={{ verticalAlign: -1 }} /> {p.clicks}
                        </span>
                        {p.featured && <span className="badge badge-featured">Destaque</span>}
                        {!p.active && <span className="badge" style={{ background: 'var(--surface-hover)' }}>Oculto</span>}
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        id={`feature-${p.code}`}
                        className="btn btn-icon"
                        onClick={() => toggle(p, 'featured')}
                        title={p.featured ? 'Remover destaque' : 'Destacar'}
                        aria-label="Alternar destaque"
                      >
                        <Star size={16} fill={p.featured ? 'currentColor' : 'none'} color={p.featured ? 'hsl(45 95% 60%)' : undefined} />
                      </button>
                      <button
                        type="button"
                        id={`visibility-${p.code}`}
                        className="btn btn-icon"
                        onClick={() => toggle(p, 'active')}
                        title={p.active ? 'Ocultar' : 'Mostrar'}
                        aria-label="Alternar visibilidade"
                      >
                        {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        type="button"
                        id={`edit-${p.code}`}
                        className="btn btn-icon"
                        onClick={() => setEditing(p)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        id={`delete-${p.code}`}
                        className="btn btn-icon btn-danger"
                        onClick={() => handleDelete(p)}
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'categories' && (
          <CategoriesPanel categories={categories} products={products} onChange={setCategories} notify={notify} />
        )}

        {tab === 'clicks' && <ClicksPanel notify={notify} />}
      </main>

      {editing !== undefined && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
