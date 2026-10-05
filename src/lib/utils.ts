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

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* navegador interno/privado pode bloquear storage */
  }
}

/** Detecta a origem pelo referrer ou pelo navegador interno do app (TikTok, Instagram...). */
function detectSourceFromEnvironment(): string | null {
  const referrer = (document.referrer || '').toLowerCase();
  const ua = (navigator.userAgent || '').toLowerCase();

  if (referrer.includes('tiktok') || ua.includes('musical_ly') || ua.includes('bytedancewebview') || ua.includes('trill')) return 'tiktok';
  if (referrer.includes('kwai') || ua.includes('kwai')) return 'kwai';
  if (referrer.includes('instagram') || ua.includes('instagram')) return 'instagram';
  if (referrer.includes('facebook') || referrer.includes('fb.com') || ua.includes('fban') || ua.includes('fbav')) return 'facebook';
  if (referrer.includes('youtube') || referrer.includes('youtu.be')) return 'youtube';
  if (referrer.includes('whatsapp') || ua.includes('whatsapp')) return 'whatsapp';
  if (referrer.includes('t.co') || referrer.includes('twitter') || referrer.includes('x.com')) return 'twitter';
  if (referrer.includes('pinterest')) return 'pinterest';
  if (referrer.includes('google.')) return 'google';
  if (referrer.includes('bing.')) return 'bing';
  return null;
}

/**
 * Lê a origem do tráfego e guarda na sessão.
 * Ordem: ?src / ?utm_source / ?ref  →  IDs de clique de anúncio  →  referrer/app  →  'direto'.
 */
export function getTrafficSource(): string {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('src') || params.get('utm_source') || params.get('ref');

  let detected: string | null = explicit ? explicit.toLowerCase() : null;

  if (!detected) {
    if (params.has('ttclid')) detected = 'tiktok_ads';
    else if (params.has('fbclid')) detected = detectSourceFromEnvironment() === 'instagram' ? 'instagram_ads' : 'facebook_ads';
    else if (params.has('gclid') || params.has('gbraid') || params.has('wbraid')) detected = 'google_ads';
    else if (params.has('kwai_click_id')) detected = 'kwai_ads';
  }

  if (detected) {
    safeSessionSet('traffic_src', detected);
    return detected;
  }

  const stored = safeSessionGet('traffic_src');
  if (stored) return stored;

  const fromEnv = detectSourceFromEnvironment() || 'direto';
  safeSessionSet('traffic_src', fromEnv);
  return fromEnv;
}

/** Nome da campanha (?utm_campaign ou ?campaign), guardado na sessão. */
export function getTrafficCampaign(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('utm_campaign') || params.get('campaign');
  if (fromUrl) {
    safeSessionSet('traffic_campaign', fromUrl);
    return fromUrl;
  }
  return safeSessionGet('traffic_campaign');
}
