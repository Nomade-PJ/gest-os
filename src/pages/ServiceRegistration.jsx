import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wrench, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from '@/hooks/useOrganization';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ptBR } from 'date-fns/locale';

// Status enum
const StatusTypes = {
  pending: "pending",
  in_progress: "in_progress",
  waiting_parts: "waiting_parts",
  completed: "completed",
  delivered: "delivered"
};

// Payment method enum
const PaymentMethodTypes = {
  pending: "pending",
  credit: "credit",
  debit: "debit",
  pix: "pix",
  cash: "cash"
};

// Warranty period enum
const WarrantyPeriods = {
  "1": "1",
  "3": "3",
  "6": "6",
  "12": "12"
};

// Service types
const SERVICE_TYPES = [{
  value: "screen_repair",
  label: "Troca de Tela"
}, {
  value: "battery_replacement",
  label: "Troca de Bateria"
}, {
  value: "water_damage",
  label: "Dano por Água"
}, {
  value: "software_issue",
  label: "Problema de Software"
}, {
  value: "charging_port",
  label: "Porta de Carregamento"
}, {
  value: "button_repair",
  label: "Reparo de Botões"
}, {
  value: "camera_repair",
  label: "Reparo de Câmera"
}, {
  value: "mic_speaker_repair",
  label: "Reparo de Microfone/Alto-falante"
}, {
  value: "diagnostics",
  label: "Diagnóstico Completo"
}, {
  value: "unlocking",
  label: "Desbloqueio"
}, {
  value: "data_recovery",
  label: "Recuperação de Dados"
}, {
  value: "other",
  label: "Outro"
}];
const serviceFormSchema = z.object({
  clientName: z.string(),
  deviceInfo: z.string(),
  serviceType: z.string().min(1, {
    message: "Selecione um tipo de serviço"
  }),
  otherServiceDescription: z.string().optional(),
  technicianId: z.string().optional(),
  price: z.number().min(0, {
    message: "Informe o preço"
  }),
  estimatedCompletionDate: z.date({
    required_error: "A data de previsão de entrega é obrigatória"
  }),
  warrantyPeriod: z.enum(["1", "3", "6", "12"]).optional(),
  status: z.enum(["pending", "in_progress", "waiting_parts", "completed", "delivered"]),
  payment_method: z.enum(["pending", "credit", "debit", "pix", "cash"]).optional(),
  observations: z.string().optional()
});
const ServiceRegistration = () => {
  const navigate = useNavigate();
  const {
    clientId,
    deviceId
  } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);
  const {
    organizationId
  } = useOrganization();
  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      clientName: "",
      deviceInfo: "",
      serviceType: "",
      otherServiceDescription: "",
      technicianId: "",
      price: 0,
      estimatedCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      warrantyPeriod: "3",
      status: "pending",
      payment_method: "pending",
      observations: ""
    }
  });
  useEffect(() => {
    if (!clientId || !deviceId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informações do cliente ou dispositivo não encontradas"
      });
      navigate("/dashboard/clients");
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch client data
        const {
          data: clientData,
          error: clientError
        } = await supabase.from("customers").select("*").eq('id', clientId).single();
        if (clientError) throw clientError;
        setClientData(clientData);

        // Fetch device data
        const {
          data: deviceData,
          error: deviceError
        } = await supabase.from("devices").select("*").eq('id', deviceId).single();
        if (deviceError) throw deviceError;
        setDeviceData(deviceData);

        // Set form values
        form.setValue("clientName", clientData.name);
        form.setValue("deviceInfo", `${deviceData.brand} ${deviceData.model}`);

        // Check if we're editing an existing service
        const url = new URL(window.location.href);
        const serviceId = url.searchParams.get('serviceId');
        if (serviceId) {
          setIsEditing(true);
          setCurrentServiceId(serviceId);

          // Buscar dados mais recentes do serviço
          const {
            data: serviceData,
            error: serviceError
          } = await supabase.from("services").select("*").eq('id', serviceId).single();
          if (serviceError) throw serviceError;

          // Fill form with service data
          form.setValue("serviceType", serviceData.service_type);
          form.setValue("otherServiceDescription", serviceData.other_service_description || "");
          form.setValue("technicianId", serviceData.technician_id || "");
          form.setValue("price", serviceData.price);
          if (serviceData.estimated_completion_date) {
            form.setValue("estimatedCompletionDate", new Date(serviceData.estimated_completion_date));
          }
          form.setValue("warrantyPeriod", serviceData.warranty_period || "3");
          form.setValue("status", serviceData.status);
          form.setValue("payment_method", serviceData.payment_method || "pending");
          form.setValue("observations", serviceData.observations || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados necessários."
        });
        navigate("/dashboard/clients");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [clientId, deviceId, form, navigate]);

  // Configurar atualização em tempo real para o serviço atual
  useEffect(() => {
    if (!currentServiceId) return;

    // Configurar um canal de tempo real para atualizações do serviço
    const subscription = supabase.channel(`service-${currentServiceId}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'services',
      filter: `id=eq.${currentServiceId}`
    }, payload => {
      // Atualizar o formulário com os novos dados
      const serviceData = payload.new;

      // Atualizar todos os campos relevantes
      form.setValue("status", serviceData.status);
      form.setValue("payment_method", serviceData.payment_method || "pending");

      // Mostrar notificação de atualização
      toast({
        title: "Serviço atualizado",
        description: "Os dados do serviço foram atualizados."
      });
    }).subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [currentServiceId, form]);

  // Show "Other service description" field if "Other" service type is selected
  const shouldShowOtherService = form.watch("serviceType") === "other";
  const onSubmit = async data => {
    if (!clientId || !deviceId) return;
    setIsLoading(true);
    try {
      if (!organizationId && !isEditing) {
        throw new Error('Não foi possível determinar a organização do usuário');
      }

      // Calculate warranty until date if warranty period is provided
      let warrantyUntil = null;
      if (data.warrantyPeriod) {
        const months = parseInt(data.warrantyPeriod);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        warrantyUntil = date.toISOString();
      }

      // Prepare data for saving
      const serviceData = {
        customer_id: clientId,
        device_id: deviceId,
        service_type: data.serviceType,
        other_service_description: data.serviceType === "other" ? data.otherServiceDescription : null,
        technician_id: data.technicianId || null,
        price: data.price,
        estimated_completion_date: data.estimatedCompletionDate ? data.estimatedCompletionDate.toISOString() : null,
        warranty_period: data.warrantyPeriod || null,
        warranty_until: warrantyUntil,
        status: data.status,
        payment_method: data.payment_method || "pending",
        observations: data.observations || null,
        updated_at: new Date().toISOString()
      };
      if (isEditing && currentServiceId) {
        // Update existing service
        const {
          error
        } = await supabase.from("services").update(serviceData).eq('id', currentServiceId);
        if (error) throw error;
        toast({
          title: "Serviço atualizado com sucesso",
          description: "Os dados do serviço foram atualizados."
        });
      } else {
        // Create new service
        const {
          error
        } = await supabase.from("services").insert({
          ...serviceData,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({
          title: "Serviço registrado com sucesso",
          description: "Os dados do serviço foram salvos."
        });
      }

      // Navigate to services list
      navigate("/dashboard/services");
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados do serviço."
      });
    } finally {
      setIsLoading(false);
    }
  };
  const goBack = () => {
    try {
      if (deviceId) {
        navigate(`/dashboard/device-registration/${clientId}/${deviceId}`);
      } else if (clientId) {
        navigate(`/dashboard/device-registration/${clientId}`);
      } else {
        navigate('/dashboard/clients');
      }
    } catch (error) {
      console.error("Erro na navegação:", error);
      navigate('/dashboard/clients');
    }
  };

  // Função para atualizar apenas o método de pagamento
  const updatePaymentMethod = async method => {
    if (!currentServiceId) return;
    try {
      setIsLoading(true);

      // Atualizar apenas o método de pagamento, sem alterar o status
      const updateData = {
        payment_method: method
      };
      const {
        error
      } = await supabase.from("services").update(updateData).eq('id', currentServiceId);
      if (error) throw error;

      // Atualizar o formulário
      form.setValue("payment_method", method);
      toast({
        title: "Serviço atualizado",
        description: `Método de pagamento atualizado para ${method}.`
      });
    } catch (error) {
      console.error("Erro ao atualizar método de pagamento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o método de pagamento."
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="space-y-6">
      <PageHeader title={isEditing ? "Editar Serviço" : "Registro de Serviço"} description={isEditing ? "Atualize os detalhes do serviço." : "Preencha os detalhes do serviço a ser executado."}>
        <Wrench className="h-6 w-6" />
      </PageHeader>
      
      <Card className="p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={goBack} size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para dados do dispositivo
          </Button>
        </div>
        
        {clientData && deviceData && <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Informações do Cliente e Dispositivo</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="clientName" render={({
                field
              }) => <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="deviceInfo" render={({
                field
              }) => <FormItem>
                        <FormLabel>Dispositivo</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-xl font-semibold">Detalhes do Serviço</h2>
                
                <FormField control={form.control} name="serviceType" render={({
              field
            }) => <FormItem>
                      <FormLabel>Tipo de Serviço*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_TYPES.map(serviceType => <SelectItem key={serviceType.value} value={serviceType.value}>
                              {serviceType.label}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                {shouldShowOtherService && <FormField control={form.control} name="otherServiceDescription" render={({
              field
            }) => <FormItem>
                        <FormLabel>Descrição do Serviço*</FormLabel>
                        <FormControl>
                          <Input placeholder="Descreva o serviço a ser realizado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="technicianId" render={({
                field
              }) => <FormItem>
                        <FormLabel>Técnico Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do técnico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="price" render={({
                field
              }) => <FormItem>
                        <FormLabel>Preço (R$)*</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Valor do serviço" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="estimatedCompletionDate" render={({
                field
              }) => <FormItem className="flex flex-col">
                        <FormLabel>Previsão de Conclusão*</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", {
                          locale: ptBR
                        }) : <span>Selecione uma data</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} disabled={date => date < new Date(Date.now() - 24 * 60 * 60 * 1000)} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="warrantyPeriod" render={({
                field
              }) => <FormItem>
                        <FormLabel>Período de Garantia (meses)</FormLabel>
                        <Select onValueChange={value => field.onChange(value)} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o período de garantia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 mês</SelectItem>
                            <SelectItem value="3">3 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="12">12 meses</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({
                field
              }) => <FormItem>
                        <FormLabel>Status do Serviço*</FormLabel>
                        <Select onValueChange={value => field.onChange(value)} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={StatusTypes.pending}>Pendente</SelectItem>
                            <SelectItem value={StatusTypes.in_progress}>Em andamento</SelectItem>
                            <SelectItem value={StatusTypes.waiting_parts}>Aguardando peças</SelectItem>
                            <SelectItem value={StatusTypes.completed}>Concluído</SelectItem>
                            <SelectItem value={StatusTypes.delivered}>Entregue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="payment_method" render={({
                field
              }) => <FormItem>
                        <FormLabel>Pagamento</FormLabel>
                        <Select onValueChange={value => {
                  field.onChange(value);
                  // Atualizar no banco de dados quando o usuário selecionar um método de pagamento
                  if (currentServiceId) {
                    updatePaymentMethod(value);
                  }
                }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o método de pagamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PaymentMethodTypes.pending}>Pagamento Pendente</SelectItem>
                            <SelectItem value="card_header" disabled className="font-medium">Cartão</SelectItem>
                            <SelectItem value={PaymentMethodTypes.credit} className="pl-6">Crédito</SelectItem>
                            <SelectItem value={PaymentMethodTypes.debit} className="pl-6">Débito</SelectItem>
                            <SelectItem value={PaymentMethodTypes.pix}>Pix</SelectItem>
                            <SelectItem value={PaymentMethodTypes.cash}>Espécie</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />
                </div>
                
                <FormField control={form.control} name="observations" render={({
              field
            }) => <FormItem>
                      <FormLabel>Observações (Será exibido na impressão térmica)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações importantes sobre o serviço, instruções especiais, detalhes do problema, etc." className="min-h-24" {...field} />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Estas informações serão exibidas no comprovante impresso para o cliente.
                      </p>
                      <FormMessage />
                    </FormItem>} />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={goBack}>
                  Voltar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Finalizar Cadastro"}
                </Button>
              </div>
            </form>
          </Form>}
      </Card>
    </div>;
};
export default ServiceRegistration;
