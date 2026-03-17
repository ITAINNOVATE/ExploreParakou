"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase";
import { 
  UserPlus, 
  Loader2, 
  Upload,
  User,
  Phone,
  ShieldAlert,
  Paperclip,
  Activity,
  Heart,
  CreditCard,
  MapPin,
  Briefcase,
  Building2
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

const contactSchema = z.object({
  last_name: z.string().min(1, "Requis"),
  first_name: z.string().min(1, "Requis"),
  relation: z.string().min(1, "Requis"),
  phone: z.string().min(1, "Requis"),
  neighborhood: z.string(),
  profession: z.string(),
});

const formSchema = z.object({
  first_name: z.string().min(2, "Le prénom est requis"),
  last_name: z.string().min(2, "Le nom est requis"),
  gender: z.enum(["M", "F", "Autre"]),
  dob: z.string().min(1, "La date de naissance est requise"),
  place_of_birth: z.string(),
  nationality: z.string(),
  phone: z.string(),
  address: z.string(),
  profession: z.string(),
  marital_status: z.string(),
  health_coverage: z.string(),
  blood_group: z.string(),
  vaccination_status: z.string(),
  allergies: z.string(),
  chronic_diseases: z.string(),
  medical_history: z.string(),
  regular_meds: z.boolean(),
  medications_list: z.string(),
  initial_service: z.string(),
  status: z.string(),
  notes: z.string(),
  
  // New Sections
  companion: contactSchema,
  emergency_contact_option: z.enum(["same", "other"]),
  emergency_contact: contactSchema,

  // Vitals
  temperature: z.string().optional(),
  sys_bp_right: z.string().optional(),
  dia_bp_right: z.string().optional(),
  sys_bp_left: z.string().optional(),
  dia_bp_left: z.string().optional(),
  heart_rate: z.string().optional(),
  resp_rate: z.string().optional(),
  spo2: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const supabase = createClient();

export function CreatePatientModal({ 
  onPatientCreated, 
  patient,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: { 
  onPatientCreated: () => void,
  patient?: any,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;
  
  const [loading, setLoading] = useState(false);
  const isEditing = !!patient;


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: patient ? {
      ...patient,
      companion: patient.companion_details || { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
      emergency_contact: patient.emergency_contact_details || { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
      emergency_contact_option: "other"
    } : {
      first_name: "",
      last_name: "",
      gender: "M",
      dob: "",
      place_of_birth: "",
      nationality: "Béninoise",
      phone: "",
      address: "",
      profession: "",
      marital_status: "Célibataire",
      health_coverage: "Aucun",
      blood_group: "Inconnu",
      vaccination_status: "Inconnu",
      allergies: "",
      chronic_diseases: "",
      medical_history: "",
      regular_meds: false,
      medications_list: "",
      initial_service: "Médecine générale",
      status: "Nouveau",
      notes: "",
      companion: { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
      emergency_contact_option: "other",
      emergency_contact: { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
      temperature: "",
      sys_bp_right: "",
      dia_bp_right: "",
      sys_bp_left: "",
      dia_bp_left: "",
      heart_rate: "",
      resp_rate: "",
      spo2: "",
      weight: "",
      height: "",
    },
});

  useEffect(() => {
    if (patient) {
      form.reset({
        ...patient,
        companion: patient.companion_details || { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
        emergency_contact: patient.emergency_contact_details || { last_name: "", first_name: "", relation: "Parent", phone: "", neighborhood: "", profession: "" },
      });
    }
  }, [patient, form]);

  const ecOption = form.watch("emergency_contact_option");
  const companion = form.watch("companion");

  useEffect(() => {
    if (ecOption === "same") {
      form.setValue("emergency_contact", { ...companion });
    }
  }, [ecOption, companion, form]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', user?.id).single();

      let patientData;
      
      if (isEditing) {
        const { data, error: updateError } = await supabase
          .from("patients")
          .update({
            first_name: values.first_name,
            last_name: values.last_name,
            gender: values.gender,
            dob: values.dob,
            phone: values.phone,
            address: values.address,
            place_of_birth: values.place_of_birth,
            nationality: values.nationality,
            profession: values.profession,
            marital_status: values.marital_status,
            health_coverage: values.health_coverage,
            medical_history: values.medical_history,
            allergies: values.allergies,
            chronic_diseases: values.chronic_diseases,
            blood_group: values.blood_group,
            status: values.status,
            companion_details: values.companion,
            emergency_contact_details: values.emergency_contact,
            initial_service: values.initial_service,
          })
          .eq('id', patient.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        patientData = data;
      } else {
        const { data, error: insertError } = await supabase
          .from("patients")
          .insert([{
            clinic_id: profile?.clinic_id,
            first_name: values.first_name,
            last_name: values.last_name,
            gender: values.gender,
            dob: values.dob,
            phone: values.phone,
            address: values.address,
            place_of_birth: values.place_of_birth,
            nationality: values.nationality,
            profession: values.profession,
            marital_status: values.marital_status,
            health_coverage: values.health_coverage,
            medical_history: values.medical_history,
            allergies: values.allergies,
            chronic_diseases: values.chronic_diseases,
            blood_group: values.blood_group,
            status: values.status,
            companion_details: values.companion,
            emergency_contact_details: values.emergency_contact,
            initial_service: values.initial_service,
          }])
          .select()
          .single();
        
        if (insertError) throw insertError;
        patientData = data;
      }

      if (patientData) {
        const { temperature, sys_bp_right, dia_bp_right, sys_bp_left, dia_bp_left, heart_rate, resp_rate, spo2, weight, height } = values;
        if (temperature || sys_bp_right || dia_bp_right || sys_bp_left || dia_bp_left || heart_rate || resp_rate || spo2 || weight || height) {
          
          let bmiValue = null;
          if (weight && height) {
            const w = parseFloat(weight);
            const h = parseFloat(height) / 100;
            if (h > 0) bmiValue = parseFloat((w / (h * h)).toFixed(2));
          }

          const { error: vitalsError } = await supabase
            .from("patient_vitals")
            .insert([{
              patient_id: patientData.id,
              clinic_id: profile?.clinic_id,
              temperature: temperature ? parseFloat(temperature) : null,
              sys_bp_right: sys_bp_right ? parseInt(sys_bp_right) : null,
              dia_bp_right: dia_bp_right ? parseInt(dia_bp_right) : null,
              sys_bp_left: sys_bp_left ? parseInt(sys_bp_left) : null,
              dia_bp_left: dia_bp_left ? parseInt(dia_bp_left) : null,
              heart_rate: heart_rate ? parseInt(heart_rate) : null,
              resp_rate: resp_rate ? parseInt(resp_rate) : null,
              spo2: spo2 ? parseInt(spo2) : null,
              weight: weight ? parseFloat(weight) : null,
              height: height ? parseFloat(height) : null,
              bmi: bmiValue
            }]);
          if (vitalsError) throw vitalsError;
        }
      }

      toast.success(isEditing ? "Dossier mis à jour." : "Patient enregistré avec succès.");
      setOpen(false);
      form.reset();
      onPatientCreated();
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement: " + error.message);
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
      { !isEditing && (
        <DialogTrigger render={
          <Button className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
            <UserPlus className="h-4 w-4" />
            Nouveau Patient
          </Button>
        } />
      )}
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
               <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isEditing ? `Modifier : ${patient.first_name} ${patient.last_name}` : "Dossier d'Admissibilité"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Mettez à jour les informations du patient." : "Enregistrez les informations complètes du nouveau patient."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="identity" className="w-full flex flex-col gap-4">
                <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1">
                  <TabsTrigger value="identity" className="gap-2 py-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Identité</span>
                  </TabsTrigger>
                  <TabsTrigger value="companion" className="gap-2 py-2">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Accompagnement</span>
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="gap-2 py-2">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Médical</span>
                  </TabsTrigger>
                  <TabsTrigger value="vitals" className="gap-2 py-2">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Signes Vitaux</span>
                  </TabsTrigger>
                  <TabsTrigger value="orientation" className="gap-2 py-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Orientation</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="w-full overflow-x-hidden space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Nom de famille *</FormLabel>
                        <FormControl><Input placeholder="Nom" className="h-11 bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Prénoms *</FormLabel>
                        <FormControl><Input placeholder="Prénoms" className="h-11 bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600">
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexe *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Féminin</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dob" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance *</FormLabel>
                        <FormControl><Input type="date" className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Phone className="h-3 w-3" /> Téléphone</FormLabel>
                        <FormControl><Input placeholder="+229 00 00 00 00" className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nationality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationalité</FormLabel>
                        <FormControl><Input className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Adresse de résidence (Quartier)</FormLabel>
                      <FormControl><Input placeholder="Cotonou, Fidjrossé..." className="h-11 bg-white" {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="profession" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> Profession</FormLabel>
                        <FormControl><Input className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="marital_status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situation matrimoniale</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Célibataire">Célibataire</SelectItem>
                            <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                            <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                            <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>

                <TabsContent value="companion" className="w-full overflow-x-hidden space-y-8">
                  <div className="space-y-4">
                    <Badge variant="secondary" className="px-3 py-1 bg-slate-200 text-slate-700">Accompagnant (Facultatif)</Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="companion.last_name" render={({ field }) => (
                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="companion.first_name" render={({ field }) => (
                        <FormItem><FormLabel>Prénoms</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="companion.relation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filiation</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                             <SelectContent>
                               <SelectItem value="Père">Père</SelectItem>
                               <SelectItem value="Mère">Mère</SelectItem>
                               <SelectItem value="Conjoint(e)">Conjoint(e)</SelectItem>
                               <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
                               <SelectItem value="Parent">Parent</SelectItem>
                               <SelectItem value="Ami(e)">Ami(e)</SelectItem>
                               <SelectItem value="Autre">Autre</SelectItem>
                             </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="companion.phone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input className="h-11 bg-white" placeholder="+229 ..." {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="companion.neighborhood" render={({ field }) => (
                        <FormItem><FormLabel>Quartier</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="companion.profession" render={({ field }) => (
                        <FormItem><FormLabel>Profession</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="px-3 py-1 bg-slate-200 text-slate-700">Personne à prévenir (Facultatif)</Badge>
                      <FormField control={form.control} name="emergency_contact_option" render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                             <RadioGroupItem value="same" id="same" /><label htmlFor="same" className="text-sm cursor-pointer">Identique à l'accompagnant</label>
                          </div>
                          <div className="flex items-center space-x-2">
                             <RadioGroupItem value="other" id="other" /><label htmlFor="other" className="text-sm cursor-pointer">Autre</label>
                          </div>
                        </RadioGroup>
                      )} />
                    </div>

                    {ecOption === "other" && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="emergency_contact.last_name" render={({ field }) => (
                            <FormItem><FormLabel>Nom</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="emergency_contact.first_name" render={({ field }) => (
                            <FormItem><FormLabel>Prénoms</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField control={form.control} name="emergency_contact.relation" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filiation</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Père">Père</SelectItem>
                                  <SelectItem value="Mère">Mère</SelectItem>
                                  <SelectItem value="Conjoint(e)">Conjoint(e)</SelectItem>
                                  <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
                                  <SelectItem value="Parent">Parent</SelectItem>
                                  <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="emergency_contact.phone" render={({ field }) => (
                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input className="h-11 bg-white" placeholder="+229 ..." {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="emergency_contact.neighborhood" render={({ field }) => (
                            <FormItem><FormLabel>Quartier</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="emergency_contact.profession" render={({ field }) => (
                            <FormItem><FormLabel>Profession</FormLabel><FormControl><Input className="h-11 bg-white" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-6 border-t font-medium">
                     <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">Fichiers joints (Facultatif)</span>
                     </div>
                     <Button type="button" variant="outline" className="gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10">
                        <Upload className="h-4 w-4" /> Télécharger des fichiers
                     </Button>
                  </div>
                </TabsContent>

                <TabsContent value="medical" className="w-full overflow-x-hidden space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="blood_group" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Groupe Sanguin</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="health_coverage" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> Assurance / Prise en charge</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Aucun">Aucun</SelectItem>
                                <SelectItem value="CNSS">CNSS</SelectItem>
                                <SelectItem value="AMU">AMU</SelectItem>
                                <SelectItem value="Privée">Privée</SelectItem>
                            </SelectContent>
                         </Select>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="allergies" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-rose-600"><ShieldAlert className="h-3 w-3" /> Allergies connues</FormLabel>
                      <FormControl><Input placeholder="Pénicilline, Aliments..." className="h-11 bg-white border-rose-100 focus-visible:ring-rose-200" {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="medical_history" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antécédents médicaux majeurs</FormLabel>
                      <FormControl><Textarea className="resize-none min-h-[100px] bg-white" placeholder="Chirurgies, hospitalisations antérieures..." {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <FormField control={form.control} name="regular_meds" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">Le patient suit-il un traitement régulier ?</FormLabel>
                        </div>
                      </FormItem>
                    )} />
                    {form.watch("regular_meds") && (
                      <FormField control={form.control} name="medications_list" render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormControl><Input placeholder="Précisez les médicaments..." className="bg-white" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="vitals" className="w-full overflow-x-hidden space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                         <Activity className="h-4 w-4" /> Signes de base
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="temperature" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Temp (°C)</FormLabel>
                              <FormControl><Input type="number" step="0.1" className="bg-white h-11 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="spo2" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">SpO2 (%)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="heart_rate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Pouls (bpm)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="resp_rate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase font-bold text-slate-500">Resp (cpm)</FormLabel>
                              <FormControl><Input type="number" className="bg-white h-11 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                      </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                         <Activity className="h-4 w-4" /> Tension Artérielle
                      </h4>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Bras Droit</p>
                        <div className="grid grid-cols-2 gap-2">
                           <FormField control={form.control} name="sys_bp_right" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Syst" className="h-9 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="dia_bp_right" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Diast" className="h-9 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Bras Gauche</p>
                        <div className="grid grid-cols-2 gap-2">
                           <FormField control={form.control} name="sys_bp_left" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Syst" className="h-9 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="dia_bp_left" render={({ field }) => (
                            <FormItem>
                              <FormControl><Input type="number" placeholder="Diast" className="h-9 text-center" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poids (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.1" className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="height" render={({ field }) => (
                       <FormItem>
                        <FormLabel>Taille (cm)</FormLabel>
                        <FormControl><Input type="number" className="h-11 bg-white" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="flex flex-col justify-end">
                       <FormLabel className="mb-2">IMC & Interprétation</FormLabel>
                       <BMIResult 
                         weight={form.watch("weight") || ""} 
                         height={form.watch("height") || ""} 
                       />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="orientation" className="w-full overflow-x-hidden space-y-6">
                   <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">Orientation du Patient</h4>
                          <p className="text-xs text-slate-500">Choisissez le service et la priorité pour ce patient</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <FormField control={form.control} name="initial_service" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-semibold">Service d'accueil / Orientation</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="h-12 bg-white border-primary/20 focus:ring-primary/30"><SelectValue /></SelectTrigger></FormControl>
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
                            <FormLabel className="text-slate-700 font-semibold">Priorité / Type de passage</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="h-12 bg-white border-primary/20 focus:ring-primary/30"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Nouveau">Normal (Consultation)</SelectItem>
                                <SelectItem value="Urgence">URGENCE VITALE</SelectItem>
                                <SelectItem value="Stable">Contrôle / Suivi</SelectItem>
                                <SelectItem value="Examen">Examen Simple (Labo/Radio)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                          L'orientation vers un service déterminera la visibilité du patient dans les listes d'attente spécifiques de chaque département.
                        </p>
                      </div>
                   </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t font-medium bg-slate-50/80 backdrop-blur-sm">
              <Button type="button" variant="ghost" className="px-6 h-11" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="px-10 h-11 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white font-bold">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditing ? "Mettre à jour le dossier" : "Créer Dossier Patient"}
              </Button>
            </div>
          </form>
        </Form>
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
    interpretation = "Insuffisance pondérale";
    colorClass = "bg-amber-100 text-amber-700 border-amber-200";
  } else if (bmi >= 18.5 && bmi < 25) {
    interpretation = "Poids normal";
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
