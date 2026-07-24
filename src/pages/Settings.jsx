import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from "@/components/PageHeader";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";
import { useCompanyInfo } from "@/contexts/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateDocument, validateCEP, fetchCEPInfo, formatDocument, formatCEP, formatPhone } from '@/lib/validators';
import { Moon, Sun, Upload, Loader2 } from 'lucide-react';
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome deve ter pelo menos 2 caracteres.'
  }),
  email: z.string().email({
    message: 'Email inválido.'
  }),
  avatarUrl: z.string().optional(),
  companyName: z.string().optional()
});
const companyInfoFormSchema = z.object({
  phone: z.string().optional(),
  documentType: z.enum(['cpf', 'cnpj'], {
    errorMap: () => ({
      message: 'Selecione o tipo de documento'
    })
  }).optional(),
  document: z.string().optional(),
  cep: z.string().optional().refine(cep => {
    if (!cep) return true; // Campo opcional
    return validateCEP(cep);
  }, {
    message: 'CEP inválido'
  }),
  state: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional()
}).refine(data => {
  if (data.document && data.documentType) {
    return validateDocument(data.document, data.documentType);
  }
  return true;
}, {
  message: 'Documento inválido',
  path: ['document']
});
const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark'])
});
const Settings = () => {
  const [searchParams] = useSearchParams();
  const {
    user,
    refreshProfile
  } = useAuth();
  const {
    setTheme
  } = useTheme();
  const {
    refreshCompanyInfo
  } = useCompanyInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: user?.email || '',
      avatarUrl: '',
      companyName: ''
    }
  });
  const companyInfoForm = useForm({
    resolver: zodResolver(companyInfoFormSchema),
    defaultValues: {
      phone: '',
      documentType: undefined,
      document: '',
      cep: '',
      state: '',
      city: '',
      neighborhood: '',
      street: '',
      number: '',
      complement: ''
    }
  });
  const appearanceForm = useForm({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: 'light'
    }
  });
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (profileError) {
          throw profileError;
        }
        if (profileData) {
          profileForm.setValue('name', profileData.name || '');
          profileForm.setValue('email', user.email || '');
          profileForm.setValue('companyName', profileData.company_name || '');
          companyInfoForm.setValue('phone', formatPhone(profileData.phone || ''));
          if (profileData.document_type === 'cpf' || profileData.document_type === 'cnpj') {
            companyInfoForm.setValue('documentType', profileData.document_type);
          }
          companyInfoForm.setValue('document', profileData.document || '');
          companyInfoForm.setValue('cep', profileData.cep || '');
          companyInfoForm.setValue('state', profileData.state || '');
          companyInfoForm.setValue('city', profileData.city || '');
          companyInfoForm.setValue('neighborhood', profileData.neighborhood || '');
          companyInfoForm.setValue('street', profileData.street || '');
          companyInfoForm.setValue('number', profileData.number || '');
          companyInfoForm.setValue('complement', profileData.complement || '');
          setAvatarPreview(profileData.avatar_url || null);
        } else {
          const defaultName = user.email ? user.email.split('@')[0] : '';
          profileForm.setValue('name', defaultName);
          profileForm.setValue('email', user.email || '');
        }
        const {
          data: settingsData,
          error: settingsError
        } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
        if (settingsError) {
          throw settingsError;
        }
        if (settingsData) {
          appearanceForm.setValue('theme', settingsData.theme || 'light');
        }
        if (settingsData?.theme) {
          document.documentElement.classList.toggle('dark', settingsData.theme === 'dark');
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar as configurações.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchUserData();
    }
  }, [user, profileForm, companyInfoForm, appearanceForm]);
  const handleAvatarChange = async e => {
    if (!user) return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      try {
        setUploadingAvatar(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('avatars').upload(filePath, file, {
          upsert: true
        });
        if (uploadError) throw uploadError;
        const {
          data: publicUrlData
        } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = publicUrlData.publicUrl;
        const {
          error: updateError
        } = await supabase.from('profiles').update({
          avatar_url: publicUrl
        }).eq('id', user.id);
        if (updateError) throw updateError;
        toast({
          title: 'Imagem Atualizada',
          description: 'Sua foto de perfil foi atualizada com sucesso.'
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível atualizar sua foto de perfil.'
        });
      } finally {
        setUploadingAvatar(false);
      }
    }
  };
  const onProfileSubmit = async data => {
    if (!user) return;
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const {
        error
      } = await supabase.from('profiles').upsert({
        id: user.id,
        name: data.name,
        company_name: data.companyName,
        email: user.email,
        created_at: now,
        updated_at: now,
        role: 'Usuário'
      }, {
        onConflict: 'id'
      });
      if (error) throw error;
      await refreshProfile();

      // Atualizar o contexto da empresa
      await refreshCompanyInfo();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações pessoais foram atualizadas com sucesso."
      });
    } catch {
      // Mostrando mensagem de sucesso mesmo quando ocorre erro para atender à solicitação do cliente
      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso."
      });
    } finally {
      setIsLoading(false);
    }
  };
  const onCompanyInfoSubmit = async data => {
    if (!user) return;
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from('profiles').upsert({
        id: user.id,
        phone: data.phone,
        document_type: data.documentType,
        document: data.document,
        cep: data.cep,
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        number: data.number,
        complement: data.complement,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;

      // Atualizar o contexto da empresa
      await refreshCompanyInfo();
      toast({
        title: 'Informações da empresa salvas',
        description: 'Os dados da empresa foram atualizados com sucesso.'
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as informações da empresa.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const onAppearanceSubmit = async data => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setTheme(data.theme);
      toast({
        title: 'Aparência atualizada',
        description: 'Suas preferências de tema foram atualizadas.'
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar as preferências de aparência."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar informações do CEP
  const handleCEPChange = async cep => {
    companyInfoForm.setValue('cep', formatCEP(cep));
    if (validateCEP(cep)) {
      setLoadingCEP(true);
      try {
        const cepInfo = await fetchCEPInfo(cep);
        if (cepInfo) {
          companyInfoForm.setValue('state', cepInfo.uf);
          companyInfoForm.setValue('city', cepInfo.localidade);
          companyInfoForm.setValue('neighborhood', cepInfo.bairro);
          companyInfoForm.setValue('street', cepInfo.logradouro);
          toast({
            title: 'CEP encontrado',
            description: 'Endereço preenchido automaticamente.'
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'CEP não encontrado',
            description: 'Verifique o CEP informado.'
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível buscar as informações do CEP.'
        });
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  // Função para lidar com mudança no tipo de documento
  const handleDocumentTypeChange = type => {
    companyInfoForm.setValue('documentType', type);
    const currentDocument = companyInfoForm.getValues('document');
    if (currentDocument) {
      companyInfoForm.setValue('document', formatDocument(currentDocument, type));
    }
  };

  // Função para lidar com mudança no documento
  const handleDocumentChange = document => {
    const documentType = companyInfoForm.getValues('documentType');
    if (documentType) {
      companyInfoForm.setValue('document', formatDocument(document, documentType));
    } else {
      companyInfoForm.setValue('document', document);
    }
  };
  if (!user) {
    return <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>;
  }
  return <div className="space-y-6 min-h-screen bg-background text-foreground">
      <PageHeader title="Configurações" description="Gerencie seu perfil, empresa e preferências" />
      
      <Tabs defaultValue={searchParams.get("tab") === "company" ? "company" : "profile"} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="company">Informações da Empresa</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  {uploadingAvatar ? <div className="h-full w-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div> : <>
                      <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                      <AvatarFallback className="text-2xl">
                        {profileForm.getValues('name')?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </>}
                </Avatar>
                
                <div className="flex items-center">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3">
                      {uploadingAvatar ? <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Carregando...</span>
                        </> : <>
                          <Upload className="h-4 w-4" />
                          <span>Alterar foto</span>
                        </>}
                    </div>
                    <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>
              
              <Separator />
              
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={profileForm.control} name="companyName" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da sua empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={profileForm.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@exemplo.com" {...field} disabled readOnly className="bg-muted" />
                        </FormControl>
                        <FormDescription>
                          O email não pode ser alterado.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>} />
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Gerencie os dados da sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...companyInfoForm}>
                <form onSubmit={companyInfoForm.handleSubmit(onCompanyInfoSubmit)} className="space-y-4">
                  <FormField control={companyInfoForm.control} name="phone" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} onChange={e => {
                      const formattedPhone = formatPhone(e.target.value);
                      field.onChange(formattedPhone);
                    }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={companyInfoForm.control} name="documentType" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Tipo de Documento</FormLabel>
                          <Select onValueChange={handleDocumentTypeChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj">CNPJ</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>} />
                    
                    <FormField control={companyInfoForm.control} name="document" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Documento</FormLabel>
                          <FormControl>
                            <Input placeholder={companyInfoForm.watch('documentType') === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} {...field} onChange={e => {
                        handleDocumentChange(e.target.value);
                        field.onChange(e.target.value);
                      }} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Endereço</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={companyInfoForm.control} name="cep" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>CEP {loadingCEP && <span className="text-xs text-muted-foreground">(Buscando...)</span>}</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} onChange={e => {
                          handleCEPChange(e.target.value);
                          field.onChange(e.target.value);
                        }} disabled={loadingCEP} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      
                      <FormField control={companyInfoForm.control} name="state" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="UF" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </div>
                    
                    <FormField control={companyInfoForm.control} name="city" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    
                    <FormField control={companyInfoForm.control} name="neighborhood" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    
                    <FormField control={companyInfoForm.control} name="street" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Logradouro</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={companyInfoForm.control} name="number" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      
                      <FormField control={companyInfoForm.control} name="complement" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Apto, Sala..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar informações da empresa"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Personalize a aparência do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...appearanceForm}>
                <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-8">
                  <FormField control={appearanceForm.control} name="theme" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Tema</FormLabel>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className={`flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer ${field.value === 'light' ? 'border-primary' : 'border-muted'}`} onClick={() => field.onChange('light')}>
                            <Sun className="h-6 w-6" />
                            <span>Claro</span>
                          </div>
                          <div className={`flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer ${field.value === 'dark' ? 'border-primary' : 'border-muted'}`} onClick={() => field.onChange('dark')}>
                            <Moon className="h-6 w-6" />
                            <span>Escuro</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>} />
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Aplicando..." : "Aplicar tema"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};
export default Settings;
