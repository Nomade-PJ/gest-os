import { supabase } from "@/integrations/supabase/client";

// Tipos para as notificações

/**
 * Envia uma notificação para um usuário específico
 */
export const sendNotification = async params => {
  try {
    const {
      data,
      error
    } = await supabase.from('notifications').insert([{
      user_id: params.userId,
      type: params.type,
      title: params.title,
      description: params.description,
      read: false,
      action_link: params.actionLink,
      related_id: params.relatedId,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    throw error;
  }
};

/**
 * Envia uma notificação para múltiplos usuários (administradores)
 */
export const sendAdminNotification = async params => {
  try {
    // Buscar todos os usuários administradores
    const {
      data: admins,
      error: adminsError
    } = await supabase.from('profiles').select('id').eq('role', 'Admin');
    if (adminsError) throw adminsError;
    if (!admins || admins.length === 0) return null;

    // Criar uma notificação para cada admin
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: params.type,
      title: params.title,
      description: params.description,
      read: false,
      action_link: params.actionLink,
      related_id: params.relatedId,
      created_at: new Date().toISOString()
    }));
    const {
      data,
      error
    } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao enviar notificação para administradores:", error);
    throw error;
  }
};

/**
 * Envia uma notificação sobre estoque baixo
 */
export const sendLowStockNotification = async (userId, itemName, quantity, itemId) => {
  return sendNotification({
    userId,
    type: 'inventory',
    title: `Estoque baixo: ${itemName}`,
    description: `Apenas ${quantity} ${quantity === 1 ? 'unidade restante' : 'unidades restantes'}`,
    actionLink: `/dashboard/inventory`,
    relatedId: itemId
  });
};

/**
 * Envia uma notificação sobre serviço aguardando
 */
export const sendServiceWaitingNotification = async (userId, serviceNumber, days, serviceId) => {
  return sendNotification({
    userId,
    type: 'service',
    title: `Serviço #${serviceNumber} aguardando ação`,
    description: `Sem atualização há ${days} ${days === 1 ? 'dia' : 'dias'}`,
    actionLink: `/dashboard/service-registration/${serviceId}`,
    relatedId: serviceId
  });
};

/**
 * Envia uma notificação sobre pagamento pendente
 */
export const sendPaymentPendingNotification = async (userId, clientName, value, serviceId) => {
  return sendNotification({
    userId,
    type: 'payment',
    title: `Pagamento pendente de ${clientName}`,
    description: `R$ ${value.toFixed(2).replace('.', ',')} - Vence hoje`,
    actionLink: `/dashboard/service-registration/${serviceId}`,
    relatedId: serviceId
  });
};

/**
 * Envia uma notificação sobre atualização do sistema
 */
export const sendSystemUpdateNotification = async (userId, title, description) => {
  return sendNotification({
    userId,
    type: 'system',
    title,
    description
  });
};
