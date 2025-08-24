
import { 
  BarChart3, 
  Calendar, 
  CreditCard,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: BarChart3,
    description: "Visão geral e métricas"
  },
  { 
    title: "Eventos", 
    url: "/events", 
    icon: Calendar,
    description: "Gerenciar eventos de votação"
  },
  { 
    title: "Candidatas", 
    url: "/candidates", 
    icon: Users,
    description: "Gerenciar candidatas"
  },
  { 
    title: "Contas", 
    url: "/accounts", 
    icon: CreditCard,
    description: "Contas de pagamento"
  },
];


export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile, setOpen]);

  const isActive = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const getNavClass = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-primary text-primary-foreground font-medium rounded-lg" 
      : "hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground rounded-lg";
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-16" : "w-72"}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarContent className="gap-0 p-4">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          {!isCollapsed && (
            <>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">LV</span>
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Leona Vity</h2>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </>
          )}
          <div className="ml-auto hidden md:block">
            <SidebarTrigger className="w-8 h-8" />
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClass(item.url)} p-3 transition-all duration-200 group min-h-[48px]`}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
