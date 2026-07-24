import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Smartphone, Wrench, BarChart3, Settings, ChevronLeft, ChevronRight, DollarSign, Calendar, UserCheck, MessageSquare, Puzzle, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useCompanyInfo } from "@/contexts/CompanyContext";
const mainNavItems = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  path: "/dashboard",
  notificationType: null
}, {
  icon: Users,
  label: "Clientes",
  path: "/dashboard/clients",
  notificationType: null
}, {
  icon: Smartphone,
  label: "Dispositivos",
  path: "/dashboard/devices",
  notificationType: "devices"
}, {
  icon: Wrench,
  label: "Serviços",
  path: "/dashboard/services",
  notificationType: "services"
}, {
  icon: BarChart3,
  label: "Relatórios",
  path: "/dashboard/reports",
  notificationType: null
}];
const soonItems = [{
  icon: DollarSign,
  label: "Financeiro"
}, {
  icon: Calendar,
  label: "Agenda"
}, {
  icon: UserCheck,
  label: "Técnicos"
}, {
  icon: MessageSquare,
  label: "WhatsApp"
}, {
  icon: Puzzle,
  label: "Integrações"
}];
const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    profile,
    logout
  } = useAuth();
  const {
    isCollapsed,
    toggleSidebar
  } = useSidebar();
  const {
    companyInfo
  } = useCompanyInfo();
  const [notificationCounts, setNotificationCounts] = useState({
    services: 0,
    devices: 0
  });
  const isActiveRoute = path => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };
  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const {
        data
      } = await supabase.from("notifications").select("type").eq("user_id", user.id).eq("read", false).gt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      const counts = {
        services: 0,
        devices: 0
      };
      data?.forEach(item => {
        if (item.type in counts) counts[item.type]++;
      });
      setNotificationCounts(counts);
    };
    fetchCounts();
    const sub = supabase.channel("sidebar:notifications").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`
    }, fetchCounts).subscribe();
    return () => {
      sub.unsubscribe();
    };
  }, [user]);
  const userInitials = profile?.name ? profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "U";
  const displayName = profile?.name || user?.email?.split("@")[0] || "Usuário";
  const companyName = companyInfo?.companyName || "Minha Empresa";
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return <motion.aside animate={{
    width: isCollapsed ? 64 : 256
  }} transition={{
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1]
  }} className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden" style={{
    background: "hsl(var(--sidebar-background))"
  }}>
    {/* ── Header / Logo ── */}
    <div className={cn("flex items-center h-16 border-b shrink-0 px-3", "border-white/5")}>
      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          <img src="/logo-icon.png" alt="GestOS" className="w-8 h-8 object-contain" />
        </div>
        <AnimatePresence>
          {!isCollapsed && <motion.div initial={{
            opacity: 0,
            x: -8
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -8
          }} transition={{
            duration: 0.15
          }} className="min-w-0">
            <p className="text-white font-bold text-base leading-none tracking-tight">GestOS</p>
            <p className="text-white/40 text-[10px] mt-0.5 truncate">Sistema de OS</p>
          </motion.div>}
        </AnimatePresence>
      </div>

      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 w-7 h-7 text-white/40 hover:text-white hover:bg-white/10 rounded-md">
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </Button>
    </div>

    {/* ── Main Nav ── */}
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
      {/* Main Items */}
      {mainNavItems.map(item => {
        const active = isActiveRoute(item.path);
        const count = item.notificationType ? notificationCounts[item.notificationType] : 0;
        const navContent = <NavLink key={item.path} to={item.path} end={item.path === "/dashboard"} className={cn("sidebar-nav-item group", active && "active", isCollapsed && "justify-center px-0")} style={isCollapsed ? {
          padding: "10px",
          justifyContent: "center"
        } : undefined}>
          {/* Active indicator */}
          {active && <motion.div layoutId="sidebar-active-pill" className="absolute inset-0 rounded-lg bg-primary" style={{
            zIndex: -1
          }} transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />}

          <div className="relative shrink-0">
            <item.icon className={cn("nav-icon", active ? "text-white" : "text-white/50")} />
            {count > 0 && <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-destructive rounded-full flex items-center justify-center text-[8px] text-white font-bold">
              {count > 9 ? "9+" : count}
            </span>}
          </div>

          <AnimatePresence>
            {!isCollapsed && <motion.span initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} transition={{
              duration: 0.1
            }} className={cn("text-sm font-medium truncate", active ? "text-white" : "text-white/60 group-hover:text-white")}>
              {item.label}
            </motion.span>}
          </AnimatePresence>

          {/* Collapsed tooltip */}
          {isCollapsed && <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-sidebar-accent text-white text-xs rounded-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150
                  whitespace-nowrap z-50 shadow-lg border border-white/10 pointer-events-none">
            {item.label}
            {count > 0 && <span className="ml-1.5 bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {count}
            </span>}
          </div>}
        </NavLink>;
        return navContent;
      })}

      {/* Configurações */}
      {(() => {
        const active = isActiveRoute("/dashboard/settings");
        return <NavLink to="/dashboard/settings" className={cn("sidebar-nav-item group mt-1", active && "active", isCollapsed && "justify-center")} style={isCollapsed ? {
          padding: "10px",
          justifyContent: "center"
        } : undefined}>
          {active && <motion.div layoutId="sidebar-active-pill-settings" className="absolute inset-0 rounded-lg bg-primary" style={{
            zIndex: -1
          }} transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />}
          <Settings className={cn("nav-icon shrink-0", active ? "text-white" : "text-white/50")} />
          <AnimatePresence>
            {!isCollapsed && <motion.span initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} transition={{
              duration: 0.1
            }} className={cn("text-sm font-medium truncate", active ? "text-white" : "text-white/60 group-hover:text-white")}>
              Configurações
            </motion.span>}
          </AnimatePresence>
          {isCollapsed && <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-sidebar-accent text-white text-xs rounded-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150
                  whitespace-nowrap z-50 shadow-lg border border-white/10 pointer-events-none">
            Configurações
          </div>}
        </NavLink>;
      })()}

      {/* ── Em Breve ── */}
      {!isCollapsed && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.1
      }} className="pt-5 pb-1">
        <div className="flex items-center gap-1.5 px-3 mb-2">
          <Sparkles className="h-3 w-3 text-white/25" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Em Breve
          </p>
        </div>
        {soonItems.map(item => <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/25 cursor-not-allowed select-none">
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
          <span className="text-[9px] font-bold bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            em breve
          </span>
        </div>)}
      </motion.div>}

      {isCollapsed && <div className="pt-3 border-t border-white/5 mt-2">
        {soonItems.map(item => <div key={item.label} className="relative group">
          <div className="flex items-center justify-center p-2.5 rounded-lg text-white/20 cursor-not-allowed">
            <item.icon className="w-4 h-4" />
          </div>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-sidebar-accent text-white/50 text-xs rounded-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150
                  whitespace-nowrap z-50 shadow-lg border border-white/10 pointer-events-none">
            {item.label} — Em breve
          </div>
        </div>)}
      </div>}
    </nav>

    {/* ── User Footer ── */}
    <div className="shrink-0 border-t border-white/5 p-2">
      {!isCollapsed ? <div className="rounded-lg bg-white/5 p-2.5 flex items-center gap-2.5 group">
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/10">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-primary text-white text-xs font-bold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate leading-tight">{displayName}</p>
          <p className="text-white/40 text-[10px] truncate mt-0.5">{companyName}</p>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors p-0.5" title="Sair">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div> : <div className="relative group flex justify-center">
        <button onClick={handleLogout} className="p-2" title="Sair">
          <Avatar className="h-8 w-8 ring-2 ring-white/10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-sidebar-accent text-white text-xs rounded-lg
              opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150
              whitespace-nowrap z-50 shadow-lg border border-white/10 pointer-events-none">
          {displayName} · Sair
        </div>
      </div>}
    </div>
  </motion.aside>;
};
export default DesktopSidebar;
