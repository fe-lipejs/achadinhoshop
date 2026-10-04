import { useEffect, useState } from 'react';
import { Copy, Users, MousePointerClick, TrendingDown } from 'lucide-react';
import type { FunnelAnalytics, Product } from '../../types';
import { fetchFunnelAnalytics } from '../../services/catalog';

interface Props {
  products: Product[];
  notify: (message: string) => void;
}

const SOURCES = ['tiktok', 'kwai', 'instagram', 'youtube', 'facebook'];

export function ClicksPanel({ products, notify }: Props) {
  const [analytics, setAnalytics] = useState<FunnelAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFunnelAnalytics(30)
      .then(setAnalytics)
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Links para rastreamento (Copie e cole na sua Bio)</h2>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Use um link diferente em cada rede para saber exatamente de onde estão vindo os seus visitantes.
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

      <section className="panel">
        <div className="panel-head">
          <h2>Funil de Conversão (Últimos 30 dias)</h2>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Descubra de onde os usuários chegam, se eles clicam nos produtos, e quantos desistem sem clicar em nada.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="hint">Analisando dados...</p>
        ) : analytics.length === 0 ? (
          <p className="hint">Nenhuma visita ou clique registrado ainda.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {analytics.map((s) => {
              const dropoff = s.views > 0 ? ((s.views - s.clicks) / s.views) * 100 : 0;
              const dropoffRate = Math.max(0, Math.min(100, dropoff));
              
              return (
                <div key={s.source} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.1rem' }}>{s.source}</h3>
                    {dropoffRate > 0 && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <TrendingDown size={14} /> {dropoffRate.toFixed(1)}% desistiram
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div className="bar-label">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Visitas (Chegaram na loja)</span>
                        <strong>{s.views}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(s.views / maxViews) * 100}%`, background: 'var(--blue)' }} />
                      </div>
                    </div>
                    
                    <div>
                      <div className="bar-label">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MousePointerClick size={14} /> Cliques (Foram para a Shopee)</span>
                        <strong>{s.clicks}</strong>
                      </div>
                      <div className="bar-track">
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

      <section className="panel">
        <div className="panel-head">
          <h2>Produtos mais desejados (Destino)</h2>
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
                  <strong>{p.clicks} cliques</strong>
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
  );
}
