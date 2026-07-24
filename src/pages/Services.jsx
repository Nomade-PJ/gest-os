import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Wrench, Search, Plus, CalendarIcon, X, CreditCard, QrCode, Banknote, Clock, ChevronDown, Check, Smartphone, RefreshCw, Pencil, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from "@/contexts/AuthContext";
import { sendNotification } from "@/lib/notifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceActionsMenu from "@/components/ServiceActionsMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Nomes de exibição do status (usado em textos simples: toasts, filtros)
const statusNames = {
  pending: "Pendente",
  in_progress: "Em andamento",
  waiting_parts: "Aguardando peças",
  completed: "Concluído",
  delivered: "Entregue"
};
const Services = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Using "all" instead of empty string
  const [paymentFilter, setPaymentFilter] = useState("all"); // Filtro de pagamentos
  const [loading, setLoading] = useState(true);
  const {
    organizationId,
    loading: orgLoading
  } = useOrganization();
  const { user } = useAuth();
  const [calendarDate, setCalendarDate] = useState(null);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const isMobile = useIsMobile();

  // Estado para controlar o modal de visualização
  const [selectedServiceForView, setSelectedServiceForView] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 20; // Carregar 20 serviços por vez

  // Scroll infinito
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Fetch services from the database with pagination
  const fetchServices = useCallback(async (page = 1, resetData = true) => {
    try {
      if (resetData) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }
      if (!organizationId) {
        console.warn("ID da organização não encontrado");
        setServices([]);
        setFilteredServices([]);
        return;
      }

      // Calcular offset para paginação
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Buscar dados com paginação
      const {
        data,
        error,
        count
      } = await supabase.from("services").select(`
          *,
          customers (
            name
          ),
          devices (
            brand,
            model,
            password,
            password_type
          )
        `, {
        count: 'exact'
      }).eq('organization_id', organizationId).order('created_at', {
        ascending: false
      }).range(from, to);
      if (error) throw error;

      // Atualizar estados
      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
      if (resetData) {
        // Primeira carga ou reset
        setServices(data || []);
        setCurrentPage(1);
      } else {
        // Carregamento adicional (scroll infinito)
        setServices(prev => [...prev, ...(data || [])]);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os serviços."
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [organizationId, ITEMS_PER_PAGE]);

  // Fetch services on component mount
  useEffect(() => {
    if (!orgLoading) {
      fetchServices();
    }
  }, [organizationId, orgLoading, fetchServices]);

  // Função de busca otimizada usando RPC
  const searchServices = useCallback(async (term = "", status = "all", payment = "all", date = null, page = 1, resetData = true) => {
    try {
      if (resetData) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }
      if (!organizationId) {
        setServices([]);
        setFilteredServices([]);
        return;
      }

      // Calcular offset para paginação
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Usar a função RPC para busca
      const {
        data,
        error
      } = await supabase.rpc('search_services', {
        search_term: term || null,
        org_id: organizationId,
        status_filter: status,
        payment_filter: payment,
        date_filter: date ? date.toISOString() : null,
        page_offset: offset,
        page_limit: ITEMS_PER_PAGE
      });
      if (error) throw error;

      // Transformar os dados para o formato esperado pelo componente
      const transformedData = data?.map(service => ({
        ...service,
        customers: {
          name: service.customer_name
        },
        devices: {
          brand: service.device_brand,
          model: service.device_model,
          password: service.device_password,
          password_type: service.device_password_type
        }
      })) || [];

      // Para calcular o total, fazer uma busca separada apenas com count
      const {
        count
      } = await supabase.rpc('search_services', {
        search_term: term || null,
        org_id: organizationId,
        status_filter: status,
        payment_filter: payment,
        date_filter: date ? date.toISOString() : null,
        page_offset: 0,
        page_limit: 999999
      });
      setTotalCount(count || transformedData.length);
      setHasMore((transformedData?.length || 0) === ITEMS_PER_PAGE);
      if (resetData) {
        // Primeira carga ou reset
        setServices(transformedData);
        setCurrentPage(1);
      } else {
        // Carregamento adicional (scroll infinito)
        setServices(prev => [...prev, ...transformedData]);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error searching services:", error);
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: "Não foi possível buscar os serviços."
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [organizationId, ITEMS_PER_PAGE]);

  // Função para carregar mais serviços (com filtros aplicados)
  const loadMoreServices = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const nextPage = currentPage + 1;
    await searchServices(searchTerm, statusFilter, paymentFilter, calendarDate, nextPage, false);
  }, [hasMore, loadingMore, currentPage, searchTerm, statusFilter, paymentFilter, calendarDate, searchServices]);

  // Apply filters when search term, status filter, or calendar date changes
  useEffect(() => {
    // Debounce para evitar muitas consultas
    const timeoutId = setTimeout(() => {
      searchServices(searchTerm, statusFilter, paymentFilter, calendarDate);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, paymentFilter, calendarDate, organizationId, searchServices]);

  // Sincronizar filteredServices quando services mudar (para atualizações em tempo real)
  useEffect(() => {
    setFilteredServices(services);
  }, [services]);

  // Função para atualizar um serviço específico mantendo o filtro
  const handleServiceUpdate = async serviceId => {
    try {
      // Buscar o serviço atualizado
      const {
        data: updatedService,
        error
      } = await supabase.from("services").select(`
          *,
          customers (
            name
          ),
          devices (
            brand,
            model,
            password,
            password_type
          )
        `).eq('id', serviceId).eq('organization_id', organizationId).single();
      if (error) throw error;

      // Verificar se o serviço ainda se encaixa no filtro atual
      const shouldRemoveFromCurrentFilter = () => {
        if (statusFilter === 'all') return false;
        return updatedService.status !== statusFilter;
      };
      if (shouldRemoveFromCurrentFilter()) {
        // Remover da lista atual se não se encaixar mais no filtro
        setServices(prev => prev.filter(s => s.id !== serviceId));
        setFilteredServices(prev => prev.filter(s => s.id !== serviceId));
        setTotalCount(prev => prev - 1);
      } else {
        // Atualizar o item na lista
        setServices(prev => prev.map(s => s.id === serviceId ? updatedService : s));
        setFilteredServices(prev => prev.map(s => s.id === serviceId ? updatedService : s));
      }
    } catch (error) {
      console.error('Error updating service in list:', error);
      // Em caso de erro, recarregar a lista mantendo os filtros
      searchServices(searchTerm, statusFilter, paymentFilter, calendarDate);
    }
  };

  // Scroll infinito - detectar quando usuário está próximo do final
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // Carrega mais quando está a 200px do final
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
      setIsNearBottom(nearBottom);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Carregar mais dados automaticamente quando próximo do final
  useEffect(() => {
    if (isNearBottom && hasMore && !loading && !loadingMore && filteredServices.length > 0) {
      loadMoreServices();
    }
  }, [isNearBottom, hasMore, loading, loadingMore, filteredServices.length, loadMoreServices]);

  // Format price as currency
  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Handle service edit
  const handleEdit = service => {
    navigate(`/dashboard/service-registration/${service.customer_id}/${service.device_id}?serviceId=${service.id}`);
  };

  // Clear date filter
  const clearDateFilter = () => {
    setCalendarDate(null);
    setShowCalendarFilter(false);
  };

  // Métodos de pagamento
  const paymentMethods = {
    pending: "Pagamento Pendente",
    credit: "Crédito",
    debit: "Débito",
    pix: "Pix",
    cash: "Espécie"
  };
  const updatePaymentMethod = async (serviceId, method) => {
    try {
      // Atualizar apenas o método de pagamento, sem alterar o status
      const updateData = {
        payment_method: method
      };
      const {
        error
      } = await supabase.from("services").update(updateData).eq("id", serviceId).eq('organization_id', organizationId); // Adicionando filtro por organization_id para RLS

      if (error) throw error;
      toast({
        title: "Serviço atualizado",
        description: `Método de pagamento atualizado para ${paymentMethods[method]}.`
      });
      fetchServices();
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar serviço",
        description: "Não foi possível atualizar o método de pagamento."
      });
    }
  };

  // Function to update service status - agora recebe o novo status diretamente
  const handleStatusChange = async (serviceId, newStatus) => {
    try {
      if (!organizationId) {
        throw new Error('ID da organização não encontrado');
      }

      // Usar a função RPC para atualizar o status
      const {
        data,
        error
      } = await supabase.rpc('update_service_status', {
        p_service_id: serviceId,
        p_organization_id: organizationId,
        p_status: newStatus
      });
      if (error) {
        console.error("Erro detalhado:", error);
        throw error;
      }

      // Verificar se a operação foi bem-sucedida
      if (!data || data.success === false) {
        const errorMsg = data?.error || 'Falha ao atualizar o status';
        console.error("Erro retornado pela função:", errorMsg);
        throw new Error(errorMsg);
      }
      toast({
        title: "Status atualizado",
        description: `O serviço agora está ${statusNames[newStatus]}.`
      });

      // Dispara notificação no sino apenas para os status que importam
      if (user && (newStatus === "in_progress" || newStatus === "completed")) {
        const service = services.find(s => s.id === serviceId);
        const clientName = service?.customers?.name || "Cliente";
        const deviceInfo = service?.devices ? `${service.devices.brand} ${service.devices.model}` : "";
        sendNotification({
          userId: user.id,
          type: "service",
          title: newStatus === "completed" ? `OS de ${clientName} concluída` : `OS de ${clientName} em andamento`,
          description: deviceInfo ? `Dispositivo: ${deviceInfo}` : `Status atualizado para ${statusNames[newStatus]}.`,
          actionLink: `/dashboard/service-registration/${service?.customer_id}/${service?.device_id}?serviceId=${serviceId}`,
          relatedId: serviceId
        }).catch(err => console.error("Erro ao criar notificação:", err));
      }

      // Atualizar o serviço específico
      handleServiceUpdate(serviceId);
    } catch (error) {
      console.error('Error updating service status:', error);
      let errorMessage = "Ocorreu um erro ao atualizar o status do serviço.";
      if (error instanceof Error) {
        errorMessage += ` Detalhes: ${error.message}`;
      }
      if (error && typeof error === 'object' && 'code' in error) {
        errorMessage += ` (Código: ${error.code})`;
      }
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: errorMessage
      });
    }
  };

  // Opções de status disponíveis (usadas tanto na tabela quanto no card mobile)
  const STATUS_OPTIONS = Object.keys(statusNames);

  // Badge de status com menu de troca — único ponto de verdade, reaproveitado
  // na tabela (desktop) e no card (mobile) em vez de duas implementações.
  const renderStatusBadge = (status, serviceId, interactive = false) => {
    if (interactive && serviceId) {
      return <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer">
              <StatusBadge status={status} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {STATUS_OPTIONS.map(option => <DropdownMenuItem key={option} onClick={() => handleStatusChange(serviceId, option)} className="cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <StatusBadge status={option} size="sm" showDot={false} className="flex-1 justify-start" />
                  {status === option && <Check className="ml-auto h-4 w-4" />}
                </div>
              </DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>;
    }
    return <StatusBadge status={status} size="sm" />;
  };

  // Componente para renderizar serviço em card (mobile)
  const ServiceCard = ({
    service
  }) => {
    const getPaymentIcon = paymentMethod => {
      switch (paymentMethod) {
        case 'pix':
          return <QrCode className="h-4 w-4" />;
        case 'cash':
          return <Banknote className="h-4 w-4" />;
        case 'credit':
        case 'debit':
          return <CreditCard className="h-4 w-4" />;
        default:
          return <Clock className="h-4 w-4 text-yellow-500" />;
      }
    };
    const paymentMethods = {
      pending: "Pendente",
      credit: "Crédito",
      debit: "Débito",
      pix: "Pix",
      cash: "Espécie"
    };
    return <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  OS #{service.id ? service.id.substring(0, 8).toUpperCase() : "N/A"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {service.customers?.name || "Cliente não encontrado"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {renderStatusBadge(service.status, service.id, true)}
              <span className="text-sm font-medium">
                {formatCurrency(service.price || 0)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {service.devices ? `${service.devices.brand} ${service.devices.model}` : "Dispositivo não encontrado"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  {service.service_type === 'other' ? service.other_service_description : getServiceLabel(service.service_type)}
                </span>
              </div>
              <div className="flex gap-1 ml-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-fit px-2 py-0 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs" onClick={() => setSelectedServiceForView(service)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Visualizar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Visualizar detalhes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-fit px-2 py-0 hover:bg-primary/10 text-xs" onClick={() => handleEdit(service)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar serviço</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm hover:bg-muted p-2 rounded-md transition-colors">
                    {getPaymentIcon(service.payment_method)}
                    <span>
                      {service.payment_method ? service.payment_method === 'pending' ? "Selecionar Pagamento" : paymentMethods[service.payment_method] : "Selecionar Pagamento"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-48" align="start">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm font-medium border-b">Cartão</div>
                    <button className="w-full text-left px-8 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => updatePaymentMethod(service.id, 'credit')}>
                      Crédito
                    </button>
                    <button className="w-full text-left px-8 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => updatePaymentMethod(service.id, 'debit')}>
                      Débito
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center" onClick={() => updatePaymentMethod(service.id, 'pix')}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Pix
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center" onClick={() => updatePaymentMethod(service.id, 'cash')}>
                      <Banknote className="h-4 w-4 mr-2" />
                      Espécie
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <ServiceActionsMenu service={service} onUpdate={fetchServices} />
            </div>
          </div>
        </CardContent>
      </Card>;
  };
  return <div className="space-y-6 w-full overflow-hidden animate-fade-in-up">
      <PageHeader title="Serviços" description="Gerenciamento de Ordens de Serviço" actions={<Button onClick={() => navigate("/dashboard/service-registration/new")} className="gap-2 shadow-primary shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova OS</span>
          </Button>}>
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
          <Wrench className="h-5 w-5 text-amber-600" />
        </div>
      </PageHeader>

      <Card className="card-surface p-4 lg:p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
          <div className="w-full flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative w-full sm:w-48 lg:w-56">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar serviços..." className="pl-8 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] lg:w-[170px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="waiting_parts">Aguardando peças</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={`w-full sm:w-[160px] lg:w-[170px] justify-between text-sm ${paymentFilter !== "all" ? "border-primary text-primary" : ""}`}>
                  {paymentFilter === "all" && "Buscar Pagamentos"}
                  {paymentFilter === "pending" && <>
                      <Clock className="h-4 w-4 mr-1" />
                      Pendentes
                    </>}
                  {paymentFilter === "paid" && <>
                      <Check className="h-4 w-4 mr-1" />
                      Pagos
                    </>}
                  {paymentFilter === "pix" && <>
                      <QrCode className="h-4 w-4 mr-1" />
                      Pix
                    </>}
                  {paymentFilter === "cash" && <>
                      <Banknote className="h-4 w-4 mr-1" />
                      Espécie
                    </>}
                  {paymentFilter === "card" && <>
                      <CreditCard className="h-4 w-4 mr-1" />
                      Cartão
                    </>}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[170px]">
                <DropdownMenuItem onClick={() => setPaymentFilter("all")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPaymentFilter("pending")}>
                  <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                  Pendentes
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Pagos
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setPaymentFilter("paid")}>
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        Todos Pagos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPaymentFilter("pix")}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Pix
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPaymentFilter("cash")}>
                        <Banknote className="h-4 w-4 mr-2" />
                        Espécie
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPaymentFilter("card")}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Cartão
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Popover open={showCalendarFilter} onOpenChange={setShowCalendarFilter}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`w-full sm:w-auto flex gap-2 text-sm ${calendarDate ? 'text-primary' : ''}`} size="sm">
                    <CalendarIcon className="h-4 w-4" />
                    {calendarDate ? format(calendarDate, "dd/MM/yyyy") : "Filtrar por data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={calendarDate} onSelect={date => {
                  setCalendarDate(date);
                  setShowCalendarFilter(false);
                }} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
              
              {calendarDate && <Button variant="ghost" size="sm" onClick={clearDateFilter} title="Limpar filtro de data" className="p-1">
                  <X className="h-4 w-4" />
                </Button>}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => searchServices(searchTerm, statusFilter, paymentFilter, calendarDate, 1, true)} disabled={loading} title="Atualizar lista" className="p-2">
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Atualizar lista de serviços</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="w-full xl:w-auto flex justify-end">
            <Button className="w-full sm:w-auto min-w-[140px] flex-shrink-0" onClick={() => navigate("/dashboard/clients")} size="sm">
              <Plus className="h-4 w-4 mr-2" /> {isMobile ? 'Novo' : 'Novo Serviço'}
            </Button>
          </div>
        </div>
        
        {/* Renderização condicional: Cards no mobile, tabela no desktop */}
        {isMobile ? <div className="space-y-4">
            {loading ? <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div> : filteredServices.length === 0 ? <div className="text-center py-10 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum serviço encontrado.</p>
                {(calendarDate || statusFilter !== 'all' || paymentFilter !== 'all') && <p className="text-sm mt-2">
                    Filtros ativos: 
                    {calendarDate && ` Data: ${format(calendarDate, "dd/MM/yyyy")}`}
                    {statusFilter !== 'all' && ` Status: ${statusNames[statusFilter]}`}
                    {paymentFilter !== 'all' && ` Pagamento: ${paymentFilter === 'pending' ? 'Pendentes' : paymentFilter === 'paid' ? 'Todos Pagos' : paymentFilter === 'pix' ? 'Pix' : paymentFilter === 'cash' ? 'Espécie' : paymentFilter === 'card' ? 'Cartão' : ''}`}
                  </p>}
              </div> : <>
                {filteredServices.map(service => <ServiceCard key={service.id} service={service} />)}
                
                {/* Indicador de Loading Infinito para Mobile */}
                {loadingMore && <div className="flex justify-center items-center p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Carregando mais serviços...</span>
                  </div>}
                
                {/* Indicador de fim dos resultados */}
                {!hasMore && filteredServices.length > 0 && <div className="text-center p-4 text-muted-foreground text-sm">
                    Todos os serviços foram carregados ({filteredServices.length} de {totalCount})
                  </div>}
              </>}
          </div> : <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método de Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
            <TableCaption>
              {(calendarDate || statusFilter !== 'all' || paymentFilter !== 'all') && <div className="text-sm text-muted-foreground">
                  {calendarDate && <>Filtrando serviços por data: {format(calendarDate, "dd/MM/yyyy")}</>}
                  {statusFilter !== 'all' && <> (Status: {statusNames[statusFilter]})</>}
                  {paymentFilter !== 'all' && <> (Pagamento: {paymentFilter === 'pending' ? 'Pendentes' : paymentFilter === 'paid' ? 'Todos Pagos' : paymentFilter === 'pix' ? 'Pix' : paymentFilter === 'cash' ? 'Espécie' : paymentFilter === 'card' ? 'Cartão' : ''})</>}
                </div>}
              {filteredServices.length === 0 && <div className="py-4 text-center">
                  Nenhum serviço encontrado com os filtros atuais.
                </div>}
            </TableCaption>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando serviços...
                  </TableCell>
                </TableRow> : filteredServices.length === 0 ? <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhum serviço encontrado.
                  </TableCell>
                </TableRow> : filteredServices.map(service => <TableRow key={service.id}>
                    <TableCell>{service.customers?.name || "Cliente não encontrado"}</TableCell>
                    <TableCell>
                      {service.devices ? `${service.devices.brand} ${service.devices.model}` : "Dispositivo não encontrado"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>
                          {service.service_type === 'other' ? service.other_service_description : getServiceLabel(service.service_type)}
                        </span>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-fit px-2 py-0 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs" onClick={() => setSelectedServiceForView(service)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visualizar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Visualizar detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-fit px-2 py-0 hover:bg-primary/10 text-xs" onClick={() => handleEdit(service)}>
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar serviço</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(service.price || 0)}</TableCell>
                    <TableCell>{renderStatusBadge(service.status, service.id, true)}</TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center text-sm hover:underline cursor-pointer">
                            {service.payment_method === 'pix' ? <QrCode className="h-4 w-4 mr-1" /> : service.payment_method === 'cash' ? <Banknote className="h-4 w-4 mr-1" /> : service.payment_method === 'credit' || service.payment_method === 'debit' ? <CreditCard className="h-4 w-4 mr-1" /> : <Clock className="h-4 w-4 mr-1 text-yellow-500" />}
                            {service.payment_method ? service.payment_method === 'pending' ? "Selecionar Pagamento" : paymentMethods[service.payment_method] : "Selecionar Pagamento"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-48" align="start">
                          <div className="py-1">
                            <div className="px-4 py-2 text-sm font-medium border-b">Cartão</div>
                            <button className="w-full text-left px-8 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => updatePaymentMethod(service.id, 'credit')}>
                              Crédito
                            </button>
                            <button className="w-full text-left px-8 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => updatePaymentMethod(service.id, 'debit')}>
                              Débito
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center" onClick={() => updatePaymentMethod(service.id, 'pix')}>
                              <QrCode className="h-4 w-4 mr-2" />
                              Pix
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center" onClick={() => updatePaymentMethod(service.id, 'cash')}>
                              <Banknote className="h-4 w-4 mr-2" />
                              Espécie
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <ServiceActionsMenu service={service} onUpdate={() => handleServiceUpdate(service.id)} onDelete={fetchServices} />
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
          
          {/* Indicador de Loading Infinito para Desktop */}
          {loadingMore && <div className="flex justify-center items-center p-6 border-t">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Carregando mais serviços...</span>
            </div>}
          
          {/* Indicador de fim dos resultados */}
          {!hasMore && filteredServices.length > 0 && <div className="text-center p-4 border-t text-muted-foreground text-sm">
              Todos os serviços foram carregados ({filteredServices.length} de {totalCount})
            </div>}
        </div>}
      </Card>
      
      {/* ServiceActionsMenu invisível para visualização rápida */}
      {selectedServiceForView && <div style={{
      display: 'none'
    }}>
          <ServiceActionsMenu service={selectedServiceForView} autoOpenDetails={true} onCloseDetails={() => setSelectedServiceForView(null)} onUpdate={fetchServices} onDelete={fetchServices} />
        </div>}
    </div>;
};

// Helper function to get human-readable service types
const getServiceLabel = serviceType => {
  const serviceTypes = {
    screen_repair: "Troca de Tela",
    battery_replacement: "Troca de Bateria",
    water_damage: "Dano por Água",
    software_issue: "Problema de Software",
    charging_port: "Porta de Carregamento",
    button_repair: "Reparo de Botões",
    camera_repair: "Reparo de Câmera",
    mic_speaker_repair: "Reparo de Microfone/Alto-falante",
    diagnostics: "Diagnóstico Completo",
    unlocking: "Desbloqueio",
    data_recovery: "Recuperação de Dados"
  };
  return serviceTypes[serviceType] || serviceType;
};
export default Services;
