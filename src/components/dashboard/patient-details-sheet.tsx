"use client";

import { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Phone, 
  MapPin, 
  Activity, 
  Calendar, 
  Clock, 
  Stethoscope, 
  ShieldAlert,
  Heart,
  Droplets,
  Loader2,
  FileText,
  PlusCircle,
  Receipt,
  History
} from "lucide-react";
import { CreateVisitModal } from "./create-visit-modal";
import { CreateInvoiceModal } from "./create-invoice-modal";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface PatientDetailsSheetProps {
  patient: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientDetailsSheet({ patient, open, onOpenChange }: PatientDetailsSheetProps) {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && patient?.id) {
      fetchPatientHistory();
    }
  }, [open, patient]);

  async function fetchPatientHistory() {
    setLoading(true);
    try {
      // Fetch Consultations
      const { data: consData, error: consError } = await supabase
        .from("consultations")
        .select(`
          *,
          profiles:doctor_id (full_name)
        `)
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });

      if (consError) throw consError;
      setConsultations(consData || []);

      // Fetch Vitals history
      const { data: vitalsData, error: vitalsError } = await supabase
        .from("patient_vitals")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });

      if (vitalsError) throw vitalsError;
      setVitals(vitalsData || []);

    } catch (error) {
      console.error("Error fetching patient history:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!patient) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] w-full p-0 flex flex-col">
        <SheetHeader className="p-6 bg-slate-50/80 border-b">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono bg-white text-primary border-primary/20">
                    {patient.identifier}
                  </Badge>
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Né(e) le {patient.dob ? format(new Date(patient.dob), "dd MMMM yyyy", { locale: fr }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
                <CreateVisitModal 
                    patient={patient} 
                    onVisitCreated={fetchPatientHistory} 
                />
                <div className="flex gap-2">
                    <CreateInvoiceModal 
                        patientId={patient.id} 
                        onCreated={fetchPatientHistory} 
                    />
                    <Button variant="outline" className="gap-2 border-slate-200 text-slate-600" onClick={() => {
                        const tabs = document.querySelector('[role="tablist"]');
                        const historyTab = tabs?.querySelector('[value="history"]') as HTMLElement;
                        historyTab?.click();
                    }}>
                        <History className="h-4 w-4" />
                        Historique
                    </Button>
                </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-white">
            <TabsList className="bg-transparent h-12 gap-6 p-0">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0"
              >
                Dossier Complet
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0"
              >
                Consultations
              </TabsTrigger>
              <TabsTrigger 
                value="vitals" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0"
              >
                Constantes
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-8">
                {/* Identity & Contact */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Informations de contact
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Téléphone</p>
                      <p className="font-medium">{patient.phone || "Non renseigné"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Adresse</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {patient.address || "Non renseignée"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Medical Info */}
                <section className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Informations Médicales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 space-y-1">
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" /> Allergies
                      </p>
                      <p className="text-sm text-rose-900 font-medium">{patient.allergies || "Aucune connue"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 space-y-1">
                      <p className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> Groupe Sanguin
                      </p>
                      <p className="text-sm text-indigo-900 font-bold">{patient.blood_group || "Non précisé"}</p>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-xs text-slate-500 font-bold">Antécédents</p>
                    <p className="text-sm whitespace-pre-line bg-slate-50 p-3 rounded-md border border-slate-100 italic text-slate-700">
                      {patient.medical_history || "Aucun antécédent majeur renseigné."}
                    </p>
                  </div>
                </section>

                {/* Companion */}
                <section className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Heart className="h-4 w-4" /> Personne à prévenir
                  </h3>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
                    {patient.emergency_contact_details ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">Nom & Prénom</p>
                          <p className="font-medium">{patient.emergency_contact_details.last_name} {patient.emergency_contact_details.first_name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">Lien / Téléphone</p>
                          <p className="font-medium">{patient.emergency_contact_details.relation} • {patient.emergency_contact_details.phone}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Aucune personne de confiance spécifiée.</p>
                    )}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : consultations.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aucune consultation enregistrée pour le moment.</p>
                  </div>
                ) : (
                  <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {consultations.map((cons) => (
                      <div key={cons.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 h-8 w-8 rounded-full bg-white border-2 border-primary flex items-center justify-center z-10">
                          <Stethoscope className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50/50 border-b flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(cons.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                            <span className="text-slate-500 px-2 py-0.5 bg-white border rounded">
                              Dr. {cons.profiles?.full_name || "Inconnu"}
                            </span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-[10px] uppercase font-extrabold text-indigo-600 mb-1">Motif / Symptômes</p>
                              <p className="text-sm text-slate-800 line-clamp-2 italic">{cons.symptoms}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-extrabold text-emerald-600 mb-1">Diagnostic</p>
                              <p className="text-sm font-semibold text-slate-900">{cons.diagnosis}</p>
                            </div>
                            {cons.treatment && (
                              <div className="pt-2 border-t mt-2">
                                <p className="text-[10px] uppercase font-extrabold text-slate-400 mb-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Traitement proposé
                                </p>
                                <p className="text-sm text-slate-600">{cons.treatment}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="vitals" className="mt-0 space-y-4">
                {vitals.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aucune constante vitale enregistrée.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vitals.map((v) => (
                      <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Prise le {format(new Date(v.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                          <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                            {v.weight ? `${v.weight} kg` : "--"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Temp</p>
                            <p className="text-lg font-bold text-slate-900">{v.temperature ? `${v.temperature}°C` : "--"}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">BP (Droit)</p>
                            <p className="text-sm font-bold text-slate-900">{v.sys_bp_right && v.dia_bp_right ? `${v.sys_bp_right}/${v.dia_bp_right}` : "--"}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">BP (Gauche)</p>
                            <p className="text-sm font-bold text-slate-900">{v.sys_bp_left && v.dia_bp_left ? `${v.sys_bp_left}/${v.dia_bp_left}` : "--"}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Pouls/SpO2</p>
                            <p className="text-sm font-bold text-slate-900">
                              {v.heart_rate || "--"} bpm / {v.spo2 ? `${v.spo2}%` : "--"}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100 col-span-2 md:col-span-1">
                            <p className="text-[10px] text-emerald-600 uppercase font-bold">IMC</p>
                            <p className="text-sm font-bold text-emerald-700">{v.bmi || "--"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
