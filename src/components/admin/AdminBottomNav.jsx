import { NavLink, useNavigate } from "react-router-dom";
import { Users, ScrollText, LogOut, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [{
  icon: Users,
  label: "Clientes",
  path: "/admin",
  end: true
}, {
  icon: Users2,
  label: "Leads",
  path: "/admin/leads",
  end: false
}, {
  icon: ScrollText,
  label: "Auditoria",
  path: "/admin/audit-log",
  end: false
}];
const AdminBottomNav = () => {
  const {
    logout
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-red-900/30 flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(item => <NavLink key={item.path} to={item.path} end={item.end} className={({
      isActive
    }) => cn("flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium", isActive ? "text-red-300" : "text-slate-400")}>
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>)}
      <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium text-slate-400">
        <LogOut className="w-5 h-5" />
        Sair
      </button>
    </nav>;
};
export default AdminBottomNav;
