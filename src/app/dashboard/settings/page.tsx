"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Settings, 
  Building2, 
  Users, 
  Lock, 
  Globe, 
  Save, 
  Loader2, 
  Upload,
  UserPlus,
  ShieldCheck,
  Mail
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ClinicCreateStaffModal } from "@/components/dashboard/clinic-create-staff-modal";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [clinic, setClinic] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchClinicData();
    fetchUsers();
  }, []);

  async function fetchClinicData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id, clinics(*)')
      .eq('id', user?.id)
      .single();
    
    if (profile?.clinics) {
      setClinic(profile.clinics);
    }
  }

  async function fetchUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

    if (profile?.clinic_id) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('clinic_id', profile.clinic_id);
        setUsers(data || []);
    }
  }

  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: clinic.name,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email
        })
        .eq('id', clinic.id);

      if (error) throw error;
      toast.success("Paramètres de la clinique mis à jour.");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez votre clinique et gérez les accès utilisateurs.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 border border-slate-200">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" /> Profil Clinique
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" /> Sécurité
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Globe className="h-4 w-4" /> Système
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-200 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle>Informations de l'Établissement</CardTitle>
              <CardDescription>Mettez à jour les coordonnées publiques de votre clinique.</CardDescription>
            </CardHeader>
            <CardContent>
              {clinic ? (
                <form onSubmit={handleUpdateClinic} className="space-y-4">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden group">
                      <Building2 className="h-8 w-8 text-slate-400" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">Logo de la Clinique</h4>
                      <p className="text-sm text-slate-500">JPG, PNG ou SVG. Max 2MB.</p>
                      <Button variant="outline" size="sm" className="mt-2" type="button">Remplacer</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom de la Clinique</Label>
                      <Input 
                        id="name" 
                        value={clinic.name} 
                        onChange={(e) => setClinic({...clinic, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input 
                        id="phone" 
                        value={clinic.phone || ""} 
                        onChange={(e) => setClinic({...clinic, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email">Email de Contact</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={clinic.email || ""} 
                        onChange={(e) => setClinic({...clinic, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Adresse Physique</Label>
                      <Input 
                        id="address" 
                        value={clinic.address || ""} 
                        onChange={(e) => setClinic({...clinic, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="py-8 text-center text-slate-500">Chargement...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des Équipes</CardTitle>
                <CardDescription>Invitez et gérez les rôles de vos collaborateurs.</CardDescription>
              </div>
              <Button 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold"
                onClick={() => setIsStaffModalOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Ajouter un membre
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-slate-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize bg-slate-50">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: fr }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Éditer</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-slate-200 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle>Sécurité du Compte</CardTitle>
              <CardDescription>Protégez vos accès avec un mot de passe robuste.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Mot de passe actuel</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Nouveau mot de passe</Label>
                <Input id="new" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
                <Input id="confirm" type="password" />
              </div>
              <div className="pt-4 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-sm text-emerald-600">
                   <ShieldCheck className="h-4 w-4" />
                   Double authentification (2FA) inactive
                 </div>
                 <Button className="bg-slate-900">Mettre à jour mot de passe</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
            <Card className="border-slate-200 shadow-sm max-w-2xl">
                <CardHeader>
                    <CardTitle>Préférences Système</CardTitle>
                    <CardDescription>Configurez la langue et les unités par défaut.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Langue de l'interface</Label>
                            <Input value="Français (FR)" disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Devise</Label>
                            <Input value="F CFA (XAF)" disabled />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                            <p className="font-medium">Notifications par Email</p>
                            <p className="text-sm text-slate-500">Recevoir des alertes pour les rendez-vous.</p>
                        </div>
                        <Button variant="outline">Activer</Button>
                    </div>
                </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {clinic && (
        <ClinicCreateStaffModal
          clinicId={clinic.id}
          open={isStaffModalOpen}
          onOpenChange={setIsStaffModalOpen}
          onCreated={fetchUsers}
        />
      )}
    </div>
  );
}
