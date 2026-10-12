import { useEffect, useRef } from 'react';
import { CreditCard, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { HIGHLIGHT_LABEL, splitPrice } from '../lib/utils';
import { observeProductCard } from '../lib/engagement';

interface Props {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
  onBuy: (product: Product) => void;
}

export function ProductCard({ product, index, onOpen }: Props) {
  const cardRef = useRef<HTMLElement>(null);

  // Mapa de atenção: mede quanto tempo este card ficou visível
  useEffect(() => {
    if (!cardRef.current) return;
    return observeProductCard(cardRef.current, product.code, index);
  }, [product.code, index]);

  const discountPct = product.old_price && product.price && product.old_price > product.price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : null;

  const installmentValue = product.price && product.price > 0
    ? (product.price / 12).toFixed(2).replace('.', ',')
    : null;

  const salesCount = product.sold_label 
    ? product.sold_label 
    : `+${((product.code * 53) % 4500) + 120} Unidades vendidas`;

  const reviewCount = product.rating 
    ? Math.round(product.rating * 7 + (product.code % 40))
    : 33 + (product.code % 50);

  return (
    <article 
      ref={cardRef}
      data-product-code={product.code}
      onClick={() => onOpen(product)}
      className="group relative flex flex-col rounded-2xl bg-white p-2.5 sm:p-3 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden animate-[rise_0.35s_ease-out_both]" 
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {/* ÁREA DA IMAGEM (SEM BORDAS) */}
      <div className="relative aspect-square w-full bg-white overflow-hidden rounded-xl flex items-center justify-center p-2 mb-2">
        {/* SELO DE DESCONTO ÂMBAR/DOURADO */}
        {discountPct ? (
          <span className="absolute top-1.5 left-1.5 z-10 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#f59e0b] text-white shadow-2xs tracking-tight">
            {discountPct}% OFF
          </span>
        ) : product.highlight ? (
          <span className="absolute top-1.5 left-1.5 z-10 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f59e0b] text-white shadow-2xs tracking-tight">
            {HIGHLIGHT_LABEL[product.highlight]}
          </span>
        ) : null}

        {product.image_url ? (
          <img 
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
            src={product.image_url} 
            alt={product.title} 
            loading="lazy" 
            decoding="async" 
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gray-50 text-gray-300">
            <ShoppingBag size={36} strokeWidth={1.2} />
          </div>
        )}
      </div>

      {/* DETALHES DO PRODUTO (FONTE POPPINS, SEM BORDAS E SEM BOTÃO) */}
      <div className="flex flex-col gap-1 flex-1 font-['Poppins']">
        {/* TÍTULO EM POPPINS SEMIBOLD */}
        <h3 className="text-[14.5px] sm:text-[15.5px] font-semibold leading-snug text-[#2d3748] line-clamp-2 min-h-[2.6em] group-hover:text-black transition-colors m-0">
          {product.title}
        </h3>

        {/* PREÇO PRINCIPAL + PREÇO RISCADO */}
        <div className="flex items-baseline flex-wrap gap-2 mt-1">
          {product.price !== null && (
            <span className="text-[20px] sm:text-[22px] font-bold text-[#1a202c] tracking-tight leading-none">
              R$ {splitPrice(product.price).reais},{splitPrice(product.price).cents}
            </span>
          )}
          {product.old_price && (
            <span className="text-[13px] text-gray-400 line-through font-normal">
              R$ {product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* PARCELAMENTO: "ou 12x de R$ XX,XX" COM VALOR EM ROXO */}
        {installmentValue && (
          <div className="flex items-center gap-1.5 text-[12px] text-[#718096] font-normal mt-0.5">
            <CreditCard size={13} className="text-[#718096] shrink-0" />
            <span>ou 12x de</span>
            <strong className="text-[#6b21a8] font-bold text-[12.5px]">R$ {installmentValue}</strong>
          </div>
        )}

        {/* PROVA SOCIAL: UNIDADES VENDIDAS */}
        <div className="text-[12px] text-[#718096] font-normal mt-0.5">
          {salesCount}
        </div>

        {/* ESTRELAS AMARELAS + AVALIAÇÕES */}
        <div className="flex items-center gap-1.5 text-[12px] text-[#718096] font-normal mt-0.5">
          <div className="flex items-center gap-0.5 text-[#fbbf24]">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 24 24" width="13" height="13" className="fill-[#fbbf24] text-[#fbbf24]">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <span>{reviewCount} avaliações</span>
        </div>
      </div>
    </article>
  );
}
