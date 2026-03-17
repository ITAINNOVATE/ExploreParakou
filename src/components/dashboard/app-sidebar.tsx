"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { sidebarItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { LogOut, User } from "lucide-react";

import { useAuth } from "@/components/providers/client-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const userRole = profile?.role;
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredSidebarItems = sidebarItems.filter(item => {
    if (!item.role) return true;
    return item.role === userRole;
  });

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
             L+
          </div>
          <span className="font-semibold text-xl tracking-tight sidebar-hide">
            LOGICLINIC<span className="text-primary font-bold">+</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSidebarItems.filter(item => !item.group).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.title}</span>
                        </Link>
                      }
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-10 transition-all duration-200",
                        isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Finance Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Finance & Caisse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Tarification Subgroup */}
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tarification</div>
              {filteredSidebarItems.filter(item => item.group === "pricing").map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      }
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-9 pl-6 transition-all duration-200",
                        isActive ? "bg-primary/5 text-primary font-medium" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    />
                  </SidebarMenuItem>
                );
              })}

              {/* Main Finance items */}
              <div className="my-2 border-t border-slate-100" />
              {filteredSidebarItems.filter(item => item.group === "finance").map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={
                        <Link href={item.href}>
                          <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.title}</span>
                        </Link>
                      }
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-10 transition-all duration-200",
                        isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-10 hover:bg-accent transition-colors">
              <User className="h-5 w-5 text-muted-foreground" />
              <span>Mon Profil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 " />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
