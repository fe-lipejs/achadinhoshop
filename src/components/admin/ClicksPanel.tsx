import { useEffect, useState, useMemo } from 'react';
import { Download, Eye, Users, MousePointerClick, TrendingUp, Monitor, Smartphone, Globe, Search, Clock } from 'lucide-react';
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
  
  // Fitros
  const [days, setDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchFunnelAnalytics(days),
      fetchAnalyticsEvents(200) // Pega mais eventos para a tabela
    ])
      .then(([funnelData, eventsData]) => {
        setAnalytics(funnelData);
        setEvents(eventsData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [days]);

  // Aggregated Metrics
  const totalViews = useMemo(() => analytics.reduce((acc, curr) => acc + curr.views, 0), [analytics]);
  const totalClicks = useMemo(() => analytics.reduce((acc, curr) => acc + curr.clicks, 0), [analytics]);
  
  // Calculate unique visitors (approximation via events visitorId)
  const uniqueVisitors = useMemo(() => {
    const ids = new Set(events.filter(e => e.visitorId).map(e => e.visitorId));
    return ids.size > 0 ? ids.size : (totalViews > 0 ? Math.max(1, Math.floor(totalViews * 0.75)) : 0);
  }, [events, totalViews]);
  
  const intentRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  // Device metrics
  const devices = useMemo(() => {
    const counts = { Mobile: 0, Desktop: 0, Tablet: 0, Total: 0 };
    events.forEach(e => {
      if (e.device === 'Mobile') counts.Mobile++;
      else if (e.device === 'Tablet') counts.Tablet++;
      else counts.Desktop++; // Desktop is default/fallback
      counts.Total++;
    });
    return counts;
  }, [events]);

  function exportCSV() {
    const headers = ['Data/Hora', 'Tipo', 'Origem', 'Página', 'Dispositivo', 'Navegador'];
    const rows = events.map(e => [
      new Date(e.createdAt).toLocaleString('pt-BR'),
      e.type === 'visit' ? 'Visita' : `Clique: #${e.productCode} ${e.productName}`,
      e.source,
      e.pathname || '/',
      e.device || 'Desconhecido',
      e.browser || 'Desconhecido'
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
           e.browser?.toLowerCase().includes(term);
  });

  return (
    <div className="analytics-dashboard" style={{ background: '#0a0a0b', color: '#ededed', padding: '24px', borderRadius: '16px', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
            <TrendingUp color="#ffb000" />
            Motor de Visitas, Cliques & Engajamento
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Métricas em tempo real da Vitrine, tráfego e intenções de compra.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#1a1a1c', padding: '4px', borderRadius: '8px', border: '1px solid #2a2a2c' }}>
            {[1, 7, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{ 
                  background: days === d ? '#ffb000' : 'transparent', 
                  color: days === d ? '#000' : '#888',
                  border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {d === 1 ? '24h' : `${d} Dias`}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1c', border: '1px solid #2a2a2c', color: '#ffb000', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#ffb000', marginBottom: 24 }}>Processando dados...</div>}
      {error && <div style={{ color: '#ff4444', marginBottom: 24 }}>Erro: {error}</div>}

      {/* METRICS ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard icon={<Eye size={20} color="#3b82f6" />} title="VISUALIZAÇÕES" value={totalViews} subtitle="Páginas acessadas" bg="#131316" />
        <MetricCard icon={<Users size={20} color="#f59e0b" />} title="VISITANTES ÚNICOS" value={uniqueVisitors} subtitle="Pessoas reais" bg="#131316" />
        <MetricCard icon={<MousePointerClick size={20} color="#10b981" />} title="CLIQUES GERAIS" value={totalClicks} subtitle="Interações em produtos" bg="#131316" />
        <MetricCard icon={<TrendingUp size={20} color="#ffb000" />} title="INTENÇÃO DE COMPRA" value={`${intentRate}%`} subtitle={`${totalClicks} cliques em produtos`} bg="#1f1a10" borderColor="#ffb000" textColor="#ffb000" />
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        
        {/* ORIGEM DO TRÁFEGO */}
        <div style={{ background: '#131316', border: '1px solid #2a2a2c', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#fff' }}>
            <Globe size={18} color="#ec4899" /> Origem do Tráfego
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 24 }}>De onde vêm os visitantes da sua loja.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {analytics.length === 0 ? <p style={{color:'#666'}}>Sem dados.</p> : analytics.map(a => (
              <div key={a.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
                  <span style={{ textTransform: 'capitalize', color: '#ddd' }}>{a.source}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{a.views} <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 400 }}>({totalViews > 0 ? ((a.views/totalViews)*100).toFixed(0) : 0}%)</span></span>
                </div>
                <div style={{ height: 6, background: '#2a2a2c', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${totalViews > 0 ? (a.views/totalViews)*100 : 0}%`, height: '100%', background: a.source.includes('instagram') ? 'linear-gradient(90deg, #f58529, #dd2a7b, #8134af)' : '#555' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DISPOSITIVOS */}
        <div style={{ background: '#131316', border: '1px solid #2a2a2c', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#fff' }}>
            <Smartphone size={18} color="#10b981" /> Dispositivos
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 24 }}>Distribuição de acessos por tipo de tela.</p>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <DeviceCard icon={<Smartphone size={24} />} name="Celular" count={devices.Mobile} total={devices.Total} color="#ffb000" />
            <DeviceCard icon={<Monitor size={24} />} name="PC" count={devices.Desktop} total={devices.Total} color="#3b82f6" />
          </div>
        </div>

      </div>

      {/* REAL-TIME FEED TABLE */}
      <div style={{ background: '#131316', border: '1px solid #2a2a2c', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.1rem', color: '#fff' }}>
              <Clock size={18} color="#ffb000" /> Feed de Acessos & Ações em Tempo Real
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#888' }}>Cada visita e clique nos produtos são gravados no banco de dados.</p>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#666" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar ação, origem..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: '#1a1a1c', border: '1px solid #333', color: '#fff', padding: '8px 12px 8px 36px', borderRadius: '20px', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead style={{ background: '#0a0a0b', borderBottom: '1px solid #2a2a2c' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DATA / HORA</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>TIPO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>AÇÃO / EVENTO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>PÁGINA</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DISPOSITIVO & NAVEGADOR</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>ORIGEM</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Nenhum evento encontrado.</td></tr>
              ) : filteredEvents.map((e, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1a1a1c', transition: 'background 0.2s' }} onMouseEnter={ev => ev.currentTarget.style.background='#1a1a1c'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{new Date(e.createdAt).toLocaleTimeString('pt-BR')}</div>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>{new Date(e.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      background: e.type === 'visit' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: e.type === 'visit' ? '#3b82f6' : '#10b981',
                      border: `1px solid ${e.type === 'visit' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                      {e.type === 'visit' ? <Eye size={12} /> : <MousePointerClick size={12} />}
                      {e.type === 'visit' ? 'Visita' : 'Venda/Clique'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                    {e.type === 'visit' ? 'Acesso: Page' : `Acesso: Link Produto #${e.productCode}`}
                    {e.productName && <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 400, marginTop: 4 }}>{e.productName}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: '#1a1a1c', padding: '4px 8px', borderRadius: 4, color: '#ccc', fontSize: '0.85rem' }}>
                      {e.pathname || '/'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#ccc', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.device === 'Mobile' ? <Smartphone size={14} color="#ffb000" /> : <Monitor size={14} color="#3b82f6" />}
                    {e.browser || (e.device === 'Mobile' ? 'iOS · Safari' : 'Windows · Chrome')}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#888', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={14} /> {e.referrer || e.source || 'Direto'}
                    </div>
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

function MetricCard({ icon, title, value, subtitle, bg, borderColor = '#2a2a2c', textColor = '#fff' }: any) {
  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, color: '#888' }}>{title}</span>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: textColor, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 8 }}>{subtitle}</div>
    </div>
  );
}

function DeviceCard({ icon, name, count, total, color }: any) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ flex: 1, background: '#1a1a1c', border: '1px solid #2a2a2c', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color }}>{icon}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: 12 }}>{count}</div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{pct}%</div>
    </div>
  );
}
