import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminBottomNav from "./AdminBottomNav";

const AdminLayout = () => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user
  } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.rpc('is_super_admin');
        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Erro ao verificar permissão de admin:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    if (isAuthenticated && user) {
      checkAdmin();
    } else if (!authLoading) {
      setCheckingAdmin(false);
    }
  }, [isAuthenticated, user, authLoading]);

  // Enquanto carrega autenticação ou a checagem de admin, mostra spinner
  if (authLoading || checkingAdmin) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>;
  }

  // Não logado -> login normal
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logado mas não é super admin -> volta pro dashboard do cliente,
  // sem revelar que uma área admin existe.
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <AdminBottomNav />
    </div>;
};
export default AdminLayout;
