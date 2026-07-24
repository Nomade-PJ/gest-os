import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Smartphone, Wrench, DollarSign, TrendingUp, Clock, CheckCircle2, ArrowRight, Plus, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/StatsCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCompanyInfo } from "@/contexts/CompanyContext";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
const getLast7Days = () => {
  return Array.from({
    length: 7
  }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "numeric"
      })
    };
  });
};
const formatCurrency = v => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
}).format(v ?? 0);
const CustomTooltipRevenue = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-primary">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>;
};
const CustomTooltipServices = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map(p => <p key={p.name} style={{
      color: p.color
    }}>
          {p.name === "completed" ? "Concluídas" : p.name === "pending" ? "Pendentes" : "Total"}: {p.value}
        </p>)}
    </div>;
};
export default function Dashboard() {
  const navigate = useNavigate();
  const { companyInfo } = useCompanyInfo();
  const {
    organizationId,
    loading: orgLoading
  } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [serviceChartData, setServiceChartData] = useState([]);
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [recentServices, setRecentServices] = useState([]);
  useEffect(() => {
    if (orgLoading || !organizationId) return;
    const load = async () => {
      setLoading(true);
      try {
        // Analytics RPC
        const {
          data: an
        } = await supabase.rpc("get_dashboard_analytics", {
          org_id: organizationId
        });
        setAnalytics(an);

        // Last 7 days services
        const {
          data: svc
        } = await supabase.from("services").select("id, status, price, created_at, service_type, other_service_description").eq("organization_id", organizationId).order("created_at", {
          ascending: false
        }).limit(50);
        const days = getLast7Days();
        setServiceChartData(days.map(d => {
          const day = svc?.filter(s => s.created_at?.split("T")[0] === d.date) ?? [];
          return {
            name: d.label,
            total: day.length,
            completed: day.filter(s => s.status === "completed" || s.status === "delivered").length,
            pending: day.filter(s => s.status === "pending" || s.status === "in_repair").length
          };
        }));
        setRevenueChartData(days.map(d => {
          const day = svc?.filter(s => s.created_at?.split("T")[0] === d.date && (s.status === "completed" || s.status === "delivered")) ?? [];
          return {
            name: d.label,
            valor: day.reduce((sum, s) => sum + (s.price ?? 0), 0)
          };
        }));

        // Recent 5
        setRecentServices((svc ?? []).slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organizationId, orgLoading]);
  const clients = analytics?.clients ?? {
    total: 0,
    newThisMonth: 0
  };
  const devices = analytics?.devices ?? {
    total: 0,
    needsService: 0
  };
  const services = analytics?.services ?? {
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0
  };
  const revenue = analytics?.revenue ?? {
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    percentChange: 0
  };
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.07
      }
    }
  };
  return <div className="space-y-6 animate-fade-in-up">
      {!companyInfo?.document && <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-sm text-amber-900 dark:text-amber-200 truncate">
              <span className="font-semibold">Complete o cadastro da sua empresa</span> — CNPJ/CPF e endereço ajudam a deixar seus comprovantes e etiquetas completos.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard/settings?tab=company")} className="shrink-0">
            Completar cadastro
          </Button>
        </div>}
      <PageHeader title="Dashboard" description={`Visão geral do seu negócio — ${new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    })}`} actions={<Button onClick={() => navigate("/dashboard/service-registration/new")} className="gap-2 shadow-primary">
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>} />

      {/* ── KPI Cards ── */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Clientes" value={loading ? "—" : clients.total} subtitle={`+${clients.newThisMonth} novos este mês`} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20" loading={loading} delay={0} onClick={() => navigate("/dashboard/clients")} />
        <StatsCard title="Dispositivos" value={loading ? "—" : devices.total} subtitle={`${devices.needsService} aguardando serviço`} icon={Smartphone} iconColor="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-900/20" loading={loading} delay={0.07} onClick={() => navigate("/dashboard/devices")} />
        <StatsCard title="OS Abertas" value={loading ? "—" : services.pending} subtitle={`${services.completed} concluídas no total`} icon={Wrench} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-900/20" loading={loading} delay={0.14} onClick={() => navigate("/dashboard/services")} />
        <StatsCard title="Faturamento (mês)" value={loading ? "—" : formatCurrency(revenue.thisMonth)} subtitle={`Total: ${formatCurrency(revenue.total)}`} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" trend={revenue.percentChange} trendLabel="vs mês anterior" loading={loading} delay={0.21} />
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Area Chart (3/5) */}
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.28,
        duration: 0.35
      }} className="lg:col-span-3">
          <Card className="card-surface h-full">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Faturamento — 7 dias</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Receita de OS concluídas</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Últimos 7 dias
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{
                  top: 4,
                  right: 4,
                  left: 0,
                  bottom: 0
                }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221,83%,53%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10
                  }} axisLine={false} tickLine={false} />
                    <YAxis tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10
                  }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <Tooltip content={<CustomTooltipRevenue />} />
                    <Area type="monotone" dataKey="valor" stroke="hsl(221,83%,53%)" strokeWidth={2} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Completion Donut + Stats (2/5) */}
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.35,
        duration: 0.35
      }} className="lg:col-span-2 flex flex-col gap-4">
          {/* Completion rate */}
          <Card className="card-surface flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Taxa de Conclusão</CardTitle>
              <p className="text-xs text-muted-foreground">OS finalizadas vs total</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-foreground">{services.percentage ?? 0}</span>
                <span className="text-lg font-medium text-muted-foreground mb-1">%</span>
              </div>
              <Progress value={services.percentage ?? 0} className="h-2" />
              <div className="grid grid-cols-3 gap-2">
                {[{
                label: "Abertas",
                val: services.pending,
                color: "text-amber-500"
              }, {
                label: "Concluídas",
                val: services.completed,
                color: "text-emerald-500"
              }, {
                label: "Total",
                val: services.total,
                color: "text-foreground"
              }].map(item => <div key={item.label} className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className={`text-lg font-bold ${item.color}`}>{item.val}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>)}
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="card-surface">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                  <p className="text-sm font-semibold">{services.pending} OS</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard/services")}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                  <p className="text-sm font-semibold">{services.completed} OS</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Novos Clientes</p>
                  <p className="text-sm font-semibold">{clients.newThisMonth} este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Services Chart + Recent OS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart (2/5) */}
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.4,
        duration: 0.35
      }} className="lg:col-span-2">
          <Card className="card-surface h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">OS por Dia</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 7 dias</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceChartData} margin={{
                  top: 4,
                  right: 4,
                  left: -16,
                  bottom: 0
                }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 9
                  }} axisLine={false} tickLine={false} />
                    <YAxis tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10
                  }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipServices />} />
                    <Bar dataKey="completed" fill="#10B981" radius={[3, 3, 0, 0]} barSize={10} />
                    <Bar dataKey="pending" fill="#F59E0B" radius={[3, 3, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-[10px] text-muted-foreground">Concluídas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span className="text-[10px] text-muted-foreground">Pendentes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent OS Table (3/5) */}
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.47,
        duration: 0.35
      }} className="lg:col-span-3">
          <Card className="card-surface h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Últimas Ordens de Serviço</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">5 mais recentes</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/dashboard/services")}>
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <div className="px-6 py-4 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="flex items-center gap-3">
                      <div className="skeleton h-8 w-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 w-40 rounded" />
                        <div className="skeleton h-2.5 w-24 rounded" />
                      </div>
                      <div className="skeleton h-5 w-20 rounded-full" />
                    </div>)}
                </div> : recentServices.length === 0 ? <EmptyState icon={Wrench} title="Nenhuma OS ainda" description="Crie sua primeira Ordem de Serviço para começar." actionLabel="Nova OS" onAction={() => navigate("/dashboard/service-registration/new")} compact /> : <div className="divide-y divide-border">
                  {recentServices.map((svc, i) => <motion.div key={svc.id} initial={{
                opacity: 0,
                x: -8
              }} animate={{
                opacity: 1,
                x: 0
              }} transition={{
                delay: 0.5 + i * 0.05
              }} onClick={() => navigate("/dashboard/services")} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {(svc.other_service_description || svc.service_type)?.slice(0, 40) || "Ordem de Serviço"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(svc.created_at).toLocaleDateString("pt-BR")}
                          {svc.price ? ` · ${formatCurrency(svc.price)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={svc.status} size="sm" />
                    </motion.div>)}
                </div>}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>;
}
