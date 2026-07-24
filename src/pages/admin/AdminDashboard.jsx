import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Ban, CheckCircle2, Users, KeyRound, MessageSquarePlus, Settings2, Building2, UserPlus, Clock, Trash2 } from "lucide-react";

const STATUS_LABELS = {
  active: { label: "Ativa", className: "bg-green-500/15 text-green-400" },
  past_due: { label: "Atrasada", className: "bg-amber-500/15 text-amber-400" },
  canceled: { label: "Cancelada", className: "bg-slate-500/15 text-slate-400" },
  incomplete: { label: "Sem assinatura", className: "bg-slate-500/15 text-slate-400" }
};

const PLAN_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" }
];

const formatDate = value => {
  if (!value) return "Nunca";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// O nome salvo costuma vir com o sufixo " - Organização" (gerado automaticamente
// no cadastro). Pra confirmação de exclusão, pedimos só o nome de verdade da
// empresa — mais fácil de digitar/colar, sem perder a segurança de ter que
// confirmar o nome certo.
const getConfirmName = org => (org?.name || "").replace(/\s*-\s*Organiza[cç][aã]o\s*$/i, "").trim();

const daysUntil = dateStr => {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
};

const endOfDayISO = dateStr => {
  if (!dateStr) return null;
  return new Date(`${dateStr}T23:59:59`).toISOString();
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <Card className="bg-slate-900 border-slate-800 p-4 flex items-center gap-3">
    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
      <Icon className="h-4.5 w-4.5" />
    </div>
    <div>
      <p className="text-xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [managingOrg, setManagingOrg] = useState(null);
  const [planValue, setPlanValue] = useState("");
  const [planUntil, setPlanUntil] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [hardDeleting, setHardDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("organizations").select(`
          id, name, is_suspended, suspended_reason, created_at, deleted_at, purge_after,
          profiles ( id, name, email, last_login_at ),
          subscriptions ( id, status, plan, current_period_end, manually_adjusted_until, admin_notes )
        `).order("created_at", { ascending: false });
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Erro ao carregar organizações:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const logAction = async (action, targetOrgId, targetUserId, details) => {
    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action,
      target_organization_id: targetOrgId,
      target_user_id: targetUserId || null,
      details: details || null
    });
  };

  const toggleSuspend = async org => {
    const willSuspend = !org.is_suspended;
    if (willSuspend && !window.confirm(`Suspender o acesso de "${org.name || 'esta empresa'}"? O cliente não vai conseguir mais entrar no sistema.`)) {
      return;
    }
    setProcessingId(org.id);
    try {
      const { error } = await supabase.from("organizations").update({
        is_suspended: willSuspend,
        suspended_at: willSuspend ? new Date().toISOString() : null,
        suspended_reason: willSuspend ? "Suspenso manualmente pelo admin" : null
      }).eq("id", org.id);
      if (error) throw error;
      await logAction(willSuspend ? "suspend_organization" : "reactivate_organization", org.id, org.profiles?.[0]?.id);
      toast.success(willSuspend ? "Acesso suspenso" : "Acesso reativado");
      fetchOrganizations();
    } catch (error) {
      console.error("Erro ao atualizar organização:", error);
      toast.error("Não foi possível atualizar o status");
    } finally {
      setProcessingId(null);
    }
  };

  const openManageDialog = org => {
    const sub = org.subscriptions?.[0];
    setManagingOrg(org);
    setPlanValue(sub?.plan || "monthly");
    setPlanUntil("");
    setPlanNotes(sub?.admin_notes || "");
    setMessageTitle("");
    setMessageBody("");
    setDeleteConfirmText("");
  };

  const closeManageDialog = () => {
    setManagingOrg(null);
    setDeleteConfirmText("");
  };

  const handleAdjustPlan = async () => {
    if (!managingOrg) return;
    if (!planUntil) {
      toast.error("Informe até quando a assinatura fica válida");
      return;
    }
    setSavingPlan(true);
    try {
      const sub = managingOrg.subscriptions?.[0];
      const ownerId = managingOrg.profiles?.[0]?.id;
      if (!sub?.id && !ownerId) {
        toast.error("Este cliente não tem usuário vinculado — não é possível criar a assinatura");
        setSavingPlan(false);
        return;
      }
      const payload = {
        organization_id: managingOrg.id,
        plan: planValue,
        status: "active",
        manually_adjusted_until: endOfDayISO(planUntil),
        admin_notes: planNotes || null,
        ...(!sub?.id ? { user_id: ownerId } : {})
      };
      const { error } = sub?.id
        ? await supabase.from("subscriptions").update(payload).eq("id", sub.id)
        : await supabase.from("subscriptions").insert(payload);
      if (error) throw error;
      await logAction("adjust_subscription", managingOrg.id, managingOrg.profiles?.[0]?.id, `Plano: ${planValue}, válido até ${planUntil}. ${planNotes || ""}`);
      toast.success("Assinatura atualizada");
      closeManageDialog();
      fetchOrganizations();
    } catch (error) {
      console.error("Erro ao ajustar assinatura:", error);
      toast.error("Não foi possível ajustar a assinatura");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleForcePasswordReset = async () => {
    const email = managingOrg?.profiles?.[0]?.email;
    if (!email) {
      toast.error("Este cliente não tem e-mail cadastrado");
      return;
    }
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) throw error;
      await logAction("force_password_reset", managingOrg.id, managingOrg.profiles?.[0]?.id, `E-mail: ${email}`);
      toast.success(`E-mail de redefinição enviado para ${email}`);
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
      toast.error("Não foi possível enviar o e-mail de redefinição");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSendMessage = async () => {
    const targetUserId = managingOrg?.profiles?.[0]?.id;
    if (!targetUserId) {
      toast.error("Este cliente não tem usuário vinculado");
      return;
    }
    if (!messageTitle.trim() || !messageBody.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: targetUserId,
        organization_id: managingOrg.id,
        type: "system",
        title: messageTitle.trim(),
        description: messageBody.trim(),
        read: false
      });
      if (error) throw error;
      await logAction("send_admin_message", managingOrg.id, targetUserId, messageTitle.trim());
      toast.success("Mensagem enviada — o cliente vai vê-la no sino de notificações");
      setMessageTitle("");
      setMessageBody("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Não foi possível enviar a mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResendInvite = async () => {
    const email = managingOrg?.profiles?.[0]?.email;
    if (!email) {
      toast.error("Este cliente não tem e-mail cadastrado");
      return;
    }
    setResendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "resend_invite", email, companyName: managingOrg.name }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logAction("resend_invite", managingOrg.id, managingOrg.profiles?.[0]?.id, `E-mail: ${email}`);
      toast.success(`Convite reenviado para ${email}`);
    } catch (error) {
      console.error("Erro ao reenviar convite:", error);
      toast.error("Não foi possível reenviar o convite", { description: error.message });
    } finally {
      setResendingInvite(false);
    }
  };

  const handleMagicLink = async () => {
    const email = managingOrg?.profiles?.[0]?.email;
    if (!email) {
      toast.error("Este cliente não tem e-mail cadastrado");
      return;
    }
    setSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      await logAction("send_magic_link", managingOrg.id, managingOrg.profiles?.[0]?.id, `E-mail: ${email}`);
      toast.success(`Link mágico enviado para ${email}`);
    } catch (error) {
      console.error("Erro ao enviar link mágico:", error);
      toast.error("Não foi possível enviar o link mágico");
    } finally {
      setSendingMagicLink(false);
    }
  };

  // Marca a organização para exclusão definitiva em 30 dias (não apaga nada
  // ainda — dá pra restaurar até lá). Toda a lógica de segurança e o registro
  // no log de auditoria acontecem dentro da função do banco.
  const handleSoftDelete = async () => {
    if (!managingOrg?.id) return;
    if (deleteConfirmText !== getConfirmName(managingOrg)) {
      toast.error("Digite o nome da empresa exatamente igual para confirmar");
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("admin_soft_delete_organization", { p_org_id: managingOrg.id });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro desconhecido");
      toast.success("Marcado para exclusão — pode ser restaurado em até 30 dias");
      setDeleteConfirmText("");
      closeManageDialog();
      fetchOrganizations();
    } catch (error) {
      console.error("Erro ao marcar para exclusão:", error);
      toast.error("Não foi possível marcar para exclusão", { description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  // Restaura uma organização que ainda está dentro do prazo de 30 dias.
  const handleRestore = async org => {
    setRestoring(true);
    try {
      const { data, error } = await supabase.rpc("admin_restore_organization", { p_org_id: org.id });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro desconhecido");
      toast.success("Organização restaurada");
      fetchOrganizations();
    } catch (error) {
      console.error("Erro ao restaurar:", error);
      toast.error("Não foi possível restaurar", { description: error.message });
    } finally {
      setRestoring(false);
    }
  };

  // Exclusão definitiva imediata, pulando os 30 dias — só aparece pra quem já
  // está marcado para exclusão, como opção extra pra casos excepcionais.
  const handleHardDeleteNow = async org => {
    if (!window.confirm(`Excluir "${getConfirmName(org)}" AGORA MESMO, sem esperar os 30 dias? Isso não pode ser desfeito de jeito nenhum.`)) {
      return;
    }
    setHardDeleting(true);
    try {
      const { data, error } = await supabase.rpc("admin_hard_delete_organization_now", { p_org_id: org.id });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Erro desconhecido");
      toast.success("Excluído definitivamente");
      fetchOrganizations();
    } catch (error) {
      console.error("Erro ao excluir definitivamente:", error);
      toast.error("Não foi possível excluir", { description: error.message });
    } finally {
      setHardDeleting(false);
    }
  };

  const handleCopyConfirmName = async org => {
    try {
      await navigator.clipboard.writeText(getConfirmName(org));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const filtered = organizations.filter(org => {
    const term = searchTerm.toLowerCase();
    const owner = org.profiles?.[0];
    return !term || org.name?.toLowerCase().includes(term) || owner?.email?.toLowerCase().includes(term) || owner?.name?.toLowerCase().includes(term);
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.subscriptions?.[0]?.status === "active" && !o.is_suspended).length,
    suspended: organizations.filter(o => o.is_suspended && !o.deleted_at).length,
    inTrash: organizations.filter(o => o.deleted_at).length,
    newThisMonth: organizations.filter(o => new Date(o.created_at) >= startOfMonth).length
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-red-400" />
          Clientes
        </h1>
        <p className="text-slate-400 text-sm mt-1">{organizations.length} organizações cadastradas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Building2} label="Total de clientes" value={stats.total} accent="bg-blue-500/15 text-blue-400" />
        <StatCard icon={CheckCircle2} label="Assinaturas ativas" value={stats.active} accent="bg-green-500/15 text-green-400" />
        <StatCard icon={Ban} label="Suspensos" value={stats.suspended} accent="bg-red-500/15 text-red-400" />
        <StatCard icon={Trash2} label="Na lixeira" value={stats.inTrash} accent="bg-amber-500/15 text-amber-400" />
        <StatCard icon={UserPlus} label="Novos este mês" value={stats.newThisMonth} accent="bg-purple-500/15 text-purple-400" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input placeholder="Buscar por empresa ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-slate-900 border-slate-700 text-slate-100" />
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum cliente encontrado.</p>
          ) : filtered.map(org => {
            const owner = org.profiles?.[0];
            const subscription = org.subscriptions?.[0];
            const statusInfo = STATUS_LABELS[subscription?.status || "incomplete"];
            return (
              <Card key={org.id} className="bg-slate-900 border-slate-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{org.name || "Sem nome"}</p>
                    <p className="text-slate-400 text-sm truncate">{owner?.email || "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                    {org.deleted_at ? (
                      <Badge className="bg-amber-500/15 text-amber-400">Exclusão em {daysUntil(org.purge_after)}d</Badge>
                    ) : org.is_suspended && <Badge className="bg-red-500/15 text-red-400">Suspenso</Badge>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-2">
                  <span>Último login: {formatDate(owner?.last_login_at)}</span>
                  <span>
                    {subscription?.plan ? (subscription.plan === "monthly" ? "Mensal" : subscription.plan === "semiannual" ? "Semestral" : "Anual") : "Sem plano"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openManageDialog(org)} className="flex-1 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Gerenciar
                  </Button>
                  {org.deleted_at ? (
                    <Button size="sm" disabled={restoring} onClick={() => handleRestore(org)} className="flex-1 bg-slate-800 border border-green-800 text-green-400 hover:bg-green-950">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Restaurar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={processingId === org.id} onClick={() => toggleSuspend(org)} className={org.is_suspended ? "flex-1 bg-slate-800 border-green-800 text-green-400 hover:bg-green-950" : "flex-1 bg-slate-800 border-red-800 text-red-400 hover:bg-red-950"}>
                      {org.is_suspended ? (<><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Reativar</>) : (<><Ban className="h-3.5 w-3.5 mr-1.5" />Suspender</>)}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Último login</th>
                <th className="px-4 py-3 font-medium">Assinatura</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
              ) : filtered.map(org => {
                const owner = org.profiles?.[0];
                const subscription = org.subscriptions?.[0];
                const statusInfo = STATUS_LABELS[subscription?.status || "incomplete"];
                return (
                  <tr key={org.id} className="border-b border-slate-800/60 text-slate-200">
                    <td className="px-4 py-3 font-medium">{org.name || "Sem nome"}</td>
                    <td className="px-4 py-3 text-slate-400">{owner?.email || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(owner?.last_login_at)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {subscription?.plan ? (subscription.plan === "monthly" ? "Mensal" : subscription.plan === "semiannual" ? "Semestral" : "Anual") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        {org.deleted_at ? (
                          <Badge className="bg-amber-500/15 text-amber-400">Exclusão em {daysUntil(org.purge_after)}d</Badge>
                        ) : org.is_suspended && <Badge className="bg-red-500/15 text-red-400">Suspenso</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openManageDialog(org)} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                          Gerenciar
                        </Button>
                        {org.deleted_at ? (
                          <Button size="sm" disabled={restoring} onClick={() => handleRestore(org)} className="bg-slate-800 border border-green-800 text-green-400 hover:bg-green-950">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Restaurar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={processingId === org.id} onClick={() => toggleSuspend(org)} className={org.is_suspended ? "bg-slate-800 border-green-800 text-green-400 hover:bg-green-950" : "bg-slate-800 border-red-800 text-red-400 hover:bg-red-950"}>
                            {org.is_suspended ? (<><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Reativar</>) : (<><Ban className="h-3.5 w-3.5 mr-1.5" />Suspender</>)}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      <Dialog open={!!managingOrg} onOpenChange={open => !open && closeManageDialog()}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{managingOrg?.name || "Cliente"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {managingOrg?.profiles?.[0]?.email || "Sem e-mail vinculado"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Ajustar assinatura manualmente
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Plano</Label>
                  <Select value={planValue} onValueChange={setPlanValue}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                      {PLAN_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Válido até</Label>
                  <Input type="date" value={planUntil} onChange={e => setPlanUntil(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 mt-1" />
                </div>
              </div>
              <Textarea placeholder="Observação (ex: pagou via PIX em 15/07)" value={planNotes} onChange={e => setPlanNotes(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" rows={2} />
              <Button size="sm" onClick={handleAdjustPlan} disabled={savingPlan} className="w-full">
                {savingPlan ? "Salvando..." : "Salvar assinatura"}
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <Label className="text-sm font-semibold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-400" />
                Forçar redefinição de senha
              </Label>
              <p className="text-xs text-slate-400">Envia um e-mail de redefinição de senha padrão do sistema para o cliente.</p>
              <Button size="sm" variant="outline" onClick={handleForcePasswordReset} disabled={resettingPassword} className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
                {resettingPassword ? "Enviando..." : "Enviar e-mail de redefinição"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleResendInvite} disabled={resendingInvite} className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
                {resendingInvite ? "Enviando..." : "Reenviar link de convite"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleMagicLink} disabled={sendingMagicLink} className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
                {sendingMagicLink ? "Enviando..." : "Enviar link mágico (sem senha)"}
              </Button>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <Label className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-green-400" />
                Enviar mensagem
              </Label>
              <p className="text-xs text-slate-400">Aparece como notificação dentro do sistema para o cliente (ainda não envia e-mail).</p>
              <Input placeholder="Título" value={messageTitle} onChange={e => setMessageTitle(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
              <Textarea placeholder="Mensagem" value={messageBody} onChange={e => setMessageBody(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" rows={3} />
              <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage} className="w-full">
                {sendingMessage ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </div>

            {managingOrg?.deleted_at ? (
              <div className="border-t border-amber-900/40 pt-4 space-y-3">
                <Label className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Marcado para exclusão
                </Label>
                <p className="text-xs text-slate-400">
                  Essa conta vai ser apagada definitivamente em{" "}
                  <span className="text-amber-300 font-semibold">{daysUntil(managingOrg.purge_after)} dia(s)</span>.
                  Até lá, dá pra restaurar o acesso normalmente.
                </p>
                <Button size="sm" onClick={() => handleRestore(managingOrg)} disabled={restoring} className="w-full bg-green-900/40 border border-green-800 text-green-300 hover:bg-green-900/60">
                  {restoring ? "Restaurando..." : "Restaurar esta conta"}
                </Button>
                <button
                  type="button"
                  onClick={() => handleHardDeleteNow(managingOrg)}
                  disabled={hardDeleting}
                  className="text-xs text-red-500/70 hover:text-red-400 underline underline-offset-2 block mx-auto"
                >
                  {hardDeleting ? "Excluindo..." : "Excluir definitivamente agora, sem esperar"}
                </button>
              </div>
            ) : (
              <div className="border-t border-red-900/40 pt-4 space-y-3">
                <Label className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir conta
                </Label>
                <p className="text-xs text-slate-400">
                  A conta fica marcada para exclusão e some do uso normal, mas os dados só são apagados de vez
                  depois de <span className="text-slate-300">30 dias</span> — até lá dá pra restaurar. Depois desse
                  prazo, não tem mais volta.
                </p>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                  Digite
                  <span className="font-mono font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                    {getConfirmName(managingOrg)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyConfirmName(managingOrg)}
                    className="text-slate-400 hover:text-white underline underline-offset-2"
                  >
                    {copied ? "copiado!" : "copiar"}
                  </button>
                  para confirmar:
                </p>
                <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Nome da empresa" className="bg-slate-800 border-red-900/40 text-slate-100" />
                <Button size="sm" variant="destructive" onClick={handleSoftDelete} disabled={deleting || deleteConfirmText !== getConfirmName(managingOrg)} className="w-full">
                  {deleting ? "Processando..." : "Marcar para exclusão"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeManageDialog} className="text-slate-400">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminDashboard;
