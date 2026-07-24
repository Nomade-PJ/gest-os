import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, RefreshCw, DollarSign, Wrench, Receipt, TrendingUp, Package2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { StatsCard } from '@/components/StatsCard';
import { PageHeader } from '@/components/PageHeader';

// Paleta derivada do design system (não a demo padrão do Recharts)
const CHART_COLORS = ['hsl(221, 83%, 53%)',
// primary blue
'hsl(142, 71%, 45%)',
// emerald
'hsl(38, 92%, 50%)',
// amber
'hsl(270, 85%, 60%)',
// violet
'hsl(0, 84%, 60%)' // red
];
const formatCurrency = v => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(v ?? 0);
const RevenueTooltip = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p style={{
      color: CHART_COLORS[0]
    }}>{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>;
};
const CountTooltip = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1">{label ?? payload[0]?.name}</p>
      <p className="text-foreground">{payload[0]?.value} serviço{payload[0]?.value === 1 ? '' : 's'}</p>
    </div>;
};
const getStatusLabel = status => {
  const labels = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    waiting_parts: 'Aguardando peças',
    completed: 'Concluído',
    delivered: 'Entregue'
  };
  return labels[status] || status;
};
const getServiceTypeLabel = type => {
  const labels = {
    screen_repair: 'Troca de Tela',
    battery_replacement: 'Troca de Bateria',
    water_damage: 'Dano por Água',
    software_issue: 'Problema de Software',
    charging_port: 'Porta de Carregamento',
    button_repair: 'Reparo de Botões',
    camera_repair: 'Reparo de Câmera',
    mic_speaker_repair: 'Reparo de Microfone/Alto-falante',
    diagnostics: 'Diagnóstico',
    unlocking: 'Desbloqueio',
    data_recovery: 'Recuperação de Dados',
    other: 'Outro'
  };
  return labels[type] || type;
};
const Reports = () => {
  const [period, setPeriod] = useState('6');
  const [loading, setLoading] = useState(false);
  const [serviceData, setServiceData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [serviceTypeData, setServiceTypeData] = useState([]);
  const {
    organizationId,
    loading: orgLoading
  } = useOrganization();
  const [deliveredPeriod, setDeliveredPeriod] = useState('24h');
  const [deliveredServicesData, setDeliveredServicesData] = useState({
    count: 0,
    totalValue: 0
  });
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!organizationId) {
        setServiceData([]);
        setStatusData([]);
        setServiceTypeData([]);
        setLoading(false);
        return;
      }
      const {
        data: chartAnalytics,
        error: chartError
      } = await supabase.rpc('get_services_chart_data', {
        org_id: organizationId,
        months_period: parseInt(period)
      });
      if (chartError) throw chartError;
      if (chartAnalytics) {
        setServiceData(chartAnalytics.chartData || []);
        setStatusData((chartAnalytics.statusData || []).map(item => ({
          status: getStatusLabel(item.status),
          count: item.count
        })));
        setServiceTypeData((chartAnalytics.serviceTypeData || []).map(item => ({
          type: getServiceTypeLabel(item.type),
          count: item.count
        })));
      } else {
        setServiceData([]);
        setStatusData([]);
        setServiceTypeData([]);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de serviços para os relatórios',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, period]);
  const fetchDeliveredServices = useCallback(async () => {
    try {
      if (!organizationId) {
        setDeliveredServicesData({
          count: 0,
          totalValue: 0
        });
        return;
      }
      const {
        data: analyticsData,
        error
      } = await supabase.rpc('get_delivered_services_analytics', {
        org_id: organizationId,
        time_period: deliveredPeriod
      });
      if (error) throw error;
      setDeliveredServicesData({
        count: analyticsData.count,
        totalValue: analyticsData.totalValue
      });
    } catch (error) {
      console.error('Error fetching delivered services data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de serviços entregues',
        variant: 'destructive'
      });
      setDeliveredServicesData({
        count: 0,
        totalValue: 0
      });
    }
  }, [organizationId, deliveredPeriod]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (!orgLoading) fetchDeliveredServices();
  }, [fetchDeliveredServices, orgLoading]);

  // ── Export / impressão (documento separado, mantém seu próprio estilo de impressão) ──
  const handleExportReport = () => {
    toast({
      title: 'Preparando relatório',
      description: 'Gerando relatório para impressão...'
    });
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.',
        variant: 'destructive'
      });
      return;
    }
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const reportContent = generateReportHTML(currentDate);
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast({
          title: 'Relatório gerado',
          description: 'Use Ctrl+P ou Cmd+P para salvar como PDF ou imprimir.'
        });
      }, 500);
    };
  };
  const generateReportHTML = currentDate => {
    const periodLabel = {
      '1': 'Último mês',
      '3': 'Últimos 3 meses',
      '6': 'Últimos 6 meses',
      '12': 'Último ano'
    }[period] || 'Período personalizado';
    const totalRevenue = serviceData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalServices = statusData.reduce((sum, item) => sum + (item.count || 0), 0);
    const completedServices = statusData.find(item => item.status === 'Concluído')?.count || 0;
    const reportBody = `
      <div class="summary-grid">
        <div class="summary-card"><div class="card-title">Receita Total</div><div class="card-value">R$ ${totalRevenue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2
    })}</div></div>
        <div class="summary-card"><div class="card-title">Total de Serviços</div><div class="card-value">${totalServices}</div></div>
        <div class="summary-card"><div class="card-title">Serviços Concluídos</div><div class="card-value">${completedServices}</div></div>
        <div class="summary-card"><div class="card-title">Serviços Entregues</div><div class="card-value">${deliveredServicesData.count}</div></div>
      </div>
      <div class="data-section">
        <h2 class="section-title">Receita Mensal</h2>
        <table class="data-table"><thead><tr><th>Mês</th><th>Receita</th></tr></thead><tbody>
          ${serviceData.map(item => `<tr><td>${item.month}</td><td>R$ ${(item.revenue || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2
    })}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="data-section">
        <h2 class="section-title">Distribuição por Status</h2>
        <table class="data-table"><thead><tr><th>Status</th><th>Quantidade</th><th>Percentual</th></tr></thead><tbody>
          ${statusData.map(item => {
      const percentage = totalServices > 0 ? (item.count / totalServices * 100).toFixed(1) : '0';
      return `<tr><td>${item.status}</td><td>${item.count}</td><td>${percentage}%</td></tr>`;
    }).join('')}
        </tbody></table>
      </div>
      <div class="data-section">
        <h2 class="section-title">Tipos de Serviço Mais Comuns</h2>
        <table class="data-table"><thead><tr><th>Tipo de Serviço</th><th>Quantidade</th></tr></thead><tbody>
          ${serviceTypeData.slice(0, 10).map(item => `<tr><td>${item.type}</td><td>${item.count}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório - GestOS</title>
        <style>
          @media print { @page { margin: 2cm; size: A4; } body { -webkit-print-color-adjust: exact; } }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: white; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 30px; }
          .header h1 { font-size: 28px; color: #1e293b; margin-bottom: 10px; }
          .header .subtitle { font-size: 16px; color: #64748b; }
          .info-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .info-item { text-align: center; }
          .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
          .info-value { font-size: 18px; font-weight: 600; color: #1e293b; }
          .data-section { margin-bottom: 30px; }
          .section-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .data-table th { background: #f1f5f9; font-weight: 600; color: #374151; }
          .data-table tr:hover { background: #f8fafc; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
          .summary-card { padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
          .card-title { font-size: 14px; color: #64748b; margin-bottom: 8px; }
          .card-value { font-size: 24px; font-weight: 700; color: #1e293b; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
          @media screen { .container { max-width: 800px; margin: 0 auto; padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>GestOS</h1><div class="subtitle">Relatório de Serviços</div></div>
          <div class="info-section">
            <div class="info-item"><div class="info-label">Data do Relatório</div><div class="info-value">${currentDate}</div></div>
            <div class="info-item"><div class="info-label">Período</div><div class="info-value">${periodLabel}</div></div>
          </div>
          ${reportBody}
          <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema GestOS</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // ── Métricas derivadas (específicas de relatório — não repetem os KPIs do Dashboard) ──
  const totalRevenue = serviceData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalServices = statusData.reduce((sum, item) => sum + (item.count || 0), 0);
  const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;
  const completedCount = statusData.find(i => i.status === 'Concluído')?.count || 0;
  const completionRate = totalServices > 0 ? Math.round(completedCount / totalServices * 100) : 0;
  const periodLabels = {
    '1': 'no último mês',
    '3': 'nos últimos 3 meses',
    '6': 'nos últimos 6 meses',
    '12': 'no último ano'
  };
  return <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Relatórios" description={`Análise de desempenho ${periodLabels[period] ?? ''}`} actions={<>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mês</SelectItem>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </>} />

      {/* ── Métricas do período ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Receita do período" value={loading ? '—' : formatCurrency(totalRevenue)} subtitle={periodLabels[period] ?? ''} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" loading={loading} delay={0} />
        <StatsCard title="Ticket médio" value={loading ? '—' : formatCurrency(avgTicket)} subtitle="por serviço concluído" icon={Receipt} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20" loading={loading} delay={0.07} />
        <StatsCard title="Serviços no período" value={loading ? '—' : totalServices} subtitle={`${completedCount} concluídos`} icon={Wrench} iconColor="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-900/20" loading={loading} delay={0.14} />
        <StatsCard title="Taxa de conclusão" value={loading ? '—' : `${completionRate}%`} subtitle="serviços finalizados" icon={TrendingUp} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-900/20" loading={loading} delay={0.21} />
      </div>

      {/* ── Receita mensal ── */}
      <motion.div initial={{
      opacity: 0,
      y: 16
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.28,
      duration: 0.35
    }}>
        <Card className="card-surface">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Receita Mensal</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Faturamento por mês no período selecionado</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serviceData} margin={{
                top: 4,
                right: 4,
                left: 0,
                bottom: 0
              }}>
                  <defs>
                    <linearGradient id="reportsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11
                }} axisLine={false} tickLine={false} />
                  <YAxis tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11
                }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#reportsRevenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Status e tipos de serviço ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.35,
        duration: 0.35
      }}>
          <Card className="card-surface h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Serviços no período selecionado</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({
                    percent
                  }) => `${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="count" nameKey="status">
                      {statusData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CountTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 justify-center">
                {statusData.map((item, i) => <div key={item.status} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                }} />
                    <span className="text-[11px] text-muted-foreground">{item.status}</span>
                  </div>)}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.42,
        duration: 0.35
      }}>
          <Card className="card-surface h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Tipos de Serviço</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Mais comuns no período</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={serviceTypeData.slice(0, 5)} margin={{
                  top: 4,
                  right: 12,
                  left: 8,
                  bottom: 0
                }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10
                  }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="type" type="category" width={110} tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10
                  }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Serviços entregues ── */}
      <motion.div initial={{
      opacity: 0,
      y: 16
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.49,
      duration: 0.35
    }}>
        <Card className="card-surface">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Serviços Entregues</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Volume e valor no período escolhido</p>
              </div>
              <Select value={deliveredPeriod} onValueChange={value => {
              setDeliveredPeriod(value);
            }}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24 horas</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="1m">Último mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Package2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="text-2xl font-bold text-foreground">{deliveredServicesData.count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(deliveredServicesData.totalValue)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>;
};
export default Reports;
