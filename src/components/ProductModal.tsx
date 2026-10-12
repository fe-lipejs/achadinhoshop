import { useEffect } from 'react';
import { ExternalLink, ShoppingBag, ShieldCheck, X } from 'lucide-react';
import type { Product } from '../types';
import { HIGHLIGHT_LABEL, STORE_LABEL, splitPrice } from '../lib/utils';
import { StoreBadge } from './StoreBadge';

interface Props {
  product: Product;
  onClose: () => void;
  onBuy: (product: Product) => void;
}

const HL_COLORS = {
  mais_vendido: 'bg-[#f59e0b] text-white',
  oferta: 'bg-[#5c0bb5] text-white',
  mais_buscado: 'bg-[#8b5cf6] text-white',
  lancamento: 'bg-[#10b981] text-white',
} as const;

export function ProductModal({ product, onClose, onBuy }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const discountPct = product.old_price && product.price && product.old_price > product.price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  const installmentValue = product.price && product.price > 0
    ? (product.price / 12).toFixed(2).replace('.', ',')
    : null;

  const reviewCount = product.rating 
    ? Math.round(product.rating * 14 + (product.code % 30))
    : 38;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] animate-[fade-in_0.2s_ease-out] p-0 sm:p-4" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-label={product.title}
    >
      <div 
        className="relative w-full max-w-4xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[85dvh] sm:h-auto max-h-[90dvh] sm:max-h-[85vh] animate-[sheet-up_0.35s_ease-out] sm:animate-[rise_0.3s_ease-out] rounded-t-2xl border border-gray-100" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="absolute right-3.5 top-3.5 z-20 p-2.5 bg-gray-900 text-white rounded-full shadow-lg hover:bg-[#5c0bb5] transition-colors border-2 border-white" 
          onClick={onClose} 
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden w-full">
          <div className="w-full sm:w-[48%] bg-white shrink-0 aspect-square sm:aspect-auto sm:border-r border-gray-100 relative p-6 flex items-center justify-center">
            {discountPct > 0 && (
              <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-[12px] font-extrabold bg-[#f59e0b] text-white shadow-xs">
                {discountPct}% OFF
              </span>
            )}
            {product.image_url ? (
              <img className="w-full h-full object-contain" src={product.image_url} alt={product.title} />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gray-50 text-gray-300">
                <ShoppingBag size={54} strokeWidth={1} />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col p-5 sm:p-8 sm:overflow-y-auto bg-white">
            <div className="flex justify-between items-center text-[12px] font-semibold tracking-wide text-gray-400 mb-2">
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">Item #{product.code}</span>
              
              {/* ESTRELAS DOURADAS */}
              <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                <div className="flex items-center text-[#f59e0b]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" width="13" height="13" className="fill-[#f59e0b] text-[#f59e0b]">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="font-bold text-gray-700">{product.rating ? product.rating : '4.9'}</span>
                <span className="text-gray-400">({reviewCount} avaliações)</span>
              </div>
            </div>

            <h2 className="text-[1.25rem] sm:text-2xl font-bold leading-[1.3] text-gray-900 m-0 mb-3">
              {product.title}
            </h2>

            {product.highlight && (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight shadow-2xs ${HL_COLORS[product.highlight]}`}>
                  {HIGHLIGHT_LABEL[product.highlight]}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {product.old_price && (
                <span className="text-sm text-gray-400 line-through">
                  R$ {product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
              {product.price !== null && (
                <div className="flex items-center flex-wrap gap-2.5">
                  <span className="inline-flex items-start text-3xl sm:text-4xl font-extrabold text-gray-900 leading-none tracking-tight">
                    <span className="text-[18px] mt-1.5 mr-1 text-gray-800 font-bold">R$</span>
                    {splitPrice(product.price).reais}
                    <span className="text-[18px] mt-1.5 ml-[1px]">{splitPrice(product.price).cents}</span>
                  </span>
                  {discountPct > 0 && (
                    <span className="text-[12px] font-extrabold text-[#f59e0b] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Economize {discountPct}%
                    </span>
                  )}
                </div>
              )}

              {installmentValue && (
                <div className="text-[13px] text-gray-600 font-normal mt-1">
                  ou até <strong>12x de R$ {installmentValue}</strong> nos cartões
                </div>
              )}
            </div>
            
            <div className="flex gap-2.5 items-center mt-4">
              <StoreBadge store={product.store} />
              {product.free_shipping && (
                <span className="text-[12px] font-bold text-[#10b981] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Frete grátis disponível
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-[14.5px] leading-relaxed text-gray-600 mt-5 pb-2">
                {product.description}
              </p>
            )}
            
            <div className="mt-auto pt-6">
              <a
                className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl font-bold text-[15px] sm:text-base transition-all shadow-sm hover:shadow-md ${
                  product.store === 'shopee' 
                    ? 'bg-[#ee4d2d] text-white hover:bg-[#d83f1f]' 
                    : 'bg-[#3483fa] text-white hover:bg-[#256fd8]'
                }`}
                href={product.affiliate_url}
                target="_blank" 
                rel="nofollow sponsored noopener"
                onClick={() => onBuy(product)}
              >
                Comprar com Segurança na {STORE_LABEL[product.store]} <ExternalLink size={18} />
              </a>
              <div className="flex items-center justify-center gap-2 text-[12px] text-gray-500 mt-3 font-medium">
                <ShieldCheck size={16} className="text-[#10b981]" />
                <span>Link direto e oficial para o aplicativo ou site oficial.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
