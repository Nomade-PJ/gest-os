import { useLocation, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404: tentativa de acesso a uma rota inexistente:", location.pathname);
  }, [location.pathname]);

  // Alguns provedores de e-mail corrompem/reescrevem a URL do link de
  // convite ou redefinição de senha (o caminho vem errado, tipo
  // "/auth/reset-password706338"). Se o token de autenticação ainda
  // estiver no fragmento da URL, resgatamos ele em vez de mostrar 404.
  const hash = window.location.hash;
  if (hash.includes("type=recovery")) {
    return <Navigate to={`/auth/reset-password${hash}`} replace />;
  }
  if (hash.includes("type=invite")) {
    return <Navigate to={`/auth/confirm${hash}`} replace />;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">
          O endereço <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span> não existe ou foi movido.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    </div>;
};
export default NotFound;
