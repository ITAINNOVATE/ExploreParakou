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
import { Search, Filter, MoreHorizontal, Loader2, Eye, Edit, History, MoreVertical } from "lucide-react";
import { CreatePatientModal } from "@/components/dashboard/create-patient-modal";
import { CreateInvoiceModal } from "@/components/dashboard/create-invoice-modal";
import { CreateVisitModal } from "@/components/dashboard/create-visit-modal";
import { PatientDetailsSheet } from "@/components/dashboard/patient-details-sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

const supabase = createClient();

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);


  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,identifier.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast.error("Erreur lors de la récupération des patients: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [search, supabase]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestion des Patients</h1>
          <p className="text-muted-foreground font-light">Consultez et gérez les dossiers médicaux de vos patients en toute sécurité.</p>
        </div>
        <div className="flex gap-3">
          <CreatePatientModal onPatientCreated={fetchPatients} />
          <CreateVisitModal onVisitCreated={fetchPatients} />
          <CreateInvoiceModal onCreated={fetchPatients} />
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom ou ID..."
                className="pl-9 h-11 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
               <Button variant="outline" className="gap-2 h-11">
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-white overflow-x-auto">
            <Table className="min-w-[600px] md:min-w-full">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="py-4">Nom Complet</TableHead>
                  <TableHead>ID Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Sexe</TableHead>
                  <TableHead className="hidden md:table-cell">Date de Naissance</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="hidden lg:table-cell">Groupe Sanguin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des patients...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      Aucun patient trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-semibold py-4">
                        <div className="flex flex-col">
                          <span>{patient.first_name} {patient.last_name}</span>
                          <span className="text-[10px] text-muted-foreground md:hidden">{patient.identifier} • {patient.gender}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary font-bold">{patient.identifier}</TableCell>
                      <TableCell className="hidden sm:table-cell">{patient.gender}</TableCell>
                      <TableCell className="hidden md:table-cell">{patient.dob}</TableCell>
                      <TableCell className="text-sm">{patient.phone || "N/A"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                          {patient.blood_group || "--"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CreateVisitModal 
                            patient={patient} 
                            onVisitCreated={fetchPatients} 
                            variant="quick"
                          />
                          <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions du dossier</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 cursor-pointer"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setDetailsOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 text-indigo-600" />
                                Voir le dossier complet
                              </DropdownMenuItem>
                              <CreateInvoiceModal 
                                patientId={patient.id} 
                                onCreated={fetchPatients} 
                                variant="dropdown"
                              />
                              <DropdownMenuItem 
                                className="gap-2 cursor-pointer"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setEditOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-amber-600" />
                                Modifier les informations
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-slate-500">
                                <History className="h-4 w-4" />
                                Historique rapide
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Hidden Modals that are triggered by actions */}
      {selectedPatient && (
        <>
          <PatientDetailsSheet 
            patient={selectedPatient} 
            open={detailsOpen} 
            onOpenChange={setDetailsOpen} 
          />
          <CreatePatientModal 
            patient={selectedPatient}
            open={editOpen}
            onOpenChange={setEditOpen}
            onPatientCreated={() => {
              fetchPatients();
              setEditOpen(false);
            }}
          />
          {/* We need a way to trigger the CreatePatientModal programmatically if it's not a trigger-based dialog */}
          {/* For now, let's wrap it in a Dialog manually or ensure CreatePatientModal handles its own state if needed */}
        </>
      )}
    </div>
  );
}
