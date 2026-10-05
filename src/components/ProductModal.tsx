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
  mais_vendido: 'bg-[#ff7733]',
  oferta: 'bg-[#3483fa]',
  mais_buscado: 'bg-[#6b4eff]',
  lancamento: 'bg-[#00a650]',
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] animate-[fade-in_0.2s_ease-out] p-0 sm:p-4" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-label={product.title}
    >
      <div 
        className="relative w-full max-w-4xl bg-white sm:rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh] animate-[sheet-up_0.35s_ease-out] sm:animate-[rise_0.3s_ease-out] rounded-t-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="absolute right-3 top-3 z-20 p-2.5 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors border-2 border-white" 
          onClick={onClose} 
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden w-full">
          <div className="w-full sm:w-[45%] bg-white shrink-0 aspect-square sm:aspect-auto sm:border-r border-gray-100 relative">
            {product.image_url ? (
              <img className="w-full h-full object-contain p-6" src={product.image_url} alt={product.title} />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gray-50 text-gray-300">
                <ShoppingBag size={48} strokeWidth={1} />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col p-5 sm:p-8 sm:overflow-y-auto">
          <div className="flex justify-between items-center text-[12px] font-semibold tracking-wide text-gray-400 mb-2">
            <span>Item #{product.code}</span>
            {(product.rating !== null || product.sold_label) && (
              <div className="flex items-center gap-1.5 text-gray-500 font-normal">
                {product.rating !== null && (
                  <>
                    <svg viewBox="0 0 24 24" width="12" height="12" className="text-[#3483fa] fill-[#3483fa]">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span>{product.rating}</span>
                  </>
                )}
                {product.rating !== null && product.sold_label && <span className="text-gray-300">|</span>}
                {product.sold_label && <span>{product.sold_label}</span>}
              </div>
            )}
          </div>

          <h2 className="text-[1.25rem] sm:text-2xl font-normal leading-[1.3] text-gray-900 m-0 mb-3">
            {product.title}
          </h2>

          {product.highlight && (
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[11px] font-bold text-white tracking-wide ${HL_COLORS[product.highlight]}`}>
                {HIGHLIGHT_LABEL[product.highlight]}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1 mt-2">
            {product.old_price && (
              <span className="text-sm text-gray-400 line-through">
                R$ {product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {product.price !== null && (
              <div className="flex items-center flex-wrap gap-2.5">
                <span className="inline-flex items-start text-4xl text-gray-900 leading-none tracking-tight">
                  <span className="text-[18px] mt-1.5 mr-1 text-gray-800">R$</span>
                  {splitPrice(product.price).reais}
                  <span className="text-[18px] mt-1.5 ml-[1px]">{splitPrice(product.price).cents}</span>
                </span>
                {product.old_price && product.old_price > product.price && (
                  <span className="text-[12px] font-bold text-[#00a650] bg-[#00a650]/10 px-1.5 py-0.5 rounded-sm">
                    {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2.5 items-center mt-4">
            <StoreBadge store={product.store} />
            {product.free_shipping && (
              <span className="text-[13px] font-semibold text-[#00a650]">Frete grátis</span>
            )}
          </div>

          {product.description && (
            <p className="text-[15px] leading-relaxed text-gray-600 mt-6 pb-4">
              {product.description}
            </p>
          )}
          
          <div className="mt-auto pt-8">
            <a
              className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-lg font-semibold text-[15px] sm:text-base transition-colors ${
                product.store === 'shopee' 
                  ? 'bg-[#ee4d2d] text-white hover:bg-[#d73f21]' 
                  : 'bg-[#3483fa] text-white hover:bg-[#2968c8]'
              }`}
              href={product.affiliate_url}
              target="_blank" rel="nofollow sponsored noopener"
              onClick={() => onBuy(product)}
            >
              Comprar na {STORE_LABEL[product.store]} <ExternalLink size={18} />
            </a>
            <div className="flex items-center justify-center gap-2 text-[12px] text-gray-500 mt-4 font-medium">
              <ShieldCheck size={16} className="text-gray-400" />
              <span>Compra segura no app ou site oficial. O preço pode variar.</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
