import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ScrollText, LogOut, ShieldAlert, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [{
  icon: LayoutDashboard,
  label: "Clientes",
  path: "/admin"
}, {
  icon: Users2,
  label: "Leads",
  path: "/admin/leads"
}, {
  icon: ScrollText,
  label: "Log de Auditoria",
  path: "/admin/audit-log"
}];
const AdminSidebar = () => {
  const {
    logout
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-red-900/30 hidden lg:flex flex-col z-40">
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-red-900/30">
        <div className="relative w-9 h-9 shrink-0">
          <img src="/logo-icon.png" alt="GestOS" className="w-9 h-9 object-contain" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 ring-2 ring-slate-900 flex items-center justify-center">
            <ShieldAlert className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Super Admin</p>
          <p className="text-red-300/60 text-[10px] mt-0.5">GestOS</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(item => <NavLink key={item.path} to={item.path} end={item.path === "/admin"} className={({
        isActive
      }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-red-600/20 text-red-300" : "text-slate-400 hover:bg-slate-800 hover:text-white")}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>)}
      </nav>

      <div className="p-2 border-t border-red-900/30">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>;
};
export default AdminSidebar;
