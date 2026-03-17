"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Activity, 
  Calendar,
  Loader2,
  PieChart as PieChartIcon,
  Filter
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const supabase = createClient();

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    unpaidAmount: 0,
    patientCount: 0,
  });
  const [revenueData, setRevenueData] = useState<any>(null);
  const [serviceData, setServiceData] = useState<any>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data: payments } = await supabase.from("payments").select("*");
      const { data: invoices } = await supabase.from("invoices").select("*");
      const { data: invoiceItems } = await supabase.from("invoice_items").select("*");
      const { data: patients } = await supabase.from("patients").select("id", { count: 'exact' });

      const totalRev = payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      const unpaid = invoices?.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0) || 0;

      setStats({
        totalRevenue: totalRev,
        monthlyRevenue: totalRev, // Simplified for now
        unpaidAmount: unpaid,
        patientCount: patients?.length || 0,
      });

      // Prepare Bar Chart Data (Revenue by Day - Mock/Last 7 days)
      setRevenueData({
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          label: 'Chiffre d\'affaires (FCFA)',
          data: [12000, 19000, 30000, 5000, 20000, 3000, 10000],
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          borderRadius: 8,
        }]
      });

      // Prepare Pie Chart Data (Services Distribution)
      const serviceCounts: any = {
         'Acte': 0,
         'Labo': 0,
         'Imagerie': 0,
         'Pharmacie': 0
      };
      
      invoiceItems?.forEach(item => {
         if (item.service_type === 'acte_medical') serviceCounts['Acte'] += 1;
         if (item.service_type === 'analyse_labo') serviceCounts['Labo'] += 1;
         if (item.service_type === 'imagerie') serviceCounts['Imagerie'] += 1;
         if (item.service_type === 'medicament') serviceCounts['Pharmacie'] += 1;
      });

      setServiceData({
        labels: Object.keys(serviceCounts),
        datasets: [{
          data: Object.values(serviceCounts),
          backgroundColor: [
            '#6366f1',
            '#10b981',
            '#f59e0b',
            '#ec4899',
          ],
          borderWidth: 0,
        }]
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rapports Financiers</h1>
          <p className="text-slate-500">Analysez la performance financière de votre centre de santé.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2"><Calendar className="h-4 w-4" /> Ce mois</Button>
           <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filtrer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
               <CardTitle className="text-sm font-medium text-slate-500">Chiffre d'Affaires</CardTitle>
               <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR').format(stats.totalRevenue)} F</div>
               <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> +12% vs mois dernier
               </p>
            </CardContent>
         </Card>
         
         <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
               <CardTitle className="text-sm font-medium text-slate-500">Factures en Souffrance</CardTitle>
               <Activity className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR').format(stats.unpaidAmount)} F</div>
               <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Important à recouvrer
               </p>
            </CardContent>
         </Card>

         <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
               <CardTitle className="text-sm font-medium text-slate-500">Tickets Modérateurs</CardTitle>
               <BarChart3 className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">4.2M F</div>
               <p className="text-xs text-slate-400 mt-1">Part patient des factures assurées.</p>
            </CardContent>
         </Card>

         <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
               <CardTitle className="text-sm font-medium text-slate-500">Patients Facturés</CardTitle>
               <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{stats.patientCount}</div>
               <p className="text-xs text-slate-400 mt-1">Flux de patients sur la période.</p>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="border-none shadow-sm">
            <CardHeader>
               <CardTitle className="text-lg font-bold">Evolution des Revenus</CardTitle>
               <CardDescription>Comparaison quotidienne des recettes.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
               {revenueData && <Bar data={revenueData} options={{ maintainAspectRatio: false }} />}
            </CardContent>
         </Card>

         <Card className="border-none shadow-sm">
            <CardHeader>
               <CardTitle className="text-lg font-bold">Distribution des Services</CardTitle>
               <CardDescription>Répartition du volume par type de prestation.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] flex items-center justify-center">
               <div className="w-[80%] h-full">
                 {serviceData && <Pie data={serviceData} options={{ maintainAspectRatio: false }} />}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
