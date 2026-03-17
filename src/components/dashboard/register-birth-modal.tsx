"use client";

import { useState } from "react";
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
import { Baby, Loader2, CheckCircle } from "lucide-react";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  pregnancy_id: z.string().min(1, "Le dossier de grossesse est requis"),
  delivery_date: z.string().min(1, "La date d'accouchement est requise"),
  type: z.string().min(1, "Le type d'accouchement est requis"),
  baby_weight: z.string().refine((val) => !isNaN(parseFloat(val)), "Poids invalide"),
  baby_height: z.string().refine((val) => !isNaN(parseFloat(val)), "Taille invalide"),
  baby_gender: z.enum(["M", "F"]),
  apgar_score: z.string().refine((val) => !isNaN(parseInt(val)), "Score Apgar invalide").optional(),
  complications: z.string().optional(),
});

export function RegisterBirthModal({ onCreated, pregnancies }: { onCreated: () => void, pregnancies: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ motherName: string, gender: string, weight: string, height: string, apgar: string, date: string } | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pregnancy_id: "",
      delivery_date: "",
      type: "Vaginal",
      baby_weight: "3.5",
      baby_height: "50",
      baby_gender: "M",
      apgar_score: "9",
      complications: "",
    },
  });

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();
        
      if (!profile?.clinic_id) {
        toast.error("Erreur: Profil clinique ou clinic_id introuvable.");
        return;
      }

      const { error } = await supabase
        .from("births")
        .insert([{ 
          ...values, 
          baby_weight: parseFloat(values.baby_weight),
          baby_height: parseFloat(values.baby_height),
          apgar_score: values.apgar_score ? parseInt(values.apgar_score) : null,
          clinic_id: profile.clinic_id 
        }]);

      if (error) throw error;

      // Update pregnancy status to completed
      await supabase
        .from("pregnancies")
        .update({ status: 'completed' })
        .eq('id', values.pregnancy_id);

      const pregnancy = pregnancies.find(p => p.id === values.pregnancy_id);
      setSuccessData({
        motherName: pregnancy ? `${pregnancy.patients?.first_name} ${pregnancy.patients?.last_name}` : "Maman",
        gender: values.baby_gender === "M" ? "Garçon" : "Fille",
        weight: values.baby_weight,
        height: values.baby_height,
        apgar: values.apgar_score,
        date: format(new Date(values.delivery_date), "dd MMMM yyyy à HH:mm", { locale: fr })
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
        <Button className="gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
          <Baby className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle Naissance</span>
          <span className="sm:hidden">Naissance</span>
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <Baby className="h-5 w-5" />
            Registre des Naissances
          </DialogTitle>
          <DialogDescription>
            Enregistrez les détails de l'accouchement et du nouveau-né.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {successData ? (
             <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Baby className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Naissance enregistrée !</h3>
                <p className="text-sm text-slate-500">
                  Le nouveau-né de <strong>{successData.motherName}</strong> a été ajouté au registre.
                </p>
              </div>

              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 grid grid-cols-2 gap-4">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Sexe</span>
                    <span className="text-lg font-black text-blue-700">{successData.gender}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Poids / Taille</span>
                    <span className="text-lg font-black text-blue-700">{successData.weight}kg / {successData.height}cm</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Score Apgar</span>
                    <span className="text-lg font-black text-blue-700">{successData.apgar || "-"}</span>
                 </div>
                 <div className="col-span-2 flex flex-col pt-2 border-t border-blue-100">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Date & Heure</span>
                    <span className="text-sm font-bold text-slate-700">{successData.date}</span>
                 </div>
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
                name="pregnancy_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dossier Patiente</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir le dossier" />
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
                  name="delivery_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Heure</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'Accouch.</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Vaginal">Voie Basse</SelectItem>
                          <SelectItem value="Cesarean">Césarienne</SelectItem>
                          <SelectItem value="Forceps">Forceps / Ventouse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="baby_gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexe du Bébé</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="baby_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baby_height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taille (cm)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apgar_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score Apgar</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="complications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations / Complications</FormLabel>
                    <FormControl><Textarea placeholder="R.A.S..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enregistrer la naissance
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
