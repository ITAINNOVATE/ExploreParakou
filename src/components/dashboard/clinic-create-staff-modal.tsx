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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Mail, Lock, User, ShieldCheck, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

const ROLES = [
  { label: "Réceptionniste", value: "Réceptionniste" },
  { label: "Infirmier", value: "Infirmier" },
  { label: "Médecin", value: "Médecin" },
  { label: "Laborantin", value: "Laborantin" },
  { label: "Radiologue", value: "Radiologue" },
  { label: "Sage-femme", value: "Sage-femme" },
  { label: "Pharmacien", value: "Pharmacien" },
  { label: "Gestionnaire de stock", value: "Gestionnaire de stock" },
  { label: "Comptable", value: "Comptable" },
  { label: "Administrateur Clinique", value: "Admin clinique" },
];

const formSchema = z.object({
  fullName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
  role: z.string().min(1, "Le rôle est requis"),
});

interface ClinicCreateStaffModalProps {
  clinicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function ClinicCreateStaffModal({ 
  clinicId, 
  open, 
  onOpenChange, 
  onCreated 
}: ClinicCreateStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ fullName: string, email: string, password: string, role: string } | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "Réceptionniste",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("admin_create_clinic_user", {
        u_email: values.email,
        u_password: values.password,
        u_full_name: values.fullName,
        u_clinic_id: clinicId,
        u_role: values.role
      });

      if (error) throw error;

      toast.success(`Compte ${values.role} créé avec succès.`);
      setSuccessData({ fullName: values.fullName, email: values.email, password: values.password, role: values.role });
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
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Ajouter un Membre du Personnel
          </DialogTitle>
          <DialogDescription>
            Créez un nouvel accès pour un membre de votre équipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {successData ? (
            <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Compte créé !</h3>
                <p className="text-sm text-slate-500">
                  Le compte de <strong>{successData.fullName}</strong> est prêt.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Identifiants de connexion</p>
                 <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Email</span>
                        <span className="text-sm font-medium text-slate-700">{successData.email}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(successData.email);
                          toast.success("Email copié !");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Mot de passe</span>
                        <span className="text-sm font-medium text-slate-700">{successData.password}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(successData.password);
                          toast.success("Mot de passe copié !");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between px-2">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase text-left">Role attribué</span>
                    <span className="text-sm font-bold text-primary">{successData.role}</span>
                 </div>
                 <Button 
                  className="bg-slate-900 hover:bg-slate-800 px-8" 
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => setSuccessData(null), 300);
                  }}
                >
                  Terminer
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nom Complet</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="Jean Dupont" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle & Département</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="pl-9 relative">
                          <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Sélectionnez un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Professionnel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" type="email" placeholder="nom@clinique.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe initial</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" type="password" placeholder="••••••••" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Créer le compte
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
