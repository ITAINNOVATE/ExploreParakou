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
import { Plus, Loader2, Search, Check, ChevronsUpDown, Camera } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  patient_id: z.string().min(1, "Le patient est requis"),
  modality: z.string().min(1, "La modalité est requise"),
});

const modalities = [
  "Radiographie standard",
  "Échographie abdominale",
  "Échographie pelvienne",
  "Scanner (TDM)",
  "IRM",
  "Mammographie",
  "Panoramique dentaire",
  "Électrocardiogramme (ECG)"
];

export function CreateImagingRequestModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      modality: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchPatients();
    }
  }, [open]);

  async function fetchPatients() {
    const { data } = await supabase.from("patients").select("id, first_name, last_name");
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

      if (!profile?.clinic_id) {
        toast.error("Erreur: Profil clinique introuvable.");
        return;
      }

      const { error } = await supabase
        .from("imaging_requests")
        .insert([{ 
          ...values, 
          clinic_id: profile.clinic_id,
          doctor_id: user?.id,
          status: 'pending'
        }]);

      if (error) throw error;

      toast.success("Demande d'imagerie envoyée au service.");
      setOpen(false);
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
        <Button className="gap-2 shadow-lg shadow-blue-200 bg-blue-600 hover:bg-blue-700 text-white">
          <Camera className="h-4 w-4" />
          Nouvel Examen
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Prescription d'Imagerie</DialogTitle>
          <DialogDescription>
            Demandez un examen radiologique ou une échographie pour un patient.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={patientSearchOpen}
                        className="w-full justify-between"
                      >
                        {field.value
                          ? `${patients.find((p) => p.id === field.value)?.first_name} ${patients.find((p) => p.id === field.value)?.last_name}`
                          : "Sélectionner un patient..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    } />
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Rechercher patient..." />
                        <CommandList>
                          <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
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
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === patient.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
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
              name="modality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Examen / Modalité</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir l'examen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modalities.map((mod) => (
                        <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Envoyer au service
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
