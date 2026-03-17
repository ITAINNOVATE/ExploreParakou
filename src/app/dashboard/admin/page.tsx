"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  ShieldAlert, 
  Building, 
  Users, 
  CreditCard, 
  Search, 
  MoreVertical, 
  Plus, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminCreateClinicModal } from "@/components/dashboard/admin-create-clinic-modal";
import { AdminCreateUserModal } from "@/components/dashboard/admin-create-user-modal";
import { Trash2 } from "lucide-react";

export default function SuperAdminPage() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalClinics: 0,
    totalPatients: 0,
    totalUsers: 0,
    recentRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchGlobalData();
  }, []);

  async function fetchGlobalData() {
    setLoading(true);
    try {
      // 1. Fetch all clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) throw clinicsError;
      setClinics(clinicsData || []);

      // 2. Fetch Global Stats (This is simplified for demo)
      const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const { data: revenueData } = await supabase.from('invoices').select('amount');
      const totalRevenue = revenueData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      setStats({
        totalClinics: clinicsData?.length || 0,
        totalPatients: patientsCount || 0,
        totalUsers: usersCount || 0,
        recentRevenue: totalRevenue
      });

    } catch (error: any) {
      toast.error("Erreur Super Admin: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteClinic(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette clinique ? Cette action est irréversible.")) return;
    try {
      const { error } = await supabase.from('clinics').delete().eq('id', id);
      if (error) throw error;
      toast.success("Clinique supprimée avec succès.");
      fetchGlobalData();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  }

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-rose-600" />
            Super Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion globale de la plateforme SaaS LOGICLINIC+.
          </p>
        </div>
        <AdminCreateClinicModal onCreated={fetchGlobalData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/50 border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Building className="h-4 w-4" /> Établissements</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.totalClinics}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/50 border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" /> Patients Globaux</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.totalPatients}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/50 border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Activity className="h-4 w-4" /> Comptes Actifs</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white/50 border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> CA Total</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.recentRevenue.toLocaleString()} F CFA</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher une clinique..." 
              className="pl-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={fetchGlobalData}>Actualiser</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinique</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement de la plateforme...</TableCell></TableRow>
            ) : filteredClinics.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Aucune clinique enregistrée.</TableCell></TableRow>
            ) : (
              filteredClinics.map((clinic) => (
                <TableRow key={clinic.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{clinic.name}</span>
                      <span className="text-xs text-slate-500 font-normal">{clinic.email || "Pas d'email"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700 border border-slate-200">
                      {clinic.code}
                    </code>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {clinic.address || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {format(new Date(clinic.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Actif
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                           <ArrowUpRight className="h-4 w-4" /> Voir Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => {
                            setSelectedClinic(clinic);
                            setIsUserModalOpen(true);
                          }}
                        >
                           <Users className="h-4 w-4" /> Créer Administrateur
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-rose-600 gap-2 font-medium"
                          onClick={() => deleteClinic(clinic.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer la clinique
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {selectedClinic && (
        <AdminCreateUserModal
          clinicId={selectedClinic.id}
          clinicName={selectedClinic.name}
          open={isUserModalOpen}
          onOpenChange={setIsUserModalOpen}
          onCreated={fetchGlobalData}
        />
      )}
    </div>
  );
}
