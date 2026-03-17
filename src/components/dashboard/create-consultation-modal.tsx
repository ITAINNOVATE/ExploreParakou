"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Stethoscope, 
  Loader2, 
  Check, 
  ChevronsUpDown, 
  Plus, 
  Trash2, 
  Beaker, 
  Pill,
  User,
  History,
  ShieldCheck,
  Activity,
  Calendar,
  Lock,
  Mic,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  Info,
  Hospital,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const formSchema = z.object({
  patient_id: z.string().min(1, "Le patient est requis"),
  appointment_id: z.string().optional(),
  category: z.string().min(1, "La catégorie est requise"),
  symptoms: z.string().min(1, "Le motif est requis"),
  anamnesis: z.string().optional(),
  previous_exams: z.string().optional(),
  current_treatments: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string()
  })).default([]),
  history_medical: z.array(z.string()).default([]),
  history_surgical: z.array(z.string()).default([]),
  history_familial: z.array(z.string()).default([]),
  vaccinations: z.array(z.object({
    vaccine: z.string(),
    dose: z.string(),
    date: z.string(),
    booster: z.string(),
    status: z.string()
  })).default([]),
  deworming: z.array(z.object({
    molecule: z.string(),
    date: z.string()
  })).default([]),
  allergies: z.array(z.string()).default([]),
  allergy_details: z.string().optional(),
  vitals: z.object({
    temp: z.string().optional(),
    bp_sys: z.string().optional(),
    bp_dia: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    pulse: z.string().optional(),
    resp_rate: z.string().optional(),
    spo2: z.string().optional(),
  }),
  physical_exam: z.object({
    etat_general: z.string().optional().default(""),
    facies: z.string().optional().default(""),
    peau_teguments: z.string().optional().default(""),
    muqueuses: z.string().optional().default(""),
    ganglions: z.string().optional().default(""),
    cou_thyroide: z.string().optional().default(""),
    thorax: z.string().optional().default(""),
    coeur: z.string().optional().default(""),
    poumons: z.string().optional().default(""),
    abdomen: z.string().optional().default(""),
    membres: z.string().optional().default(""),
    neuro: z.string().optional().default(""),
    autres: z.string().optional().default(""),
    detailed: z.string().optional().default("")
  }),
  diagnosis: z.string().min(1, "Le diagnostic principal est requis"),
  diagnosis_status: z.string().default("provisional"),
  diagnosis_certainty: z.string().default("medium"),
  secondary_diagnosis: z.string().optional(),
  medications: z.array(z.object({
    source: z.enum(["interne", "externe"]).default("externe"),
    medicine_id: z.string().optional(),
    name: z.string().min(1, "Nom requis"),
    dosage: z.string().min(1, "Posologie requise"),
    duration: z.string().min(1, "Durée requise"),
    frequency: z.string().optional(),
    quantity: z.string().optional(),
    instructions: z.string().optional(),
  })).default([]),
  lab_tests: z.array(z.object({
    name: z.string().min(1, "Nom requis"),
    source: z.enum(["interne", "externe"]).default("interne"),
    test_id: z.string().optional(),
  })).default([]),
  hospitalization_needed: z.boolean().default(false),
  hospitalization_reason: z.string().optional(),
  follow_up_date: z.string().optional(),
  follow_up_reason: z.string().optional(),
});

const COMMON_TESTS = [
  "NFS (Hémogramme)",
  "Glycémie",
  "Groupe Sanguin / Rh",
  "Paludisme (TDR/GE)",
  "Widal & Félix",
  "ECBU",
  "Créatininémie",
  "Bilan Lipidique",
  "Test de Grossesse",
  "Scanner",
  "Radiographie Chest"
];

interface CreateConsultationModalProps {
  onConsultationCreated: () => void;
  initialData?: {
    patient_id?: string;
    appointment_id?: string;
  };
  renderTrigger?: React.ReactElement;
}

export function CreateConsultationModal({ onConsultationCreated, initialData, renderTrigger }: CreateConsultationModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const supabase = createClient();

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      patient_id: initialData?.patient_id || "",
      appointment_id: initialData?.appointment_id || "",
      category: "Médecine Générale",
      symptoms: "",
      anamnesis: "",
      previous_exams: "",
      current_treatments: [],
      history_medical: [],
      history_surgical: [],
      history_familial: [],
      vaccinations: [],
      deworming: [],
      allergies: [],
      allergy_details: "",
      vitals: {
        temp: "",
        bp_sys: "",
        bp_dia: "",
        weight: "",
        height: "",
        pulse: "",
        resp_rate: "",
        spo2: "",
      },
      physical_exam: {
        etat_general: "",
        facies: "",
        peau_teguments: "",
        muqueuses: "",
        ganglions: "",
        cou_thyroide: "",
        thorax: "",
        coeur: "",
        poumons: "",
        abdomen: "",
        membres: "",
        neuro: "",
        autres: "",
        detailed: ""
      },
      diagnosis: "",
      diagnosis_status: "provisional",
      diagnosis_certainty: "medium",
      secondary_diagnosis: "",
      medications: [],
      lab_tests: [],
      hospitalization_needed: false,
      hospitalization_reason: "",
      follow_up_date: "",
      follow_up_reason: "",
    },
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 12));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const [availableMedicines, setAvailableMedicines] = useState<any[]>([]);
  const [availableLabTests, setAvailableLabTests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', user?.id).single();
      
      if (profile?.clinic_id) {
        const [meds, labs] = await Promise.all([
          supabase.from('medicines').select('*').eq('clinic_id', profile.clinic_id),
          supabase.from('lab_tests').select('*').eq('clinic_id', profile.clinic_id)
        ]);
        if (meds.data) setAvailableMedicines(meds.data);
        if (labs.data) setAvailableLabTests(labs.data);
      }
    }
    if (open) fetchData();
  }, [open, supabase]);

  const { 
    fields: currentTreatmentFields, 
    append: appendCurrentTreatment, 
    remove: removeCurrentTreatment 
  } = useFieldArray({
    control: form.control,
    name: "current_treatments",
  });

  const { 
    fields: vaccinationFields, 
    append: appendVaccination, 
    remove: removeVaccination 
  } = useFieldArray({
    control: form.control,
    name: "vaccinations",
  });

  const { 
    fields: dewormingFields, 
    append: appendDeworming, 
    remove: removeDeworming 
  } = useFieldArray({
    control: form.control,
    name: "deworming",
  });

  const { 
    fields: medicationFields, 
    append: appendMedication, 
    remove: removeMedication,
    update: updateMedication
  } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const { 
    fields: labTestFields, 
    append: appendLabTest, 
    remove: removeLabTest,
    update: updateLabTest
  } = useFieldArray({
    control: form.control,
    name: "lab_tests",
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...form.getValues(),
        patient_id: initialData.patient_id || "",
        appointment_id: initialData.appointment_id || "",
      });
      if (initialData.patient_id) setOpen(true);
    }
  }, [initialData, form]);

  useEffect(() => {
    if (open) {
      fetchPatients();
      if (step === 1 && !form.getValues("patient_id")) {
        setPatientSearchOpen(true);
      }
    }
  }, [open, step, form]);

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("id, first_name, last_name");
    if (data) setPatients(data);
  }

  const checkForDraft = useCallback(async (patientId: string, appointmentId?: string) => {
    if (!patientId) return;
    
    try {
      let query = supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .eq("status", "open");
      
      if (appointmentId) {
        query = query.eq("appointment_id", appointmentId);
      }

      const { data, error } = await query.maybeSingle();
      
      if (data) {
        setActiveConsultationId(data.id);
        form.reset({
          patient_id: data.patient_id,
          appointment_id: data.appointment_id || "",
          category: data.category || "General",
          symptoms: data.symptoms || "",
          anamnesis: data.anamnesis || "",
          previous_exams: data.previous_exams || "",
          vitals: data.vitals || {
            temp: "", bp_sys: "", bp_dia: "", weight: "", height: "", pulse: "", resp_rate: "", spo2: "",
          },
          physical_exam: data.physical_exam || "",
          diagnosis: data.diagnosis || "",
          diagnosis_status: data.diagnosis_status || "provisional",
          diagnosis_certainty: data.diagnosis_certainty || "medium",
          secondary_diagnosis: data.secondary_diagnosis || "",
          follow_up_date: data.follow_up_date || "",
          follow_up_reason: data.follow_up_reason || "",
          medications: [],
          lab_tests: [],
          current_treatments: [],
          history_medical: [],
          history_surgical: [],
          history_familial: [],
          vaccinations: [],
          deworming: [],
          allergies: [],
          allergy_details: ""
        });
        toast.info("Brouillon récupéré pour ce patient.");
      }
    } catch (err) {
      console.error("Error checking for draft:", err);
    }
  }, [supabase, form]);

  useEffect(() => {
    const patientId = form.watch("patient_id");
    const appointmentId = form.watch("appointment_id");
    if (open && patientId && !activeConsultationId) {
      checkForDraft(patientId, appointmentId);
    }
  }, [open, form.watch("patient_id"), activeConsultationId, checkForDraft]);

  const saveDraft = async () => {
    const values = form.getValues();
    if (!values.patient_id) {
      toast.error("Sélectionnez un patient avant de sauvegarder.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.clinic_id) throw new Error("Profil clinique introuvable.");

      const payload = {
        patient_id: values.patient_id,
        clinic_id: profile.clinic_id,
        doctor_id: user?.id,
        category: values.category,
        symptoms: values.symptoms,
        anamnesis: values.anamnesis,
        previous_exams: values.previous_exams,
        vitals: values.vitals,
        physical_exam: values.physical_exam,
        diagnosis: values.diagnosis,
        diagnosis_status: values.diagnosis_status,
        diagnosis_certainty: values.diagnosis_certainty,
        secondary_diagnosis: values.secondary_diagnosis,
        follow_up_date: values.follow_up_date || null,
        follow_up_reason: values.follow_up_reason || null,
        appointment_id: values.appointment_id || null,
        status: 'open'
      };

      let result;
      if (activeConsultationId) {
        result = await supabase
          .from("consultations")
          .update(payload)
          .eq("id", activeConsultationId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("consultations")
          .insert([payload])
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      setActiveConsultationId(result.data.id);
      setLastSaved(new Date());
      toast.success("Brouillon sauvegardé.");
    } catch (error: any) {
      toast.error("Erreur sauvegarde : " + error.message);
    }
  };

  const syncVitals = async () => {
    const patientId = form.getValues("patient_id");
    if (!patientId) {
      toast.error("Sélectionnez un patient d'abord.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patient_vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.info("Aucune constante trouvée pour ce patient.");
        return;
      }

      form.setValue("vitals", {
        temp: data.temperature || "",
        bp_sys: data.blood_pressure_sys || "",
        bp_dia: data.blood_pressure_dia || "",
        weight: data.weight || "",
        height: data.height || "",
        pulse: data.pulse || "",
        resp_rate: data.respiratory_rate || "",
        spo2: data.oxygen_saturation || ""
      });
      toast.success("Constantes synchronisées avec l'accueil.");
    } catch (err: any) {
      toast.error("Erreur synchro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.clinic_id) throw new Error("Profil clinique introuvable.");

      // 1. Insert/Update Consultation
      const payload = { 
        patient_id: values.patient_id,
        clinic_id: profile.clinic_id,
        doctor_id: user?.id,
        category: values.category,
        symptoms: values.symptoms,
        anamnesis: values.anamnesis,
        previous_exams: values.previous_exams,
        diagnosis: values.diagnosis,
        diagnosis_status: values.diagnosis_status,
        diagnosis_certainty: values.diagnosis_certainty,
        secondary_diagnosis: values.secondary_diagnosis,
        vitals: values.vitals,
        physical_exam: values.physical_exam,
        follow_up_date: values.follow_up_date || null,
        follow_up_reason: values.follow_up_reason || null,
        appointment_id: values.appointment_id || null,
        status: 'closed'
      };

      let consultation;
      if (activeConsultationId) {
        const { data, error } = await supabase
          .from("consultations")
          .update(payload)
          .eq("id", activeConsultationId)
          .select()
          .single();
        if (error) throw error;
        consultation = data;
      } else {
        const { data, error } = await supabase
          .from("consultations")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        consultation = data;
      }

      // 1.5 Update Patient History
      const { error: patientUpdateError } = await supabase
        .from("patients")
        .update({
          history_medical: values.history_medical,
          history_surgical: values.history_surgical,
          history_familial: values.history_familial,
          vaccinations: values.vaccinations,
          deworming: values.deworming,
          current_treatments: values.current_treatments,
          allergies_list: {
            basics: values.allergies,
            details: values.allergy_details
          }
        })
        .eq('id', values.patient_id);

      if (patientUpdateError) console.error("Patient history update error:", patientUpdateError);

      // 2. Insert Prescriptions if any
      if (values.medications.length > 0) {
        const { error: presError } = await supabase
          .from("prescriptions")
          .insert([{
            clinic_id: profile.clinic_id,
            consultation_id: consultation.id,
            patient_id: values.patient_id,
            doctor_id: user?.id,
            meds_list: values.medications,
            status: 'actif'
          }]);
        if (presError) throw presError;
      }

      // 3. Insert Lab Requests if any
      if (values.lab_tests.length > 0) {
        const labRequests = values.lab_tests.map(test => ({
          clinic_id: profile.clinic_id,
          patient_id: values.patient_id,
          doctor_id: user?.id,
          consultation_id: consultation.id,
          test_type: test,
          status: 'pending'
        }));
        const { error: labError } = await supabase
          .from("lab_requests")
          .insert(labRequests);
        if (labError) throw labError;
      }

      // 4. Update appointment status
      if (values.appointment_id) {
        await supabase
          .from("appointments")
          .update({ status: 'terminé' })
          .eq('id', values.appointment_id);
      }

      toast.success("Consultation enregistrée avec succès.");
      setOpen(false);
      form.reset();
      setActiveConsultationId(null);
      setLastSaved(null);
      onConsultationCreated();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen, eventDetails) => {
        if (!newOpen && (eventDetails.reason === 'outside-press' || eventDetails.reason === 'escape-key')) {
          return;
        }
        setOpen(newOpen);
      }}
    >
      <DialogTrigger render={renderTrigger || (
        <Button className="gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Stethoscope className="h-4 w-4" />
          Nouvelle Consultation
        </Button>
      )} />
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Examen Clinique & Consultation</DialogTitle>
          <DialogDescription>
            Saisissez les résultats de l'examen, les ordonnances et les examens de laboratoire.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center gap-3 mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary shrink-0">
                  <span className="text-lg font-bold">{step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {step === 1 && "Sélection du Patient"}
                    {step === 2 && "Motif & Catégorie"}
                    {step === 3 && "Anamnèse (Histoire de la maladie)"}
                    {step === 4 && "Traitements en cours"}
                    {step === 5 && "Antécédents"}
                    {step === 6 && "Prévention (Vaccination & Déparasitage)"}
                    {step === 7 && "Allergies"}
                    {step === 8 && "Bilans Antérieurs"}
                    {step === 9 && "Examen Physique"}
                    {step === 10 && "Diagnostic & Traitement"}
                    {step === 11 && "RDV & Clôture"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${(step / 11) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{Math.round((step/11)*100)}%</span>
                  </div>
                </div>
              </div>

              {/* Steps renders */}
              <div className="space-y-6">
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormField
                      control={form.control}
                      name="patient_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-bold text-slate-700 text-lg mb-2">Quel patient consultez-vous ?</FormLabel>
                          <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                            <PopoverTrigger render={
                              <Button variant="outline" role="combobox" className="w-full justify-between h-14 text-lg rounded-2xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all">
                                {field.value
                                  ? `${patients.find((p) => p.id === field.value)?.first_name} ${patients.find((p) => p.id === field.value)?.last_name}`
                                  : "Rechercher un patient par nom..."}
                                <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                              </Button>
                            } />
                            <PopoverContent className="w-[600px] p-0 shadow-2xl rounded-2xl border-slate-200">
                              <Command className="rounded-2xl">
                                <CommandInput placeholder="Saisir le nom ou prénom..." className="h-14 text-lg" />
                                <CommandList className="max-h-[400px]">
                                  <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                                  <CommandGroup heading="Patients enregistrés">
                                    {patients.map((patient) => (
                                      <CommandItem
                                        key={patient.id}
                                        className="h-12 text-base cursor-pointer px-4"
                                        value={`${patient.first_name} ${patient.last_name}`}
                                        onSelect={() => {
                                          form.setValue("patient_id", patient.id);
                                          setPatientSearchOpen(false);
                                        }}
                                      >
                                        <div className="flex items-center gap-3 w-full">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {patient.first_name[0]}{patient.last_name[0]}
                                          </div>
                                          <span className="flex-1 font-medium">{patient.first_name} {patient.last_name}</span>
                                          {field.value === patient.id && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("patient_id") && (
                      <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-primary border border-primary/10">
                            <User className="h-8 w-8" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900">
                              {patients.find(p => p.id === form.watch("patient_id"))?.first_name} {patients.find(p => p.id === form.watch("patient_id"))?.last_name}
                            </h4>
                            <p className="text-slate-500">Patient prêt pour l'examen clinique</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-auto text-primary font-bold"
                            onClick={() => form.setValue("patient_id", "")}
                          >
                            Changer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700">Catégorie de Consultation</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                  <SelectValue placeholder="Type de consultation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="General">Médecine Générale</SelectItem>
                                <SelectItem value="Pediatry">Pédiatrie</SelectItem>
                                <SelectItem value="Gynecology">Gynécologie</SelectItem>
                                <SelectItem value="Cardiology">Cardiologie</SelectItem>
                                <SelectItem value="Emergency">Urgence</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="appointment_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700">ID Rendez-vous (facultatif)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Numéro de RDV si existant" 
                                className="h-12 rounded-xl border-slate-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="font-bold text-slate-700">Motif de consultation</FormLabel>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-2 rounded-lg border-primary/20 text-primary hover:bg-primary/5">
                              <Mic className="h-3.5 w-3.5" /> Transcription Vocale
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea 
                              placeholder="Quelles sont les plaintes principales du patient ? (ex: Fièvre persistante, douleurs abdominales...)" 
                              className="min-h-[150px] rounded-2xl resize-none border-slate-200 focus-visible:ring-primary text-base p-4" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormField
                      control={form.control}
                      name="anamnesis"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel className="font-bold text-slate-700">Histoire de la maladie (Anamnèse)</FormLabel>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"><Mic className="h-3 w-3" /> Vocal</Button>
                          </div>
                          <FormControl>
                            <Textarea 
                              placeholder="Détaillez l'évolution des symptômes, les circonstances d'apparition..." 
                              className="min-h-[300px] rounded-xl resize-none border-slate-200 focus-visible:ring-primary" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-bold text-slate-700">Traitements Médicamenteux en Cours</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendCurrentTreatment({ name: "", dosage: "", frequency: "" })}
                        className="gap-1 rounded-lg"
                      >
                        <Plus className="h-4 w-4" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {currentTreatmentFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 items-end">
                          <div className="col-span-11 grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name={`current_treatments.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Médicament</FormLabel>
                                  <FormControl><Input placeholder="Nom" className="h-10" {...field} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`current_treatments.${index}.dosage`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Posologie</FormLabel>
                                  <FormControl><Input placeholder="ex: 500mg" className="h-10" {...field} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`current_treatments.${index}.frequency`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Fréquence</FormLabel>
                                  <FormControl><Input placeholder="ex: 1x/jour" className="h-10" {...field} /></FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCurrentTreatment(index)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      {currentTreatmentFields.length === 0 && (
                        <div className="p-8 border-2 border-dashed rounded-xl text-center text-slate-400 italic">
                          Aucun traitement en cours déclaré.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><History className="h-4 w-4" /> Antécédents Médicaux</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['HTA', 'Diabète', 'Asthme', 'Drépanocytose', 'Cardiopathie', 'VIH', 'Hépatite', 'Gastrite'].map((item) => (
                           <FormField
                            key={item}
                            control={form.control}
                            name="history_medical"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-lg border p-3">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item])
                                        : field.onChange(field.value?.filter((v) => v !== item));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium cursor-pointer">{item}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><Plus className="h-4 w-4" /> Antécédents Chirurgicaux</FormLabel>
                      <FormField
                        control={form.control}
                        name="history_surgical"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea placeholder="Interventions passées..." className="min-h-[80px] rounded-xl" value={field.value.join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormLabel className="font-bold text-slate-700">Antécédents Familiaux</FormLabel>
                      <FormField
                        control={form.control}
                        name="history_familial"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea placeholder="Pathologies héréditaires (HTA, Diabète, Cancer...)" className="min-h-[80px] rounded-xl" value={field.value.join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Vaccination</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendVaccination({ vaccine: "", dose: "", date: "", booster: "", status: "done" })}>
                          <Plus className="h-4 w-4" /> Ajouter
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {vaccinationFields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 items-end">
                              <FormField
                                control={form.control}
                                name={`vaccinations.${index}.vaccine`}
                                render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold text-slate-400">Vaccin</FormLabel><FormControl><Input placeholder="Nom" {...field} /></FormControl></FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vaccinations.${index}.dose`}
                                render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold text-slate-400">Dose</FormLabel><FormControl><Input placeholder="ex: 1/3" {...field} /></FormControl></FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vaccinations.${index}.date`}
                                render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold text-slate-400">Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vaccinations.${index}.status`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-slate-400">Statut</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent><SelectItem value="done">Fait</SelectItem><SelectItem value="pending">Prévu</SelectItem></SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeVaccination(index)} className="text-rose-500 mb-1"><Trash2 className="h-4 w-4" /></Button>
                           </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                        <FormLabel className="font-bold text-slate-700">Déparasitage</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendDeworming({ molecule: "", date: "" })}>
                          <Plus className="h-4 w-4" /> Ajouter
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {dewormingFields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 items-end">
                             <div className="col-span-11 grid grid-cols-2 gap-2">
                               <FormField
                                 control={form.control}
                                 name={`deworming.${index}.molecule`}
                                 render={({ field }) => (
                                   <FormItem><FormLabel className="text-[10px] font-bold text-slate-400">Molécule</FormLabel><FormControl><Input placeholder="ex: Albendazole" {...field} /></FormControl></FormItem>
                                 )}
                               />
                               <FormField
                                 control={form.control}
                                 name={`deworming.${index}.date`}
                                 render={({ field }) => (
                                   <FormItem><FormLabel className="text-[10px] font-bold text-slate-400">Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                                 )}
                               />
                             </div>
                             <div className="col-span-1">
                               <Button type="button" variant="ghost" size="icon" onClick={() => removeDeworming(index)} className="text-rose-500 mb-1"><Trash2 className="h-4 w-4" /></Button>
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><X className="h-4 w-4 text-rose-500" /> Allergies Connues</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                       {['Pénicilline', 'Sulfamides', 'Aspirine', 'Iode', 'Latex', 'Arachides'].map((item) => (
                         <FormField
                            key={item}
                            control={form.control}
                            name="allergies"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-3 rounded-lg border">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item])
                                        : field.onChange(field.value?.filter((v) => v !== item));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">{item}</FormLabel>
                              </FormItem>
                            )}
                          />
                       ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="allergy_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-slate-500">Autres allergies ou précisions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Précisez les réactions..." className="rounded-xl" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 8 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <FormLabel className="font-bold text-slate-700">Bilans Antérieurs (Laboratoire / Imagerie)</FormLabel>
                     <div className="flex flex-col gap-4">
                       <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                         Indiquez les résultats marquants des examens apportés par le patient.
                       </div>
                       <FormField
                         control={form.control}
                         name="previous_exams"
                         render={({ field }) => (
                           <FormItem>
                             <FormControl>
                               <Textarea 
                                 placeholder="Ex: Glycémie à jeun (1.2g/L le 12/03), Scanner thoracique (normal)..." 
                                 className="min-h-[250px] rounded-xl border-slate-200"
                                 {...field} 
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                  </div>
                )}

                {step === 9 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <FormLabel className="font-bold text-slate-700 text-lg flex items-center gap-2">
                          <Activity className="h-5 w-5 text-indigo-500" /> Constantes Vitales
                        </FormLabel>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={syncVitals}
                          disabled={loading}
                          className="h-9 px-4 gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-semibold"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Synchroniser avec l'accueil
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        <FormField
                          control={form.control}
                          name="vitals.temp"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Temp (°C)</FormLabel><FormControl><Input placeholder="37.0" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.bp_sys"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">TA Sys (mmHg)</FormLabel><FormControl><Input placeholder="120" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.bp_dia"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">TA Dia (mmHg)</FormLabel><FormControl><Input placeholder="80" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.pulse"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Pouls (bpm)</FormLabel><FormControl><Input placeholder="72" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="vitals.weight"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Poids (kg)</FormLabel><FormControl><Input placeholder="70" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.height"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Taille (cm)</FormLabel><FormControl><Input placeholder="175" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.spo2"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">SpO2 (%)</FormLabel><FormControl><Input placeholder="98" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vitals.resp_rate"
                          render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-bold text-slate-500 uppercase">Fréq. Resp (cpm)</FormLabel><FormControl><Input placeholder="16" className="h-11 rounded-xl" {...field} /></FormControl></FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          <Stethoscope className="h-5 w-5 text-primary" /> Examen Physique par Système
                        </FormLabel>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Saisie Structurée</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(form.getValues("physical_exam")).filter(k => k !== 'detailed') as Array<keyof FormValues["physical_exam"]>).map((systemId) => {
                          const labels: Record<string, string> = {
                            etat_general: "État Général",
                            facies: "Facies",
                            peau_teguments: "Peau et Téguments",
                            muqueuses: "Muqueuses",
                            ganglions: "Ganglions",
                            cou_thyroide: "Cou et Thyroïde",
                            thorax: "Thorax",
                            coeur: "Cœur",
                            poumons: "Poumons",
                            abdomen: "Abdomen",
                            membres: "Membres",
                            neuro: "Examen Neurologique",
                            autres: "Autres Observations",
                          };
                          return (
                            <FormField
                              key={systemId}
                              control={form.control}
                              name={`physical_exam.${systemId}`}
                              render={({ field }) => (
                                <FormItem className="space-y-2 p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/30 transition-all group">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="font-bold text-slate-700 text-sm">{labels[systemId]}</FormLabel>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-primary">
                                      <Mic className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <FormControl>
                                    <Input 
                                      placeholder={`Résultats ${labels[systemId].toLowerCase()}...`} 
                                      className="h-10 border-transparent bg-slate-50 focus:bg-white focus:border-primary/50 transition-colors rounded-lg"
                                      {...field} 
                                      value={typeof field.value === 'string' ? field.value : ""}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>

                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <FormLabel className="font-bold text-primary flex items-center gap-2 mb-3">
                          <Lock className="h-4 w-4" /> Examen Systémique (Mode Avancé / Détaillé)
                        </FormLabel>
                        <FormField
                          control={form.control}
                          name="physical_exam.detailed"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Saisissez ici les détails supplémentaires ou le compte-rendu global de l'examen physique..." 
                                  className="min-h-[120px] rounded-xl border-primary/20 bg-white focus-visible:ring-primary shadow-inner" 
                                  {...field} 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 10 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-700">Diagnostic principal et diagnostics secondaires en texte libre.</p>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700">Diagnostic Principal</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea 
                                  placeholder="Diagnostic principal" 
                                  className="min-h-[120px] rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-12 text-base" 
                                  {...field} 
                                />
                                <Button size="icon" variant="ghost" className="absolute right-3 bottom-3 text-slate-400 hover:text-primary">
                                  <Mic className="h-5 w-5" />
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondary_diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700">Diagnostics Secondaires (texte libre)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea 
                                  placeholder="Diagnostics secondaires" 
                                  className="min-h-[120px] rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-12 text-base" 
                                  {...field} 
                                />
                                <Button size="icon" variant="ghost" className="absolute right-3 bottom-3 text-slate-400 hover:text-primary">
                                  <Mic className="h-5 w-5" />
                                </Button>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {step === 11 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-700">Prescription complète : Médicaments, Analyses biologiques et Hospitalisation. Un PDF imprimable sera généré pour chaque prescription.</p>
                    </div>

                    <Tabs defaultValue="prescription" className="w-full">
                      <TabsList className="flex gap-6 border-b rounded-none bg-transparent h-auto p-0 mb-6">
                        <TabsTrigger 
                          value="prescription" 
                          className="flex items-center gap-2 pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-slate-500"
                        >
                          <Pill className="h-4 w-4" /> Ordonnance Médicamenteuse
                        </TabsTrigger>
                        <TabsTrigger 
                          value="labs" 
                          className="flex items-center gap-2 pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-slate-500"
                        >
                          <Beaker className="h-4 w-4" /> Prescription d'Analyse
                        </TabsTrigger>
                        <TabsTrigger 
                          value="hospitalization" 
                          className="flex items-center gap-2 pb-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-slate-500"
                        >
                          <Hospital className="h-4 w-4" /> Hospitalisation
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="prescription" className="space-y-6">
                        <div className="space-y-4">
                          {medicationFields.map((field, index) => (
                            <div key={field.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 relative">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeMedication(index)} 
                                className="absolute top-2 right-2 text-rose-500 h-8 w-8 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-3">
                                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Source</FormLabel>
                                  <Select 
                                    onValueChange={(val) => {
                                      if (val) updateMedication(index, { ...form.getValues().medications[index], source: val as "interne" | "externe", name: "", medicine_id: "" });
                                    }} 
                                    defaultValue={form.getValues().medications[index].source || undefined}
                                  >
                                    <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="interne">Interne (Pharmacie)</SelectItem>
                                      <SelectItem value="externe">Externe (Achat)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="md:col-span-5">
                                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Médicament</FormLabel>
                                  {form.watch(`medications.${index}.source`) === "interne" ? (
                                    <Select 
                                      onValueChange={(val) => {
                                        const med = availableMedicines.find(m => m.id === val);
                                        updateMedication(index, { 
                                          ...form.getValues().medications[index], 
                                          medicine_id: val, 
                                          name: med?.name || "" 
                                        });
                                      }}
                                      defaultValue={(form.getValues().medications[index].medicine_id as string | undefined)}
                                    >
                                      <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisir un médicament" /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <ScrollArea className="h-[200px]">
                                          {availableMedicines.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name} ({m.dosage})</SelectItem>
                                          ))}
                                        </ScrollArea>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input 
                                      placeholder="Nom du médicament" 
                                      className="h-11 rounded-xl"
                                      value={form.watch().medications[index]?.name || ""}
                                      onChange={(e) => updateMedication(index, { ...form.getValues().medications[index], name: e.target.value })}
                                    />
                                  )}
                                </div>

                                <div className="md:col-span-2">
                                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Quantité</FormLabel>
                                  <Input 
                                    placeholder="Qté" 
                                    className="h-11 rounded-xl"
                                    value={form.watch(`medications.${index}.quantity`)}
                                    onChange={(e) => updateMedication(index, { ...form.getValues(`medications.${index}`), quantity: e.target.value })}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Durée</FormLabel>
                                  <Input 
                                    placeholder="ex: 7j" 
                                    className="h-11 rounded-xl"
                                    value={form.watch(`medications.${index}.duration`)}
                                    onChange={(e) => updateMedication(index, { ...form.getValues(`medications.${index}`), duration: e.target.value })}
                                  />
                                </div>

                                <div className="md:col-span-12">
                                  <FormLabel className="text-xs font-bold text-slate-500 uppercase">Posologie / Ligne de traitement</FormLabel>
                                  <Input 
                                    placeholder="ex: 1 comprimé matin et soir après le repas" 
                                    className="h-11 rounded-xl"
                                    value={form.watch(`medications.${index}.dosage`)}
                                    onChange={(e) => updateMedication(index, { ...form.getValues(`medications.${index}`), dosage: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button 
                            type="button" 
                            onClick={() => appendMedication({ source: "externe", name: "", dosage: "", duration: "", frequency: "", quantity: "", instructions: "" })}
                            className="w-full h-12 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40 font-bold gap-2"
                          >
                            <Plus className="h-5 w-5" /> Créer une ordonnance
                          </Button>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-4">
                          <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
                          <div>
                            <p className="text-sm font-bold text-orange-900">Vérifications automatiques :</p>
                            <p className="text-xs text-orange-700 mt-1 flex items-center gap-2">
                              • Allergies du patient • Interactions médicamenteuses • Disponibilité en stock
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="labs" className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                               <h4 className="font-bold text-slate-700 flex items-center gap-2"><Beaker className="h-4 w-4 text-primary" /> Examens Internes</h4>
                               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                  <ScrollArea className="h-[300px] pr-4">
                                     <div className="grid grid-cols-1 gap-2">
                                        {availableLabTests.map((test) => (
                                          <div key={test.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white transition-colors">
                                            <Checkbox 
                                              id={`test-${test.id}`}
                                              checked={labTestFields.some(f => f.test_id === test.id)}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  appendLabTest({ name: test.nom_analyse, source: "interne", test_id: test.id });
                                                } else {
                                                  const idx = labTestFields.findIndex(f => f.test_id === test.id);
                                                  if (idx !== -1) removeLabTest(idx);
                                                }
                                              }}
                                            />
                                            <label htmlFor={`test-${test.id}`} className="text-sm font-medium cursor-pointer flex-1">{test.nom_analyse}</label>
                                            <Badge variant="outline" className="text-[10px]">{test.prix} F</Badge>
                                          </div>
                                        ))}
                                     </div>
                                  </ScrollArea>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <h4 className="font-bold text-slate-700 flex items-center gap-2"><ExternalLink className="h-4 w-4 text-indigo-500" /> Examens Externes</h4>
                               <div className="space-y-3">
                                  {labTestFields.filter(f => f.source === "externe").map((field) => {
                                    const actualIndex = labTestFields.findIndex(f => f.id === field.id);
                                    return (
                                      <div key={field.id} className="flex gap-2">
                                        <Input 
                                          value={field.name}
                                          onChange={(e) => {
                                            updateLabTest(actualIndex, { ...field, name: e.target.value });
                                          }}
                                          placeholder="Nom de l'examen externe"
                                          className="h-11 rounded-xl"
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLabTest(actualIndex)} className="text-rose-500 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                                      </div>
                                    );
                                  })}
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => appendLabTest({ name: "", source: "externe" })}
                                    className="w-full h-11 rounded-xl border-dashed gap-2 text-slate-500"
                                  >
                                    <Plus className="h-4 w-4" /> Ajouter un examen externe
                                  </Button>
                               </div>
                            </div>
                         </div>
                      </TabsContent>

                      <TabsContent value="hospitalization" className="space-y-6">
                        <div className="p-8 border-2 border-dashed rounded-3xl text-center space-y-4">
                           <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-indigo-500">
                              <Hospital className="h-8 w-8" />
                           </div>
                           <div>
                              <h4 className="font-bold text-slate-900">Module d'Hospitalisation</h4>
                              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">Configurez les entrées, le choix de la chambre et le protocole de soins initial.</p>
                           </div>
                           <Button variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50">Définir un protocole</Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {step === 12 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
                      <div className="bg-emerald-500 p-3 rounded-xl text-white">
                        <Check className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">Résumé & Clôture</h3>
                        <p className="text-emerald-700 text-sm">Veuillez vérifier les informations avant d'enregistrer.</p>
                      </div>
                    </div>

                    <ScrollArea className="h-[450px] pr-4">
                      <div className="space-y-6">
                         {/* Patient & Motif */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold">
                              <User className="h-4 w-4" />
                              <h4 className="text-sm">Patient & Motif</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Consultation</p>
                                  <p className="text-sm font-bold text-slate-700">{form.watch("category")}</p>
                               </div>
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Symptômes</p>
                                  <p className="text-xs text-slate-700 italic">{form.watch("symptoms") || "Non spécifié"}</p>
                               </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Histoire de la maladie (Anamnèse)</p>
                               <p className="text-xs text-slate-700">{form.watch("anamnesis") || "Non spécifiée"}</p>
                            </div>
                            {form.watch("previous_exams") && (
                              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Bilans Antérieurs</p>
                                <p className="text-xs text-blue-900">{form.watch("previous_exams")}</p>
                              </div>
                            )}
                          </div>

                          {/* Vitals & Physical Exam */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-rose-500 font-bold">
                              <Activity className="h-4 w-4" />
                              <h4 className="text-sm">Examen Physique</h4>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                               {[
                                 { label: "Temp", val: form.watch("vitals.temp"), unit: "°C" },
                                 { label: "TA Sys", val: form.watch("vitals.bp_sys"), unit: "mmHg" },
                                 { label: "TA Dia", val: form.watch("vitals.bp_dia"), unit: "mmHg" },
                                 { label: "Poids", val: form.watch("vitals.weight"), unit: "kg" },
                                 { label: "Pouls", val: form.watch("vitals.pulse"), unit: "bpm" },
                                 { label: "SpO2", val: form.watch("vitals.spo2"), unit: "%" },
                               ].map((v, i) => (
                                 <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{v.label}</p>
                                   <p className="text-sm font-bold text-slate-700">{v.val || "-"}<span className="text-[9px] ml-0.5 font-normal">{v.unit}</span></p>
                                 </div>
                               ))}
                            </div>
                            {form.watch("physical_exam") && (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Examen par système</p>
                                <div className="text-xs text-slate-700 space-y-1 mt-1">
                                  {Object.entries(form.watch("physical_exam"))
                                    .filter(([key, val]) => val && key !== 'detailed')
                                    .map(([key, val]) => (
                                      <div key={key} className="flex gap-1">
                                        <span className="font-semibold capitalize">{key.replace('_', ' ')}:</span>
                                        <span>{val as string}</span>
                                      </div>
                                    ))}
                                  {form.watch("physical_exam.detailed") && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                      <span className="font-semibold">Détails:</span>
                                      <p className="mt-0.5">{form.watch("physical_exam.detailed")}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                         {/* History & Prevention */}
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-indigo-500 font-bold">
                             <History className="h-4 w-4" />
                             <h4 className="text-sm">Antécédents & Prévention</h4>
                           </div>
                           <div className="space-y-2">
                             {(form.watch("history_medical").length > 0 || form.watch("history_surgical").length > 0) && (
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                                 <span className="font-bold not-italic text-slate-500">Antécédents: </span>
                                 {[...form.watch("history_medical"), ...form.watch("history_surgical")].join(", ")}
                               </div>
                             )}
                             {(form.watch("current_treatments").length > 0) && (
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                                 <span className="font-bold not-italic text-slate-500">Traitements actuels: </span>
                                 {form.watch("current_treatments").map(t => `${t.name} (${t.dosage})`).join(", ")}
                               </div>
                             )}
                             {(form.watch("allergies").length > 0) && (
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                                 <span className="font-bold not-italic text-slate-500">Allergies: </span>
                                 {form.watch("allergies").join(", ")}
                               </div>
                             )}
                             {form.watch("vaccinations").length > 0 && (
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                                 <span className="font-bold not-italic text-slate-500">Vaccinations: </span>
                                 {form.watch("vaccinations").map(v => v.vaccine).join(", ")}
                               </div>
                             )}
                           </div>
                         </div>

                         {/* Diagnosis */}
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-amber-500 font-bold">
                             <Stethoscope className="h-4 w-4" />
                             <h4 className="text-sm">Diagnostic</h4>
                           </div>
                           <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                             <div className="flex justify-between items-start mb-2">
                               <p className="text-sm font-bold text-amber-900">{form.watch("diagnosis") || "Diagnostic non renseigné"}</p>
                               <Badge variant="outline" className="bg-white capitalize">{form.watch("diagnosis_status")}</Badge>
                             </div>
                             {form.watch("secondary_diagnosis") && (
                               <p className="text-xs text-amber-700 mt-1"><span className="font-bold">Secondaire:</span> {form.watch("secondary_diagnosis")}</p>
                             )}
                           </div>
                         </div>

                         {/* Plan de Traitement */}
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-emerald-500 font-bold">
                             <Pill className="h-4 w-4" />
                             <h4 className="text-sm">Plan de Traitement</h4>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Médicaments</p>
                               {form.watch("medications").length > 0 ? (
                                 <ul className="space-y-1">
                                   {(form.watch("medications") as any[]).map((m, i) => (
                                      <li key={i} className="text-xs text-slate-700 flex flex-col border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                                         <div className="flex items-center justify-between">
                                           <span className="font-bold">{m.name}</span>
                                           <Badge variant="outline" className="text-[8px] h-4">{m.source}</Badge>
                                         </div>
                                         <span className="text-slate-500 text-[10px]">{m.dosage} • Qté: {m.quantity} • {m.duration}</span>
                                      </li>
                                    ))}
                                 </ul>
                               ) : <p className="text-xs text-slate-500 italic">Aucune prescription</p>}
                             </div>
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Examens Labo</p>
                               {form.watch("lab_tests").length > 0 ? (
                                 <div className="flex flex-wrap gap-1">
                                   {(form.watch("lab_tests") as any[]).map((t, i) => (
                                      <Badge key={i} variant="secondary" className="text-[9px] h-5 flex items-center gap-1">
                                        {t?.name || "Sans nom"}
                                        <span className="text-[7px] opacity-60">({t?.source || "???"})</span>
                                      </Badge>
                                    ))}
                                 </div>
                               ) : <p className="text-xs text-slate-500 italic">Aucun examen demandé</p>}
                             </div>
                           </div>
                         </div>
                      </div>
                    </ScrollArea>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="follow_up_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700 text-sm">Date de retour souhaitée</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type="datetime-local" className="h-12 rounded-xl" {...field} />
                                <Calendar className="absolute right-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="follow_up_reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700 text-sm">Motif du suivi</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Pourquoi le patient doit-il revenir ?" className="min-h-[100px] rounded-xl resize-none" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50/80 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (step === 1) {
                      setOpen(false);
                      setActiveConsultationId(null);
                      setLastSaved(null);
                    } else {
                      prevStep();
                    }
                  }}
                  className="h-12 px-6 rounded-xl font-bold text-slate-600"
                >
                  {step === 1 ? "Annuler" : <><ArrowLeft className="h-4 w-4 mr-2" /> Précédent</>}
                </Button>
                {lastSaved && (
                  <span className="text-[10px] text-slate-400 font-medium italic">
                    Sauvegardé à {format(lastSaved, "HH:mm")}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveDraft}
                    className="h-12 px-6 rounded-xl font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    Sauvegarder Brouillon
                  </Button>
                )}
                {step < 11 ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    Suivant <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="h-12 px-8 rounded-xl font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 text-white"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Clôturer la Consultation
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
