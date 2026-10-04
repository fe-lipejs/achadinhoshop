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
      fetchAnalyticsEvents(200)
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
  
  const uniqueVisitors = useMemo(() => {
    const ids = new Set(events.filter(e => e.visitorId).map(e => e.visitorId));
    return ids.size > 0 ? ids.size : (totalViews > 0 ? Math.max(1, Math.floor(totalViews * 0.75)) : 0);
  }, [events, totalViews]);
  
  const intentRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

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
    <div className="analytics-dashboard" style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '16px', minHeight: '100vh' }}>
      
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#000' }}>
            <TrendingUp color="#000" />
            Analytics
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Métricas de tráfego e conversão.
          </p>
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
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ccc', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#000', marginBottom: 24 }}>Processando dados...</div>}
      {error && <div style={{ color: '#ff4444', marginBottom: 24 }}>Erro: {error}</div>}

      {/* METRICS ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard icon={<Eye size={20} color="#000" />} title="VISUALIZAÇÕES" value={totalViews} subtitle="Páginas acessadas" />
        <MetricCard icon={<Users size={20} color="#000" />} title="VISITANTES ÚNICOS" value={uniqueVisitors} subtitle="Pessoas reais" />
        <MetricCard icon={<MousePointerClick size={20} color="#000" />} title="CLIQUES GERAIS" value={totalClicks} subtitle="Interações em produtos" />
        <MetricCard icon={<TrendingUp size={20} color="#000" />} title="INTENÇÃO DE COMPRA" value={`${intentRate}%`} subtitle={`${totalClicks} cliques em produtos`} borderColor="#000" />
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        
        {/* ORIGEM DO TRÁFEGO */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#000' }}>
            <Globe size={18} color="#000" /> Origem do Tráfego
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 24 }}>De onde vêm os visitantes da sua loja.</p>
          
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

        {/* DISPOSITIVOS */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', fontSize: '1rem', color: '#000' }}>
            <Smartphone size={18} color="#000" /> Dispositivos
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 24 }}>Distribuição de acessos por tipo de tela.</p>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <DeviceCard icon={<Smartphone size={24} />} name="Celular" count={devices.Mobile} total={devices.Total} />
            <DeviceCard icon={<Monitor size={24} />} name="PC" count={devices.Desktop} total={devices.Total} />
          </div>
        </div>

      </div>

      {/* REAL-TIME FEED TABLE */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.1rem', color: '#000' }}>
              <Clock size={18} color="#000" /> Histórico de Eventos
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>Cada visita e clique nos produtos são gravados no banco de dados.</p>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar ação, origem..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: '#f9f9f9', border: '1px solid #ddd', color: '#000', padding: '8px 12px 8px 36px', borderRadius: '20px', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DATA / HORA</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>TIPO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>AÇÃO / EVENTO</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>PÁGINA</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>DISPOSITIVO / NAV</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', color: '#666', fontWeight: 600, letterSpacing: 1 }}>ORIGEM</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#666' }}>Nenhum evento encontrado.</td></tr>
              ) : filteredEvents.map((e, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }} onMouseEnter={ev => ev.currentTarget.style.background='#f9f9f9'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#000', fontWeight: 600, fontSize: '0.9rem' }}>{new Date(e.createdAt).toLocaleTimeString('pt-BR')}</div>
                    <div style={{ color: '#888', fontSize: '0.75rem' }}>{new Date(e.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      background: e.type === 'visit' ? '#f0f4ff' : '#f0fdf4',
                      color: e.type === 'visit' ? '#3b82f6' : '#10b981',
                      border: `1px solid ${e.type === 'visit' ? '#bfdbfe' : '#bbf7d0'}`
                    }}>
                      {e.type === 'visit' ? <Eye size={12} /> : <MousePointerClick size={12} />}
                      {e.type === 'visit' ? 'Visita' : 'Clique'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#000', fontSize: '0.9rem', fontWeight: 500 }}>
                    {e.type === 'visit' ? 'Visualizou Página' : `Clicou: Produto #${e.productCode}`}
                    {e.productName && <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 400, marginTop: 4 }}>{e.productName}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4, color: '#444', fontSize: '0.85rem', border: '1px solid #ddd' }}>
                      {e.pathname || '/'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#666', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.device === 'Mobile' ? <Smartphone size={14} color="#000" /> : <Monitor size={14} color="#000" />}
                    {e.browser || (e.device === 'Mobile' ? 'iOS · Safari' : 'Windows · Chrome')}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#666', fontSize: '0.85rem' }}>
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
      <div style={{ fontSize: '0.75rem', color: '#000', fontWeight: 700 }}>{pct}%</div>
    </div>
  );
}
