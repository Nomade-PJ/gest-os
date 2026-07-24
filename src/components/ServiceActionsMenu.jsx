import React, { useState, useEffect } from 'react';
import { Lock, Grid3x3, Hash, Type, Fingerprint, Unlock, Lightbulb } from 'lucide-react';
import { getStatusConfig } from '@/components/StatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Printer, Bluetooth, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import ServiceThermalPrinter from './ServiceThermalPrinter';
import ServiceLabelPrinter from './ServiceLabelPrinter';
import ServiceLabelBluetoothPrinter from './ServiceLabelBluetoothPrinter';
import BluetoothPrinterComponent from '@/components/BluetoothPrinter';
import PatternLockDisplay from '@/components/PatternLockDisplay';
import { useCompanyInfo } from '@/contexts/CompanyContext';
const ServiceActionsMenu = ({
  service,
  onDelete,
  autoOpenDetails = false,
  onCloseDetails
}) => {
  const {
    companyInfo
  } = useCompanyInfo();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [showBluetoothDialog, setShowBluetoothDialog] = useState(false);
  const {
    organizationId
  } = useOrganization();

  // Abrir automaticamente o dialog de detalhes se autoOpenDetails for true
  useEffect(() => {
    if (autoOpenDetails) {
      setDetailsDialogOpen(true);
    }
  }, [autoOpenDetails]);
  const handleDelete = async () => {
    try {
      if (!organizationId) {
        throw new Error('ID da organização não encontrado');
      }
      const {
        error
      } = await supabase.from("services").delete().eq('id', service.id).eq('organization_id', organizationId);
      if (error) throw error;
      setDeleteDialogOpen(false);
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso."
      });
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o serviço."
      });
    }
  };

  // Format values for display
  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  const formatDate = dateString => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString('pt-BR');
  };
  const getStatusName = status => {
    const statusNames = {
      pending: "Pendente",
      in_progress: "Em andamento",
      waiting_parts: "Aguardando peças",
      completed: "Concluído",
      delivered: "Entregue"
    };
    return statusNames[status] || status;
  };
  const getServiceTypeName = type => {
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
    return type === 'other' ? service.other_service_description : serviceTypes[type] || type;
  };

  // Preparar dados do serviço para impressão Bluetooth
  const getPrintableServiceData = () => {
    if (!service) return undefined;

    // Mapear status para nomes amigáveis
    const statusNames = {
      pending: "Pendente",
      in_progress: "Em andamento",
      waiting_parts: "Aguardando peças",
      completed: "Concluído",
      delivered: "Entregue"
    };

    // Mapear métodos de pagamento para nomes amigáveis
    const paymentMethods = {
      pending: "Pagamento Pendente",
      credit: "Crédito",
      debit: "Débito",
      pix: "Pix",
      cash: "Espécie"
    };
    return {
      serviceName: service.service_type === 'other' ? service.other_service_description || 'Serviço Personalizado' : getServiceTypeName(service.service_type),
      customerName: service.customers?.name || 'Cliente não identificado',
      deviceInfo: `${service.devices?.brand || ''} ${service.devices?.model || ''}`.trim() || 'Dispositivo não especificado',
      price: Number(service.price) || 0,
      date: new Date(service.updated_at).toLocaleDateString('pt-BR'),
      status: statusNames[service.status] || service.status,
      paymentMethod: service.payment_method ? paymentMethods[service.payment_method] || service.payment_method : undefined,
      observations: service.observations || undefined,
      warrantyInfo: service.warranty_period ? `${service.warranty_period} ${parseInt(service.warranty_period) === 1 ? 'mês' : 'meses'}` : undefined,
      companyInfo: companyInfo
    };
  };

  // Modificar a função do onClick para implementar a impressão Bluetooth diretamente
  const handleBluetoothPrint = () => {
    setShowBluetoothDialog(true);
  };
  return <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" data-service-id={service.id}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <ServiceThermalPrinter service={service}>
              <Printer className="mr-2 h-4 w-4" />
              <span>Imprimir térmica</span>
            </ServiceThermalPrinter>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleBluetoothPrint}>
            <Bluetooth className="mr-2 h-4 w-4" />
            <span>Imprimir via Bluetooth</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <ServiceLabelPrinter service={service}>
              <Tag className="mr-2 h-4 w-4" />
              <span>Imprimir Etiqueta</span>
            </ServiceLabelPrinter>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <ServiceLabelPrinter service={service} directPrint={true}>
              <Printer className="mr-2 h-4 w-4" />
              <span>Imprimir Etiqueta Direto</span>
            </ServiceLabelPrinter>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <ServiceLabelBluetoothPrinter service={service} />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={open => {
      setDetailsDialogOpen(open);
      if (!open && onCloseDetails) {
        onCloseDetails();
      }
    }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Serviço</DialogTitle>
            <DialogDescription>
              Informações completas da ordem de serviço
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Informações do Serviço</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Tipo:</span> {getServiceTypeName(service.service_type)}</p>
                  <p><span className="font-medium">Status:</span> {getStatusName(service.status)}</p>
                  <p><span className="font-medium">Valor:</span> {formatCurrency(service.price)}</p>
                  <p><span className="font-medium">Data de Criação:</span> {formatDate(service.created_at)}</p>
                  {service.updated_at && <p><span className="font-medium">Última Atualização:</span> {formatDate(service.updated_at)}</p>}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Cliente e Dispositivo</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Cliente:</span> {service.customers?.name || "Cliente não encontrado"}</p>
                  <p>
                    <span className="font-medium">Dispositivo:</span> 
                    {service.devices ? `${service.devices.brand} ${service.devices.model}` : "Dispositivo não encontrado"}
                  </p>
                  {service.payment_method && <p>
                      <span className="font-medium">Método de Pagamento:</span> 
                      {service.payment_method === 'pending' ? 'Pagamento Pendente' : service.payment_method === 'credit' ? 'Crédito' : service.payment_method === 'debit' ? 'Débito' : service.payment_method === 'pix' ? 'Pix' : service.payment_method === 'cash' ? 'Espécie' : service.payment_method}
                    </p>}
                </div>
              </div>
            </div>
            
            {/* Seção de Senha do Dispositivo */}
            {service.devices && <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Senha do Dispositivo
                </h4>
                {service.devices.password && service.devices.password.trim() !== '' ? <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="flex-1">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Tipo de Senha:</span>
                            <span className="text-sm px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded-md font-medium inline-flex items-center gap-1.5">
                              {service.devices.password_type === 'pattern' ? <><Grid3x3 className="h-3.5 w-3.5" /> Padrão (Desenho)</> : service.devices.password_type === 'pin' ? <><Hash className="h-3.5 w-3.5" /> PIN Numérico</> : service.devices.password_type === 'password' ? <><Type className="h-3.5 w-3.5" /> Senha Alfanumérica</> : service.devices.password_type === 'biometric' ? <><Fingerprint className="h-3.5 w-3.5" /> Biometria</> : service.devices.password_type === 'none' ? <><Unlock className="h-3.5 w-3.5" /> Sem Senha</> : service.devices.password_type || 'Não especificado'}
                            </span>
                          </div>
                          
                          {service.devices.password_type !== 'pattern' && service.devices.password && <div className="bg-card p-3 rounded border border-amber-200 dark:border-amber-700">
                              <span className="text-xs text-muted-foreground block mb-1">Senha:</span>
                              <span className="font-mono font-bold text-lg text-amber-900 dark:text-amber-100 select-all">
                                {service.devices.password}
                              </span>
                            </div>}
                        </div>
                      </div>
                      
                      {service.devices.password_type === 'pattern' && service.devices.password && <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-end">
                          <PatternLockDisplay pattern={service.devices.password} size={180} />
                        </div>}
                    </div>
                    
                    {service.devices.password_type === 'pattern' && <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 p-2 rounded flex items-start gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span><span className="font-medium">Dica:</span> Os números no padrão indicam a sequência do desenho.
                        A grade é numerada de 0 a 8, começando do canto superior esquerdo.</span>
                      </div>}
                  </div> : <div className="text-sm text-muted-foreground italic p-4 bg-muted/50 rounded border border-border">
                    Nenhuma senha cadastrada para este dispositivo.
                  </div>}
              </div>}
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Histórico de Status</h4>
              <div className="relative min-h-[100px]">
                {/* Timeline vertical */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {[{
                  date: service.pending_date,
                  status: 'pending',
                  label: 'Pendente'
                }, {
                  date: service.in_progress_date,
                  status: 'in_progress',
                  label: 'Em Andamento'
                }, {
                  date: service.waiting_parts_date,
                  status: 'waiting_parts',
                  label: 'Aguardando Peças'
                }, {
                  date: service.completed_date,
                  status: 'completed',
                  label: 'Concluído'
                }, {
                  date: service.delivery_date,
                  status: 'delivered',
                  label: 'Entregue'
                }].filter(step => step.date).map(step => <div key={step.status} className="relative flex items-start gap-3">
                      <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${getStatusConfig(step.status).dot}`}>
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-foreground">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>
                      </div>
                    </div>)}
                  
                  {!service.pending_date && !service.in_progress_date && !service.waiting_parts_date && !service.completed_date && !service.delivery_date && <div className="relative flex items-start gap-3">
                      <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${getStatusConfig(service.status).dot}`}>
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {getStatusName(service.status)} 
                          <span className="text-xs text-muted-foreground ml-2">(atual)</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criado em: {formatDate(service.created_at)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                          Histórico de mudanças será registrado a partir da próxima atualização de status
                        </p>
                      </div>
                    </div>}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium">Descrição do Serviço</h4>
              <div className="mt-2">
                <p className="text-sm whitespace-pre-wrap">{service.description || "Sem descrição detalhada"}</p>
              </div>
            </div>

            {service.diagnosis && <div className="border-t pt-4">
                <h4 className="font-medium">Diagnóstico</h4>
                <div className="mt-2">
                  <p className="text-sm whitespace-pre-wrap">{service.diagnosis}</p>
                </div>
              </div>}
            
            {service.parts_used && <div className="border-t pt-4">
                <h4 className="font-medium">Peças Utilizadas</h4>
                <div className="mt-2">
                  <p className="text-sm whitespace-pre-wrap">{service.parts_used}</p>
                </div>
              </div>}
            
            {service.notes && <div className="border-t pt-4">
                <h4 className="font-medium">Observações</h4>
                <div className="mt-2">
                  <p className="text-sm whitespace-pre-wrap">{service.notes}</p>
                </div>
              </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bluetooth Printer Dialog */}
      <Dialog open={showBluetoothDialog} onOpenChange={setShowBluetoothDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impressão Bluetooth</DialogTitle>
            <DialogDescription>
              Conecte-se a uma impressora térmica Bluetooth para imprimir o comprovante.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <BluetoothPrinterComponent serviceData={getPrintableServiceData()} onSuccess={() => {
            setShowBluetoothDialog(false);
            toast({
              title: "Impressão iniciada",
              description: "O comprovante está sendo impresso via Bluetooth."
            });
          }} onError={error => {
            toast({
              variant: "destructive",
              title: "Erro na impressão",
              description: `Não foi possível imprimir: ${error.message}`
            });
          }} />
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default ServiceActionsMenu;
