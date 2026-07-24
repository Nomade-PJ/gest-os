/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode } from 'react';
const SidebarContext = createContext(undefined);
export const SidebarProvider = ({
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };
  return <SidebarContext.Provider value={{
    isCollapsed,
    toggleSidebar
  }}>
      {children}
    </SidebarContext.Provider>;
};
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
