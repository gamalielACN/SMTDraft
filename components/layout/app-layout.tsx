'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumb } from './breadcrumb';
import { useAuth } from '@/contexts/auth-context';

interface AppLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange?: (module: string) => void;
}

export function AppLayout({ 
  children, 
  activeModule, 
  onModuleChange
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  if (!user) {
    return null; // This should not happen as auth is checked at higher level
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeModule={activeModule}
        onModuleChange={onModuleChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={user.role}
      />
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        <Header 
          currentUser={user}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={logout}
        />
        <main className="p-6">
          <Breadcrumb activeModule={activeModule} />
          <div className="mt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}