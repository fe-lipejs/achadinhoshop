import type { Store } from '../types';

export function StoreBadge({ store }: { store: Store }) {
  if (store === 'shopee') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden" title="Produto da Shopee">
        <img src="/logo-shopee.png" alt="Shopee" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden" title="Produto do Mercado Livre">
      <img src="/logo-mercado.png" alt="Mercado Livre" className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
}
