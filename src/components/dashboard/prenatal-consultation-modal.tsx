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
import { Stethoscope, Loader2, CheckCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  pregnancy_id: z.string().min(1, "Le dossier de grossesse est requis"),
  vitals: z.object({
    weight: z.string().optional(),
    bp: z.string().optional(),
    temp: z.string().optional(),
    heart_rate: z.string().optional(),
    fetal_heart_rate: z.string().optional(),
  }),
  clinical_exam: z.string().min(1, "L'examen clinique est requis"),
  observation: z.string().optional(),
});

export function PrenatalConsultationModal({ onCreated, pregnancies }: { onCreated: () => void, pregnancies: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pregnancy_id: "",
      vitals: {
        weight: "",
        bp: "",
        temp: "",
        heart_rate: "",
        fetal_heart_rate: "",
      },
      clinical_exam: "",
      observation: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from("prenatal_consultations")
        .insert([{ 
          ...values, 
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
          <Stethoscope className="h-4 w-4" />
          <span>Nouvelle CPN</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Activity className="h-5 w-5" />
            Consultation Prénatale (CPN)
          </DialogTitle>
          <DialogDescription>
            Enregistrez les constantes et l'examen clinique de la patiente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {success ? (
            <div className="py-10 flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-in zoom-in duration-300">
                <CheckCircle className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Consultation enregistrée !</h3>
              <Button onClick={() => { setOpen(false); setSuccess(false); }} className="px-8 bg-indigo-600">Fermer</Button>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vitals.weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids (kg)</FormLabel>
                      <FormControl><Input placeholder="65" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vitals.bp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tension Artérielle</FormLabel>
                      <FormControl><Input placeholder="120/80" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vitals.temp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Température (°C)</FormLabel>
                      <FormControl><Input placeholder="37" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vitals.fetal_heart_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bruit Cœur Fœtal (BCF)</FormLabel>
                      <FormControl><Input placeholder="140" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clinical_exam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examen Clinique</FormLabel>
                    <FormControl><Textarea placeholder="Hauteur utérine, présentation..." className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations</FormLabel>
                    <FormControl><Textarea placeholder="Notes complémentaires..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading} className="indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer CPN
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
