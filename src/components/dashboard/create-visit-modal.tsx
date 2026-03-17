"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Calculator, 
  Loader2, 
  PlusCircle, 
  UserPlus,
  ArrowRight,
  TrendingUp,
  Scale,
  Thermometer,
  HeartPulse,
  RefreshCw,
  Heart,
  Check,
  ChevronsUpDown,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { BillingForm } from "./billing-form";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const vitalsSchema = z.object({
  temperature: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  sys_bp_right: z.string().optional(),
  dia_bp_right: z.string().optional(),
  sys_bp_left: z.string().optional(),
  dia_bp_left: z.string().optional(),
  heart_rate: z.string().optional(),
  spo2: z.string().optional(),
  resp_rate: z.string().optional(),
  bmi: z.string().optional(),
  initial_service: z.string().optional(),
  status: z.string().optional(),
});

type VitalsValues = z.infer<typeof vitalsSchema>;

export function CreateVisitModal({ 
  patient: initialPatient, 
  onVisitCreated,
  variant = "button"
}: { 
  patient?: any;
  onVisitCreated: () => void;
  variant?: "button" | "quick";
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Vitals, 2: Billing
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(initialPatient || null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<VitalsValues>({
    resolver: zodResolver(vitalsSchema) as any,
    defaultValues: {
      temperature: "37",
      weight: "",
      height: "",
      bmi: "",
      initial_service: "Médecine générale",
      status: "Nouveau",
    },
  });

  const weight = form.watch("weight");
  const height = form.watch("height");

  useEffect(() => {
    if (open && !initialPatient) {
      fetchPatients();
    }
  }, [open, initialPatient]);

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("*").order("last_name");
    if (data) setPatients(data);
  }

  useEffect(() => {
    if (weight && height) {
      const w = parseFloat(weight);
      const h = parseFloat(height) / 100;
      if (h > 0) {
        const bmiValue = (w / (h * h)).toFixed(1);
        form.setValue("bmi", bmiValue);
      }
    }
  }, [weight, height, form]);


  async function onVitalsSubmit(values: VitalsValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.clinic_id) throw new Error("Profil clinique introuvable.");

      // Save Vitals
      const { error: vitalsError } = await supabase
        .from("patient_vitals")
        .insert([{
          patient_id: selectedPatient.id,
          clinic_id: profile.clinic_id,
          temperature: values.temperature ? parseFloat(values.temperature) : null,
          weight: values.weight ? parseFloat(values.weight) : null,
          height: values.height ? parseFloat(values.height) : null,
          sys_bp_right: values.sys_bp_right ? parseInt(values.sys_bp_right) : null,
          dia_bp_right: values.dia_bp_right ? parseInt(values.dia_bp_right) : null,
          sys_bp_left: values.sys_bp_left ? parseInt(values.sys_bp_left) : null,
          dia_bp_left: values.dia_bp_left ? parseInt(values.dia_bp_left) : null,
          heart_rate: values.heart_rate ? parseInt(values.heart_rate) : null,
          resp_rate: values.resp_rate ? parseInt(values.resp_rate) : null,
          spo2: values.spo2 ? parseInt(values.spo2) : null,
          bmi: values.bmi ? parseFloat(values.bmi) : null,
        }]);

      if (vitalsError) throw vitalsError;
      
      toast.success("Constantes enregistrées. Veuillez orienter le patient.");
      setStep(2);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFinish = () => {
    setOpen(false);
    setStep(1);
    form.reset();
    onVisitCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
            setStep(1);
            form.reset();
            setSelectedPatient(initialPatient || null);
        }
    }}>
      <DialogTrigger render={
        variant === "button" ? (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
            <PlusCircle className="h-4 w-4" />
            Nouvelle visite
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/20 hover:bg-primary/5 h-8">
            <UserPlus className="h-3.5 w-3.5" />
            Visite rapide
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[850px] max-h-[95vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
        <div className="p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Nouvelle Visite Patient</DialogTitle>
                <DialogDescription className="text-emerald-50/80">
                  {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} • ${selectedPatient.identifier}` : "Sélectionner un patient pour commencer"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge className={step >= 1 ? "bg-white text-emerald-600" : "bg-white/30 text-white/60"}>1. Constantes</Badge>
                <ArrowRight className="h-3 w-3 opacity-50" />
                <Badge className={step >= 2 ? "bg-white text-emerald-600" : "bg-white/30 text-white/60"}>2. Orientation</Badge>
                <ArrowRight className="h-3 w-3 opacity-50" />
                <Badge className={step >= 3 ? "bg-white text-emerald-600" : "bg-white/30 text-white/60"}>3. Facturation</Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {step === 1 ? (
            <div className="p-6 max-w-4xl mx-auto overflow-x-hidden">
              {!initialPatient && (
                <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-dashed border-emerald-200 shadow-sm">
                  <h4 className="text-emerald-700 font-bold mb-3 block text-center uppercase tracking-wider">Étape 0 : Sélection du Patient</h4>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-14 text-lg font-bold rounded-xl border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-900"
                      >
                        {selectedPatient
                          ? `${selectedPatient.first_name} ${selectedPatient.last_name} - ${selectedPatient.identifier}`
                          : "Rechercher un patient..."}
                        <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                      </Button>
                    } />
                    <PopoverContent className="w-[600px] p-0 shadow-2xl border-emerald-100" align="center">
                      <Command className="rounded-xl overflow-hidden">
                        <CommandInput placeholder="Nom, prénom ou identifiant..." className="h-12" />
                        <CommandList>
                          <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                          <CommandGroup heading="Patients">
                            {patients.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.first_name} ${p.last_name} ${p.identifier}`}
                                onSelect={() => {
                                  setSelectedPatient(p);
                                  setPatientSearchOpen(false);
                                  toast.success(`Patient sélectionné : ${p.first_name} ${p.last_name}`);
                                }}
                                className="p-3 cursor-pointer hover:bg-emerald-50"
                              >
                                <Check className={cn("mr-2 h-4 w-4 text-emerald-600", selectedPatient?.id === p.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="font-bold">{p.first_name} {p.last_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.identifier}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {!selectedPatient && (
                    <p className="text-[10px] text-emerald-600 text-center mt-3 font-medium animate-pulse">
                      Veuillez choisir un patient dans la liste pour activer la saisie des constantes.
                    </p>
                  )}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onVitalsSubmit)} className={cn("space-y-6 transition-all", !selectedPatient && "opacity-30 pointer-events-none grayscale")}>
                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-emerald-600/5 rounded-xl border border-emerald-600/10">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                         <Activity className="h-4 w-4" /> Signes de base
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="temperature" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Temp (°C)</FormLabel>
                              <FormControl><Input type="number" step="0.1" className="bg-white h-11 text-center font-bold" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="spo2" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">SpO2 (%)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center font-bold" {...field} /></FormControl>
                            </FormItem>
                          )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="heart_rate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Pouls (bpm)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center font-bold" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="resp_rate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Resp (cpm)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center font-bold" {...field} /></FormControl>
                            </FormItem>
                          )} />
                      </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                         <HeartPulse className="h-4 w-4" /> Tension Artérielle
                      </h4>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Bras Droit</p>
                        <div className="grid grid-cols-2 gap-2">
                           <FormField control={form.control} name="sys_bp_right" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Syst" className="h-9 text-center font-medium" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="dia_bp_right" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Diast" className="h-9 text-center font-medium" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Bras Gauche</p>
                        <div className="grid grid-cols-2 gap-2">
                           <FormField control={form.control} name="sys_bp_left" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Syst" className="h-9 text-center font-medium" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="dia_bp_left" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Diast" className="h-9 text-center font-medium" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Scale className="h-3 w-3 text-slate-400" /> Poids (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.1" className="h-11 bg-white font-bold" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="height" render={({ field }) => (
                       <FormItem>
                        <FormLabel className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-slate-400" /> Taille (cm)</FormLabel>
                        <FormControl><Input type="number" className="h-11 bg-white font-bold" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="flex flex-col justify-end">
                       <FormLabel className="mb-2 text-xs font-bold text-slate-500 uppercase">IMC & Interprétation</FormLabel>
                       <BMIResult weight={form.watch("weight") || ""} height={form.watch("height") || ""} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 pt-6">
                     <FormField control={form.control} name="initial_service" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service d'orientation</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Médecine générale">Médecine générale</SelectItem>
                            <SelectItem value="Pédiatrie">Pédiatrie</SelectItem>
                            <SelectItem value="Gynécologie">Gynécologie</SelectItem>
                            <SelectItem value="Urgences">Urgences</SelectItem>
                            <SelectItem value="Ophtalmologie">Ophtalmologie</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité / Statut</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Nouveau">Normal (Consultation)</SelectItem>
                            <SelectItem value="Urgence">URGENCE VITALE</SelectItem>
                            <SelectItem value="Stable">Contrôle / Suivi</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-200"
                    disabled={loading || !selectedPatient}
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Enregistrer & Suite (Orientation)"}
                  </Button>
                </form>
              </Form>
            </div>
          ) : step === 2 ? (
            <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Orientation Vers Service</h3>
                  <p className="text-slate-500 text-sm">Précisez le service d'accueil pour le patient <span className="font-bold text-emerald-600">{selectedPatient?.first_name} {selectedPatient?.last_name}</span></p>
               </div>

               <Form {...form}>
                  <form onSubmit={form.handleSubmit(async (values) => {
                    setLoading(true);
                    try {
                      const { error } = await supabase
                        .from("patients")
                        .update({
                          initial_service: values.initial_service,
                          status: values.status
                        })
                        .eq('id', selectedPatient.id);
                      
                      if (error) throw error;
                      toast.success("Orientation confirmée.");
                      setStep(3);
                    } catch (e: any) {
                      toast.error("Erreur d'orientation: " + e.message);
                    } finally {
                      setLoading(false);
                    }
                  })} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                       <FormField control={form.control} name="initial_service" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-slate-700">Service Destination</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 bg-white border-2 border-emerald-100 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-lg"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Médecine générale">Médecine générale</SelectItem>
                              <SelectItem value="Pédiatrie">Pédiatrie</SelectItem>
                              <SelectItem value="Gynécologie">Gynécologie</SelectItem>
                              <SelectItem value="Maternité">Maternité</SelectItem>
                              <SelectItem value="Laboratoire">Laboratoire</SelectItem>
                              <SelectItem value="Imagerie">Imagerie</SelectItem>
                              <SelectItem value="Urgences">Urgences</SelectItem>
                              <SelectItem value="Ophtalmologie">Ophtalmologie</SelectItem>
                              <SelectItem value="Comptabilité">Comptabilité / Caisse</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-slate-700">Priorité de Passage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 bg-white border-2 border-emerald-100 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-lg"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Nouveau">Normal (Consultation)</SelectItem>
                              <SelectItem value="Urgence">URGENCE VITALE</SelectItem>
                              <SelectItem value="Stable">Contrôle / Suivi</SelectItem>
                              <SelectItem value="Examen">Examen Simple</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xl font-bold shadow-xl shadow-emerald-200 transition-all hover:scale-[1.02]"
                      >
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                          <div className="flex items-center gap-2">
                             Valider & Facturer <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
               </Form>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <BillingForm 
                patientId={selectedPatient?.id} 
                onSuccess={handleFinish}
                showPatientSelector={false}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BMIResult({ weight, height }: { weight: string, height: string }) {
  if (!weight || !height) return (
    <div className="h-11 flex items-center px-4 bg-slate-50 rounded-md border border-slate-200 text-slate-400 italic text-sm">
      Saisissez poids et taille
    </div>
  );

  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;

  if (h === 0 || isNaN(w) || isNaN(h)) return null;

  const bmi = w / (h * h);
  const bmiFixed = bmi.toFixed(2);

  let interpretation = "";
  let colorClass = "";

  if (bmi < 18.5) {
    interpretation = "Insuffisance";
    colorClass = "bg-amber-100 text-amber-700 border-amber-200";
  } else if (bmi >= 18.5 && bmi < 25) {
    interpretation = "Normal";
    colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
  } else if (bmi >= 25 && bmi < 30) {
    interpretation = "Surpoids";
    colorClass = "bg-orange-100 text-orange-700 border-orange-200";
  } else {
    interpretation = "Obésité";
    colorClass = "bg-rose-100 text-rose-700 border-rose-200";
  }

  return (
    <div className={`h-11 flex items-center justify-between px-3 rounded-md border font-bold text-sm ${colorClass}`}>
      <span>IMC: {bmiFixed}</span>
      <span className="text-[10px] uppercase">{interpretation}</span>
    </div>
  );
}
