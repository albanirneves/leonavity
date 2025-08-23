
import { useState } from "react";
import { 
  BarChart3, 
  Calendar, 
  CreditCard, 
  Settings, 
  Users, 
  Vote,
  Trophy,
  TrendingUp,
  Database
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
    title: "Contas", 
    url: "/accounts", 
    icon: CreditCard,
    description: "Contas de pagamento"
  },
  { 
    title: "Configurações", 
    url: "/settings", 
    icon: Settings,
    description: "Configurações do sistema"
  },
];

const quickStatsItems = [
  { 
    title: "Votos Hoje", 
    url: "/dashboard?tab=votes", 
    icon: Vote,
    description: "Votos recebidos hoje"
  },
  { 
    title: "Top Candidatas", 
    url: "/dashboard?tab=ranking", 
    icon: Trophy,
    description: "Ranking de candidatas"
  },
  { 
    title: "Faturamento", 
    url: "/dashboard?tab=revenue", 
    icon: TrendingUp,
    description: "Receita e pagamentos"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const getNavClass = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-r-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-accent-foreground";
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      {/* Trigger button inside sidebar for mini state */}
      <div className="p-2 border-b border-sidebar-border">
        <SidebarTrigger className="w-full" />
      </div>

      <SidebarContent className="gap-0">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navegação Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClass(item.url)} transition-all duration-200 group`}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.title}</span>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats - Only shown when expanded */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Acesso Rápido</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {quickStatsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className="hover:bg-sidebar-accent/30 text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors group"
                      >
                        <item.icon className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.title}</span>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* System Info - Bottom */}
        <div className="mt-auto p-3 border-t border-sidebar-border">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3 w-3" />
                <span>Supabase conectado</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Sistema v1.0.0
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
