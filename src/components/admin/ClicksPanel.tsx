import { useEffect, useState, useMemo } from 'react';
import { Download, Eye, Users, MousePointerClick, TrendingUp, Monitor, Smartphone, Globe, Search, Clock, AlertCircle, ShoppingBag, BarChart3, Target, Calendar } from 'lucide-react';
import type { FunnelAnalytics, AnalyticsEvent } from '../../types';
import { fetchFunnelAnalytics, fetchAnalyticsEvents } from '../../services/catalog';

interface Props {
  notify: (message: string) => void;
}

export function ClicksPanel({ notify }: Props) {
  const [analytics, setAnalytics] = useState<FunnelAnalytics[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [days, setDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const [funnelData, eventsData] = await Promise.all([
          fetchFunnelAnalytics(days),
          fetchAnalyticsEvents(days, 5000)
        ]);
        if (isMounted) {
          setAnalytics(funnelData);
          setEvents(eventsData);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    };

    // Carregamento inicial (mostra esqueleto/texto de loading)
    loadData(true);

    // Auto-refresh silencioso a cada 10 segundos
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [days]);

  // Aggregated Metrics
  const totalViews = useMemo(() => analytics.reduce((acc, curr) => acc + curr.views, 0), [analytics]);
  const totalClicks = useMemo(() => analytics.reduce((acc, curr) => acc + curr.clicks, 0), [analytics]);
  
  const uniqueVisitors = useMemo(() => {
    return new Set(events.filter(e => e.visitorId && e.type === 'visit').map(e => e.visitorId)).size;
  }, [events]);
  
  const intentRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
  const dropoffRate = totalViews > 0 ? (100 - Number(intentRate)).toFixed(1) : '0.0';

  const devices = useMemo(() => {
    const counts = { Mobile: 0, Desktop: 0, Tablet: 0, Total: 0 };
    events.forEach(e => {
      if (e.device === 'Mobile') counts.Mobile++;
      else if (e.device === 'Tablet') counts.Tablet++;
      else counts.Desktop++;
      counts.Total++;
    });
    return counts;
  }, [events]);

  // TOP PRODUTOS MAIS CLICADOS
  const topProducts = useMemo(() => {
    const clicks = events.filter(e => e.type === 'click' && e.productCode);
    const map: Record<string, { name: string, code: number, count: number }> = {};
    clicks.forEach(c => {
      const code = String(c.productCode);
      if (!map[code]) map[code] = { name: c.productName || 'Produto', code: c.productCode!, count: 0 };
      map[code].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [events]);

  // GRÁFICO 2: VISITAS E CLIQUES POR DIA (Últimos 7 dias)
  const chartByDay = useMemo(() => {
    const localKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const daysMap: Record<string, { date: string, label: string, visits: number, clicks: number }> = {};
    // Setup last X days (fuso local, não UTC)
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = localKey(d);
      daysMap[k] = { date: k, label: d.toLocaleDateString('pt-BR', { weekday: 'short' }), visits: 0, clicks: 0 };
    }
    events.forEach(e => {
      const k = localKey(new Date(e.createdAt));
      if (daysMap[k]) {
        if (e.type === 'visit') daysMap[k].visits++;
        if (e.type === 'click') daysMap[k].clicks++;
      }
    });
    const values = Object.values(daysMap);
    const maxVal = Math.max(...values.map(v => Math.max(v.visits, v.clicks)), 1);
    return values.map(v => ({ ...v, hVisits: (v.visits/maxVal)*100, hClicks: (v.clicks/maxVal)*100 }));
  }, [events, days]);

  function exportCSV() {
    const headers = ['Data/Hora', 'Tipo', 'Origem', 'Campanha', 'Página', 'Parâmetros', 'Dispositivo', 'Navegador', 'Referrer', 'Visitante'];
    const rows = events.map(e => [
      new Date(e.createdAt).toLocaleString('pt-BR'),
      e.type === 'visit' ? 'Visita' : `Clique: #${e.productCode} ${e.productName}`,
      e.source,
      e.campaign || '',
      e.pathname || '/',
      e.query || '',
      e.device || 'Desconhecido',
      e.browser || 'Desconhecido',
      e.referrer || '',
      e.visitorId || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Relatório CSV exportado!');
  }

  const filteredEvents = events.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.source.toLowerCase().includes(term) || 
           e.pathname?.toLowerCase().includes(term) ||
           e.productName?.toLowerCase().includes(term) ||
           e.browser?.toLowerCase().includes(term) ||
           e.campaign?.toLowerCase().includes(term) ||
           e.query?.toLowerCase().includes(term) ||
           (e.productCode !== undefined && `#${e.productCode}`.includes(term));
  });

  return (
    <div className="analytics-dashboard" style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '16px', minHeight: '100vh' }}>
      
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#000' }}>
            <TrendingUp color="#000" />
            Analytics Avançado
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '16px', fontWeight: 600, border: '1px solid #a7f3d0' }}>
              <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              AO VIVO
            </span>
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Acompanhe o funil de conversão, perfil de visitantes e horários de pico. Dados atualizados a cada 10 segundos.
          </p>
          <style>
            {`
              @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.8); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}
          </style>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f5f5f5', padding: '4px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
            {[1, 7, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{ 
                  background: days === d ? '#fff' : 'transparent', 
                  color: days === d ? '#000' : '#666',
                  border: days === d ? '1px solid #ccc' : '1px solid transparent', 
                  padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s', boxShadow: days === d ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {d === 1 ? '24h' : `${d} Dias`}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#000', marginBottom: 24, padding: 12, background: '#f9f9f9', borderRadius: 8 }}>Processando dados avançados...</div>}
      {error && <div style={{ color: '#ff4444', marginBottom: 24, padding: 12, background: '#fff0f0', borderRadius: 8 }}>Erro: {error}</div>}

      {/* METRICS ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard icon={<Eye size={20} color="#000" />} title="VISUALIZAÇÕES" value={totalViews} subtitle="Páginas acessadas" />
        <MetricCard icon={<Users size={20} color="#000" />} title="VISITANTES ÚNICOS" value={uniqueVisitors} subtitle="Pessoas reais na loja" />
        <MetricCard icon={<MousePointerClick size={20} color="#000" />} title="CLIQUES EM PRODUTOS" value={totalClicks} subtitle="Intenções de compra" />
        
        {/* CARD DE FUNIL / DESISTÊNCIA */}
        <div style={{ background: '#fff', border: `1px solid #000`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, color: '#000' }}>FUNIL & CONVERSÃO</span>
            <div style={{ background: '#f5f5f5', padding: 6, borderRadius: 8 }}><Target size={20} color="#000" /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#000', lineHeight: 1 }}>{intentRate}%</div>
            <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Clicaram</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>{dropoffRate}%</div>
            <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Desistiram (Saíram sem clicar)</div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS ROW 1 (BARRAS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* GRÁFICO DINÂMICO DE VISITAS (DIA / SEMANA / ANO) */}
        <DynamicVisitsChart events={events} />

        {/* FUNIL POR DIA DA SEMANA */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px 0', fontSize: '1rem', color: '#000' }}>
            <BarChart3 size={18} color="#000" /> Evolução do Funil ({days} Dias)
          </h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, background: '#000', borderRadius: 2 }}/> Visitas</span>
            <span style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, background: '#10b981', borderRadius: 2 }}/> Cliques (Compras)</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
            {chartByDay.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }} title={`${d.date}: ${d.visits} Visitas, ${d.clicks} Cliques`}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', width: '100%', justifyContent: 'center' }}>
                  <div style={{ width: '40%', maxWidth: 16, height: `${d.hVisits}%`, background: '#000', borderRadius: '4px 4px 0 0', minHeight: d.visits > 0 ? 4 : 0 }} />
                  <div style={{ width: '40%', maxWidth: 16, height: `${d.hClicks}%`, background: '#10b981', borderRadius: '4px 4px 0 0', minHeight: d.clicks > 0 ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {chartByDay.map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center' }}>{d.label}</span>)}
          </div>
        </div>

      </div>

      {/* GRÁFICOS ROW 2 (ORIGEM, DISPOSITIVO, TOP PRODUTOS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        
        {/* ORIGEM DO TRÁFEGO */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#000' }}>
            <Globe size={18} color="#000" /> Canais & Origens
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {analytics.length === 0 ? <p style={{color:'#666'}}>Sem dados.</p> : analytics.map(a => (
              <div key={a.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
                  <span style={{ textTransform: 'capitalize', color: '#333' }}>{a.source}</span>
                  <span style={{ color: '#000', fontWeight: 600 }}>{a.views} <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 400 }}>({totalViews > 0 ? ((a.views/totalViews)*100).toFixed(0) : 0}%)</span></span>
                </div>
                <div style={{ height: 6, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${totalViews > 0 ? (a.views/totalViews)*100 : 0}%`, height: '100%', background: '#000' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP PRODUTOS */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#000' }}>
            <ShoppingBag size={18} color="#000" /> Top Produtos Mais Clicados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topProducts.length === 0 ? <p style={{color:'#666'}}>Ainda sem vendas/cliques.</p> : topProducts.map((p, idx) => (
              <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: idx === 0 ? '#ffb000' : '#e5e5e5', color: idx === 0 ? '#000' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Code: #{p.code}</div>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>{p.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DISPOSITIVOS */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#000' }}>
            <Smartphone size={18} color="#000" /> Dispositivos
          </h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <DeviceCard icon={<Smartphone size={24} />} name="Celular" count={devices.Mobile} total={devices.Total} />
            <DeviceCard icon={<Monitor size={24} />} name="PC / Desk" count={devices.Desktop} total={devices.Total} />
          </div>
          <div style={{ marginTop: 24, padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            Otimize sempre seus vídeos para formato vertical, pois a grande maioria do tráfego vem do celular.
          </div>
        </div>

      </div>

      {/* REAL-TIME FEED TABLE */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.1rem', color: '#000' }}>
              <Clock size={18} color="#000" /> Auditoria de Acessos & Rastreamento Vivo
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>Cada interação registrada detalhadamente. Pesquise por ID do produto, origem ou data.</p>
          </div>
          
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Ex: tiktok, safari, iphone, #123..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: '#f9f9f9', border: '1px solid #ddd', color: '#000', padding: '10px 12px 10px 36px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DATA / HORA</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>SITUAÇÃO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DETALHE DO EVENTO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>SISTEMA / HARDWARE</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>ORIGEM (REFERRER)</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#888' }}>Nenhum evento registrado com esse filtro.</td></tr>
              ) : filteredEvents.map((e, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }} onMouseEnter={ev => ev.currentTarget.style.background='#f9f9f9'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#000', fontWeight: 600, fontSize: '0.9rem' }}>{new Date(e.createdAt).toLocaleTimeString('pt-BR')}</div>
                    <div style={{ color: '#888', fontSize: '0.75rem', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Calendar size={12} /> {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                      background: e.type === 'visit' ? '#f5f5f5' : '#10b981',
                      color: e.type === 'visit' ? '#333' : '#fff',
                      border: `1px solid ${e.type === 'visit' ? '#ddd' : '#059669'}`
                    }}>
                      {e.type === 'visit' ? <Eye size={14} /> : <MousePointerClick size={14} />}
                      {e.type === 'visit' ? 'VISITOU' : 'CLICOU EM COMPRAR'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#000', fontSize: '0.9rem', fontWeight: 500 }}>
                    {e.type === 'visit' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={14} color="#666" />
                        Acessou a Página <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>{e.pathname || '/'}</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                          <ShoppingBag size={14} />
                          Interessou-se pelo Produto <strong>#{e.productCode}</strong>
                        </div>
                        {e.productName && <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 400, marginTop: 4 }}>↳ {e.productName}</div>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#444', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      {e.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                      {e.device || 'Mobile'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
                      Navegador: {e.browser || 'Safari / Chrome'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#444', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#f5f5f5', borderRadius: 4, width: 'fit-content', border: '1px solid #eaeaea', textTransform: 'capitalize', fontWeight: 600 }}>
                      <Globe size={14} color="#888" /> {e.source || 'direto'}
                    </div>
                    {e.campaign && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Campanha: {e.campaign}</div>
                    )}
                    {e.referrer && e.referrer !== 'Direto' && (
                      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.referrer}>
                        Veio de: {e.referrer}
                      </div>
                    )}
                    {e.query && (
                      <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 4, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.query}>
                        {e.query}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}

function MetricCard({ icon, title, value, subtitle, borderColor = '#e5e5e5' }: any) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, color: '#666' }}>{title}</span>
        <div style={{ background: '#f5f5f5', padding: 6, borderRadius: 8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#000', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 8 }}>{subtitle}</div>
    </div>
  );
}

function DeviceCard({ icon, name, count, total }: any) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ flex: 1, background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color: '#000' }}>{icon}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000', marginTop: 12 }}>{count}</div>
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#000', fontWeight: 700, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>{pct}%</div>
    </div>
  );
}

function DynamicVisitsChart({ events }: { events: AnalyticsEvent[] }) {
  const [mode, setMode] = useState<'dia' | 'mes' | 'ano'>('dia');
  
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDay()); // 0-6
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const chartData = useMemo(() => {
    let data: { label: string; count: number; height: number }[] = [];
    const visits = events.filter(e => e.type === 'visit');

    if (mode === 'dia') {
      const hours = Array(8).fill(0); // 0h, 3h, 6h, 9h, 12h, 15h, 18h, 21h
      const labels = ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'];
      visits.forEach(v => {
        const d = new Date(v.createdAt);
        if (d.getDay() === selectedDay) {
          const index = Math.floor(d.getHours() / 3);
          if (index >= 0 && index < 8) hours[index]++;
        }
      });
      const max = Math.max(...hours, 1);
      data = hours.map((c, i) => ({ label: labels[i], count: c, height: (c / max) * 100 }));
    } 
    else if (mode === 'mes') {
      const days = Array(7).fill(0);
      const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      visits.forEach(v => {
        const d = new Date(v.createdAt);
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          const dw = d.getDay();
          if (dw >= 0 && dw < 7) days[dw]++;
        }
      });
      const max = Math.max(...days, 1);
      data = days.map((c, i) => ({ label: labels[i], count: c, height: (c / max) * 100 }));
    } 
    else if (mode === 'ano') {
      const months = Array(12).fill(0);
      const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      visits.forEach(v => {
        const d = new Date(v.createdAt);
        if (d.getFullYear() === selectedYear) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) months[m]++;
        }
      });
      const max = Math.max(...months, 1);
      data = months.map((c, i) => ({ label: labels[i], count: c, height: (c / max) * 100 }));
    }

    return data;
  }, [events, mode, selectedDay, selectedMonth, selectedYear]);

  // Render Sub-Selectors based on Mode
  const renderSubSelectors = () => {
    if (mode === 'dia') {
      const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => setSelectedDay(i)} style={{ width: 32, height: 32, borderRadius: 16, border: selectedDay === i ? '2px solid #000' : '1px solid #e5e5e5', background: selectedDay === i ? '#000' : '#fff', color: selectedDay === i ? '#fff' : '#666', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{d}</button>
          ))}
        </div>
      );
    }
    if (mode === 'mes') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {months.map((m, i) => (
            <button key={i} onClick={() => setSelectedMonth(i)} style={{ padding: '6px 12px', borderRadius: 16, border: selectedMonth === i ? '2px solid #000' : '1px solid #e5e5e5', background: selectedMonth === i ? '#000' : '#fff', color: selectedMonth === i ? '#fff' : '#666', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{m}</button>
          ))}
        </div>
      );
    }
    if (mode === 'ano') {
      const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          {years.map((y) => (
            <button key={y} onClick={() => setSelectedYear(y)} style={{ padding: '6px 16px', borderRadius: 16, border: selectedYear === y ? '2px solid #000' : '1px solid #e5e5e5', background: selectedYear === y ? '#000' : '#fff', color: selectedYear === y ? '#fff' : '#666', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{y}</button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1rem', color: '#000' }}>
          <BarChart3 size={18} color="#000" /> Gráfico de Visitas
        </h3>
        
        {/* TOGGLES (Dia / Mês / Ano) */}
        <div style={{ display: 'flex', background: '#f5f5f5', padding: '4px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
          {[
            { id: 'dia', label: 'Por Hora' },
            { id: 'mes', label: 'Por Dia' },
            { id: 'ano', label: 'Por Mês' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id as any)}
              style={{ 
                background: mode === opt.id ? '#fff' : 'transparent', 
                color: mode === opt.id ? '#000' : '#666',
                border: mode === opt.id ? '1px solid #ccc' : '1px solid transparent', 
                padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: mode === opt.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* SUB-SELECTORS (D S T Q Q S S / Jan Fev... ) */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
        {renderSubSelectors()}
      </div>

      {/* CHART BARS */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: mode === 'ano' ? 4 : 8, height: 160, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${d.count} visitas`}>
            <div style={{ 
              width: '100%', 
              maxWidth: mode === 'ano' ? 14 : 32, 
              height: `${d.height}%`, 
              background: d.count > 0 ? '#b102b5' : 'transparent', 
              borderRadius: '6px 6px 0 0', 
              minHeight: d.count > 0 ? 4 : 0, 
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            }} />
          </div>
        ))}
      </div>
      
      {/* LABELS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#888', fontSize: '0.75rem', fontWeight: 600 }}>
        {chartData.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center' }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
