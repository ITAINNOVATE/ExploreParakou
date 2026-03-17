"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, MoreHorizontal, Loader2, ClipboardList, User } from "lucide-react";
import { CreateConsultationModal } from "@/components/dashboard/create-consultation-modal";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";

export default function ConsultationsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const appointmentId = searchParams.get("appointment_id");
  const patientId = searchParams.get("patient_id");

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          *,
          patients ( first_name, last_name ),
          profiles ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Consultations Médicales</h1>
          <p className="text-muted-foreground font-light">Historique et suivi des examens cliniques effectués.</p>
        </div>
        <CreateConsultationModal 
          onConsultationCreated={fetchConsultations} 
          initialData={appointmentId && patientId ? { appointment_id: appointmentId, patient_id: patientId } : undefined}
        />
      </div>

      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient..."
                className="pl-9 h-11 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-white overflow-x-auto">
            <Table className="min-w-[700px] md:min-w-full">
                  <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="py-4">Patient</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="hidden md:table-cell">Médecin</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Diagnostic / Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                       <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : consultations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      Aucune consultation enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  consultations.map((cons) => (
                    <TableRow key={cons.id} className="cursor-pointer hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-semibold py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-[10px]">
                            {cons.patients?.first_name?.[0]}{cons.patients?.last_name?.[0]}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span>{cons.patients?.first_name} {cons.patients?.last_name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground md:hidden truncate">
                              Dr. {cons.profiles?.full_name || "N/A"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[200px] truncate text-slate-600 italic" title={cons.symptoms}>
                          {cons.symptoms || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        Dr. {cons.profiles?.full_name || "N/A"}
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{format(new Date(cons.created_at), "dd MMM yyyy", { locale: fr })}</span>
                           <span className="text-[10px] text-muted-foreground">{format(new Date(cons.created_at), "HH:mm")}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="max-w-[150px] md:max-w-[200px] truncate text-sm">
                            {cons.diagnosis || <span className="text-muted-foreground italic">Non renseigné</span>}
                          </div>
                          {cons.status === 'open' ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 w-fit text-[9px] h-5">Brouillon</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 w-fit text-[9px] h-5">Terminé</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {cons.status === 'open' && (
                            <CreateConsultationModal 
                              onConsultationCreated={fetchConsultations} 
                              renderTrigger={
                                <Button variant="outline" size="sm" className="h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold text-[10px]">
                                  Reprendre
                                </Button>
                              }
                              initialData={{ patient_id: cons.patient_id, appointment_id: cons.appointment_id }}
                            />
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
