import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { User, ArrowRight } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// Define document type enum
const DocumentTypes = {
  cpf: "cpf",
  cnpj: "cnpj"
};
const FormSchema = z.object({
  name: z.string().min(3, {
    message: 'O nome deve ter pelo menos 3 caracteres.'
  }),
  documentType: z.nativeEnum(DocumentTypes).optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().refine(email => {
    if (!email || email.trim() === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, {
    message: 'Email inválido'
  }),
  cep: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional()
});
export default function UserRegistration() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const clientId = params.id || new URLSearchParams(location.search).get('id');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const {
    organizationId
  } = useOrganization();
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      documentType: DocumentTypes.cpf,
      document: '',
      phone: '',
      email: '',
      cep: '',
      state: '',
      city: '',
      neighborhood: '',
      street: '',
      number: '',
      complement: ''
    }
  });
  useEffect(() => {
    if (clientId) {
      setIsEditing(true);
      setIsLoading(true);
      const fetchClientData = async () => {
        try {
          const {
            data,
            error
          } = await supabase.from("customers").select('*').eq('id', clientId).single();
          if (error) throw error;

          // Fill the form with fetched data
          form.setValue('name', data.name);
          form.setValue('documentType', data.document_type);
          form.setValue('document', data.document);
          form.setValue('phone', data.phone || '');
          form.setValue('email', data.email || '');
          form.setValue('cep', data.cep || '');
          form.setValue('state', data.state || '');
          form.setValue('city', data.city || '');
          form.setValue('neighborhood', data.neighborhood || '');
          form.setValue('street', data.street || '');
          form.setValue('number', data.number || '');
          form.setValue('complement', data.complement || '');
        } catch (error) {
          console.error('Error fetching client data:', error);
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível carregar os dados do cliente.'
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchClientData();
    }
  }, [clientId, form]);
  async function onSubmit(data) {
    setIsLoading(true);
    try {
      if (!organizationId && !isEditing) {
        throw new Error('Não foi possível determinar a organização do usuário');
      }
      const customerData = {
        name: data.name,
        document_type: data.documentType,
        document: data.document,
        phone: data.phone,
        email: data.email,
        cep: data.cep,
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        number: data.number,
        complement: data.complement,
        updated_at: new Date().toISOString()
      };
      if (isEditing && clientId) {
        // Update existing customer
        const {
          error
        } = await supabase.from("customers").update(customerData).eq('id', clientId);
        if (error) throw error;
        toast({
          title: 'Cliente atualizado',
          description: 'Os dados do cliente foram atualizados com sucesso.'
        });

        // Navigate to device registration with the client ID
        navigate(`/dashboard/device-registration/${clientId}`);
      } else {
        // Create new customer
        const {
          data: insertedData,
          error
        } = await supabase.from("customers").insert({
          ...customerData,
          created_at: new Date().toISOString(),
          organization_id: organizationId
        }).select('id').single();
        if (error) throw error;
        toast({
          title: 'Cliente cadastrado',
          description: 'Cliente cadastrado com sucesso.'
        });

        // Navigate to device registration with the newly created client ID
        navigate(`/dashboard/device-registration/${insertedData.id}`);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar os dados do cliente.'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch address information when CEP changes
  const handleCepChange = async cep => {
    if (cep.replace(/\D/g, '').length !== 8) return;
    try {
      const formattedCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${formattedCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.setValue('state', data.uf);
        form.setValue('city', data.localidade);
        form.setValue('neighborhood', data.bairro);
        form.setValue('street', data.logradouro);
      }
    } catch (error) {
      console.error('Error fetching address from CEP:', error);
    }
  };
  const watchDocumentType = form.watch('documentType');
  return <div className="space-y-6">
      <PageHeader title={isEditing ? "Editar Cliente" : "Cadastro de Cliente"} description={isEditing ? "Edite as informações do cliente." : "Preencha os dados do cliente para cadastro."}>
        <User className="h-6 w-6" />
      </PageHeader>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
          <CardDescription>
            Preencha as informações pessoais do cliente.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nome Completo*</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="documentType" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Tipo de Documento</FormLabel>
                        <Select onValueChange={value => field.onChange(value)} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de documento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={DocumentTypes.cpf}>CPF</SelectItem>
                            <SelectItem value={DocumentTypes.cnpj}>CNPJ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="document" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Número do Documento</FormLabel>
                        <FormControl>
                          <Input placeholder={watchDocumentType === DocumentTypes.cpf ? '000.000.000-00' : '00.000.000/0000-00'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Endereço</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="cep" render={({
                  field
                }) => <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="00000-000" {...field} onChange={e => {
                      field.onChange(e);
                      handleCepChange(e.target.value);
                    }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="state" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="UF" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="city" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="neighborhood" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="street" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Rua</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="number" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="Número" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <div className="md:col-span-2">
                    <FormField control={form.control} name="complement" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto, bloco, etc" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard/clients')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-1">
                  {isLoading ? 'Salvando...' : 'Próximo'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
}
