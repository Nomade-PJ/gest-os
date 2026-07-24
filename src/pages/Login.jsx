import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema para validação do formulário de login
const loginSchema = z.object({
  email: z.string().email({
    message: "E-mail inválido"
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres"
  })
});

// Schema para validação do formulário de recuperação de senha
const resetPasswordSchema = z.object({
  email: z.string().email({
    message: "E-mail inválido"
  })
});
const Login = () => {
  const {
    login,
    isAuthenticated,
    sendPasswordResetEmail
  } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  // Todos os useForm devem ser chamados antes de qualquer return condicional
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  // Efeito para animar o card quando o componente montar
  useEffect(() => {
    setAnimateCard(true);
  }, []);

  // Se já estiver autenticado, redirecionar para a página inicial certa
  // (painel admin para super admin, dashboard normal para os demais)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const redirect = async () => {
      try {
        const { data: isAdmin } = await supabase.rpc('is_super_admin');
        if (!cancelled) navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
      } catch (error) {
        console.error('Erro ao verificar permissão de admin:', error);
        if (!cancelled) navigate('/dashboard', { replace: true });
      }
    };
    redirect();
    return () => { cancelled = true; };
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }
  const handleLogin = async values => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      // A navegação será feita automaticamente quando isAuthenticated mudar
    } catch (error) {
      console.error(error);
      // Toast já é chamado no login() do AuthContext
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async values => {
    setIsLoading(true);
    try {
      // Confere se o e-mail realmente pertence a um cliente cadastrado
      // antes de tentar enviar o link de recuperação.
      const {
        data: exists,
        error: checkError
      } = await supabase.rpc('email_exists', {
        check_email: values.email
      });
      if (checkError) throw checkError;
      if (!exists) {
        setResetPasswordDialogOpen(false);
        resetPasswordForm.reset();
        toast.error("E-mail não cadastrado", {
          description: "Não encontramos uma assinatura ativa com esse e-mail."
        });
        navigate("/plans");
        return;
      }
      await sendPasswordResetEmail(values.email);
      setResetPasswordDialogOpen(false);
      resetPasswordForm.reset();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar solicitação", {
        description: "Tente novamente em instantes."
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex flex-col items-center justify-center landing-page p-4 bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden login-gradient-bg">
      {/* Background elements for visual interest */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-purple-600 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-cyan-600 opacity-10 rounded-full blur-3xl"></div>
      </div>

      {/* Logo e nome do sistema */}
      <div className={cn("mb-6 flex flex-col items-center transition-all duration-700 transform", animateCard ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8")}>
        <div className="w-20 h-20 flex items-center justify-center mb-3 icon-container">
          <img src="/logo-icon.png" alt="GestOS" className="w-20 h-20 object-contain drop-shadow-lg" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">GestOS</h1>
        <p className="text-slate-300 mt-1">Sistema de Gerenciamento</p>
      </div>

      <div className={cn("w-full max-w-md transition-all duration-500 transform", animateCard ? "opacity-100 scale-100" : "opacity-0 scale-95")}>
        <Card className="shadow-xl border-none rounded-xl overflow-hidden" style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white">Bem-vindo</CardTitle>
            <CardDescription className="text-slate-300">
              Acesse o sistema para gerenciar sua loja
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField control={loginForm.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel className="text-slate-200 flex items-center text-sm font-medium">
                        <Mail className="h-4 w-4 mr-2 text-blue-400" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" type="email" {...field} className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-md h-11" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>} />
                <FormField control={loginForm.control} name="password" render={({
                field
              }) => <FormItem>
                      <FormLabel className="text-slate-200 flex items-center text-sm font-medium">
                        <Lock className="h-4 w-4 mr-2 text-blue-400" />
                        Senha
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="******" {...field} className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-md pr-10 h-11" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>} />
                <Button type="submit" className="w-full enter-button h-11 mt-2 font-medium pulse-animation" disabled={isLoading}>
                  {isLoading ? <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Entrando...
                    </span> : "Entrar"}
                </Button>
              </form>
            </Form>
            <div className="text-center mt-2 flex flex-col gap-1">
              <Button variant="link" className="text-sm text-blue-400 hover:text-blue-300 hover:underline" onClick={() => navigate("/plans")}>
                Não tem conta? Veja os planos
              </Button>
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-slate-400">
              <Button variant="link" className="text-sm text-blue-400 hover:text-blue-300 hover:underline p-0 h-auto" onClick={() => setResetPasswordDialogOpen(true)}>
                Esqueceu a senha?
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-700/50 pt-6 pb-4">
            <p className="text-sm text-slate-400">
              Sistema Desenvolvido por Nomade-PJ © 2025
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl overflow-hidden" style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
          <DialogHeader className="border-b border-slate-700/50 pb-4">
            <DialogTitle className="text-xl text-white flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                <Lock className="h-4 w-4 text-blue-400" />
              </div>
              Recuperar Senha
            </DialogTitle>
            <DialogDescription className="text-slate-300 mt-2">
              Digite seu e-mail para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <FormField control={resetPasswordForm.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel className="text-slate-200 flex items-center text-sm font-medium">
                        <Mail className="h-4 w-4 mr-2 text-blue-400" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" type="email" {...field} className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 rounded-md h-11" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>} />
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 hover:text-white rounded-md">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit" className="enter-button" disabled={isLoading}>
                    {isLoading ? <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verificando...
                      </span> : "Enviar Link"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Login;
