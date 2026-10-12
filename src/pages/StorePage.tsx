import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Menu, 
  PackageSearch, 
  Search, 
  X, 
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Category, Product, Store } from '../types';
import { fetchPublicCatalog, registerClick, registerPageView } from '../services/catalog';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  markCatalogLoaded,
  setProductModalOpen,
  startEngagement,
  trackBuyClick,
  trackFilter,
  trackProductOpen,
  trackSearch,
} from '../lib/engagement';
import {
  STORE_NAME,
  STORE_TAGLINE,
  getTrafficCampaign,
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
  const [campaign] = useState(() => getTrafficCampaign());
  const pageViewSent = useRef(false);

  // Registrar a visita IMEDIATAMENTE (não espera o catálogo carregar)
  useEffect(() => {
    if (pageViewSent.current) return;
    pageViewSent.current = true;
    registerPageView(source, campaign);
  }, [source, campaign]);

  // Mapa de atenção: tempo por seção, rolagem e ponto de saída
  useEffect(() => startEngagement(source, campaign), [source, campaign]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      markCatalogLoaded(0);
      return;
    }
    let mounted = true;
    fetchPublicCatalog()
      .then(({ products: loadedProducts, categories: loadedCategories }) => {
        if (!mounted) return;
        setProducts(loadedProducts);
        setCategories(loadedCategories);
        markCatalogLoaded(loadedProducts.length);
        const productCode = new URLSearchParams(window.location.search).get('p');
        if (productCode) {
          const product = loadedProducts.find((item) => String(item.code) === productCode);
          if (product) setSelectedProduct(product);
        }
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
        markCatalogLoaded(0);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Produto aberto (modal) conta como seção própria
  useEffect(() => {
    setProductModalOpen(Boolean(selectedProduct));
    if (selectedProduct) trackProductOpen();
  }, [selectedProduct]);

  // Busca: conta quando a pessoa para de digitar por 1s
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(trackSearch, 1000);
    return () => clearTimeout(timer);
  }, [query]);

  // Filtros (categoria / loja)
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    trackFilter();
  }, [categoryId, storeFilter]);

  const handleBuy = useCallback((product: Product) => {
    registerClick(product.id, source, campaign);
    trackBuyClick();
  }, [source, campaign]);
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
    <div className="min-h-screen bg-[#f8f9fa] pb-10 font-['Poppins'] text-gray-900 antialiased">
      {/* HEADER PRETO MINIMALISTA ORIGINAL */}
      <header className="sticky top-0 z-30 bg-black border-b border-black text-white">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-5">
          <div className="flex items-center justify-between gap-4 h-[76px] sm:h-[80px]">
            {/* LOGO */}
            <a href="/" className="flex items-center gap-3 font-bold text-[1.35rem] sm:text-[1.4rem] tracking-tight shrink-0 text-white" aria-label={`Ir para ${STORE_NAME}`}>
              <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-200 shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span className="hidden sm:block">{STORE_NAME}</span>
            </a>

            {/* NOME DA LOJA NO MOBILE */}
            <span className="font-bold text-[1.1rem] sm:hidden tracking-tight text-white flex-1 text-center truncate px-2">
              {STORE_NAME}
            </span>

            {/* CAMPO DE BUSCA DESKTOP */}
            <div className="relative flex-1 max-w-[500px] hidden sm:block mx-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="search-desktop"
                type="search"
                placeholder="Buscar produtos..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar produtos"
                className="w-full py-2.5 pl-11 pr-10 rounded-full border border-gray-700 bg-[#1a1a1a] text-white text-[14.5px] outline-none placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
              {query && (
                <button 
                  type="button" 
                  onClick={() => setQuery('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-400 rounded-full hover:text-white hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex gap-2 ml-auto shrink-0 items-center">
              {/* BOTÃO LOGIN LOJISTA */}
              <Link 
                to="/admin" 
                className="hidden sm:flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13.5px] font-semibold text-white border border-gray-600 hover:border-white hover:bg-white hover:text-black transition-all" 
                title="Acessar painel do lojista"
              >
                <User size={16} />
                Lojista
              </Link>

              <button
                type="button"
                className="p-2 text-white hover:bg-white/10 rounded-full bg-transparent sm:hidden"
                onClick={() => setMobileMenuOpen((current) => !current)}
                aria-label="Abrir Menu"
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
            <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-100">
              <span className="font-bold text-lg text-gray-900">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <Link 
                to="/admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-900 font-medium transition-colors border border-gray-200"
              >
                <User size={18} />
                Acessar Lojista
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* BANNER PRINCIPAL COM FUNDO PRETO */}
      <div className="w-full bg-black mb-4" data-track-section="topo">
        <img 
          src="/banner.png" 
          alt="Banner de Destaque" 
          className="w-full h-auto block"
        />
      </div>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-5">
        {/* BUSCA MOBILE NA ÁREA DOS PRODUTOS */}
        <div className="sm:hidden mb-6" data-track-section="filtros">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="search-mobile"
              type="search"
              placeholder="Buscar produtos..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full py-2.5 pl-9 pr-9 rounded-full border border-gray-300 bg-white text-[14.5px] outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
            {query && (
              <button 
                type="button" 
                onClick={() => setQuery('')} 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-400 rounded-full hover:bg-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {!hasActiveFilters && (
          <section className="py-8 pb-6 text-center sm:text-left hidden sm:block" data-track-section="topo">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold tracking-widest text-gray-400 uppercase">Destaques da semana</span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight m-0 text-gray-900 leading-tight">
                {STORE_TAGLINE}
              </h1>
              <p className="text-gray-500 text-[15px] sm:text-[16px] mt-1 max-w-3xl sm:mx-0 mx-auto font-normal leading-relaxed">
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

        {/* CHIPS DE FILTRO DE CATEGORIAS */}
        <div className="flex flex-col items-center sm:items-start mt-4 mb-6" data-track-section="filtros">
          <span className="text-[13px] text-gray-500 mb-3">Deseja filtrar por categoria:</span>
          <div className="flex gap-2.5 overflow-x-auto pb-2 w-full sm:w-auto [&::-webkit-scrollbar]:hidden justify-start">
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[85px] px-4.5 py-2.5 rounded-full border transition-all text-[13.5px] font-semibold ${
                categoryId === 'all' && storeFilter === 'all' 
                  ? 'border-black bg-black text-white' 
                  : 'border-gray-300 bg-white text-black hover:border-black'
              }`}
              onClick={() => { setCategoryId('all'); setStoreFilter('all'); }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[85px] px-4.5 py-2.5 rounded-full border transition-all text-[13.5px] font-semibold ${
                storeFilter === 'shopee' 
                  ? 'border-black bg-black text-white' 
                  : 'border-gray-300 bg-white text-black hover:border-black'
              }`}
              onClick={() => setStoreFilter(storeFilter === 'shopee' ? 'all' : 'shopee')}
            >
              Shopee
            </button>
            <button
              type="button"
              className={`shrink-0 inline-flex items-center justify-center min-w-[85px] px-4.5 py-2.5 rounded-full border transition-all text-[13.5px] font-semibold ${
                storeFilter === 'mercadolivre' 
                  ? 'border-black bg-black text-white' 
                  : 'border-gray-300 bg-white text-black hover:border-black'
              }`}
              onClick={() => setStoreFilter(storeFilter === 'mercadolivre' ? 'all' : 'mercadolivre')}
            >
              Mercado Livre
            </button>

            {usedCategories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`shrink-0 inline-flex items-center justify-center min-w-[85px] px-4.5 py-2.5 rounded-full border transition-all text-[13.5px] font-semibold ${
                  categoryId === category.id 
                    ? 'border-black bg-black text-white' 
                    : 'border-gray-300 bg-white text-black hover:border-black'
                }`}
                onClick={() => setCategoryId(categoryId === category.id ? 'all' : category.id)}
              >
                {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                {category.name}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button 
              type="button" 
              className="text-[12.5px] font-medium text-gray-500 underline mt-2 hover:text-black" 
              onClick={clearFilters}
            >
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
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 mt-6" data-track-section="produtos">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col rounded-2xl bg-white shadow-2xs overflow-hidden p-3">
                <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                <div className="p-1 mt-2">
                  <div className="h-4 bg-gray-200 rounded w-11/12 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mt-2 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-5/12 mt-3 animate-pulse" />
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="mt-8" data-track-section="produtos">
            <h2 className="text-[1.35rem] sm:text-[1.45rem] font-bold tracking-tight text-black pb-3 border-b border-gray-200 mb-6 flex items-center justify-between">
              <span>{query ? 'Produtos encontrados' : activeCategory ? activeCategory.name : 'Mais recentes'}</span>
              <span className="text-[14px] text-gray-400 font-normal">({filteredProducts.length})</span>
            </h2>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {filteredProducts.map((product, index) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    index={index} 
                    onOpen={setSelectedProduct} 
                    onBuy={handleBuy} 
                  />
                ))}
              </div>
            ) : (
              isSupabaseConfigured && (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-200 rounded-2xl bg-white mt-4">
                  <PackageSearch size={48} strokeWidth={1.2} className="text-gray-300" />
                  <h3 className="text-lg font-bold mt-4 text-black">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 mt-1 mb-6 text-sm">Tente buscar por outro nome ou remover os filtros.</p>
                  <button 
                    type="button" 
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-[14px] bg-black text-white hover:bg-gray-800 transition-colors" 
                    onClick={clearFilters}
                  >
                    Ver todos os produtos
                  </button>
                </div>
              )
            )}
          </section>
        )}

        <footer className="mt-20 py-10 border-t border-gray-200 text-center flex flex-col items-center gap-4" data-track-section="rodape">
          <div className="flex items-center gap-2 text-black font-bold text-[1.1rem]">
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
          <div className="flex items-center gap-4 mt-1">
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
