"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserPlus, 
  CalendarCheck, 
  FlaskConical, 
  Pill, 
  CreditCard,
  Sparkles,
  Building2,
  Loader2,
  Activity
} from "lucide-react";

import { useAuth } from "@/components/providers/client-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { profile, clinicName, loading: authLoading } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "";
  
  const [fetchingStats, setFetchingStats] = useState(true);
  const supabase = createClient();

  const [stats, setStats] = useState([
    { title: "Patients", value: "--", icon: Users, color: "text-blue-600", bg: "bg-blue-100", table: "patients" },
    { title: "Consultations", value: "--", icon: UserPlus, color: "text-green-600", bg: "bg-green-100", table: "consultations" },
    { title: "Rendez-vous", value: "--", icon: CalendarCheck, color: "text-purple-600", bg: "bg-purple-100", table: "appointments" },
    { title: "Analyses", value: "--", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-100", table: "lab_requests" },
    { title: "Pharmacie", value: "--", icon: Pill, color: "text-rose-600", bg: "bg-rose-100", table: "central_stock" },
    { title: "Revenus", value: "--", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-100", table: "invoices" },
  ]);

  useEffect(() => {
    async function getStats() {
      if (!profile?.clinic_id) return;
      
      setFetchingStats(true);
      try {
        const updatedStats = await Promise.all(stats.map(async (stat) => {
          const { count, error } = await supabase
            .from(stat.table)
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id);
          
          if (error) return stat;
          return { ...stat, value: count && count > 0 ? count.toString() : "--" };
        }));
        setStats(updatedStats);
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setFetchingStats(false);
      }
    }

    if (!authLoading && profile) {
      getStats();
    }
  }, [authLoading, profile]);

  if (authLoading) return (
    <div className="space-y-6">
       <Skeleton className="h-24 w-full rounded-xl" />
       <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
         {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
       </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Personalized Welcome Header - Compact & Elegant */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Bonjour, {firstName} <Sparkles className="h-4 w-4 text-amber-500" />
            </h1>
            <p className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mt-1">
              BIENVENUE DANS L'INTERFACE DE LA CLINIQUE <span className="text-primary">{clinicName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-1.5 rounded-md`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder for real data visualization */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Flux de Consultations</CardTitle>
            <CardDescription className="text-xs">Aperçu hebdomadaire de l'activité médicale.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
               <Activity className="h-10 w-10 text-slate-200 mb-2" />
               <p className="text-xs italic">Données d'analyse en cours de collecte...</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Agenda du Jour</CardTitle>
            <CardDescription className="text-xs">Rendez-vous et suivis immédiats.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50 space-y-2">
               <CalendarCheck className="h-10 w-10 text-slate-200" />
               <p className="text-xs italic">Aucun événement à afficher aujourd'hui.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Loader2 as Loader2Icon, Activity as ActivityIcon } from "lucide-react";

