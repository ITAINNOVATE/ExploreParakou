"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

import { useAuth } from "@/components/providers/client-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinicName, profile, loading } = useAuth();
  const userRole = profile?.role || "Utilisateur";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="gradient-bg">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none text-slate-900">{clinicName}</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary mt-1">{userRole}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Dynamic Header Actions */}
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
