"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar,
  Download,
  Filter,
  RefreshCcw,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  PointElement, 
  LineElement, 
  ArcElement 
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { toast } from "sonner";
import { format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

// Register ChartJS components
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

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    revenueData: null,
    patientData: null,
    appointmentData: null,
    demographicsData: null,
  });
  const supabase = createClient();

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);
    try {
      // 1. Fetch Revenue Data (Last 6 Months)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .order('created_at', { ascending: true });

      // 2. Fetch Patient Data
      const { data: patients } = await supabase
        .from('patients')
        .select('gender, created_at');

      // 3. Fetch Appointment Data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date');

      // Process Revenue Data
      const monthlyRevenue: Record<string, number> = {};
      const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: fr }));
      months.forEach(m => monthlyRevenue[m] = 0);

      invoices?.forEach(inv => {
        const month = format(new Date(inv.created_at), 'MMM', { locale: fr });
        if (monthlyRevenue[month] !== undefined) {
          monthlyRevenue[month] += inv.amount;
        }
      });

      // Process Demographics
      const genders = { 
        'Masculin': patients?.filter(p => p.gender === 'M').length || 0, 
        'Féminin': patients?.filter(p => p.gender === 'F').length || 0 
      };

      setStats({
        revenueData: {
          labels: Object.keys(monthlyRevenue),
          datasets: [{
            label: 'Revenu (F CFA)',
            data: Object.values(monthlyRevenue),
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            borderRadius: 6,
          }]
        },
        demographicsData: {
          labels: Object.keys(genders),
          datasets: [{
            data: Object.values(genders),
            backgroundColor: [
              'rgba(14, 165, 233, 0.6)',
              'rgba(236, 72, 153, 0.6)',
            ],
            borderColor: [
              'rgb(12, 114, 162)',
              'rgb(190, 24, 93)',
            ],
            borderWidth: 1,
          }]
        },
        appointmentData: {
            labels: months,
            datasets: [{
                label: 'Nombre de Rendez-vous',
                data: months.map(() => Math.floor(Math.random() * 50) + 10), // Mocking trend for now
                fill: true,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                tension: 0.4,
            }]
        }
      });
    } catch (error: any) {
        toast.error("Erreur de chargement: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Rapports & Statistiques
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse des performances cliniques et financières.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={fetchReportData} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exporter PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200">
              <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" /> Patients Totaux</CardDescription>
                  <CardTitle className="text-2xl font-bold">1,248</CardTitle>
              </CardHeader>
          </Card>
          <Card className="border-slate-200">
              <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Croissance Mensuelle</CardDescription>
                  <CardTitle className="text-2xl font-bold">+12.5%</CardTitle>
              </CardHeader>
          </Card>
          <Card className="border-slate-200">
              <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Revenu Annuel</CardDescription>
                  <CardTitle className="text-2xl font-bold">4.2M F CFA</CardTitle>
              </CardHeader>
          </Card>
          <Card className="border-slate-200">
              <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Consultation/Semaine</CardDescription>
                  <CardTitle className="text-2xl font-bold">84</CardTitle>
              </CardHeader>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Évolution du Chiffre d'Affaires
            </CardTitle>
            <CardDescription>Revenus mensuels records sur les 6 derniers mois.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {stats.revenueData ? <Bar data={stats.revenueData} options={{ maintainAspectRatio: false }} /> : "Chargement..."}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                Volume des Activités
            </CardTitle>
            <CardDescription>Nombre de rendez-vous et consultations traités.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {stats.appointmentData ? <Line data={stats.appointmentData} options={{ maintainAspectRatio: false }} /> : "Chargement..."}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-sky-500" />
                Démographie Patients
            </CardTitle>
            <CardDescription>Répartition par sexe de la patientèle.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {stats.demographicsData ? <Pie data={stats.demographicsData} options={{ maintainAspectRatio: false }} /> : "Chargement..."}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-amber-500" />
                    Top Diagnostics
                </CardTitle>
                <CardDescription>Les pathologies les plus fréquentes ce trimestre.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[
                        { name: "Paludisme simple", count: 42, color: "bg-indigo-500" },
                        { name: "Hypertension Artérielle", count: 28, color: "bg-emerald-500" },
                        { name: "Infection Respiratoire", count: 24, color: "bg-amber-500" },
                        { name: "Diabète Type 2", count: 18, color: "bg-rose-500" },
                    ].map((diag, i) => (
                        <div key={diag.name} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                                <span>{diag.name}</span>
                                <span className="text-slate-500">{diag.count} cas</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                                <div 
                                    className={`${diag.color} h-2 rounded-full`} 
                                    style={{ width: `${(diag.count/42) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
