/**
 * Gera um novo ID de rastreamento público para um serviço
 * 
 * @returns UUID v4 simulado para uso como tracking ID
 */
export const generateTrackingId = () => {
  // Implementação básica de um gerador de UUID v4
  // Não é tão seguro quanto uuid real, mas serve para fins de demonstração
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
};

/**
 * Valida se um tracking ID tem formato válido (UUID v4)
 * 
 * @param trackingId ID de rastreamento a ser validado
 * @returns true se o ID for um UUID v4 válido
 */
export const isValidTrackingId = trackingId => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trackingId);
};

/**
 * Converte o status do serviço para um esquema de cores do QR code
 * 
 * @param status Status do serviço
 * @returns Esquema de cores correspondente ao status
 */
export const statusToColorScheme = status => {
  switch (status.toLowerCase()) {
    case 'concluído':
    case 'concluido':
    case 'finalizado':
    case 'pronto para entrega':
      return 'success';
    case 'em andamento':
    case 'em análise':
    case 'em analise':
    case 'aguardando peças':
    case 'aguardando pecas':
      return 'warning';
    case 'cancelado':
    case 'sem reparo':
    case 'desistência':
    case 'desistencia':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Formata uma data estimada de conclusão para exibição
 * 
 * @param estimatedDate Data estimada de conclusão (string ou Date)
 * @returns Data formatada em formato amigável (ex: "15 de junho de 2024")
 */
export const formatEstimatedDate = estimatedDate => {
  if (!estimatedDate) return 'Data não disponível';
  const date = typeof estimatedDate === 'string' ? new Date(estimatedDate) : estimatedDate;

  // Verifica se a data é válida
  if (isNaN(date.getTime())) return 'Data inválida';

  // Formata a data em PT-BR
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Traduz o status do serviço para um formato amigável ao cliente
 * 
 * @param status Status original do serviço
 * @returns Status traduzido para exibição pública
 */
export const translateStatusForPublic = status => {
  const statusMap = {
    // Status em inglês
    'pending': 'Pendente',
    'in_progress': 'Em andamento',
    'waiting_parts': 'Aguardando peças',
    'completed': 'Concluído',
    'delivered': 'Entregue',
    // Status em português
    'pendente': 'Pendente',
    'em análise': 'Em análise técnica',
    'em analise': 'Em análise técnica',
    'aguardando aprovação': 'Aguardando sua aprovação',
    'aguardando aprovacao': 'Aguardando sua aprovação',
    'aguardando peças': 'Aguardando peças para reparo',
    'aguardando pecas': 'Aguardando peças para reparo',
    'em andamento': 'Em andamento',
    'concluído': 'Serviço concluído ✅',
    'concluido': 'Serviço concluído ✅',
    'pronto para entrega': 'Pronto para retirada ✅',
    'cancelado': 'Serviço cancelado',
    'sem reparo': 'Sem possibilidade de reparo',
    'desistência': 'Cancelado pelo cliente',
    'desistencia': 'Cancelado pelo cliente'
  };
  return statusMap[status.toLowerCase()] || status;
};
