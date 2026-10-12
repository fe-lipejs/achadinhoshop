import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Clock,
  Eye,
  Flame,
  Hourglass,
  LogOut,
  MousePointerClick,
  ScrollText,
  Smartphone,
  Target,
} from 'lucide-react';
import type { AnalyticsEvent, EngagementSession, Product } from '../../types';
import { fetchAllProducts, fetchEngagementSessions } from '../../services/catalog';

interface Props {
  days: number;
  events: AnalyticsEvent[];
}

type DeviceFilter = 'all' | 'Mobile' | 'Desktop';

const SECTION_LABEL: Record<string, string> = {
  carregando: 'Carregando (produtos ainda não apareceram)',
  topo: 'Topo / Banner',
  filtros: 'Busca & Filtros',
  produtos: 'Lista de produtos',
  rodape: 'Rodapé (fim da página)',
  produto_aberto: 'Detalhe do produto aberto',
};

const SECTION_ORDER = ['carregando', 'topo', 'filtros', 'produtos', 'produto_aberto', 'rodape'];

const SECTION_COLOR: Record<string, string> = {
  carregando: '#9ca3af',
  topo: '#b102b5',
  filtros: '#3483fa',
  produtos: '#10b981',
  produto_aberto: '#ff7733',
  rodape: '#111827',
};

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: 12,
  padding: 20,
};

const h3: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '0 0 4px 0',
  fontSize: '1rem',
  color: '#000',
};

const hint: CSSProperties = { margin: '0 0 20px 0', fontSize: '0.8rem', color: '#777' };

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function fmtPct(value: number): string {
  return `${value.toFixed(value > 0 && value < 10 ? 1 : 0)}%`;
}

function fmtSeconds(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${m}min ${rest}s`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function EngagementPanel({ days, events }: Props) {
  const [sessions, setSessions] = useState<EngagementSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('Mobile');

  useEffect(() => {
    let mounted = true;
    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const data = await fetchEngagementSessions(days);
        if (mounted) {
          setSessions(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted && showLoading) setLoading(false);
      }
    };
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [days]);

  useEffect(() => {
    fetchAllProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const filtered = useMemo(() => {
    if (deviceFilter === 'all') return sessions;
    if (deviceFilter === 'Mobile') return sessions.filter((s) => s.device === 'Mobile' || s.device === 'Tablet');
    return sessions.filter((s) => s.device !== 'Mobile' && s.device !== 'Tablet');
  }, [sessions, deviceFilter]);

  const total = filtered.length;
  const quitters = useMemo(() => filtered.filter((s) => s.buy_clicks === 0), [filtered]);

  // ------------------------------------------------------------ Funil de atenção
  const funnel = useMemo(() => {
    const steps = [
      { label: 'Entraram na vitrine', count: total },
      { label: 'Ficaram mais de 5 segundos', count: filtered.filter((s) => s.duration_ms >= 5000).length },
      { label: 'Produtos chegaram a aparecer', count: filtered.filter((s) => s.catalog_load_ms !== null).length },
      { label: 'Viram pelo menos 1 produto', count: filtered.filter((s) => s.products_seen >= 1).length },
      { label: 'Rolaram além dos 4 primeiros produtos', count: filtered.filter((s) => s.max_product_index > 4).length },
      { label: 'Abriram um produto', count: filtered.filter((s) => s.product_opens > 0).length },
      { label: 'Clicaram para comprar', count: filtered.filter((s) => s.buy_clicks > 0).length },
    ];
    let worstIdx = -1;
    let worstDrop = 0;
    steps.forEach((step, i) => {
      if (i === 0) return;
      const drop = steps[i - 1].count - step.count;
      if (drop > worstDrop) {
        worstDrop = drop;
        worstIdx = i;
      }
    });
    return { steps, worstIdx };
  }, [filtered, total]);

  // ------------------------------------------------------------ Onde saíram
  const exitDistribution = useMemo(() => {
    const map = new Map<string, number>();
    quitters.forEach((s) => {
      const key = s.exit_section || 'carregando';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return SECTION_ORDER.filter((k) => map.has(k))
      .map((key) => ({ key, count: map.get(key) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [quitters]);

  // ------------------------------------------------------------ Onde passam tempo
  const timeBySection = useMemo(() => {
    const totals = new Map<string, number>();
    filtered.forEach((s) => {
      Object.entries(s.section_ms || {}).forEach(([key, ms]) => {
        totals.set(key, (totals.get(key) || 0) + (Number(ms) || 0));
      });
    });
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    return {
      sum,
      rows: SECTION_ORDER.filter((k) => (totals.get(k) || 0) > 0)
        .map((key) => ({ key, ms: totals.get(key) || 0, avg: total > 0 ? (totals.get(key) || 0) / total : 0 }))
        .sort((a, b) => b.ms - a.ms),
    };
  }, [filtered, total]);

  // ------------------------------------------------------------ Curva de retenção por posição
  const retention = useMemo(() => {
    const maxTotal = Math.max(0, ...filtered.map((s) => s.products_total || 0));
    const positions = Math.min(Math.max(maxTotal, 8), 24);
    const base = filtered.filter((s) => s.catalog_load_ms !== null).length;
    const rows = Array.from({ length: positions }, (_, i) => {
      const n = i + 1;
      const count = filtered.filter((s) => s.max_product_index >= n).length;
      return { n, count, pct: pct(count, base) };
    });
    return { rows, base };
  }, [filtered]);

  // ------------------------------------------------------------ Tempo na página
  const timeBuckets = useMemo(() => {
    const buckets = [
      { label: '< 5s', min: 0, max: 5000 },
      { label: '5–15s', min: 5000, max: 15000 },
      { label: '15–30s', min: 15000, max: 30000 },
      { label: '30–60s', min: 30000, max: 60000 },
      { label: '1–3min', min: 60000, max: 180000 },
      { label: '3min+', min: 180000, max: Infinity },
    ].map((b) => ({ ...b, count: 0 }));
    filtered.forEach((s) => {
      const b = buckets.find((x) => s.duration_ms >= x.min && s.duration_ms < x.max);
      if (b) b.count++;
    });
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({ ...b, height: (b.count / max) * 100 }));
  }, [filtered]);

  // ------------------------------------------------------------ Produtos que prendem atenção
  const productAttention = useMemo(() => {
    const byCode = new Map(products.map((p) => [String(p.code), p]));
    const clicksByCode = new Map<string, number>();
    events
      .filter((e) => e.type === 'click' && e.productCode !== undefined)
      .filter((e) => {
        if (deviceFilter === 'all') return true;
        if (deviceFilter === 'Mobile') return e.device === 'Mobile' || e.device === 'Tablet';
        return e.device !== 'Mobile' && e.device !== 'Tablet';
      })
      .forEach((e) => {
        const key = String(e.productCode);
        clicksByCode.set(key, (clicksByCode.get(key) || 0) + 1);
      });

    const agg = new Map<string, { views: number; ms: number }>();
    filtered.forEach((s) => {
      Object.entries(s.product_dwell || {}).forEach(([code, ms]) => {
        const value = Number(ms) || 0;
        if (value < 800) return;
        const row = agg.get(code) || { views: 0, ms: 0 };
        row.views++;
        row.ms += value;
        agg.set(code, row);
      });
    });

    return [...agg.entries()]
      .map(([code, row]) => {
        const clicks = clicksByCode.get(code) || 0;
        return {
          code,
          title: byCode.get(code)?.title || `Produto #${code}`,
          image: byCode.get(code)?.image_url || null,
          views: row.views,
          avgMs: row.ms / row.views,
          totalMs: row.ms,
          clicks,
          ctr: pct(clicks, row.views),
        };
      })
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 10);
  }, [filtered, products, events, deviceFilter]);

  // ------------------------------------------------------------ KPIs
  const kpis = useMemo(() => {
    const durations = filtered.map((s) => s.duration_ms);
    const loads = filtered.map((s) => s.catalog_load_ms).filter((v): v is number => v !== null);
    return {
      medianTime: median(durations),
      avgScroll: total > 0 ? filtered.reduce((a, s) => a + (s.max_scroll_pct || 0), 0) / total : 0,
      medianLoad: median(loads),
      sawProduct: pct(filtered.filter((s) => s.products_seen >= 1).length, total),
      avgDeepest: total > 0 ? filtered.reduce((a, s) => a + (s.max_product_index || 0), 0) / total : 0,
    };
  }, [filtered, total]);

  // ------------------------------------------------------------ Diagnóstico automático
  const diagnosis = useMemo(() => {
    if (total < 3) return [];
    const items: { level: 'alto' | 'medio' | 'info'; text: string }[] = [];

    const quick = filtered.filter((s) => s.duration_ms < 5000).length;
    const quickPct = pct(quick, total);
    if (quickPct >= 30) {
      items.push({
        level: 'alto',
        text: `${fmtPct(quickPct)} saíram em menos de 5 segundos. A primeira tela (banner) não está convencendo — o produto do vídeo precisa aparecer logo de cara.`,
      });
    }

    const leftLoading = quitters.filter((s) => s.exit_section === 'carregando' || s.catalog_load_ms === null).length;
    const leftLoadingPct = pct(leftLoading, total);
    if (leftLoadingPct >= 10) {
      items.push({
        level: 'alto',
        text: `${fmtPct(leftLoadingPct)} foram embora ANTES dos produtos aparecerem (carregamento mediano: ${fmtSeconds(kpis.medianLoad)}). Velocidade está custando visitas.`,
      });
    }

    const neverSaw = pct(filtered.filter((s) => s.products_seen === 0).length, total);
    if (neverSaw >= 30) {
      items.push({
        level: 'alto',
        text: `${fmtPct(neverSaw)} nunca chegaram a ver nenhum produto na tela. Banner + filtros ocupam espaço demais acima dos produtos no celular.`,
      });
    }

    const mainExit = exitDistribution[0];
    if (mainExit && quitters.length > 0) {
      items.push({
        level: 'medio',
        text: `Principal ponto de saída de quem não comprou: "${SECTION_LABEL[mainExit.key] || mainExit.key}" (${fmtPct(pct(mainExit.count, quitters.length))} dos desistentes).`,
      });
    }

    const opened = filtered.filter((s) => s.product_opens > 0);
    const openedNoBuy = opened.filter((s) => s.buy_clicks === 0).length;
    if (opened.length >= 3 && pct(openedNoBuy, opened.length) >= 60) {
      items.push({
        level: 'medio',
        text: `${fmtPct(pct(openedNoBuy, opened.length))} de quem abriu um produto fechou sem clicar em comprar. Revise preço, foto e o botão dentro do detalhe.`,
      });
    }

    const ignored = productAttention.filter((p) => p.views >= 5 && p.clicks === 0);
    if (ignored.length > 0) {
      items.push({
        level: 'info',
        text: `Olham mas não clicam: ${ignored
          .slice(0, 3)
          .map((p) => `#${p.code}`)
          .join(', ')}. Recebem atenção mas ninguém clica — teste trocar imagem/preço ou mover para baixo.`,
      });
    }

    if (items.length === 0) {
      items.push({ level: 'info', text: 'Nenhum vazamento grave detectado no período. Continue acompanhando.' });
    }
    return items;
  }, [filtered, quitters, total, exitDistribution, productAttention, kpis.medianLoad]);

  const deviceButtons: { id: DeviceFilter; label: string }[] = [
    { id: 'Mobile', label: 'Celular' },
    { id: 'Desktop', label: 'Computador' },
    { id: 'all', label: 'Todos' },
  ];

  return (
    <section style={{ marginBottom: 32 }} aria-labelledby="engagement-title">
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 id="engagement-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#000' }}>
            <Flame size={22} color="#ff7733" /> Mapa de Atenção
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#666' }}>
            Onde o visitante passa o tempo, até onde rola e em que ponto desiste. {total} sessões no período.
          </p>
        </div>
        <div style={{ display: 'flex', background: '#f5f5f5', padding: 4, borderRadius: 8, border: '1px solid #e5e5e5' }}>
          {deviceButtons.map((opt) => (
            <button
              key={opt.id}
              id={`engagement-device-${opt.id}`}
              type="button"
              onClick={() => setDeviceFilter(opt.id)}
              style={{
                background: deviceFilter === opt.id ? '#fff' : 'transparent',
                color: deviceFilter === opt.id ? '#000' : '#666',
                border: deviceFilter === opt.id ? '1px solid #ccc' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: 4,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: '#b91c1c', marginBottom: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.9rem' }}>
          Erro ao carregar o mapa de atenção: {error}
          <div style={{ marginTop: 6, color: '#7f1d1d' }}>
            Se a mensagem fala de <code>page_sessions</code>, rode o arquivo <code>supabase/004_engagement.sql</code> no SQL Editor do Supabase.
          </div>
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div style={{ ...card, color: '#666' }}>Carregando mapa de atenção...</div>
      ) : total === 0 ? (
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fafafa' }}>
          <Hourglass size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
            <strong>Ainda sem sessões registradas{deviceFilter !== 'all' ? ' para este dispositivo' : ''}.</strong>
            <br />
            O mapa de atenção começa a coletar assim que esta versão do site estiver publicada e o arquivo{' '}
            <code>supabase/004_engagement.sql</code> tiver sido executado. Visitas antigas não têm esses dados.
          </div>
        </div>
      ) : (
        <>
          {/* DIAGNÓSTICO + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#0a0a0a', color: '#fff', borderRadius: 12, padding: 20 }}>
              <h3 style={{ ...h3, color: '#fff', marginBottom: 16 }}>
                <AlertTriangle size={18} color="#ffb000" /> Diagnóstico automático
              </h3>
              {diagnosis.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '0.9rem', margin: 0 }}>Precisa de pelo menos 3 sessões para gerar o diagnóstico.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {diagnosis.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.88rem', lineHeight: 1.45 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          marginTop: 6,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: item.level === 'alto' ? '#ef4444' : item.level === 'medio' ? '#ffb000' : '#10b981',
                        }}
                      />
                      <span style={{ color: '#e5e5e5' }}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <MiniKpi icon={<Clock size={16} />} label="Tempo mediano na página" value={fmtSeconds(kpis.medianTime)} />
              <MiniKpi icon={<ScrollText size={16} />} label="Rolagem média da página" value={fmtPct(kpis.avgScroll)} />
              <MiniKpi icon={<Eye size={16} />} label="Viram ao menos 1 produto" value={fmtPct(kpis.sawProduct)} />
              <MiniKpi icon={<Activity size={16} />} label="Produtos aparecem em" value={fmtSeconds(kpis.medianLoad)} />
              <MiniKpi icon={<ArrowDown size={16} />} label="Posição média mais funda" value={`#${kpis.avgDeepest.toFixed(1)}`} />
              <MiniKpi icon={<LogOut size={16} />} label="Desistentes (não clicaram)" value={fmtPct(pct(quitters.length, total))} danger />
            </div>
          </div>

          {/* FUNIL DE ATENÇÃO */}
          <div style={{ ...card, marginBottom: 16 }}>
            <h3 style={h3}>
              <Target size={18} /> Funil de atenção — em que etapa as pessoas param
            </h3>
            <p style={hint}>Cada barra mostra quantos % do total chegaram até aquela etapa. A etapa em vermelho é onde você mais perde gente.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnel.steps.map((step, i) => {
                const width = pct(step.count, total);
                const isWorst = i === funnel.worstIdx;
                const prev = i > 0 ? funnel.steps[i - 1].count : step.count;
                const lost = prev - step.count;
                return (
                  <div key={step.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.85rem', marginBottom: 4, gap: 8 }}>
                      <span style={{ color: '#222', fontWeight: 600 }}>
                        {i + 1}. {step.label}
                        {isWorst && (
                          <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 800, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>
                            MAIOR VAZAMENTO
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#000', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {step.count}{' '}
                        <span style={{ color: '#888', fontWeight: 400 }}>({fmtPct(width)})</span>
                        {i > 0 && lost > 0 && (
                          <span style={{ color: isWorst ? '#ef4444' : '#b45309', fontWeight: 600, marginLeft: 8, fontSize: '0.78rem' }}>
                            −{lost} aqui
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 10, background: '#f3f3f3', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${width}%`,
                          height: '100%',
                          background: isWorst ? '#ef4444' : i === funnel.steps.length - 1 ? '#10b981' : '#000',
                          borderRadius: 5,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ONDE SAÍRAM x ONDE PASSAM TEMPO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <h3 style={h3}>
                <LogOut size={18} color="#ef4444" /> Onde estavam quando desistiram
              </h3>
              <p style={hint}>Só quem saiu sem clicar em comprar ({quitters.length} sessões).</p>
              <SectionBars
                rows={exitDistribution.map((r) => ({ key: r.key, value: r.count, share: pct(r.count, quitters.length), right: `${r.count}` }))}
              />
            </div>

            <div style={card}>
              <h3 style={h3}>
                <Flame size={18} color="#ff7733" /> Ponto focal — onde passam mais tempo
              </h3>
              <p style={hint}>Divisão do tempo ativo total. Valor à direita = média por sessão.</p>
              <SectionBars
                rows={timeBySection.rows.map((r) => ({ key: r.key, value: r.ms, share: pct(r.ms, timeBySection.sum), right: fmtSeconds(r.avg) }))}
              />
            </div>
          </div>

          {/* RETENÇÃO POR POSIÇÃO x TEMPO NA PÁGINA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <h3 style={h3}>
                <Smartphone size={18} /> Até qual produto as pessoas chegam
              </h3>
              <p style={hint}>
                % das sessões (com produtos carregados) que viram o produto na posição N. Onde a barra despenca é onde o interesse morre.
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                {retention.rows.map((r) => (
                  <div
                    key={r.n}
                    title={`Produto #${r.n} da lista: ${r.count} sessões (${fmtPct(r.pct)})`}
                    style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${r.pct}%`,
                        minHeight: r.count > 0 ? 3 : 0,
                        background: r.pct >= 50 ? '#10b981' : r.pct >= 20 ? '#ffb000' : '#ef4444',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.5s ease',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {retention.rows.map((r) => (
                  <span key={r.n} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', color: '#888', fontWeight: 600 }}>
                    {r.n}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: '0.72rem', color: '#666', flexWrap: 'wrap' }}>
                <Legend color="#10b981" label="50%+ chegam" />
                <Legend color="#ffb000" label="20–50%" />
                <Legend color="#ef4444" label="menos de 20%" />
              </div>
            </div>

            <div style={card}>
              <h3 style={h3}>
                <Clock size={18} /> Quanto tempo ficam na página
              </h3>
              <p style={hint}>Tempo ativo (só conta com a aba aberta na tela).</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                {timeBuckets.map((b) => (
                  <div key={b.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#000' }}>{b.count > 0 ? fmtPct(pct(b.count, total)) : ''}</span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 40,
                        height: `${b.height}%`,
                        minHeight: b.count > 0 ? 3 : 0,
                        background: b.min === 0 ? '#ef4444' : '#000',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {timeBuckets.map((b) => (
                  <span key={b.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.72rem', color: '#888', fontWeight: 600 }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PRODUTOS QUE PRENDEM ATENÇÃO */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #eee' }}>
              <h3 style={h3}>
                <MousePointerClick size={18} /> Produtos que mais prendem o olhar
              </h3>
              <p style={{ ...hint, margin: 0 }}>
                Visto = card ficou 0,8s+ na tela. Produto com muita atenção e zero clique é sinal de preço/foto que não convence.
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, textAlign: 'left' }}>
                <thead style={{ background: '#fafafa' }}>
                  <tr>
                    {['PRODUTO', 'SESSÕES QUE VIRAM', 'TEMPO MÉDIO OLHANDO', 'CLIQUES', 'CONVERSÃO', ''].map((th) => (
                      <th key={th} style={{ padding: '10px 20px', fontSize: '0.72rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productAttention.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                        Nenhum produto foi visto por tempo suficiente ainda.
                      </td>
                    </tr>
                  ) : (
                    productAttention.map((p) => {
                      const ignored = p.views >= 5 && p.clicks === 0;
                      return (
                        <tr key={p.code} style={{ borderTop: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.image ? (
                                <img src={p.image} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee', background: '#fff' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f3f3' }} />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.title}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#888' }}>#{p.code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px', fontWeight: 700 }}>{p.views}</td>
                          <td style={{ padding: '12px 20px', fontWeight: 700 }}>{fmtSeconds(p.avgMs)}</td>
                          <td style={{ padding: '12px 20px', fontWeight: 700, color: p.clicks > 0 ? '#10b981' : '#999' }}>{p.clicks}</td>
                          <td style={{ padding: '12px 20px', fontWeight: 700 }}>{fmtPct(p.ctr)}</td>
                          <td style={{ padding: '12px 20px' }}>
                            {ignored && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                                OLHAM, NÃO CLICAM
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MiniKpi({ icon, label, value, danger = false }: { icon: ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: '0.72rem', fontWeight: 600 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: danger ? '#ef4444' : '#000', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SectionBars({ rows }: { rows: { key: string; value: number; share: number; right: string }[] }) {
  if (rows.length === 0) return <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Sem dados ainda.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((r, i) => (
        <div key={r.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5, gap: 8 }}>
            <span style={{ color: '#222', fontWeight: i === 0 ? 700 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: SECTION_COLOR[r.key] || '#999', flexShrink: 0 }} />
              {SECTION_LABEL[r.key] || r.key}
            </span>
            <span style={{ fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
              {fmtPct(r.share)} <span style={{ color: '#888', fontWeight: 400, fontSize: '0.78rem' }}>· {r.right}</span>
            </span>
          </div>
          <div style={{ height: 8, background: '#f3f3f3', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${r.share}%`, height: '100%', background: SECTION_COLOR[r.key] || '#999', borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}
