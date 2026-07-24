import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LinkIcon, XCircle } from "lucide-react";
export default function MagicLink() {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL - handles both search params and hash params
  const getTokenFromUrl = () => {
    // Check for token in search params
    const tokenFromSearch = searchParams.get("token");
    if (tokenFromSearch) return tokenFromSearch;

    // Check for token in hash (Supabase sometimes puts it in hash)
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      return hashParams.get("token");
    }
    return null;
  };
  const token = getTokenFromUrl();
  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        // Verificar sessão diretamente, independente dos parâmetros da URL
        const {
          data,
          error
        } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        if (data.session) {
          // Se a sessão existe, redirecionar para o dashboard
          setTimeout(() => {
            navigate("/dashboard");
          }, 1500);
        } else {
          // Se não há sessão, verificar se temos dados de URL
          if (!token) {
            throw new Error("Link inválido ou expirado. Por favor, solicite um novo link mágico.");
          }

          // Tentar processar o token se existir mas a sessão não foi estabelecida
          throw new Error("Não foi possível estabelecer uma sessão. Por favor, tente novamente.");
        }
      } catch (err) {
        console.error("Erro ao processar link mágico:", err);
        setError(err instanceof Error ? err.message : "Erro ao processar o link mágico. Por favor, tente novamente.");
      } finally {
        setIsProcessing(false);
      }
    };
    verifyMagicLink();
  }, [token, navigate]);
  if (isProcessing) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Acessando o Sistema</CardTitle>
            <CardDescription>Estamos validando seu acesso, por favor aguarde...</CardDescription>
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
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold tracking-tight">Erro ao acessar</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <LinkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold tracking-tight">Acesso Autorizado!</CardTitle>
          <CardDescription>
            Seu acesso foi autorizado. Você será redirecionado em instantes...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>;
}
