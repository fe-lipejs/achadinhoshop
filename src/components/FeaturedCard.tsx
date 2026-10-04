import { ArrowUpRight, ImageOff, Sparkles } from 'lucide-react';
import type { Product } from '../types';
import { discountPercent, formatPrice } from '../lib/utils';
import { StoreBadge } from './StoreBadge';

interface Props {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
}

export function FeaturedCard({ product, index, onOpen }: Props) {
  const off = discountPercent(product.price, product.old_price);

  return (
    <button
      type="button"
      id={`featured-${product.code}`}
      className="featured-card"
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={() => onOpen(product)}
    >
      <div className="thumb">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} loading="lazy" />
        ) : (
          <div className="media-placeholder">
            <ImageOff size={24} />
          </div>
        )}
      </div>
      <div className="info">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-featured">
            <Sparkles size={11} /> Destaque
          </span>
          <StoreBadge store={product.store} />
        </div>
        <h3>{product.title}</h3>
        <div className="price-box">
          {product.old_price && off > 0 && (
            <span className="price-old">
              {formatPrice(product.old_price)} · <strong style={{ color: 'var(--success)' }}>-{off}%</strong>
            </span>
          )}
          {product.price !== null && <span className="price">{formatPrice(product.price)}</span>}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Ver oferta <ArrowUpRight size={14} />
        </span>
      </div>
    </button>
  );
}
