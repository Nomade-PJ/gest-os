import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
const formSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula").regex(/[a-z]/, "Inclua ao menos uma letra minúscula").regex(/[0-9]/, "Inclua ao menos um número"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"]
});
export default function PasswordReset() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });
  useEffect(() => {
    // Check if we have an access token in the URL
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // Attempt to get the session to check if the user is authenticated
        const {
          data,
          error
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Erro ao verificar sessão:", error);
          setError("Não foi possível verificar sua sessão. Por favor, solicite um novo link de redefinição de senha.");
          return;
        }
        if (!data.session) {
          setError("Link inválido ou expirado. Por favor, solicite um novo link de redefinição de senha.");
          return;
        }

        // Session is valid, allow the user to reset password
      } catch (err) {
        console.error("Erro ao processar autenticação:", err);
        setError("Ocorreu um erro durante a autenticação. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);
  const onSubmit = async values => {
    setIsProcessing(true);
    setError(null);
    try {
      // Tentar atualizar a senha através da API Supabase
      const {
        error
      } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) throw error;
      setIsSuccess(true);
      toast.success("Senha redefinida com sucesso!");

      // Redirecionar para a página de login após 3 segundos
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      if (err?.code === "weak_password" || err?.message?.includes("weak")) {
        toast.error("Senha muito fraca ou comum", {
          description: "Escolha uma senha diferente, que não seja usada em outros sites."
        });
      } else {
        setError(err instanceof Error ? err.message : "Erro ao redefinir a senha. Por favor, tente novamente.");
        toast.error("Erro ao redefinir senha");
      }
    } finally {
      setIsProcessing(false);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Verificando...</CardTitle>
            <CardDescription>Estamos validando seu link de redefinição</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Erro</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Voltar para o login
            </Button>
          </CardFooter>
        </Card>
      </div>;
  }
  if (isSuccess) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Senha atualizada!</CardTitle>
            <CardDescription>Sua senha foi atualizada com sucesso.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p>Você será redirecionado para a página de login em instantes.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/login")}>
              Ir para o login
            </Button>
          </CardFooter>
        </Card>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Redefinir Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="password" render={({
              field
            }) => <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua nova senha" {...field} autoComplete="new-password" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres, com letra maiúscula, minúscula e número.</p>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="confirmPassword" render={({
              field
            }) => <FormItem>
                    <FormLabel>Confirme a nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirme sua nova senha" {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </> : "Atualizar Senha"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
}
