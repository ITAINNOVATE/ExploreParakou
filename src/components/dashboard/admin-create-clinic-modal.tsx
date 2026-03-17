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
import { Plus, Loader2, Building, MapPin, Phone, Mail, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

const formSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  country: z.string().min(1, "Le pays est requis"),
  city: z.string().min(1, "La ville est requise"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").or(z.literal("")),
});

export function AdminCreateClinicModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string, code: string } | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      country: "Bénin",
      city: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // Générer le code clinique (ITA-NOM_CLINIQUE)
      const clinicCode = `ITA-${values.name.toUpperCase().replace(/\s+/g, "_")}`;

      const { error } = await supabase
        .from("clinics")
        .insert([{ ...values, code: clinicCode }]);

      if (error) throw error;

      toast.success("Nouvelle clinique ajoutée avec succès.");
      setSuccessData({ name: values.name, code: clinicCode });
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
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Nouvelle Clinique
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-600" />
            Ajouter une Clinique
          </DialogTitle>
          <DialogDescription>
            Enregistrez un nouvel établissement sur la plateforme.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {successData ? (
            <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Clinique Créée !</h3>
                <p className="text-sm text-slate-500">
                  L'établissement <strong>{successData.name}</strong> a été enregistré avec succès.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Code Clinique à transmettre</p>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <code className="text-lg font-mono font-bold text-primary">{successData.code}</code>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(successData.code);
                        toast.success("Code copié !");
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 leading-relaxed">
                  <p><strong>Note:</strong> Ce code est indispensable pour que les utilisateurs puissent se connecter à cet établissement spécifique.</p>
                </div>
              </div>

              <Button 
                className="w-full bg-slate-900 hover:bg-slate-800" 
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => setSuccessData(null), 300);
                }}
              >
                Terminer
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la Clinique</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Clinique Saint-Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input placeholder="Cotonou" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète</FormLabel>
                    <FormControl>
                      <div className="relative">
                         <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input className="pl-9" placeholder="Quartier, Rue, Maison..." {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="+229 ..." {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Contact</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="clinique@example.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Créer l'établissement
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
