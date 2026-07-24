import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Smartphone, Wrench, MoreHorizontal, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
const primaryNavItems = [{
  icon: LayoutDashboard,
  label: "Início",
  path: "/dashboard",
  end: true
}, {
  icon: Users,
  label: "Clientes",
  path: "/dashboard/clients",
  end: false
}, {
  icon: Smartphone,
  label: "Dispositivos",
  path: "/dashboard/devices",
  end: false
}, {
  icon: Wrench,
  label: "Serviços",
  path: "/dashboard/services",
  end: false
}];
const secondaryNavItems = [{
  icon: BarChart3,
  label: "Relatórios",
  path: "/dashboard/reports"
}, {
  icon: Settings,
  label: "Configurações",
  path: "/dashboard/settings"
}];
const BottomNav = () => {
  const location = useLocation();
  const {
    user
  } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [counts, setCounts] = useState({
    services: 0,
    devices: 0
  });
  const isActive = (path, end = false) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };
  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const {
        data
      } = await supabase.from("notifications").select("type").eq("user_id", user.id).eq("read", false).gt("created_at", new Date(Date.now() - 7 * 86400 * 1000).toISOString());
      const c = {
        services: 0,
        devices: 0
      };
      data?.forEach(item => {
        if (item.type in c) c[item.type]++;
      });
      setCounts(c);
    };
    fetchCounts();
    const sub = supabase.channel("bottomnav:notifs").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`
    }, fetchCounts).subscribe();
    return () => {
      sub.unsubscribe();
    };
  }, [user]);
  return <>
      {/* Floating Bottom Nav */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
        <div className="bottom-nav flex items-center rounded-2xl px-2 py-1 gap-1 w-full max-w-sm">
          {primaryNavItems.map(item => {
          const active = isActive(item.path, item.end);
          return <NavLink key={item.path} to={item.path} end={item.end} className="flex-1">
                <motion.div whileTap={{
              scale: 0.88
            }} className={cn("relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors", active ? "text-primary" : "text-white/40 hover:text-white/70")}>
                  {active && <motion.div layoutId="bottom-active-bg" className="absolute inset-0 rounded-xl bg-white/10" transition={{
                type: "spring",
                stiffness: 500,
                damping: 40
              }} />}
                  <div className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.label === "Serviços" && counts.services > 0 && <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-destructive rounded-full
                        flex items-center justify-center text-[8px] text-white font-bold">
                        {counts.services}
                      </span>}
                    {item.label === "Dispositivos" && counts.devices > 0 && <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-destructive rounded-full
                        flex items-center justify-center text-[8px] text-white font-bold">
                        {counts.devices}
                      </span>}
                  </div>
                  <span className={cn("text-[10px] font-medium mt-0.5", active ? "text-primary" : "")}>
                    {item.label}
                  </span>
                </motion.div>
              </NavLink>;
        })}

          {/* More */}
          <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <DrawerTrigger asChild>
              <motion.button whileTap={{
              scale: 0.88
            }} className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-white/40 hover:text-white/70">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium mt-0.5">Mais</span>
              </motion.button>
            </DrawerTrigger>
            <DrawerContent className="bg-card border-border">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-sm font-semibold">Mais opções</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">
                  Acesse outras funcionalidades
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid grid-cols-3 gap-3 px-4 pb-4">
                {secondaryNavItems.map(item => {
                const active = isActive(item.path);
                return <NavLink key={item.path} to={item.path} onClick={() => setIsMoreOpen(false)} className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors", active ? "bg-primary/10 border-primary/30 text-primary" : "border-border hover:bg-muted text-foreground")}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </NavLink>;
              })}
              </div>
              <DrawerFooter className="pt-0">
                <DrawerClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Fechar</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-24" />
    </>;
};
export default BottomNav;
