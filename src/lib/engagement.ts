/**
 * Mapa de atenção da vitrine.
 *
 * Mede, para cada abertura da página:
 *  - tempo ATIVO (só conta com a aba visível)
 *  - em qual seção a pessoa está (topo, filtros, produtos, rodapé, produto aberto)
 *  - até onde rolou e até qual posição de produto chegou
 *  - quanto tempo cada produto ficou na tela
 *  - onde estava quando saiu
 *
 * Os dados ficam acumulados em memória e são enviados (upsert) para o Supabase
 * aos 3s, depois a cada 10s, e quando a pessoa troca de aba / fecha a página.
 */
import type { EngagementSection } from '../types';
import { generateId, getDeviceInfo, getVisitorId, sendTrackingEvent } from '../services/catalog';

const TICK_MS = 500;
const FIRST_FLUSH_MS = 3000;
const FLUSH_EVERY_MS = 10000;
const SEEN_THRESHOLD_MS = 800; // card precisa ficar 0,8s na tela para contar como "visto"
const MAX_DWELL_KEYS = 80;

interface CardInfo {
  code: number;
  index: number;
}

interface EngagementState {
  sessionId: string;
  source: string;
  campaign: string | null;
  startedAt: number;
  lastTick: number;
  activeMs: number;
  maxScrollPct: number;
  catalogLoadMs: number | null;
  productsTotal: number;
  maxProductIndex: number;
  seenCodes: Set<number>;
  productOpens: number;
  buyClicks: number;
  searches: number;
  filters: number;
  sectionMs: Record<string, number>;
  productDwell: Map<number, number>;
  cards: Map<Element, CardInfo>;
  visibleCards: Set<Element>;
  currentSection: EngagementSection;
  modalOpen: boolean;
  dirty: boolean;
}

let state: EngagementState | null = null;
let observer: IntersectionObserver | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let firstFlushTimer: ReturnType<typeof setTimeout> | null = null;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function detectSection(s: EngagementState): EngagementSection {
  if (s.modalOpen) return 'produto_aberto';
  if (s.catalogLoadMs === null) return 'carregando';
  const probeY = window.innerHeight * 0.5;
  const elements = document.querySelectorAll<HTMLElement>('[data-track-section]');
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.top <= probeY && rect.bottom >= probeY) {
      return (el.dataset.trackSection as EngagementSection) || s.currentSection;
    }
  }
  // meio da tela caiu num espaço entre seções: mantém a última conhecida
  return s.currentSection === 'carregando' ? 'topo' : s.currentSection;
}

function updateScroll(s: EngagementState): void {
  if (s.catalogLoadMs === null) return; // antes de carregar, a página é curta e daria 100% falso
  const doc = document.documentElement;
  const total = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
  if (total <= 0) return;
  const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
  if (pct > s.maxScrollPct) {
    s.maxScrollPct = pct;
    s.dirty = true;
  }
}

function tick(): void {
  const s = state;
  if (!s) return;
  const t = now();
  const dt = Math.min(t - s.lastTick, 1000); // evita saltos quando o celular "dorme"
  s.lastTick = t;
  if (document.visibilityState !== 'visible' || dt <= 0) return;

  s.activeMs += dt;
  const section = detectSection(s);
  s.currentSection = section;
  s.sectionMs[section] = (s.sectionMs[section] || 0) + dt;

  if (!s.modalOpen) {
    s.visibleCards.forEach((el) => {
      const info = s.cards.get(el);
      if (!info) return;
      const dwell = (s.productDwell.get(info.code) || 0) + dt;
      s.productDwell.set(info.code, dwell);
      if (dwell >= SEEN_THRESHOLD_MS && !s.seenCodes.has(info.code)) {
        s.seenCodes.add(info.code);
        s.maxProductIndex = Math.max(s.maxProductIndex, info.index + 1);
      }
    });
  }
  updateScroll(s);
  s.dirty = true;
}

function buildDwellPayload(s: EngagementState): Record<string, number> {
  const entries = [...s.productDwell.entries()]
    .filter(([, ms]) => ms >= 300)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DWELL_KEYS);
  const result: Record<string, number> = {};
  entries.forEach(([code, ms]) => {
    result[String(code)] = Math.round(ms);
  });
  return result;
}

function flush(): void {
  const s = state;
  if (!s) return;
  s.dirty = false;
  const { device, browser } = getDeviceInfo();
  const sectionMs: Record<string, number> = {};
  Object.entries(s.sectionMs).forEach(([key, ms]) => {
    sectionMs[key] = Math.round(ms);
  });

  sendTrackingEvent('upsert_page_session', {
    p_session_id: s.sessionId,
    p_visitor_id: getVisitorId(),
    p_source: s.source,
    p_campaign: s.campaign,
    p_device: device,
    p_browser: browser,
    p_pathname: window.location.pathname,
    p_viewport_h: window.innerHeight,
    p_duration_ms: Math.round(s.activeMs),
    p_max_scroll_pct: s.maxScrollPct,
    p_catalog_load_ms: s.catalogLoadMs === null ? null : Math.round(s.catalogLoadMs),
    p_products_total: s.productsTotal,
    p_products_seen: s.seenCodes.size,
    p_max_product_index: s.maxProductIndex,
    p_product_opens: s.productOpens,
    p_buy_clicks: s.buyClicks,
    p_searches: s.searches,
    p_filters: s.filters,
    p_exit_section: detectSection(s),
    p_section_ms: sectionMs,
    p_product_dwell: buildDwellPayload(s),
  });
}

function onVisibilityChange(): void {
  if (!state) return;
  if (document.visibilityState === 'hidden') {
    tick();
    flush();
  } else {
    state.lastTick = now();
  }
}

function onPageHide(): void {
  if (!state) return;
  tick();
  flush();
}

function onScroll(): void {
  if (state) updateScroll(state);
}

function handleIntersections(entries: IntersectionObserverEntry[]): void {
  const s = state;
  if (!s) return;
  entries.forEach((entry) => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) s.visibleCards.add(entry.target);
    else s.visibleCards.delete(entry.target);
  });
}

/** Inicia o rastreamento. Retorna a função para parar (usar no cleanup do useEffect). */
export function startEngagement(source: string, campaign: string | null): () => void {
  if (state) return stopEngagement;
  const t = now();
  state = {
    sessionId: generateId(),
    source,
    campaign,
    startedAt: t,
    lastTick: t,
    activeMs: 0,
    maxScrollPct: 0,
    catalogLoadMs: null,
    productsTotal: 0,
    maxProductIndex: 0,
    seenCodes: new Set(),
    productOpens: 0,
    buyClicks: 0,
    searches: 0,
    filters: 0,
    sectionMs: {},
    productDwell: new Map(),
    cards: new Map(),
    visibleCards: new Set(),
    currentSection: 'carregando',
    modalOpen: false,
    dirty: true,
  };

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(handleIntersections, { threshold: [0, 0.6] });
  }

  tickTimer = setInterval(tick, TICK_MS);
  firstFlushTimer = setTimeout(flush, FIRST_FLUSH_MS);
  flushTimer = setInterval(() => {
    if (state?.dirty) flush();
  }, FLUSH_EVERY_MS);

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('scroll', onScroll, { passive: true });

  return stopEngagement;
}

export function stopEngagement(): void {
  if (!state) return;
  tick();
  // só envia se a pessoa realmente ficou na página (evita sessões vazias do StrictMode)
  if (state.activeMs >= 1000) flush();
  if (tickTimer) clearInterval(tickTimer);
  if (flushTimer) clearInterval(flushTimer);
  if (firstFlushTimer) clearTimeout(firstFlushTimer);
  tickTimer = null;
  flushTimer = null;
  firstFlushTimer = null;
  observer?.disconnect();
  observer = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('scroll', onScroll);
  state = null;
}

/** Chamar quando a lista de produtos terminar de carregar. */
export function markCatalogLoaded(productsTotal: number): void {
  const s = state;
  if (!s || s.catalogLoadMs !== null) return;
  s.catalogLoadMs = now() - s.startedAt;
  s.productsTotal = productsTotal;
  s.dirty = true;
  requestAnimationFrame(() => {
    if (state) updateScroll(state);
  });
}

/** Observa um card de produto. Retorna a função para parar de observar. */
export function observeProductCard(el: Element, code: number, index: number): () => void {
  const s = state;
  if (!s || !observer) return () => undefined;
  s.cards.set(el, { code, index });
  observer.observe(el);
  return () => {
    observer?.unobserve(el);
    state?.cards.delete(el);
    state?.visibleCards.delete(el);
  };
}

export function setProductModalOpen(open: boolean): void {
  if (!state) return;
  tick(); // fecha o tempo da seção anterior antes de trocar
  state.modalOpen = open;
}

export function trackProductOpen(): void {
  if (!state) return;
  state.productOpens++;
  state.dirty = true;
}

export function trackBuyClick(): void {
  if (!state) return;
  state.buyClicks++;
  tick();
  flush(); // a pessoa está indo para a loja: envia na hora
}

export function trackSearch(): void {
  if (!state) return;
  state.searches++;
  state.dirty = true;
}

export function trackFilter(): void {
  if (!state) return;
  state.filters++;
  state.dirty = true;
}
