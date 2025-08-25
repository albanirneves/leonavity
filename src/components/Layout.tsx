
import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from '@/lib/auth';
import { CustomButton } from '@/components/ui/button-variants';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children?: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Fixed Header that accounts for sidebar */}
          <header className="fixed top-0 right-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur-sm left-0 md:left-[var(--sidebar-width)]">
            <div className="h-full flex items-center justify-between px-4 md:px-6">
              {/* Mobile Menu Button */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden" />
              </div>
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  Tempo real
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <CustomButton variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline-block max-w-32 truncate">
                        {user?.email}
                      </span>
                    </CustomButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.email}</p>
                      <p className="text-xs text-muted-foreground">Administrador</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content with top padding to account for fixed header */}
          <main className="flex-1 overflow-auto pt-16">
            <div className="content-container py-6">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
