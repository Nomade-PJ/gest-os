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

export default function ConfirmRegistration() {
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
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Erro ao verificar sessão:", error);
          setError("Não foi possível verificar seu convite. Solicite um novo convite.");
          return;
        }
        if (!data.session) {
          setError("Link inválido ou expirado. Solicite um novo convite.");
          return;
        }
      } catch (err) {
        console.error("Erro ao processar convite:", err);
        setError("Ocorreu um erro ao processar seu convite. Tente novamente.");
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
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) throw error;
      setIsSuccess(true);
      toast.success("Conta ativada com sucesso!");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Erro ao definir senha:", err);
      if (err?.code === "weak_password" || err?.message?.includes("weak")) {
        toast.error("Senha muito fraca ou comum", {
          description: "Escolha uma senha diferente, que não seja usada em outros sites."
        });
      } else {
        setError(err instanceof Error ? err.message : "Erro ao definir a senha. Tente novamente.");
        toast.error("Erro ao definir senha");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Verificando</CardTitle>
            <CardDescription>Estamos confirmando seu convite...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Ocorreu um erro</CardTitle>
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
            <CardTitle className="text-2xl font-bold tracking-tight">Conta ativada!</CardTitle>
            <CardDescription>Sua senha foi definida com sucesso.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p>Você será redirecionado para o sistema em instantes...</p>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo ao GestOS!</CardTitle>
          <CardDescription>Defina uma senha para ativar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="password" render={({ field }) => <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Crie uma senha" {...field} autoComplete="new-password" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres, com letra maiúscula, minúscula e número.</p>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem>
                    <FormLabel>Confirme a senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repita a senha" {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando...
                  </> : "Ativar minha conta"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
}
