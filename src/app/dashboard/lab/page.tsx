"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  FlaskConical, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Beaker
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
import { CreateLabRequestModal } from "@/components/dashboard/create-lab-request-modal";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function LabPage() {
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
        .from("lab_requests")
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
    const testType = req.test_type.toLowerCase();
    return patientName.includes(searchQuery.toLowerCase()) || testType.includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" /> En cours</Badge>;
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
            <FlaskConical className="h-8 w-8 text-primary" />
            Laboratoire d'Analyses
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les demandes d'analyses et les résultats médicaux.
          </p>
        </div>
        <CreateLabRequestModal onCreated={fetchRequests} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Analyses en cours
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {requests.filter(r => r.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Terminées ce jour
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {requests.filter(r => r.status === 'completed' && format(new Date(r.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Total Demandes
              <Beaker className="h-4 w-4 text-primary" />
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
              placeholder="Rechercher un patient ou une analyse..."
              className="pl-10 bg-white border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" onClick={fetchRequests} disabled={loading}>
               Rafraîchir
             </Button>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Analyse</TableHead>
              <TableHead>Date Demande</TableHead>
              <TableHead>Médecin</TableHead>
              <TableHead>Urgent</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Chargement des analyses...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Aucune demande trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                  <TableCell className="font-medium text-slate-900">
                    {request.patients?.first_name} {request.patients?.last_name}
                  </TableCell>
                  <TableCell className="text-slate-600">{request.test_type}</TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(request.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    Dr. {request.profiles?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {request.urgent ? (
                      <Badge variant="destructive" className="animate-pulse">Urgent</Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
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
                        <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                        <DropdownMenuItem>Saisir les résultats</DropdownMenuItem>
                        {request.status === 'completed' && (
                          <DropdownMenuItem className="text-primary font-medium">Imprimer le rapport</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-rose-600">Annuler la demande</DropdownMenuItem>
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
