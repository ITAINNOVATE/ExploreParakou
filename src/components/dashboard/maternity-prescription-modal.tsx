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
import { FileText, Loader2, CheckCircle, Search, Pill, TestTube, Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const medicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string(),
  duration: z.string(),
});

const labSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const formSchema = z.object({
  pregnancy_id: z.string().min(1, "Dossier requis"),
  type: z.enum(["medication", "laboratory", "hospitalization"]),
  medications: z.array(medicationSchema),
  lab_tests: z.array(labSchema),
  hospitalization_details: z.object({
    reason: z.string(),
    expected_duration: z.string(),
    urgency: z.enum(["normal", "urgent"]),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function MaternityPrescriptionModal({ onCreated, pregnancies }: { onCreated: () => void, pregnancies: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [medSearchOpen, setMedSearchOpen] = useState(false);
  const [labSearchOpen, setLabSearchOpen] = useState(false);
  
  const supabase = createClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pregnancy_id: "",
      type: "medication",
      medications: [],
      lab_tests: [],
      hospitalization_details: {
        reason: "",
        expected_duration: "",
        urgency: "normal",
      },
    },
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  async function fetchData() {
    const [medsRes, labsRes] = await Promise.all([
      supabase.from("medicines").select("id, name, dosage"),
      supabase.from("lab_tests").select("id, nom_analyse"),
    ]);
    if (medsRes.data) setMedicines(medsRes.data);
    if (labsRes.data) setLabTests(labsRes.data);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      let details = {};
      if (values.type === "medication") details = { medications: values.medications };
      if (values.type === "laboratory") details = { lab_tests: values.lab_tests };
      if (values.type === "hospitalization") details = values.hospitalization_details || {};

      const { error } = await supabase
        .from("maternity_prescriptions")
        .insert([{ 
          pregnancy_id: values.pregnancy_id,
          type: values.type,
          details,
          clinic_id: profile?.clinic_id,
          created_by: user?.id
        }]);

      if (error) throw error;

      setSuccess(true);
      form.reset();
      onCreated();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const addMedication = (med: any) => {
    const current = form.getValues("medications") || [];
    form.setValue("medications", [...current, { id: med.id, name: med.name, dosage: "", duration: "" }]);
    setMedSearchOpen(false);
  };

  const removeMedication = (index: number) => {
    const current = form.getValues("medications") || [];
    form.setValue("medications", current.filter((_, i) => i !== index));
  };

  const addLabTest = (test: any) => {
    const current = form.getValues("lab_tests") || [];
    form.setValue("lab_tests", [...current, { id: test.id, name: test.nom_analyse }]);
    setLabSearchOpen(false);
  };

  const removeLabTest = (index: number) => {
    const current = form.getValues("lab_tests") || [];
    form.setValue("lab_tests", current.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2 shadow-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold">
          <Plus className="h-4 w-4" />
          <span>Prescription</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <FileText className="h-5 w-5" />
            Prescription & Demandes
          </DialogTitle>
          <DialogDescription>
            Émettez des ordonnances ou des demandes d'hospitalisation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {success ? (
            <div className="py-10 flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 animate-in zoom-in duration-300">
                <CheckCircle className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Prescription enregistrée !</h3>
              <Button onClick={() => { setOpen(false); setSuccess(false); }} className="px-8 bg-purple-600">Fermer</Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="pregnancy_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dossier Patiente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir la patiente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pregnancies.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.patients?.first_name} {p.patients?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs defaultValue="medication" onValueChange={(v) => form.setValue("type", v as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="medication" className="gap-2"><Pill className="h-4 w-4" /> Meds</TabsTrigger>
                  <TabsTrigger value="laboratory" className="gap-2"><TestTube className="h-4 w-4" /> Labo</TabsTrigger>
                  <TabsTrigger value="hospitalization" className="gap-2"><Building2 className="h-4 w-4" /> Hosp.</TabsTrigger>
                </TabsList>

                <TabsContent value="medication" className="space-y-4 mt-4">
                   <div className="flex flex-col gap-3">
                      <Popover open={medSearchOpen} onOpenChange={setMedSearchOpen}>
                        <PopoverTrigger render={
                          <Button variant="outline" className="w-full justify-start text-muted-foreground gap-2">
                            <Search className="h-4 w-4" /> Chercher un médicament...
                          </Button>
                        } />
                        <PopoverContent className="w-[500px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Nom du médicament..." />
                            <CommandList>
                              <CommandEmpty>Aucun résultat.</CommandEmpty>
                              <CommandGroup>
                                {medicines.map((m) => (
                                  <CommandItem key={m.id} onSelect={() => addMedication(m)}>
                                    {m.name} {m.dosage && `(${m.dosage})`}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {form.watch("medications")?.map((med, index) => (
                          <div key={index} className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                             <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700 mb-1">{med.name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                   <Input placeholder="Posologie" className="h-8 text-xs" {...form.register(`medications.${index}.dosage`)} />
                                   <Input placeholder="Durée" className="h-8 text-xs" {...form.register(`medications.${index}.duration`)} />
                                </div>
                             </div>
                             <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeMedication(index)}>
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                        ))}
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="laboratory" className="space-y-4 mt-4">
                  <div className="flex flex-col gap-3">
                      <Popover open={labSearchOpen} onOpenChange={setLabSearchOpen}>
                        <PopoverTrigger render={
                          <Button variant="outline" className="w-full justify-start text-muted-foreground gap-2">
                            <Search className="h-4 w-4" /> Chercher une analyse...
                          </Button>
                        } />
                        <PopoverContent className="w-[500px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Nom de l'analyse..." />
                            <CommandList>
                              <CommandEmpty>Aucun résultat.</CommandEmpty>
                              <CommandGroup>
                                {labTests.map((t) => (
                                  <CommandItem key={t.id} onSelect={() => addLabTest(t)}>
                                    {t.nom_analyse}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="flex flex-wrap gap-2">
                        {form.watch("lab_tests")?.map((test, index) => (
                          <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs font-medium">
                             {test.name}
                             <Trash2 className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => removeLabTest(index)} />
                          </div>
                        ))}
                      </div>
                  </div>
                </TabsContent>

                <TabsContent value="hospitalization" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="hospitalization_details.reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motif d'hospitalisation</FormLabel>
                        <FormControl><Textarea placeholder="Contractions, menace d'accouchement prématuré..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hospitalization_details.urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgence</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normale</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hospitalization_details.expected_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée estimée</FormLabel>
                          <FormControl><Input placeholder="ex: 48h" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading} className="purple-600 bg-purple-600 hover:bg-purple-700 text-white font-bold px-8">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Valider la prescription
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
