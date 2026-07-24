/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { cn } from "@/lib/utils";

// 5 grupos semânticos (neutro / ativo / atenção / sucesso / cancelado) em vez de
// uma cor arbitrária por status — mais fácil de manter contraste e reconhecer de relance.
const NEUTRAL = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
const NEUTRAL_DOT = "bg-slate-400";
const ACTIVE = "bg-primary/10 text-primary dark:bg-primary/20";
const ACTIVE_DOT = "bg-primary";
const ATTENTION = "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
const ATTENTION_DOT = "bg-amber-500";
const SUCCESS = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
const SUCCESS_DOT = "bg-emerald-500";
const CANCELLED = "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
const CANCELLED_DOT = "bg-red-500";
const STATUS_MAP = {
  received: {
    label: "Recebido",
    color: NEUTRAL,
    dot: NEUTRAL_DOT
  },
  diagnosis: {
    label: "Diagnóstico",
    color: ACTIVE,
    dot: ACTIVE_DOT
  },
  waiting_client: {
    label: "Aguardando Cliente",
    color: ATTENTION,
    dot: ATTENTION_DOT
  },
  waiting_part: {
    label: "Aguardando Peça",
    color: ATTENTION,
    dot: ATTENTION_DOT
  },
  in_repair: {
    label: "Em Reparo",
    color: ACTIVE,
    dot: ACTIVE_DOT
  },
  testing: {
    label: "Em Teste",
    color: ACTIVE,
    dot: ACTIVE_DOT
  },
  ready: {
    label: "Pronto",
    color: SUCCESS,
    dot: SUCCESS_DOT
  },
  delivered: {
    label: "Entregue",
    color: SUCCESS,
    dot: SUCCESS_DOT
  },
  cancelled: {
    label: "Cancelado",
    color: CANCELLED,
    dot: CANCELLED_DOT
  },
  pending: {
    label: "Pendente",
    color: ATTENTION,
    dot: ATTENTION_DOT
  },
  completed: {
    label: "Concluído",
    color: SUCCESS,
    dot: SUCCESS_DOT
  },
  in_progress: {
    label: "Em Andamento",
    color: ACTIVE,
    dot: ACTIVE_DOT
  },
  waiting_parts: {
    label: "Aguardando Peças",
    color: ATTENTION,
    dot: ATTENTION_DOT
  }
};
const normalizeStatus = status => status?.toLowerCase().replace(/-/g, "_").replace(/ /g, "_");

// Único ponto de verdade pra cor de status — reaproveitado tanto pelo <StatusBadge>
// quanto por qualquer outro lugar do app que precise só da cor (ex: timeline).
export const getStatusConfig = status => STATUS_MAP[normalizeStatus(status)] ?? {
  label: status ?? "—",
  color: NEUTRAL,
  dot: NEUTRAL_DOT
};
export const StatusBadge = ({
  status,
  size = "md",
  showDot = true,
  className
}) => {
  const config = getStatusConfig(status);
  return <span className={cn("inline-flex items-center gap-1.5 font-medium rounded-full", size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1", config.color, className)}>
      {showDot && <span className={cn("rounded-full shrink-0", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />}
      {config.label}
    </span>;
};
export default StatusBadge;
