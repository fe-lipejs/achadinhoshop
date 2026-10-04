import type { Store } from '../types';

export function StoreBadge({ store }: { store: Store }) {
  if (store === 'shopee') {
    return (
      <div className="flex items-center justify-center h-8 sm:h-10 bg-white shadow-sm border border-gray-100 rounded-md px-2 overflow-hidden" title="Produto da Shopee">
        <img src="/logo-shopee.png" alt="Shopee" className="h-full w-auto object-contain p-1" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-8 sm:h-10 bg-white shadow-sm border border-gray-100 rounded-md px-2 overflow-hidden" title="Produto do Mercado Livre">
      <img src="/logo-mercado.png" alt="Mercado Livre" className="h-full w-auto object-contain p-1" loading="lazy" />
    </div>
  );
}
