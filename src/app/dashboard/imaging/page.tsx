"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Stethoscope, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Camera,
  FileText,
  Image as ImageIcon
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
import { CreateImagingRequestModal } from "@/components/dashboard/create-imaging-request-modal";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ImagingPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("imaging_requests")
        .select(`
          *,
          patients (first_name, last_name),
          profiles:doctor_id (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = requests.filter((req) => {
    const patientName = `${req.patients?.first_name} ${req.patients?.last_name}`.toLowerCase();
    const modality = req.modality.toLowerCase();
    return patientName.includes(searchQuery.toLowerCase()) || modality.includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Terminé</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200"><AlertCircle className="w-3 h-3 mr-1" /> Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Camera className="h-8 w-8 text-primary" />
            Imagerie Médicale
          </h1>
          <p className="text-muted-foreground mt-1">
            Prescriptions et rapports de radiologie, échographie, scanner et IRM.
          </p>
        </div>
        <CreateImagingRequestModal onCreated={fetchRequests} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Examens en attente
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Réalisés ce mois
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {requests.filter(r => r.status === 'completed' && new Date(r.created_at).getMonth() === new Date().getMonth()).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Total Examens
              <FileText className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {requests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un patient ou un examen..."
              className="pl-10 bg-white border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" onClick={fetchRequests} disabled={loading}>
               Actualiser
             </Button>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Modalité</TableHead>
              <TableHead>Date Prescription</TableHead>
              <TableHead>Prescripteur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Chargement des examens...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Aucun examen trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                  <TableCell className="font-medium text-slate-900">
                    {request.patients?.first_name} {request.patients?.last_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                      {request.modality}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(request.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    Dr. {request.profiles?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Saisir le rapport</DropdownMenuItem>
                        <DropdownMenuItem>Ajouter des images</DropdownMenuItem>
                        {request.status === 'completed' && (
                          <DropdownMenuItem className="text-primary font-medium flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Voir les clichés
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-rose-600">Annuler l'examen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
