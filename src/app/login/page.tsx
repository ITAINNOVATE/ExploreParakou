"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LogIn, Terminal } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const [clinicCode, setClinicCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const supabase = createClient();

      // 1. Vérifier si le code clinique est valide
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("code", clinicCode)
        .single();

      if (clinicError || !clinic) {
        toast.error("Code clinique invalide. Vérifiez l'orthographe.");
        setIsLoading(false);
        return;
      }

      // 2. Authentifier l'utilisateur
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Connexion échouée : " + error.message);
        return;
      }

      // 3. Vérifier que l'utilisateur appartient à cette clinique (sauf pour Super Admin)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("clinic_id, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        toast.error("Erreur lors de la récupération du profil.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.role !== "Super Admin") {
        if (profile.clinic_id !== clinic.id) {
          toast.error("Vous n'êtes pas autorisé à accéder à cette clinique.");
          await supabase.auth.signOut();
          return;
        }
      } else {
        // Si c'est un Super Admin, on met à jour sa clinique "active" dans son profil
        // pour que tout le tableau de bord affiche les données de cette clinique
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ clinic_id: clinic.id })
          .eq("id", data.user.id);

        if (updateError) {
          console.error("Erreur mise à jour clinique active:", updateError);
        }
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      toast.error("Une erreur inattendue est survenue lors de la connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
           <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-3xl shadow-lg ring-4 ring-primary/20">
             L+
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">LOGICLINIC+</h1>
          <p className="text-muted-foreground">Gestion Hospitalière Intégrée</p>
        </div>

        <p className="text-[14px] text-slate-700 font-medium text-center px-4 leading-relaxed max-w-4xl mx-auto subpixel-antialiased">
          LOGICLINIC+ est une solution numérique complète de gestion des établissements de santé dévéloppé par <strong>ITA INNOVATE</strong>, permettant de centraliser et d’optimiser la gestion des patients, des consultations, des examens de laboratoire, de l’imagerie médicale, de la maternité, de la pharmacie, des médicaments ainsi que de la facturation et des rapports d’activité.
        </p>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>
              Entrez le code de votre établissement et vos identifiants.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clinicCode">Code Clinique</Label>
                <Input
                  id="clinicCode"
                  placeholder="EX: ITA-CLINIQUE"
                  required
                  value={clinicCode}
                  onChange={(e) => setClinicCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@clinique.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Button variant="link" className="px-0 font-normal h-auto text-xs">
                    Oublié ?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full gap-2 shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? "Connexion..." : (
                  <>
                    <LogIn className="h-4 w-4" /> Se connecter
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="px-8 text-center text-sm text-muted-foreground">
          En vous connectant, vous acceptez nos{" "}
          <Button variant="link" className="px-0 font-normal h-auto text-sm">Conditions d'utilisation</Button>.
        </p>
      </div>
    </div>
  );
}
