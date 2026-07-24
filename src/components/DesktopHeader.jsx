import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Search, Moon, Sun, User, Settings, LogOut, Wrench, DollarSign, FileText, Sparkles, CheckCheck, ChevronRight, HelpCircle, LayoutDashboard, Users, Smartphone, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Route → breadcrumb map
const ROUTE_LABELS = {
  "/dashboard": "Dashboard",
  "/dashboard/clients": "Clientes",
  "/dashboard/devices": "Dispositivos",
  "/dashboard/services": "Serviços",
  "/dashboard/reports": "Relatórios",
  "/dashboard/settings": "Configurações",
  "/dashboard/user-registration": "Usuários"
};
const DesktopHeader = () => {
  const {
    user,
    profile,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dark mode toggle
  useEffect(() => {
    const stored = localStorage.getItem("gestos-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gestos-theme", next ? "dark" : "light");
  };

  // Notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      }).limit(15);
      if (error) throw error;
      setNotifications(data || []);
    } catch {
      toast.error("Erro ao carregar notificações");
    } finally {
      setNotifLoading(false);
    }
  }, [user]);
  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const sub = supabase.channel("header:notifications").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`
    }, payload => {
      const n = payload.new;
      setNotifications(prev => [n, ...prev]);
      toast.info(n.title, {
        description: n.description
      });
    }).subscribe();
    return () => {
      sub.unsubscribe();
    };
  }, [user, loadNotifications]);

  // Global search keyboard shortcut
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const markAsRead = async id => {
    await supabase.from("notifications").update({
      read: true
    }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? {
      ...n,
      read: true
    } : n));
  };
  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({
      read: true
    }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({
      ...n,
      read: true
    })));
    toast.success("Todas marcadas como lidas");
  };
  const unreadCount = notifications.filter(n => !n.read).length;
  const formatDate = s => {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (diff < 60) return "Agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };
  const getNotifIcon = type => {
    const map = {
      service: <Wrench className="h-3.5 w-3.5 text-yellow-500" />,
      payment: <DollarSign className="h-3.5 w-3.5 text-green-500" />,
      document: <FileText className="h-3.5 w-3.5 text-orange-500" />,
      system: <Sparkles className="h-3.5 w-3.5 text-blue-500" />
    };
    return map[type] ?? <Bell className="h-3.5 w-3.5 text-blue-500" />;
  };

  // Breadcrumb
  const getBreadcrumb = () => {
    const path = location.pathname;
    const label = ROUTE_LABELS[path] || "GestOS";
    return label;
  };
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const userInitials = profile?.name ? profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "U";

  // Quick search suggestions
  const searchLinks = [{
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard
  }, {
    label: "Nova OS",
    path: "/dashboard/service-registration/new",
    icon: Wrench
  }, {
    label: "Clientes",
    path: "/dashboard/clients",
    icon: Users
  }, {
    label: "Dispositivos",
    path: "/dashboard/devices",
    icon: Smartphone
  }, {
    label: "Relatórios",
    path: "/dashboard/reports",
    icon: BarChart3
  }, {
    label: "Configurações",
    path: "/dashboard/settings",
    icon: Settings
  }].filter(item => !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase()));
  return <>
      {/* Global Search Modal */}
      {searchOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{
        opacity: 0,
        scale: 0.96,
        y: -8
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.96
      }} transition={{
        duration: 0.15
      }} className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar página, ação..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
                ESC
              </kbd>
            </div>
            <div className="py-2 max-h-72 overflow-y-auto">
              {searchLinks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum resultado</p> : searchLinks.map(item => <button key={item.path} onClick={() => {
            navigate(item.path);
            setSearchOpen(false);
            setSearchQuery("");
          }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground
                      hover:bg-muted transition-colors text-left">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>)}
            </div>
          </motion.div>
        </div>}

      {/* Header Bar */}
      <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-5 gap-4 sticky top-0 z-30">
        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">GestOS</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:inline" />
          <span className="text-sm font-semibold text-foreground truncate">
            {getBreadcrumb()}
          </span>
        </div>

        {/* Center actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button onClick={() => setSearchOpen(true)} className={cn("hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border", "text-sm text-muted-foreground bg-muted/50 hover:bg-muted transition-colors")}>
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs hidden md:inline">Buscar...</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono hidden md:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Dark mode */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Help */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notificações</p>
                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" />
                    Marcar todas
                  </button>}
              </div>
              <ScrollArea className="h-80">
                {notifLoading ? <div className="p-6 flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
                  </div> : notifications.length === 0 ? <div className="py-10 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Sem notificações</p>
                  </div> : <div className="py-1">
                    {notifications.map(n => <button key={n.id} onClick={() => {
                  markAsRead(n.id);
                  if (n.action_link) {
                    navigate(n.action_link);
                    setNotifOpen(false);
                  }
                }} className={cn("w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors", !n.read && "bg-primary/5")}>
                        <div className="mt-0.5 p-1.5 bg-muted rounded-md shrink-0">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</span>
                          {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                        </div>
                      </button>)}
                  </div>}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 ml-1">
                <Avatar className="h-7 w-7 ring-2 ring-border">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-white text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 shadow-xl">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold truncate">{profile?.name || user?.email?.split("@")[0]}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 text-sm">
                  <User className="h-3.5 w-3.5" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 text-sm">
                  <Settings className="h-3.5 w-3.5" /> Configurações
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>;
};
export default DesktopHeader;
