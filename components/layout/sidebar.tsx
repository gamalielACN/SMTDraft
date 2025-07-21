'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  MapPin, 
  FileText, 
  Ticket, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  onModuleChange?: (module: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole: string;
}

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'seats', label: 'Seats', icon: MapPin },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'master-data', label: 'Master Data', icon: Settings, roles: ['business_ops', 'admin'] },
];

export function Sidebar({ 
  activeModule, 
  onModuleChange, 
  collapsed, 
  onToggleCollapse,
  userRole 
}: SidebarProps) {
  const router = useRouter();
  const filteredModules = modules.filter(module => 
    !module.roles || module.roles.includes(userRole)
  );

  const handleModuleClick = (moduleId: string) => {
    const targetPath = moduleId === 'dashboard' ? '/dashboard' : `/${moduleId}`;
    router.push(targetPath);
    
    if (onModuleChange) {
      onModuleChange(moduleId);
    }
  };

  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg accenture-gradient flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-sm">SM</span>
              </div>
              <span className="text-lg font-semibold text-gradient">Seat Management</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 hover:bg-accenture-50"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {filteredModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Button
                  key={`${module.id}-${module.label}-${index}`}
                  variant={activeModule === module.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10 transition-all duration-200",
                    collapsed && "justify-center",
                    activeModule === module.id 
                      ? "accenture-gradient text-white shadow-md" 
                      : "hover:bg-accenture-50 hover:text-accenture-700"
                  )}
                  onClick={() => handleModuleClick(module.id)}
                  onMouseEnter={() => {
                    // Prefetch the route on hover for faster navigation
                    const targetPath = module.id === 'dashboard' ? '/dashboard' : `/${module.id}`;
                    router.prefetch(targetPath);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed && (
                    <span className="ml-2">{module.label}</span>
                  )}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Role Indicator */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-border bg-accenture-50/50">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {userRole === 'project_pic' ? 'Project PIC' : 
               userRole === 'business_ops' ? 'Business Operations' : 'Admin'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}