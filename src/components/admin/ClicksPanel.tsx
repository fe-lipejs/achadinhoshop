import { useEffect, useState } from 'react';
import { Copy, MousePointerClick, TrendingDown, Clock, Eye, ShoppingBag } from 'lucide-react';
import type { FunnelAnalytics, Product, AnalyticsEvent } from '../../types';
import { fetchFunnelAnalytics, fetchAnalyticsEvents } from '../../services/catalog';

interface Props {
  products: Product[];
  notify: (message: string) => void;
}

const SOURCES = ['tiktok', 'kwai', 'instagram', 'youtube', 'facebook'];

export function ClicksPanel({ products, notify }: Props) {
  const [analytics, setAnalytics] = useState<FunnelAnalytics[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchFunnelAnalytics(30),
      fetchAnalyticsEvents(50)
    ])
      .then(([funnelData, eventsData]) => {
        setAnalytics(funnelData);
        setEvents(eventsData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top = [...products].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const maxProduct = Math.max(1, ...top.map((p) => p.clicks));
  const maxViews = Math.max(1, ...analytics.map((s) => s.views));
  const origin = window.location.origin;

  function copy(text: string) {
    void navigator.clipboard.writeText(text).then(() => notify('Link copiado!'));
  }

  function formatTimeAgo(dateString: string) {
    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    const diff = new Date(dateString).getTime() - Date.now();
    const diffMins = Math.round(diff / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (Math.abs(diffMins) < 1) return 'Agora mesmo';
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(diffDays, 'day');
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 1. LINKS DE RASTREAMENTO */}
      <section className="panel">
        <div className="panel-head">
          <h2>🔗 Links para sua Bio</h2>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Copie e use um link específico em cada rede social para saber de onde seus visitantes vêm.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SOURCES.map((s) => {
            const link = `${origin}/?src=${s}`;
            return (
              <div className="link-builder" key={s} style={{ display: 'flex', flex: '1 1 300px', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', width: 80 }}>{s}</span>
                <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</code>
                <button type="button" className="btn btn-sm btn-soft" onClick={() => copy(link)}>
                  <Copy size={14} /> Copiar
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. FUNIL DE CONVERSÃO */}
      <section className="panel">
        <div className="panel-head">
          <h2>📊 Funil de Engajamento (30 dias)</h2>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Entenda quais redes sociais trazem pessoas que apenas olham a vitrine e quais trazem quem realmente clica nos produtos.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="hint">Processando métricas...</p>
        ) : analytics.length === 0 ? (
          <p className="hint">Ainda sem dados suficientes.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {analytics.map((s) => {
              const dropoff = s.views > 0 ? ((s.views - s.clicks) / s.views) * 100 : 0;
              const dropoffRate = Math.max(0, Math.min(100, dropoff));
              
              return (
                <div key={s.source} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                    <h3 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.2rem' }}>{s.source}</h3>
                    {dropoffRate > 0 && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, padding: '4px 8px', background: 'rgba(255,50,50,0.1)', borderRadius: 6 }}>
                        <TrendingDown size={14} /> {dropoffRate.toFixed(1)}% desistem
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div className="bar-label" style={{ fontSize: '0.9rem', color: 'var(--text-alt)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> Visitas à vitrine</span>
                        <strong style={{ color: 'var(--text)' }}>{s.views}</strong>
                      </div>
                      <div className="bar-track" style={{ height: 6 }}>
                        <div className="bar-fill" style={{ width: `${(s.views / maxViews) * 100}%`, background: 'var(--blue)' }} />
                      </div>
                    </div>
                    
                    <div>
                      <div className="bar-label" style={{ fontSize: '0.9rem', color: 'var(--text-alt)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MousePointerClick size={14} /> Cliques p/ Comprar</span>
                        <strong style={{ color: 'var(--text)' }}>{s.clicks}</strong>
                      </div>
                      <div className="bar-track" style={{ height: 6 }}>
                        <div className="bar-fill" style={{ width: `${s.views > 0 ? (s.clicks / maxViews) * 100 : 0}%`, background: 'var(--green)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* 3. TIMELINE (Tempo Real) */}
        <section className="panel" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <div className="panel-head sticky top-0 bg-white z-10 pb-2">
            <h2>⏱️ Feed em Tempo Real</h2>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>Últimos acessos na sua loja.</p>
          
          {loading ? (
            <p className="hint">Buscando rastros...</p>
          ) : events.length === 0 ? (
            <p className="hint">O feed está vazio.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((event) => (
                <div key={event.id} style={{ display: 'flex', gap: 12, padding: '12px', borderLeft: `3px solid ${event.type === 'click' ? 'var(--green)' : 'var(--blue)'}`, background: 'var(--surface-alt)', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-alt)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatTimeAgo(event.createdAt)}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', background: 'var(--border)', borderRadius: 4 }}>
                        via {event.source}
                      </span>
                    </div>
                    {event.type === 'visit' ? (
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        <Eye size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4, color: 'var(--blue)' }} />
                        Usuário visualizou sua vitrine.
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        <ShoppingBag size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4, color: 'var(--green)' }} />
                        Usuário clicou no produto <strong>#{event.productCode} - {event.productName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. TOP PRODUTOS */}
        <section className="panel">
          <div className="panel-head">
            <h2>🔥 Produtos Mais Clicados</h2>
          </div>
          {top.length === 0 || top[0].clicks === 0 ? (
            <p className="hint">Nenhum produto recebeu cliques ainda.</p>
          ) : (
            <div className="bar-list">
              {top.map((p) => (
                <div className="bar-item" key={p.id}>
                  <div className="bar-label">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
                      #{p.code} · {p.title}
                    </span>
                    <strong>{p.clicks} clicks</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(p.clicks / maxProduct) * 100}%`, background: 'var(--shopee)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
