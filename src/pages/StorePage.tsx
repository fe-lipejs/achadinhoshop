import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, PackageSearch, Search, X, User } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Category, Product, Store } from '../types';
import { fetchPublicCatalog, registerClick, registerPageView } from '../services/catalog';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  STORE_NAME,
  STORE_TAGLINE,
  getTrafficSource,
  normalize,
} from '../lib/utils';

import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';

type StoreFilter = 'all' | Store;

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [source] = useState(() => getTrafficSource());

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    fetchPublicCatalog()
      .then(({ products: loadedProducts, categories: loadedCategories }) => {
        if (!mounted) return;
        setProducts(loadedProducts);
        setCategories(loadedCategories);
        const productCode = new URLSearchParams(window.location.search).get('p');
        if (productCode) {
          const product = loadedProducts.find((item) => String(item.code) === productCode);
          if (product) setSelectedProduct(product);
        }
        
        // Registrar visita 
        const src = new URLSearchParams(window.location.search).get('src') || 'direto';
        registerPageView(src);
      })
      .catch((err: Error) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleBuy = useCallback((product: Product) => registerClick(product.id, source), [source]);
  const handleCloseProduct = useCallback(() => setSelectedProduct(null), []);
  const clearFilters = useCallback(() => { setQuery(''); setCategoryId('all'); setStoreFilter('all'); }, []);

  const usedCategories = useMemo(() => categories.filter((category) => products.some((product) => product.category_id === category.id)), [categories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalize(query.trim().replace(/^#/, ''));
    return products.filter((product) => {
      if (categoryId !== 'all' && product.category_id !== categoryId) return false;
      if (storeFilter !== 'all' && product.store !== storeFilter) return false;
      if (!normalizedQuery) return true;
      if (/^\d+$/.test(normalizedQuery) && String(product.code) === normalizedQuery) return true;
      return normalize(`${product.title} ${product.description || ''}`).includes(normalizedQuery);
    });
  }, [products, query, categoryId, storeFilter]);

  const hasActiveFilters = Boolean(query.trim()) || categoryId !== 'all' || storeFilter !== 'all';
  const activeCategory = usedCategories.find((category) => category.id === categoryId);

  return (
    <div className="min-h-screen bg-white pb-10 font-sans text-black antialiased">
      {/* HEADER PRETO MINIMALISTA */}
      <header className="sticky top-0 z-20 bg-black border-b border-black text-white">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-5">
          <div className="flex items-center justify-between gap-4 h-[80px]">
            <a href="/" className="flex items-center gap-4 font-bold text-[1.4rem] tracking-tight shrink-0 text-white" aria-label={`Ir para ${STORE_NAME}`}>
              {/* Logo maior */}
              <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-200">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span className="hidden sm:block">{STORE_NAME}</span>
            </a>

            {/* Nome da loja centralizado apenas no mobile */}
            <span className="font-bold text-[1.1rem] sm:hidden tracking-tight text-white flex-1 text-center truncate px-2">{STORE_NAME}</span>

            <div className="relative flex-1 max-w-[500px] hidden sm:block mx-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="search-desktop"
                type="search"
                placeholder="Buscar produtos..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar produtos"
                className="w-full py-3 pl-11 pr-10 rounded-full border border-gray-700 bg-[#1a1a1a] text-white text-[15px] outline-none placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-400 rounded-full hover:text-white hover:bg-white/10">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex gap-2 ml-auto shrink-0 items-center">
              {/* BOTÃO LOGIN LOJISTA NO HEADER */}
              <Link to="/admin" className="hidden sm:flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-semibold text-white border border-gray-600 hover:border-white hover:bg-white hover:text-black transition-all" title="Acessar painel do lojista">
                <User size={16} />
                Lojista
              </Link>

              <button
                type="button"
                className="p-2 text-white hover:bg-white/10 rounded-full bg-transparent sm:hidden"
                onClick={() => setMobileMenuOpen((current) => !current)}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col p-5 animate-in slide-in-from-right-full duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <Link to="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-black font-medium transition-colors border border-gray-200">
                <User size={18} />
                Acessar Lojista
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-black mb-4">
        <img 
          src="/banner.png" 
          alt="Banner de Destaque" 
          className="w-full h-auto block"
        />
      </div>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-5">
        {/* BUSCA MOBILE NA ÁREA DOS PRODUTOS */}
        <div className="sm:hidden mb-6">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="search-mobile"
              type="search"
              placeholder="Buscar produtos..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full py-2.5 pl-9 pr-9 rounded-full border border-gray-300 bg-gray-50 text-[15px] outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-400 rounded-full hover:bg-gray-200">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {!hasActiveFilters && (
          <section className="py-12 pb-8 text-center sm:text-left hidden sm:block">
            <div className="flex flex-col gap-3">
              <span className="text-[12px] font-semibold tracking-widest text-gray-500 uppercase">Destaques da semana</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight m-0 text-black leading-tight">
                {STORE_TAGLINE}
              </h1>
              <p className="text-gray-500 text-[16px] sm:text-[18px] mt-2 max-w-3xl sm:mx-0 mx-auto font-normal leading-relaxed">
                Encontre aqui as novidades e promoções com links seguros e diretos.
              </p>
            </div>
          </section>
        )}

        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4 text-yellow-800">
            <h3 className="font-bold mb-2">Catálogo ainda não conectado</h3>
            <p className="text-sm">Abra o arquivo <code>.env</code> e configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.</p>
          </div>
        )}

        {/* C&A STYLE FILTERS (CHIPS) */}
        <div className="flex flex-col items-center sm:items-start mt-8 mb-4">
          <span className="text-[13px] text-gray-500 mb-3">Deseja filtrar por categoria:</span>
          <div className="flex gap-3 overflow-x-auto pb-2 w-full sm:w-auto [&::-webkit-scrollbar]:hidden justify-start">
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[90px] px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold ${categoryId === 'all' && storeFilter === 'all' ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'}`}
              onClick={() => { setCategoryId('all'); setStoreFilter('all'); }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[90px] px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold ${storeFilter === 'shopee' ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'}`}
              onClick={() => setStoreFilter(storeFilter === 'shopee' ? 'all' : 'shopee')}
            >
              Shopee
            </button>
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[90px] px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold ${storeFilter === 'mercadolivre' ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'}`}
              onClick={() => setStoreFilter(storeFilter === 'mercadolivre' ? 'all' : 'mercadolivre')}
            >
              Mercado Livre
            </button>

            {usedCategories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`shrink-0 inline-flex items-center justify-center min-w-[90px] px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold ${categoryId === category.id ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'}`}
                onClick={() => setCategoryId(categoryId === category.id ? 'all' : category.id)}
              >
                {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                {category.name}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button type="button" className="text-[13px] font-medium text-gray-500 underline mt-3 hover:text-black" onClick={clearFilters}>
              Limpar filtros de busca
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg my-4">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {loading ? (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 mt-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col rounded-lg bg-white border border-gray-100 overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-11/12 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mt-2 animate-pulse" />
                  <div className="h-7 bg-gray-200 rounded w-5/12 mt-4 animate-pulse" />
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="mt-10">
            <h2 className="text-[1.35rem] font-bold tracking-tight text-black pb-4 border-b border-gray-200 mb-6 flex items-center gap-2">
              {query ? 'Produtos encontrados' : activeCategory ? activeCategory.name : 'Mais recentes'}
              <span className="text-[15px] text-gray-400 font-normal">({filteredProducts.length})</span>
            </h2>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} onOpen={setSelectedProduct} onBuy={handleBuy} />
                ))}
              </div>
            ) : (
              isSupabaseConfigured && (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-100 rounded-xl mt-4">
                  <PackageSearch size={48} strokeWidth={1.2} className="text-gray-300" />
                  <h3 className="text-lg font-semibold mt-4 text-black">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 mt-1 mb-6">Tente buscar por outro nome ou remover os filtros.</p>
                  <button type="button" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-[15px] bg-black text-white hover:bg-gray-800 transition-colors" onClick={clearFilters}>
                    Ver todos os produtos
                  </button>
                </div>
              )
            )}
          </section>
        )}

        <footer className="mt-16 py-10 border-t border-gray-200 text-center flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-black font-bold">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-black text-white flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            {STORE_NAME}
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-md">
            © {new Date().getFullYear()} {STORE_NAME}.<br />
            Todos os produtos foram selecionados a dedo com os melhores preços, vendedores confiáveis e menor prazo de entrega garantido.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link to="/admin" className="text-[13px] font-semibold text-gray-400 hover:text-black flex items-center gap-1">
              <User size={14} /> Admin
            </Link>
          </div>
        </footer>
      </main>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={handleCloseProduct} onBuy={handleBuy} />}
    </div>
  );
}
