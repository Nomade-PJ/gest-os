import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, ScrollText, Ban, CheckCircle2, CreditCard, KeyRound, MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const ACTION_INFO = {
  suspend_organization: {
    label: "Suspendeu acesso",
    icon: Ban,
    className: "bg-red-500/15 text-red-400"
  },
  reactivate_organization: {
    label: "Reativou acesso",
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-400"
  },
  adjust_subscription: {
    label: "Ajustou assinatura",
    icon: CreditCard,
    className: "bg-blue-500/15 text-blue-400"
  },
  force_password_reset: {
    label: "Forçou reset de senha",
    icon: KeyRound,
    className: "bg-amber-500/15 text-amber-400"
  },
  send_admin_message: {
    label: "Enviou mensagem",
    icon: MessageSquare,
    className: "bg-purple-500/15 text-purple-400"
  }
};
const formatDateTime = value => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};
const AuditLog = () => {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: rawLogs,
        error
      } = await supabase.from("admin_audit_log").select("*").order("created_at", {
        ascending: false
      }).limit(200);
      if (error) throw error;
      const entries = rawLogs || [];

      // admin_audit_log não tem FK direta pra profiles (só pra auth.users),
      // então o PostgREST não consegue montar esse join sozinho.
      // Buscamos os perfis e organizações separadamente e juntamos aqui.
      const userIds = [...new Set(entries.flatMap(l => [l.admin_user_id, l.target_user_id]).filter(Boolean))];
      const orgIds = [...new Set(entries.map(l => l.target_organization_id).filter(Boolean))];
      const [{
        data: profilesData
      }, {
        data: orgsData
      }] = await Promise.all([userIds.length ? supabase.from("profiles").select("id, name, email").in("id", userIds) : Promise.resolve({
        data: []
      }), orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({
        data: []
      })]);
      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      const orgMap = Object.fromEntries((orgsData || []).map(o => [o.id, o]));
      const merged = entries.map(entry => ({
        ...entry,
        adminProfile: profileMap[entry.admin_user_id],
        targetProfile: entry.target_user_id ? profileMap[entry.target_user_id] : null,
        targetOrg: entry.target_organization_id ? orgMap[entry.target_organization_id] : null
      }));
      setLogs(merged);
    } catch (error) {
      console.error("Erro ao carregar log de auditoria:", error);
      toast.error("Erro ao carregar log de auditoria");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  const filtered = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return log.targetOrg?.name?.toLowerCase().includes(term) || log.targetProfile?.email?.toLowerCase().includes(term) || ACTION_INFO[log.action]?.label.toLowerCase().includes(term);
  });
  return <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-red-400" />
          Log de Auditoria
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Últimas {logs.length} ações administrativas registradas
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input placeholder="Buscar por empresa, e-mail ou ação..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-slate-900 border-slate-700 text-slate-100" />
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhuma ação registrada ainda.</p>
          ) : filtered.map(log => {
            const info = ACTION_INFO[log.action] || { label: log.action, icon: ScrollText, className: "bg-slate-500/15 text-slate-400" };
            const Icon = info.icon;
            return (
              <Card key={log.id} className="bg-slate-900 border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={`${info.className} gap-1.5`}>
                    <Icon className="h-3 w-3" />
                    {info.label}
                  </Badge>
                  <span className="text-xs text-slate-500 shrink-0">{formatDateTime(log.created_at)}</span>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{log.targetOrg?.name || "—"}</p>
                  {log.targetProfile?.email && <p className="text-slate-500 text-xs">{log.targetProfile.email}</p>}
                </div>
                {log.details && (
                  <p className="text-slate-400 text-xs border-t border-slate-800 pt-2">
                    {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                  </p>
                )}
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
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Cliente afetado</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Carregando...
                  </td>
                </tr> : filtered.length === 0 ? <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma ação registrada ainda.
                  </td>
                </tr> : filtered.map(log => {
              const info = ACTION_INFO[log.action] || {
                label: log.action,
                icon: ScrollText,
                className: "bg-slate-500/15 text-slate-400"
              };
              const Icon = info.icon;
              return <tr key={log.id} className="border-b border-slate-800/60 text-slate-200 align-top">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${info.className} gap-1.5`}>
                          <Icon className="h-3 w-3" />
                          {info.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{log.targetOrg?.name || "—"}</p>
                        {log.targetProfile?.email && <p className="text-slate-500 text-xs">{log.targetProfile.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={typeof log.details === "string" ? log.details : JSON.stringify(log.details)}>
                        {typeof log.details === "string" ? log.details : log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>;
            })}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>;
};
export default AuditLog;
