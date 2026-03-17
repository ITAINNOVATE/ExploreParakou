"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'Super Admin',
          }
        }
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Compte créé ! Vous pouvez maintenant vous connecter.");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
           <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-3xl shadow-lg ring-4 ring-primary/20">
             L+
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">LOGICLINIC+</h1>
          <p className="text-muted-foreground">Créer votre compte administrateur</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Inscription</CardTitle>
            <CardDescription>
              Inscrivez-vous pour commencer à configurer votre clinique.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  placeholder="Jean Dupont"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Mot de passe</Label>
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
                {isLoading ? "Création..." : (
                  <>
                    <UserPlus className="h-4 w-4" /> S'inscrire
                  </>
                )}
              </Button>
              <Link href="/login" className="text-xs text-primary hover:underline text-center">
                Déjà un compte ? Se connecter
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
