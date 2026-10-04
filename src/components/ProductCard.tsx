import { ExternalLink, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { HIGHLIGHT_LABEL, STORE_LABEL, splitPrice } from '../lib/utils';
import { StoreBadge } from './StoreBadge';

interface Props {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
  onBuy: (product: Product) => void;
}

const HL_COLORS = {
  mais_vendido: 'bg-[#ff7733]',
  oferta: 'bg-[#3483fa]',
  mais_buscado: 'bg-[#6b4eff]',
  lancamento: 'bg-[#00a650]',
} as const;

export function ProductCard({ product, index, onOpen, onBuy }: Props) {
  return (
    <article 
      className="relative flex flex-col rounded-lg bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow animate-[rise_0.35s_ease-out_both]" 
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div
        className="relative aspect-square bg-white overflow-hidden cursor-pointer border-b border-gray-100"
        role="button"
        tabIndex={0}
        aria-label={`Ver detalhes de ${product.title}`}
        onClick={() => onOpen(product)}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
      >
        {product.image_url ? (
          <img className="w-full h-full object-contain p-1.5" src={product.image_url} alt={product.title} loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gray-50 text-gray-400">
            <ShoppingBag size={24} />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StoreBadge store={product.store} />
        </div>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-white/90 text-gray-500 border border-gray-200">
          #{product.code}
        </span>
      </div>

      <div className="flex flex-col gap-1 p-2.5 sm:p-3 flex-1">
        {product.highlight && (
          <span className={`self-start inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold text-white tracking-wide ${HL_COLORS[product.highlight]}`}>
            {HIGHLIGHT_LABEL[product.highlight]}
          </span>
        )}

        <h3 className="text-[13.5px] sm:text-sm font-normal leading-[1.3] text-gray-900 line-clamp-2 min-h-[2.6em] cursor-pointer" onClick={() => onOpen(product)}>
          {product.title}
        </h3>

        {(product.rating !== null || product.sold_label) && (
          <div className="flex items-center gap-1 text-[12px] text-gray-500 mt-0.5">
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

        <div className="flex flex-col gap-[1px] mt-1.5">
          {product.old_price && (
            <span className="text-[12px] text-gray-400 line-through">
              R$ {product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {product.price !== null && (
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="inline-flex items-start text-[22px] text-gray-900 leading-none tracking-tight">
                <span className="text-[12px] mt-1 mr-0.5">R$</span>
                {splitPrice(product.price).reais}
                <span className="text-[12px] mt-1">{splitPrice(product.price).cents}</span>
              </span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-[11px] font-bold text-[#00a650] bg-[#00a650]/10 px-1 py-0.5 rounded-sm">
                  {Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF
                </span>
              )}
            </div>
          )}
        </div>

        {product.free_shipping && <div className="text-[12px] font-semibold text-[#00a650] mt-1">Frete grátis</div>}

        <div className="mt-auto pt-2.5">
          <a
            id={`buy-${product.code}`}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-md font-semibold text-[13px] transition-colors ${
              product.store === 'shopee' 
                ? 'bg-[#ee4d2d]/10 text-[#ee4d2d] hover:bg-[#ee4d2d]/20' 
                : 'bg-[#3483fa]/15 text-[#3483fa] hover:bg-[#3483fa]/25'
            }`}
            href={product.affiliate_url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            onClick={() => onBuy(product)}
          >
            Ver na {STORE_LABEL[product.store]} <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
