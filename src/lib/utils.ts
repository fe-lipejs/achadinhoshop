import type { Highlight, Store } from '../types';

export const STORE_NAME = (import.meta.env.VITE_STORE_NAME as string) || 'Achadinhos';
export const STORE_TAGLINE =
  (import.meta.env.VITE_STORE_TAGLINE as string) || 'Os produtos dos meus vídeos, num clique.';
export const TIKTOK_URL = (import.meta.env.VITE_TIKTOK_URL as string) || '';
export const KWAI_URL = (import.meta.env.VITE_KWAI_URL as string) || '';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return brl.format(Number(value));
}

/** Separa reais e centavos para exibir "R$ 68⁶⁶" como no Mercado Livre. */
export function splitPrice(value: number): { reais: string; cents: string } {
  const fixed = Number(value).toFixed(2);
  const [int, cents] = fixed.split('.');
  return { reais: Number(int).toLocaleString('pt-BR'), cents };
}

export function discountPercent(price: number | null, oldPrice: number | null): number {
  if (!price || !oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export const STORE_LABEL: Record<Store, string> = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
};

export const HIGHLIGHT_LABEL: Record<Highlight, string> = {
  mais_vendido: 'MAIS VENDIDO',
  oferta: 'OFERTA IMPERDÍVEL',
  mais_buscado: 'MAIS BUSCADO',
  lancamento: 'LANÇAMENTO',
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Lê a origem do tráfego (?src=tiktok, ?utm_source=kwai) e guarda na sessão. */
export function getTrafficSource(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('src') || params.get('utm_source') || params.get('ref');
  if (fromUrl) {
    sessionStorage.setItem('traffic_src', fromUrl.toLowerCase());
    return fromUrl.toLowerCase();
  }
  const stored = sessionStorage.getItem('traffic_src');
  if (stored) return stored;
  const referrer = document.referrer.toLowerCase();
  if (referrer.includes('tiktok')) return 'tiktok';
  if (referrer.includes('kwai')) return 'kwai';
  if (referrer.includes('instagram')) return 'instagram';
  return 'direto';
}
