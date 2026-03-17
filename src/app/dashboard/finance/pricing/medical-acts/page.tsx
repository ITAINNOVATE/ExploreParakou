"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, BriefcaseMedical, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const supabase = createClient();

interface MedicalService {
  id: string;
  code_acte: string | null;
  nom_acte: string;
  categorie: string;
  service: string;
  prix: number;
  description: string;
  clinic_id: string;
}

export default function MedicalActsPage() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code_acte: "",
    nom_acte: "",
    categorie: "Consultation",
    service: "Général",
    prix: "",
    description: "",
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_services")
        .select("*")
        .order("nom_acte", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des actes: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenModal = (service?: MedicalService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        code_acte: service.code_acte || "",
        nom_acte: service.nom_acte,
        categorie: service.categorie || "Consultation",
        service: service.service || "Général",
        prix: service.prix.toString(),
        description: service.description || "",
      });
    } else {
      setEditingService(null);
      setFormData({
        code_acte: "",
        nom_acte: "",
        categorie: "Consultation",
        service: "Général",
        prix: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error("Profil non trouvé");

      const payload = {
        ...formData,
        prix: parseFloat(formData.prix),
        clinic_id: profile.clinic_id,
      };

      if (editingService) {
        const { error } = await supabase
          .from("medical_services")
          .update(payload)
          .eq("id", editingService.id);
        if (error) throw error;
        toast.success("Acte médical mis à jour");
      } else {
        const { error } = await supabase
          .from("medical_services")
          .insert([payload]);
        if (error) throw error;
        toast.success("Acte médical créé");
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet acte ?")) return;

    try {
      const { error } = await supabase
        .from("medical_services")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Acte supprimé");
      fetchServices();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression: " + error.message);
    }
  };

  const filteredServices = services.filter(s => 
    s.nom_acte.toLowerCase().includes(search.toLowerCase()) ||
    s.code_acte?.toLowerCase().includes(search.toLowerCase()) ||
    s.categorie?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Actes Médicaux</h1>
          <p className="text-slate-500">Gérez le catalogue des soins et services médicaux.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un acte
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="pb-3 bg-white rounded-t-xl border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, code ou catégorie..."
                className="pl-9 bg-slate-50 border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white rounded-b-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Nom de l'acte</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Prix (FCFA)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">
                    Aucun acte médical trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id} className="group transition-colors hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {service.code_acte || "---"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {service.nom_acte}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 uppercase">
                        {service.categorie}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">{service.service}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {new Intl.NumberFormat('fr-FR').format(service.prix)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(service)}
                          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service.id)}
                          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BriefcaseMedical className="h-5 w-5 text-primary" />
                {editingService ? "Modifier l'acte" : "Nouvel acte médical"}
              </DialogTitle>
              <DialogDescription>
                Renseignez les détails de l'acte médical pour la facturation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_acte" className="text-slate-400">Code Acte (Auto)</Label>
                  <Input
                    id="code_acte"
                    disabled
                    placeholder="Généré automatiquement"
                    value={formData.code_acte || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix (FCFA)</Label>
                  <Input
                    id="prix"
                    type="number"
                    required
                    placeholder="0"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom_acte">Nom de l'acte</Label>
                <Input
                  id="nom_acte"
                  required
                  placeholder="ex: Consultation Généraliste"
                  value={formData.nom_acte}
                  onChange={(e) => setFormData({ ...formData, nom_acte: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select 
                    value={formData.categorie} 
                    onValueChange={(v) => setFormData({ ...formData, categorie: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                      <SelectItem value="Chirurgie">Chirurgie</SelectItem>
                      <SelectItem value="Soins">Soins / Pansements</SelectItem>
                      <SelectItem value="Urgence">Urgence</SelectItem>
                      <SelectItem value="Maternité">Maternité</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Input
                    id="service"
                    placeholder="ex: Médecine Générale"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optionnel)</Label>
                <Textarea
                  id="description"
                  placeholder="Détails supplémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingService ? "Mettre à jour" : "Créer l'acte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
