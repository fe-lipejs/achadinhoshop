import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import type { ClickBySource, Product } from '../../types';
import { fetchClicksBySource } from '../../services/catalog';

interface Props {
  products: Product[];
  notify: (message: string) => void;
}

const SOURCES = ['tiktok', 'kwai', 'instagram'];

export function ClicksPanel({ products, notify }: Props) {
  const [bySource, setBySource] = useState<ClickBySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClicksBySource(30)
      .then(setBySource)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top = [...products].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const maxProduct = Math.max(1, ...top.map((p) => p.clicks));
  const maxSource = Math.max(1, ...bySource.map((s) => s.total));
  const origin = window.location.origin;

  function copy(text: string) {
    void navigator.clipboard.writeText(text).then(() => notify('Link copiado!'));
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Links para a bio</h2>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Use um link diferente em cada rede para saber de onde vêm os cliques.
        </p>
        {SOURCES.map((s) => {
          const link = `${origin}/?src=${s}`;
          return (
            <div className="link-builder" key={s}>
              <code>{link}</code>
              <button type="button" id={`copy-${s}`} className="btn btn-sm" onClick={() => copy(link)}>
                <Copy size={14} /> {s}
              </button>
            </div>
          );
        })}
        <p className="hint">
          Dica: <code>{origin}/?src=tiktok&amp;p=12</code> abre direto o produto #12.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Cliques por origem (30 dias)</h2>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="hint">Carregando...</p>
        ) : bySource.length === 0 ? (
          <p className="hint">Nenhum clique registrado ainda.</p>
        ) : (
          <div className="bar-list">
            {bySource.map((s) => (
              <div className="bar-item" key={s.source}>
                <div className="bar-label">
                  <span style={{ textTransform: 'capitalize' }}>{s.source}</span>
                  <strong>{s.total}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(s.total / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Produtos mais clicados (total)</h2>
        </div>
        {top.length === 0 || top[0].clicks === 0 ? (
          <p className="hint">Nenhum clique ainda.</p>
        ) : (
          <div className="bar-list">
            {top.map((p) => (
              <div className="bar-item" key={p.id}>
                <div className="bar-label">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
                    #{p.code} · {p.title}
                  </span>
                  <strong>{p.clicks}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(p.clicks / maxProduct) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
