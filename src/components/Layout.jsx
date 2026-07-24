import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";
import DesktopHeader from "./DesktopHeader";
import Header from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Navigate } from "react-router-dom";
const LayoutContent = () => {
  const {
    isCollapsed
  } = useSidebar();
  return <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopSidebar />
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Mobile Header - Hidden on desktop */}
        <div className="lg:hidden">
          <Header />
        </div>
        
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden lg:block">
          <DesktopHeader />
        </div>
        
        {/* Main Content */}
        <main className="min-h-screen pb-20 lg:pb-0">
          <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6 w-full max-w-full">
            <Outlet />
          </div>
        </main>
        
        {/* Mobile Bottom Navigation - Hidden on desktop */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>;
};
const Layout = () => {
  const {
    isAuthenticated,
    isLoading
  } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show the authenticated layout with responsive navigation
  return <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>;
};
export default Layout;
