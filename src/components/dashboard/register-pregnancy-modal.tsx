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
import { Plus, Loader2, Check, ChevronsUpDown, UserPlus, Heart, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";

const formSchema = z.object({
  patient_id: z.string().min(1, "La patiente est requise"),
  lmp_date: z.string().min(1, "La date des dernières règles est requise"),
  gestational_age: z.string().optional(),
});

export function RegisterPregnancyModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ patientName: string, edd: string } | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      lmp_date: "",
      gestational_age: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [open]);

  async function fetchPatients() {
    // Only females
    const { data } = await supabase.from("patients").select("id, first_name, last_name").eq('gender', 'F');
    if (data) setPatients(data);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      // Simple EDD calculation (Naegele's rule: LMP + 280 days)
      const lmp = new Date(values.lmp_date);
      const edd = addDays(lmp, 280);

      const { error } = await supabase
        .from("pregnancies")
        .insert([{ 
          ...values, 
          clinic_id: profile?.clinic_id,
          edd: format(edd, 'yyyy-MM-dd')
        }]);

      if (error) throw error;

      const patient = patients.find(p => p.id === values.patient_id);
      setSuccessData({ 
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Patiente",
        edd: format(edd, 'dd MMMM yyyy', { locale: fr })
      });
      form.reset();
      onCreated();
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
      <DialogTrigger render={
        <Button className="gap-2 shadow-sm bg-pink-600 hover:bg-pink-700 text-white">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle Grossesse</span>
          <span className="sm:hidden">Grossesse</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Suivi de Grossesse
          </DialogTitle>
          <DialogDescription>
            Enregistrez une nouvelle grossesse pour une patiente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {successData ? (
            <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Dossier Ouvert !</h3>
                <p className="text-sm text-slate-500">
                  Le suivi de grossesse de <strong>{successData.patientName}</strong> est activé.
                </p>
              </div>

              <div className="p-5 bg-pink-50/50 rounded-2xl border border-pink-100 flex flex-col items-center gap-2">
                 <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Date Prévue d'Accouchement (DPA)</span>
                 <span className="text-2xl font-black text-pink-700">{successData.edd}</span>
                 <p className="text-[10px] text-pink-500 italic mt-1 text-center">Basé sur la règle de Naegele (DDR + 280 jours)</p>
              </div>

              <div className="flex justify-center pt-2">
                <Button 
                  className="bg-slate-900 hover:bg-slate-800 px-12 h-12 rounded-xl font-bold" 
                  onClick={() => {
                    setOpen(false);
                    setTimeout(() => setSuccessData(null), 300);
                  }}
                >
                  Terminer
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Patiente</FormLabel>
                    <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                      <PopoverTrigger render={
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          {field.value
                            ? `${patients.find((p) => p.id === field.value)?.first_name} ${patients.find((p) => p.id === field.value)?.last_name}`
                            : "Sélectionner une patiente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      } />
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher..." />
                          <CommandList>
                            <CommandEmpty>Aucune patiente trouvée.</CommandEmpty>
                            <CommandGroup>
                              {patients.map((patient) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.first_name} ${patient.last_name}`}
                                  onSelect={() => {
                                    form.setValue("patient_id", patient.id);
                                    setPatientSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === patient.id ? "opacity-100" : "opacity-0")} />
                                  {patient.first_name} {patient.last_name}
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

              <FormField
                control={form.control}
                name="lmp_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Dernières Règles (DDR)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gestational_age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Âge Gestationnel Actuel (ex: 12 SA)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: 14 Semaines" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading} className="gap-2 bg-pink-600 hover:bg-pink-700 text-white">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ouvrir Dossier
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
