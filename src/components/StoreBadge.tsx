import type { Store } from '../types';

export function StoreBadge({ store }: { store: Store }) {
  if (store === 'shopee') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden" title="Produto da Shopee">
        <svg viewBox="0 0 32 32" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.8 11.2H9.2l-.7 13.9c-.1 1.3 1 2.5 2.3 2.5h10.4c1.3 0 2.4-1.2 2.3-2.5l-.7-13.9z" fill="#ee4d2d"/>
          <path d="M10.8 11.2v-2c0-2.9 2.3-5.2 5.2-5.2s5.2 2.3 5.2 5.2v2" fill="none" stroke="#ee4d2d" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M18.5 14.5c0-.9-.7-1.6-1.6-1.6h-1.8c-.5 0-.9.4-.9.9 0 .5.4.9.9.9h1.8c1.3 0 2.4.9 2.6 2.1.2 1.3-.7 2.5-2 2.7-.2 0-.4.1-.6.1h-.9v.9c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-.9h-.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7h1.4c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9h-1.8c-1.3 0-2.4-.9-2.6-2.1-.2-1.3.7-2.5 2-2.7.2 0 .4-.1.6-.1h.9v-.9c0-.4.3-.7.7-.7s.7.3.7.7v.9h1.1c.4 0 .7.3.7.7s-.3.7-.7.7h-.9z" fill="#fff"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden" title="Produto do Mercado Livre">
      <svg viewBox="0 0 32 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#ffe600"/>
        <path d="M21.2 13.3c-.6-1-1.6-1.5-2.6-1.4-.4.1-.8.2-1.1.5l-3.3 3c-.4.4-.9.7-1.4.9l-.6.2c-.3 0-.6.1-.8.2-.2.1-.4.2-.5.4l-.6.6c-.3.4-.6.9-.6 1.4v1.8c0 .2.2.4.4.4h3.5c.2 0 .4-.1.5-.2l.6-.6c.1-.1.1-.3.1-.5v-1.1c.4-.2.8-.5 1.1-.9.2-.2.4-.5.5-.8 0-.1.1-.2.2-.2l2.6-2.5c.2-.2.5-.2.8-.2s.5.2.6.4l-3 3.6c-.2.2-.2.6 0 .8.2.2.6.2.8 0l3.9-4.8c.2-.3.1-.8-.1-1z" fill="#2d3277"/>
        <path d="M12.9 14.6l-1.3 1.2c-.2.2-.2.6 0 .8.2.2.6.2.8 0l1.2-1.1c.3-.3.3-.8 0-1-.2-.2-.5-.2-.7.1z" fill="#2d3277"/>
      </svg>
    </div>
  );
}
