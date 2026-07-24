import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Preços — ver PRICING.md para o raciocínio.
const PLANS = [{
  id: "monthly",
  name: "Mensal",
  pricePerMonth: 59.9,
  billingNote: "Cobrado todo mês",
  highlight: false
}, {
  id: "semiannual",
  name: "Semestral",
  pricePerMonth: 50.9,
  billingNote: "Equivalente a R$ 50,90/mês",
  discountLabel: "Economize 15%",
  highlight: true
}, {
  id: "annual",
  name: "Anual",
  pricePerMonth: 44.9,
  billingNote: "Equivalente a R$ 44,90/mês",
  discountLabel: "Economize 25%",
  highlight: false
}];
const FEATURES = ["Clientes, dispositivos e ordens de serviço ilimitados", "Notificações em tempo real", "Relatórios e dashboard completos", "Impressão de etiquetas e comprovantes", "Suporte por e-mail"];
const Plans = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubscribe = async () => {
    if (!companyName.trim() || !email.trim()) {
      toast.error("Preenche nome da empresa e e-mail");
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          plan: selectedPlan.id,
          email: email.trim(),
          companyName: companyName.trim()
        }
      });
      if (error) throw error;
      if (!data?.url) throw new Error("URL de pagamento não retornada");

      // Redireciona para o Checkout hospedado do Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error("Erro ao iniciar assinatura:", error);
      toast.error("Não foi possível iniciar o pagamento", {
        description: "Tente novamente em instantes."
      });
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 py-12">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" className="text-slate-300 hover:text-white mb-8" onClick={() => navigate("/login")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para o login
        </Button>

        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img src="/logo-icon.png" alt="GestOS" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Escolha seu plano
          </h1>
          <p className="text-slate-300 mt-2">
            Gerencie sua assistência técnica com o GestOS. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => <Card key={plan.id} className={cn("relative border-none rounded-xl overflow-hidden flex flex-col", plan.highlight && "ring-2 ring-blue-500 md:-translate-y-2")} style={{
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(16px)'
        }}>
              {plan.highlight && <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-xs font-semibold text-center py-1.5">
                  Mais popular
                </div>}
              <CardHeader className={cn("text-center", plan.highlight && "pt-10")}>
                <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-white">
                    R$ {plan.pricePerMonth.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                {plan.discountLabel && <span className="inline-block mt-2 text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    {plan.discountLabel}
                  </span>}
                <CardDescription className="text-slate-400 mt-2">
                  {plan.billingNote}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {FEATURES.map(feature => <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>)}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={cn("w-full h-11 font-medium", plan.highlight ? "enter-button" : "bg-slate-800 hover:bg-slate-700 text-white")} onClick={() => setSelectedPlan(plan)}>
                  Assinar {plan.name}
                </Button>
              </CardFooter>
            </Card>)}
        </div>

        <p className="text-center text-slate-500 text-xs mt-10">
          Sistema Desenvolvido por Nomade-PJ © 2025
        </p>
      </div>

      {/* Formulário rápido antes de ir para o pagamento */}
      <Dialog open={!!selectedPlan} onOpenChange={open => !open && !loading && setSelectedPlan(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Assinar plano {selectedPlan?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Você será redirecionado para o pagamento seguro do Stripe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-slate-300">Nome da empresa</Label>
              <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Assistência Técnica do João" className="bg-slate-800 border-slate-700 text-slate-100" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-slate-800 border-slate-700 text-slate-100" disabled={loading} />
            </div>
            <Button className="w-full enter-button h-11" onClick={handleSubscribe} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecionando...</> : "Continuar para pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Plans;
