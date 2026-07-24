import React, { useState, useEffect, useCallback } from "react";
import { Bell, DollarSign, Wrench, Package, FileText, Sparkles, CheckCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Tipo para as notificações

const Header = () => {
  const {
    logout,
    user,
    profile
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Função para determinar o título da página baseado na URL atual
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path.includes("/clients")) return "Clientes";
    if (path.includes("/devices")) return "Dispositivos";
    if (path.includes("/services")) return "Serviços";
    if (path.includes("/inventory")) return "Estoque";
    if (path.includes("/documents")) return "Documentos";
    if (path.includes("/reports")) return "Relatórios";
    if (path.includes("/settings")) return "Configurações";
    if (path.includes("/user-registration")) return "Cadastro de Cliente";
    if (path.includes("/device-registration")) return "Cadastro de Dispositivo";
    if (path.includes("/service-registration")) return "Cadastro de Serviço";
    return "GestOS";
  };

  // Função para carregar notificações do usuário
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Buscar notificações no Supabase
      const {
        data,
        error
      } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      toast.error("Não foi possível carregar as notificações");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Função para marcar notificação como lida
  const markAsRead = async (notificationId, actionLink) => {
    try {
      await supabase.from('notifications').update({
        read: true
      }).eq('id', notificationId);

      // Atualizar estado localmente
      setNotifications(prev => prev.map(n => n.id === notificationId ? {
        ...n,
        read: true
      } : n));

      // Se tiver um link de ação, navegue para ele
      if (actionLink) {
        setOpen(false);
        navigate(actionLink);
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      toast.error("Não foi possível atualizar a notificação");
    }
  };

  // Função para marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      if (!user) return;
      await supabase.from('notifications').update({
        read: true
      }).eq('user_id', user.id).eq('read', false);

      // Atualizar estado localmente
      setNotifications(prev => prev.map(n => ({
        ...n,
        read: true
      })));
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
      toast.error("Não foi possível atualizar as notificações");
    }
  };

  // Carregar notificações ao iniciar
  useEffect(() => {
    if (user) {
      loadNotifications();

      // Assinar para atualizações em tempo real
      const subscription = supabase.channel('public:notifications').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        // Adicionar nova notificação ao estado
        const newNotification = payload.new;
        setNotifications(prev => [newNotification, ...prev]);

        // Mostrar toast para notificação recebida
        toast.info(newNotification.title, {
          description: newNotification.description,
          position: 'top-right'
        });
      }).subscribe();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, loadNotifications]);

  // Contagem de notificações não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Renderizar ícone correspondente ao tipo de notificação
  const getNotificationIcon = type => {
    switch (type) {
      case 'service':
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-red-500" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'system':
        return <Sparkles className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };
  const formatDate = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMinutes < 60) {
      return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else if (diffDays < 7) {
      return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  // Recuperar as informações do avatar e nome do usuário
  const userInitials = profile?.name ? profile.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const displayName = profile?.name || (user?.email ? user.email.split('@')[0] : "Usuário");
  const avatarUrl = profile?.avatar_url;
  return <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
        {/* Título da página atual */}
        <div className="font-semibold text-lg">{getPageTitle()}</div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex justify-between items-center">
                <span>Notificações</span>
                {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs flex items-center" onClick={markAllAsRead}>
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas como lidas
                  </Button>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <ScrollArea className="h-[300px]">
                <DropdownMenuGroup>
                  {loading ? <div className="flex justify-center items-center py-4">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div> : notifications.length === 0 ? <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Nenhuma notificação</p>
                    </div> : notifications.map(notification => <DropdownMenuItem key={notification.id} className={`cursor-pointer py-2 px-3 ${!notification.read ? 'bg-primary/5' : ''}`} onClick={() => markAsRead(notification.id, notification.action_link)}>
                        <div className="flex gap-2 w-full">
                          <div className="pt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && <div className="h-2 w-2 bg-primary rounded-full mt-1 flex-shrink-0"></div>}
                        </div>
                      </DropdownMenuItem>)}
                </DropdownMenuGroup>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};
export default Header;
