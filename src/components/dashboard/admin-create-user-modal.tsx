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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Mail, Lock, User, CheckCircle, Copy, Building } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

const formSchema = z.object({
  fullName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
});

interface AdminCreateUserModalProps {
  clinicId: string;
  clinicName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AdminCreateUserModal({ 
  clinicId, 
  clinicName, 
  open, 
  onOpenChange, 
  onCreated 
}: AdminCreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ fullName: string, email: string, password: string } | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "Admin123", // Mot de passe par défaut
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // Pour créer un utilisateur sans être déconnecté, on utilise l'API RPC dédiée (à créer)
      // OU on utilise la création standard si on accepte d'être déconnecté (moins bien)
      // On va appeler une fonction RPC qui utilise SECURITY DEFINER pour créer l'utilisateur
      
      const { data, error } = await supabase.rpc("admin_create_clinic_user", {
        u_email: values.email,
        u_password: values.password,
        u_full_name: values.fullName,
        u_clinic_id: clinicId,
        u_role: "Admin clinique"
      });

      if (error) throw error;

      toast.success(`Administrateur créé pour ${clinicName}`);
      setSuccessData({ fullName: values.fullName, email: values.email, password: values.password });
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Créer l'Administrateur
          </DialogTitle>
          <DialogDescription>
            Définissez l'administrateur principal pour <strong>{clinicName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {successData ? (
            <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Accès Créé !</h3>
                <p className="text-sm text-slate-500">
                  Le compte de <strong>{successData.fullName}</strong> est prêt.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identifiants de connexion</p>
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
                  
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rappel Établissement</p>
                    <div className="flex items-center gap-2 text-primary font-bold">
                       <Building className="h-4 w-4" />
                       <span className="text-sm">{clinicName}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full bg-slate-900 hover:bg-slate-800" 
                onClick={() => {
                  onOpenChange(false);
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
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Jean Admin" {...field} />
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
                    <FormLabel>Email professionnel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" type="email" placeholder="admin@clinique.com" {...field} />
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
                    <FormLabel>Mot de passe provisoire</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" type="password" {...field} />
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
                  Créer l'accès
                </Button>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
